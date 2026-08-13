import React, { useRef, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { KeyboardAvoidingView } from 'react-native-keyboard-controller';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { apiPost, ChatMessage } from '@/utils/api';

const GOLD = '#d9b64f';
const GREEN = '#4ade80';
const BORDER = '#1e1e1e';
const CARD = '#0d0d0d';

const QUICK_PROMPTS = [
  '¿Cuánto necesito ganar por hora para cubrir mis gastos?',
  '¿Vale la pena seguir manejando después de las 10pm?',
  '¿Cuáles son las mejores zonas para trabajar en NYC ahora?',
  '¿Cómo calculo mi deducción de millas para impuestos?',
];

export default function ChatScreen() {
  const insets = useSafeAreaInsets();
  const [messages, setMessages] = useState<ChatMessage[]>([
    { role: 'assistant', content: 'Hola Miguel 👋 Soy tu asistente IA de IslandCity. Pregúntame sobre tus ganancias, gastos, o estrategia de manejo en NYC.' },
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const flatRef = useRef<FlatList>(null);

  const send = async (text?: string) => {
    const msg = (text ?? input).trim();
    if (!msg || loading) return;
    setInput('');
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    const userMsg: ChatMessage = { role: 'user', content: msg };
    const updated = [...messages, userMsg];
    setMessages(updated);
    setLoading(true);

    try {
      const history = updated.slice(-10).map(m => ({ role: m.role, content: m.content }));
      const data = await apiPost<{ reply: string }>('/api/gemini-chat', {
        message: msg,
        history: history.slice(0, -1),
        context: { app: 'IslandCity Android', platform: 'android' },
      });
      setMessages(prev => [...prev, { role: 'assistant', content: data.reply }]);
    } catch {
      setMessages(prev => [...prev, { role: 'assistant', content: 'Error de conexión. Verifica tu internet e intenta de nuevo.' }]);
    } finally {
      setLoading(false);
    }
  };

  const webTop = Platform.OS === 'web' ? 67 : 0;
  const webBottom = Platform.OS === 'web' ? 34 : 0;

  return (
    <KeyboardAvoidingView style={[styles.root, { paddingTop: insets.top + webTop }]} behavior="padding" keyboardVerticalOffset={0}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.brand}>AI ASSISTANT</Text>
          <Text style={styles.brandSub}>ISLANDCITY · GEMINI</Text>
        </View>
        <View style={styles.onlineDot} />
      </View>

      {/* Messages — inverted FlatList */}
      <FlatList
        ref={flatRef}
        data={[...messages].reverse()}
        inverted
        keyExtractor={(_, i) => i.toString()}
        style={styles.list}
        contentContainerStyle={[styles.listContent, { paddingBottom: 8 }]}
        showsVerticalScrollIndicator={false}
        keyboardDismissMode="interactive"
        keyboardShouldPersistTaps="handled"
        scrollEnabled={!!messages.length}
        ListHeaderComponent={loading ? (
          <View style={[styles.bubble, styles.aiBubble, { flexDirection: 'row', gap: 8, alignItems: 'center' }]}>
            <ActivityIndicator size="small" color={GOLD} />
            <Text style={styles.aiText}>Pensando…</Text>
          </View>
        ) : null}
        renderItem={({ item }) => (
          <View style={item.role === 'user' ? styles.userRow : styles.aiRow}>
            <View style={[styles.bubble, item.role === 'user' ? styles.userBubble : styles.aiBubble]}>
              <Text style={item.role === 'user' ? styles.userText : styles.aiText}>{item.content}</Text>
            </View>
          </View>
        )}
      />

      {/* Quick prompts */}
      {messages.length <= 1 && (
        <View style={styles.prompts}>
          {QUICK_PROMPTS.map((p, i) => (
            <Pressable key={i} style={({ pressed }) => [styles.prompt, pressed && { opacity: 0.7 }]} onPress={() => send(p)}>
              <Text style={styles.promptText}>{p}</Text>
            </Pressable>
          ))}
        </View>
      )}

      {/* Input bar */}
      <View style={[styles.inputBar, { paddingBottom: insets.bottom + webBottom + 4 }]}>
        <TextInput
          style={styles.textInput}
          value={input}
          onChangeText={setInput}
          placeholder="Pregúntame cualquier cosa…"
          placeholderTextColor="#333"
          multiline
          maxLength={500}
          onSubmitEditing={() => send()}
        />
        <Pressable
          style={({ pressed }) => [styles.sendBtn, pressed && { opacity: 0.7 }, (!input.trim() || loading) && { opacity: 0.4 }]}
          onPress={() => send()}
          disabled={!input.trim() || loading}
        >
          <Feather name="send" size={18} color="#000" />
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#000000' },
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 20, paddingBottom: 14, paddingTop: 4,
    borderBottomWidth: 1, borderBottomColor: BORDER,
  },
  brand: { fontSize: 18, fontWeight: '900', color: GOLD, letterSpacing: 2, fontFamily: 'Inter_700Bold' },
  brandSub: { fontSize: 8, color: '#555', letterSpacing: 3, marginTop: 1, fontFamily: 'Inter_500Medium' },
  onlineDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: GREEN },
  list: { flex: 1 },
  listContent: { padding: 12, gap: 8 },
  userRow: { alignItems: 'flex-end' },
  aiRow: { alignItems: 'flex-start' },
  bubble: { maxWidth: '82%', borderRadius: 18, paddingHorizontal: 14, paddingVertical: 10 },
  userBubble: { backgroundColor: GOLD, borderBottomRightRadius: 4 },
  aiBubble: { backgroundColor: CARD, borderWidth: 1, borderColor: BORDER, borderBottomLeftRadius: 4 },
  userText: { color: '#000', fontSize: 14, fontFamily: 'Inter_500Medium', lineHeight: 20 },
  aiText: { color: '#fff', fontSize: 14, fontFamily: 'Inter_400Regular', lineHeight: 20 },
  prompts: { paddingHorizontal: 12, paddingVertical: 8, gap: 6 },
  prompt: {
    backgroundColor: CARD, borderRadius: 10, borderWidth: 1, borderColor: BORDER,
    paddingHorizontal: 12, paddingVertical: 8,
  },
  promptText: { color: '#888', fontSize: 12, fontFamily: 'Inter_400Regular' },
  inputBar: {
    flexDirection: 'row', alignItems: 'flex-end', gap: 10,
    paddingHorizontal: 12, paddingTop: 10,
    borderTopWidth: 1, borderTopColor: BORDER, backgroundColor: '#000',
  },
  textInput: {
    flex: 1, backgroundColor: CARD, borderRadius: 14, borderWidth: 1, borderColor: BORDER,
    paddingHorizontal: 14, paddingVertical: 12, color: '#fff',
    fontSize: 14, fontFamily: 'Inter_400Regular', maxHeight: 100,
  },
  sendBtn: {
    width: 44, height: 44, borderRadius: 12,
    backgroundColor: GOLD, alignItems: 'center', justifyContent: 'center',
  },
});
