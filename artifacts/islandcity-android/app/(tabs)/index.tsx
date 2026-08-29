import React, { useCallback, useEffect, useState } from 'react';
import {
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { apiPost } from '@/utils/api';
import { useAuth } from '@clerk/expo';

interface Trip {
  id: string;
  fare: number;
  tip: number;
  total: number;
  time: string;
  date: string;
}

interface SyncResponse {
  ok: boolean;
  error?: string;
}

const GOLD = '#d9b64f';
const GOLD_LIGHT = '#f6dd8c';
const GREEN = '#4ade80';
const BORDER = '#1e1e1e';
const CARD = '#0d0d0d';

const TODAY = () => new Date().toISOString().slice(0, 10);

export default function DashboardScreen() {
  const { userId } = useAuth();
  const tripsKey = `ic-user:${userId}:android-trips`;
  const goalKey = `ic-user:${userId}:android-goal`;
  const insets = useSafeAreaInsets();
  const [trips, setTrips] = useState<Trip[]>([]);
  const [fare, setFare] = useState('');
  const [tip, setTip] = useState('');
  const [goal, setGoal] = useState('400');
  const [logging, setLogging] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [syncMessage, setSyncMessage] = useState('');
  const [loadedUserId, setLoadedUserId] = useState<string | null>(null);

  const todayStr = TODAY();
  const todayTrips = trips.filter(t => t.date === todayStr);
  const totalToday = todayTrips.reduce((s, t) => s + t.total, 0);
  const goalNum = parseFloat(goal) || 400;
  const progress = Math.min(totalToday / goalNum, 1);

  const load = useCallback(async () => {
    if (!userId) return;
    setTrips([]);
    setLoadedUserId(null);
    try {
      const raw = await AsyncStorage.getItem(tripsKey);
      setTrips(raw ? JSON.parse(raw) : []);
      const g = await AsyncStorage.getItem(goalKey);
      if (g) setGoal(g);
    } catch {
      setTrips([]);
    } finally {
      setLoadedUserId(userId);
    }
  }, [goalKey, tripsKey, userId]);

  useEffect(() => { load(); }, [load]);

  const syncTrip = async (trip: Trip) => {
    try {
      await apiPost<SyncResponse>('/api/trips', { trip });
      return true;
    } catch {
      return false;
    }
  };

  const syncAllTrips = useCallback(async (entries: Trip[]) => {
    if (entries.length === 0) return;
    setSyncing(true);
    const results = await Promise.all(entries.map(syncTrip));
    const synced = results.filter(Boolean).length;
    setSyncMessage(
      synced === entries.length
        ? `${synced} trip${synced === 1 ? '' : 's'} synced`
        : `${synced}/${entries.length} synced — will retry`,
    );
    setSyncing(false);
  }, []);

  useEffect(() => {
    if (loadedUserId === userId && trips.length > 0) void syncAllTrips(trips);
  }, [trips, syncAllTrips, loadedUserId, userId]);

  const logTrip = async () => {
    const f = parseFloat(fare) || 0;
    const t = parseFloat(tip) || 0;
    if (f <= 0) return;
    setLogging(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    const newTrip: Trip = {
      id: Date.now().toString(),
      fare: f, tip: t, total: f + t,
      time: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
      date: todayStr,
    };
    const updated = [newTrip, ...trips];
    setTrips(updated);
    await AsyncStorage.setItem(tripsKey, JSON.stringify(updated));
    const synced = await syncTrip(newTrip);
    setSyncMessage(synced ? 'Trip synced to web app' : 'Saved on phone — sync will retry');
    setFare(''); setTip('');
    setLogging(false);
  };

  const saveGoal = async (v: string) => {
    setGoal(v);
    await AsyncStorage.setItem(goalKey, v);
  };

  const now = new Date();
  const dayName = now.toLocaleDateString('en-US', { weekday: 'long' }).toUpperCase();
  const dateStr = now.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }).toUpperCase();

  const webTop = Platform.OS === 'web' ? 67 : 0;

  return (
    <View style={[styles.root, { paddingTop: insets.top + webTop }]}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.brand}>ISLANDCITY</Text>
          <Text style={styles.brandSub}>TRANSIT SERVICES</Text>
        </View>
        <View style={styles.dateBlock}>
          <Text style={styles.dayName}>{dayName}</Text>
          <Text style={styles.dateStr}>{dateStr}</Text>
        </View>
      </View>

      <ScrollView style={styles.scroll} contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + (Platform.OS === 'web' ? 84 : 80) }]} showsVerticalScrollIndicator={false}>

        {/* Earnings hero */}
        <View style={styles.heroCard}>
          <Text style={styles.heroLabel}>EARNINGS TODAY</Text>
          <Text style={styles.heroAmount}>${totalToday.toFixed(2)}</Text>

          {/* Progress bar */}
          <View style={styles.progressTrack}>
            <View style={[styles.progressFill, { width: `${progress * 100}%` as any }]} />
          </View>
          <View style={styles.progressLabels}>
            <Text style={styles.progressText}>${totalToday.toFixed(0)} of ${goalNum}</Text>
            <Text style={styles.progressText}>{Math.round(progress * 100)}%</Text>
          </View>

          {/* Stats row */}
          <View style={styles.statsRow}>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{todayTrips.length}</Text>
              <Text style={styles.statLabel}>TRIPS</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={styles.statValue}>
                ${todayTrips.length > 0 ? (totalToday / todayTrips.length).toFixed(2) : '0.00'}
              </Text>
              <Text style={styles.statLabel}>AVG TRIP</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={[styles.statValue, { color: GREEN }]}>
                ${(goalNum - totalToday).toFixed(0)}
              </Text>
              <Text style={styles.statLabel}>REMAINING</Text>
            </View>
          </View>
        </View>

        {/* Daily goal input */}
        <View style={styles.row}>
          <Text style={styles.sectionLabel}>DAILY GOAL</Text>
          <TextInput
            style={styles.goalInput}
            value={goal}
            onChangeText={saveGoal}
            keyboardType="numeric"
            placeholderTextColor="#444"
          />
        </View>
        {syncing || syncMessage ? (
          <View style={styles.syncRow}>
            <Feather name={syncing ? 'refresh-cw' : syncMessage.includes('retry') ? 'cloud-off' : 'cloud'} size={12} color={syncMessage.includes('retry') ? '#facc15' : GREEN} />
            <Text style={[styles.syncText, syncMessage.includes('retry') && { color: '#facc15' }]}>
              {syncing ? 'Syncing with web app…' : syncMessage}
            </Text>
          </View>
        ) : null}

        {/* Quick trip entry */}
        <View style={styles.card}>
          <Text style={styles.sectionLabel}>LOG TRIP</Text>
          <View style={styles.inputRow}>
            <View style={styles.inputWrap}>
              <Text style={styles.inputLabel}>FARE</Text>
              <TextInput
                style={styles.amtInput}
                value={fare}
                onChangeText={setFare}
                keyboardType="decimal-pad"
                placeholder="0.00"
                placeholderTextColor="#333"
              />
            </View>
            <View style={styles.inputWrap}>
              <Text style={styles.inputLabel}>TIP</Text>
              <TextInput
                style={styles.amtInput}
                value={tip}
                onChangeText={setTip}
                keyboardType="decimal-pad"
                placeholder="0.00"
                placeholderTextColor="#333"
              />
            </View>
            <Pressable
              style={({ pressed }) => [styles.logBtn, pressed && { opacity: 0.75 }, logging && { opacity: 0.5 }]}
              onPress={logTrip}
              disabled={logging}
            >
              <Feather name="plus" size={22} color="#000" />
            </Pressable>
          </View>
        </View>

        {/* Recent trips */}
        {todayTrips.length > 0 && (
          <View style={styles.card}>
            <Text style={styles.sectionLabel}>TODAY'S TRIPS</Text>
            {todayTrips.slice(0, 8).map(t => (
              <View key={t.id} style={styles.tripRow}>
                <View style={styles.tripTime}>
                  <Feather name="clock" size={12} color="#555" />
                  <Text style={styles.tripTimeText}>{t.time}</Text>
                </View>
                <Text style={styles.tripFare}>
                  ${t.fare.toFixed(2)}{t.tip > 0 ? ` + $${t.tip.toFixed(2)}` : ''}
                </Text>
                <Text style={styles.tripTotal}>${t.total.toFixed(2)}</Text>
              </View>
            ))}
          </View>
        )}

        {todayTrips.length === 0 && (
          <View style={styles.emptyCard}>
            <Feather name="moon" size={32} color="#333" />
            <Text style={styles.emptyText}>No trips logged yet today</Text>
            <Text style={styles.emptySubtext}>Log your first fare above</Text>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#000000' },
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end',
    paddingHorizontal: 20, paddingBottom: 14, paddingTop: 4,
    borderBottomWidth: 1, borderBottomColor: BORDER,
  },
  brand: { fontSize: 22, fontWeight: '900', color: GOLD, letterSpacing: 2, fontFamily: 'Inter_700Bold' },
  brandSub: { fontSize: 8, color: GOLD, letterSpacing: 4, marginTop: 1, fontFamily: 'Inter_600SemiBold' },
  dateBlock: { alignItems: 'flex-end' },
  dayName: { fontSize: 9, color: '#555', letterSpacing: 2, fontFamily: 'Inter_600SemiBold' },
  dateStr: { fontSize: 10, color: '#888', letterSpacing: 1, fontFamily: 'Inter_500Medium' },
  scroll: { flex: 1 },
  content: { padding: 16, gap: 12 },
  heroCard: {
    backgroundColor: CARD, borderRadius: 20, padding: 20,
    borderWidth: 1, borderColor: '#1a1200',
  },
  heroLabel: { fontSize: 9, color: '#888', letterSpacing: 3, fontFamily: 'Inter_600SemiBold', marginBottom: 4 },
  heroAmount: { fontSize: 48, fontWeight: '900', color: GOLD_LIGHT, fontFamily: 'Inter_700Bold', letterSpacing: -1 },
  progressTrack: { height: 4, backgroundColor: '#111', borderRadius: 2, marginTop: 12, overflow: 'hidden' },
  progressFill: { height: 4, backgroundColor: GOLD, borderRadius: 2 },
  progressLabels: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 6 },
  progressText: { fontSize: 10, color: '#666', fontFamily: 'Inter_500Medium' },
  statsRow: { flexDirection: 'row', marginTop: 18, paddingTop: 18, borderTopWidth: 1, borderTopColor: BORDER },
  statItem: { flex: 1, alignItems: 'center' },
  statDivider: { width: 1, backgroundColor: BORDER },
  statValue: { fontSize: 20, fontWeight: '800', color: '#fff', fontFamily: 'Inter_700Bold' },
  statLabel: { fontSize: 8, color: '#555', letterSpacing: 2, marginTop: 2, fontFamily: 'Inter_600SemiBold' },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 4 },
  sectionLabel: { fontSize: 9, color: '#555', letterSpacing: 3, fontFamily: 'Inter_700Bold', marginBottom: 10 },
  goalInput: {
    backgroundColor: '#111', borderWidth: 1, borderColor: BORDER,
    borderRadius: 10, paddingHorizontal: 14, paddingVertical: 8,
    color: GOLD, fontSize: 16, fontFamily: 'Inter_700Bold', width: 80, textAlign: 'center',
  },
  card: { backgroundColor: CARD, borderRadius: 16, padding: 16, borderWidth: 1, borderColor: BORDER },
  inputRow: { flexDirection: 'row', gap: 10, alignItems: 'flex-end' },
  inputWrap: { flex: 1 },
  inputLabel: { fontSize: 9, color: '#555', letterSpacing: 2, marginBottom: 6, fontFamily: 'Inter_600SemiBold' },
  amtInput: {
    backgroundColor: '#111', borderWidth: 1, borderColor: BORDER,
    borderRadius: 12, paddingHorizontal: 14, paddingVertical: 14,
    color: '#fff', fontSize: 20, fontFamily: 'Inter_700Bold', textAlign: 'center',
  },
  logBtn: {
    width: 52, height: 52, borderRadius: 14,
    backgroundColor: GOLD, alignItems: 'center', justifyContent: 'center',
  },
  tripRow: {
    flexDirection: 'row', alignItems: 'center', paddingVertical: 10,
    borderTopWidth: 1, borderTopColor: '#111',
  },
  tripTime: { flexDirection: 'row', alignItems: 'center', gap: 4, width: 70 },
  tripTimeText: { fontSize: 11, color: '#555', fontFamily: 'Inter_500Medium' },
  tripFare: { flex: 1, fontSize: 13, color: '#888', fontFamily: 'Inter_500Medium' },
  tripTotal: { fontSize: 15, fontWeight: '700', color: GREEN, fontFamily: 'Inter_700Bold' },
  emptyCard: {
    alignItems: 'center', paddingVertical: 40, gap: 10,
    backgroundColor: CARD, borderRadius: 16, borderWidth: 1, borderColor: BORDER,
  },
  emptyText: { fontSize: 15, color: '#444', fontFamily: 'Inter_600SemiBold' },
  emptySubtext: { fontSize: 12, color: '#333', fontFamily: 'Inter_400Regular' },
  syncRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 2 },
  syncText: { fontSize: 10, color: GREEN, fontFamily: 'Inter_500Medium' },
});
