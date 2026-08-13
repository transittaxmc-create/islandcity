import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as ImagePicker from 'expo-image-picker';
import * as Haptics from 'expo-haptics';
import { Feather } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { apiPost, LimoOffer } from '@/utils/api';

const GOLD = '#d9b64f';
const GOLD_LIGHT = '#f6dd8c';
const GREEN_BRIGHT = '#00FF00';
const RED_BRIGHT = '#FF0000';
const BORDER = '#1e1e1e';
const CARD = '#0d0d0d';

export default function LimoSysScreen() {
  const insets = useSafeAreaInsets();
  const [minHr, setMinHr] = useState('40');
  const [minMi, setMinMi] = useState('2.5');
  const [analyzing, setAnalyzing] = useState(false);
  const [offers, setOffers] = useState<LimoOffer[]>([]);
  const [warning, setWarning] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    AsyncStorage.getItem('ic-limo-min-hr').then(v => v && setMinHr(v));
    AsyncStorage.getItem('ic-limo-min-mi').then(v => v && setMinMi(v));
  }, []);

  const saveThresholds = async () => {
    await AsyncStorage.setItem('ic-limo-min-hr', minHr);
    await AsyncStorage.setItem('ic-limo-min-mi', minMi);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  };

  const pickAndEval = async () => {
    setError(''); setWarning('');
    try {
      // Request media library permission
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permiso requerido', 'Necesitamos acceso a tu galería para analizar la oferta.');
        return;
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: false,
        quality: 0.85,
        base64: true,
      });
      if (result.canceled || !result.assets?.[0]) return;
      const asset = result.assets[0];
      if (!asset.base64) { setError('No se pudo leer la imagen'); return; }

      setAnalyzing(true);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);

      const data = await apiPost<{ offers: LimoOffer[]; warning?: string }>('/api/limosys-eval', {
        imageBase64: asset.base64,
        mimeType: 'image/jpeg',
        minHourly: parseFloat(minHr) || 40,
        minPerMile: parseFloat(minMi) || 2.5,
      });

      setOffers(data.offers ?? []);
      if (data.warning) setWarning(data.warning);
      Haptics.notificationAsync(
        (data.offers ?? []).some(o => o.decision === 'TOMAR')
          ? Haptics.NotificationFeedbackType.Success
          : Haptics.NotificationFeedbackType.Warning,
      );
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error evaluando oferta');
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } finally {
      setAnalyzing(false);
    }
  };

  const webTop = Platform.OS === 'web' ? 67 : 0;

  return (
    <View style={[styles.root, { paddingTop: insets.top + webTop }]}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.brand}>LIMOSYS</Text>
          <Text style={styles.brandSub}>AI JOB EVALUATOR</Text>
        </View>
        <View style={styles.badge}>
          <Text style={styles.badgeText}>GEMINI</Text>
        </View>
      </View>

      <ScrollView style={styles.scroll}
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + (Platform.OS === 'web' ? 84 : 80) }]}
        showsVerticalScrollIndicator={false}>

        {/* How to use */}
        <View style={styles.howToCard}>
          <Text style={styles.sectionLabel}>CÓMO USAR</Text>
          {[
            { n: '1', t: 'Toma screenshot en LimoSys', s: 'Botón lateral + bajar volumen (Samsung)' },
            { n: '2', t: 'Toca el botón verde abajo', s: 'Selecciona desde Galería / Photos' },
            { n: '3', t: 'Gemini analiza TODAS las ofertas', s: 'Veredicto TOMAR o RECHAZAR por oferta' },
          ].map(step => (
            <View key={step.n} style={styles.stepRow}>
              <View style={styles.stepBadge}><Text style={styles.stepNum}>{step.n}</Text></View>
              <View style={{ flex: 1 }}>
                <Text style={styles.stepTitle}>{step.t}</Text>
                <Text style={styles.stepSub}>{step.s}</Text>
              </View>
            </View>
          ))}
        </View>

        {/* Thresholds */}
        <View style={styles.card}>
          <Text style={styles.sectionLabel}>UMBRALES MÍNIMOS</Text>
          <View style={styles.threshRow}>
            <View style={styles.threshItem}>
              <Text style={styles.threshLabel}>MÍN $/HR</Text>
              <TextInput
                style={styles.threshInput}
                value={minHr}
                onChangeText={setMinHr}
                keyboardType="decimal-pad"
                placeholder="40"
                placeholderTextColor="#333"
              />
            </View>
            <View style={styles.threshItem}>
              <Text style={styles.threshLabel}>MÍN $/MI</Text>
              <TextInput
                style={styles.threshInput}
                value={minMi}
                onChangeText={setMinMi}
                keyboardType="decimal-pad"
                placeholder="2.5"
                placeholderTextColor="#333"
              />
            </View>
            <Pressable style={({ pressed }) => [styles.saveBtn, pressed && { opacity: 0.7 }]} onPress={saveThresholds}>
              <Feather name="check" size={18} color="#000" />
            </Pressable>
          </View>
        </View>

        {/* Main evaluate button */}
        <Pressable
          style={({ pressed }) => [styles.evalBtn, pressed && { opacity: 0.8 }, analyzing && { opacity: 0.6 }]}
          onPress={pickAndEval}
          disabled={analyzing}
        >
          {analyzing ? (
            <>
              <ActivityIndicator color={GREEN_BRIGHT} size="small" />
              <Text style={styles.evalBtnText}>Analizando con Gemini…</Text>
            </>
          ) : (
            <>
              <Feather name="camera" size={22} color={GREEN_BRIGHT} />
              <Text style={styles.evalBtnText}>EVALUAR OFERTA LIMOSYS</Text>
            </>
          )}
        </Pressable>

        {error ? <Text style={styles.errorText}>{error}</Text> : null}
        {warning ? <Text style={styles.warningText}>{warning}</Text> : null}

        {/* Results */}
        {offers.length > 0 && (
          <View>
            <Text style={[styles.sectionLabel, { marginBottom: 8 }]}>
              {offers.length} OFERTA{offers.length > 1 ? 'S' : ''} DETECTADA{offers.length > 1 ? 'S' : ''}
            </Text>
            {offers.map((o, i) => {
              const take = o.decision === 'TOMAR';
              const borderColor = take ? GREEN_BRIGHT : RED_BRIGHT;
              return (
                <View key={i} style={[styles.offerCard, { borderColor }]}>
                  {o.isBest && (
                    <View style={styles.bestBadge}>
                      <Text style={styles.bestBadgeText}>⭐ MEJOR OFERTA</Text>
                    </View>
                  )}
                  <View style={styles.offerRow1}>
                    <Text style={[styles.verdict, { color: borderColor }]}>
                      {take ? '🟢 TOMAR' : '🔴 RECHAZAR'}
                    </Text>
                    <Text style={styles.offerPrice}>${o.price.toFixed(2)}</Text>
                    <Text style={styles.offerRate}>💰 ${o.hourlyRate.toFixed(2)}/hr</Text>
                  </View>
                  <Text style={styles.offerRoute}>📍 {o.origin} → {o.destination}</Text>
                  <View style={styles.offerRow2}>
                    <Text style={styles.offerMeta}>⏱️ {o.pickupTime}</Text>
                    <Text style={styles.offerMeta}>${o.perMileRate.toFixed(2)}/mi</Text>
                    <Text style={styles.offerMeta}>{o.company}</Text>
                  </View>
                </View>
              );
            })}
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#000000' },
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 20, paddingBottom: 14, paddingTop: 4,
    borderBottomWidth: 1, borderBottomColor: BORDER,
  },
  brand: { fontSize: 22, fontWeight: '900', color: '#00FF00', letterSpacing: 2, fontFamily: 'Inter_700Bold' },
  brandSub: { fontSize: 8, color: '#00aa00', letterSpacing: 3, marginTop: 1, fontFamily: 'Inter_600SemiBold' },
  badge: { backgroundColor: '#001a00', borderRadius: 8, borderWidth: 1, borderColor: '#00FF00', paddingHorizontal: 10, paddingVertical: 4 },
  badgeText: { fontSize: 9, color: '#00FF00', fontFamily: 'Inter_700Bold', letterSpacing: 2 },
  scroll: { flex: 1 },
  content: { padding: 16, gap: 12 },
  sectionLabel: { fontSize: 9, color: '#555', letterSpacing: 3, fontFamily: 'Inter_700Bold', marginBottom: 12 },
  howToCard: { backgroundColor: '#050f05', borderRadius: 16, padding: 16, borderWidth: 1, borderColor: '#00FF00' + '33' },
  stepRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, marginBottom: 10 },
  stepBadge: { width: 22, height: 22, borderRadius: 11, backgroundColor: '#00FF00', alignItems: 'center', justifyContent: 'center' },
  stepNum: { fontSize: 11, fontWeight: '900', color: '#000', fontFamily: 'Inter_700Bold' },
  stepTitle: { fontSize: 13, fontWeight: '700', color: '#fff', fontFamily: 'Inter_600SemiBold' },
  stepSub: { fontSize: 10, color: '#555', fontFamily: 'Inter_400Regular', marginTop: 1 },
  card: { backgroundColor: CARD, borderRadius: 16, padding: 16, borderWidth: 1, borderColor: BORDER },
  threshRow: { flexDirection: 'row', gap: 10, alignItems: 'flex-end' },
  threshItem: { flex: 1 },
  threshLabel: { fontSize: 9, color: '#555', letterSpacing: 2, marginBottom: 6, fontFamily: 'Inter_600SemiBold' },
  threshInput: {
    backgroundColor: '#111', borderWidth: 1, borderColor: BORDER,
    borderRadius: 12, paddingHorizontal: 14, paddingVertical: 14,
    color: '#FFFF00', fontSize: 22, fontFamily: 'Inter_700Bold', textAlign: 'center',
  },
  saveBtn: {
    width: 52, height: 52, borderRadius: 14,
    backgroundColor: GOLD, alignItems: 'center', justifyContent: 'center',
  },
  evalBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10,
    paddingVertical: 18, borderRadius: 16,
    backgroundColor: '#000', borderWidth: 2, borderColor: '#00FF00',
    shadowColor: '#00FF00', shadowOpacity: 0.2, shadowRadius: 12, elevation: 6,
  },
  evalBtnText: { fontSize: 14, fontWeight: '900', color: '#00FF00', letterSpacing: 1, fontFamily: 'Inter_700Bold' },
  errorText: { color: '#f87171', fontSize: 12, textAlign: 'center', fontFamily: 'Inter_500Medium' },
  warningText: { color: '#facc15', fontSize: 11, textAlign: 'center', fontFamily: 'Inter_500Medium' },
  offerCard: {
    backgroundColor: '#000', borderRadius: 14, padding: 14,
    borderWidth: 2, marginBottom: 10, gap: 6,
  },
  bestBadge: {
    alignSelf: 'flex-start', backgroundColor: '#FFFF00', borderRadius: 6,
    paddingHorizontal: 8, paddingVertical: 3, marginBottom: 4,
  },
  bestBadgeText: { fontSize: 9, fontWeight: '900', color: '#000', fontFamily: 'Inter_700Bold', letterSpacing: 1 },
  offerRow1: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  verdict: { fontSize: 16, fontWeight: '900', fontFamily: 'Inter_700Bold', flex: 1 },
  offerPrice: { fontSize: 20, fontWeight: '900', color: '#FFFF00', fontFamily: 'Inter_700Bold' },
  offerRate: { fontSize: 13, fontWeight: '700', color: '#fff', fontFamily: 'Inter_600SemiBold' },
  offerRoute: { fontSize: 13, fontWeight: '700', color: '#fff', fontFamily: 'Inter_600SemiBold' },
  offerRow2: { flexDirection: 'row', gap: 12 },
  offerMeta: { fontSize: 10, color: '#555', fontFamily: 'Inter_400Regular' },
});
