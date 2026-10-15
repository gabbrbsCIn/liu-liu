import { router, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { takePendingAsk } from '@/lib/actions';
import { api, refreshAll } from '@/lib/api';
import type { ChatData, ChatReply, Conversation } from '@/lib/types';
import { Markdown } from '@/ui/chat/Markdown';
import { Typing } from '@/ui/chat/Typing';
import { hhmm, newId, parseTs, SUGGESTIONS, when } from '@/ui/chat/format';
import { Button, Icon, Mark, T, type IconName } from '@/ui/kit';
import { fonts, useTheme } from '@/ui/theme';

type Msg = { role: 'user' | 'assistant'; text: string; time: string; error?: boolean };

/** The conversation with liu liu (the web's ChatDrawer), as a full-screen modal. */
export default function Chat() {
  const t = useTheme();
  const insets = useSafeAreaInsets();
  const { q } = useLocalSearchParams<{ q?: string }>();
  const [msgs, setMsgs] = useState<Msg[] | null>(null);
  const [busy, setBusy] = useState(false);
  const [input, setInput] = useState('');
  const [conv, setConv] = useState<string | null>(null);
  const [convs, setConvs] = useState<Conversation[]>([]);
  const [panel, setPanel] = useState<'chat' | 'history'>('chat');
  const [confirmDelete, setConfirmDelete] = useState(false);
  const listRef = useRef<ScrollView>(null);
  const inputRef = useRef<TextInput>(null);
  const busyRef = useRef(false);
  // The question from askLiu() is sent once, even if the effect runs twice (StrictMode) or the screen re-renders.
  const asked = useRef(false);

  const load = useCallback(async (id?: string) => {
    const r = await api<ChatData>(`/api/chat${id ? `?c=${encodeURIComponent(id)}` : ''}`).catch(() => ({ conversation: undefined, messages: [], conversations: [] }) as Partial<ChatData>);
    setConv(r.conversation ?? id ?? newId());
    setConvs(r.conversations ?? []);
    setMsgs((r.messages ?? []).map((m) => ({ role: m.role, text: m.display, time: hhmm(parseTs(m.created_at)) })));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const startNew = () => {
    setConv(newId());
    setMsgs([]);
    setPanel('chat');
    setConfirmDelete(false);
    setTimeout(() => inputRef.current?.focus(), 0);
  };

  const removeCurrent = async () => {
    if (conv) await api(`/api/chat?c=${encodeURIComponent(conv)}`, { method: 'DELETE' }).catch(() => {});
    setConvs((cs) => cs.filter((c) => c.id !== conv));
    startNew();
  };

  const send = useCallback(
    async (text: string) => {
      const message = text.trim();
      if (!message || busyRef.current) return;
      busyRef.current = true;
      setBusy(true);
      setMsgs((m) => [...(m ?? []), { role: 'user', text: message, time: hhmm() }]);
      try {
        const r = await api<ChatReply>('/api/chat', { method: 'POST', body: { message, conversation: conv } });
        setMsgs((m) => [...(m ?? []), { role: 'assistant', text: r.reply, time: hhmm() }]);
        if (r.conversation) setConv(r.conversation);
        if (r.changed) refreshAll();
      } catch (e) {
        const err = (e as Error).message || 'Não consegui responder agora.';
        setMsgs((m) => [...(m ?? []), { role: 'assistant', text: err, time: hhmm(), error: true }]);
      } finally {
        busyRef.current = false;
        setBusy(false);
      }
    },
    [conv],
  );

  useEffect(() => {
    if (msgs === null || asked.current) return;
    asked.current = true;
    // Questions from the app's own buttons are sent; a ?q= from a link only fills the box.
    const pending = takePendingAsk();
    if (pending?.trim()) send(pending);
    else if (typeof q === 'string' && q.trim()) setInput(q.slice(0, 2000));
  }, [msgs, q, send]);

  const submit = () => {
    send(input);
    setInput('');
  };

  const userAsked = new Set((msgs ?? []).filter((m) => m.role === 'user').map((m) => m.text.trim().toLowerCase()));
  const sugs = SUGGESTIONS.filter((s) => !userAsked.has(s.toLowerCase())).slice(0, 3);

  const action = (icon: IconName, label: string, onPress: () => void, opts: { on?: boolean; disabled?: boolean } = {}) => (
    <Pressable
      onPress={onPress}
      disabled={opts.disabled}
      accessibilityLabel={label}
      accessibilityState={{ selected: opts.on, disabled: opts.disabled }}
      hitSlop={4}
      style={({ pressed }) => ({ width: 36, height: 36, borderRadius: 9, alignItems: 'center', justifyContent: 'center', backgroundColor: opts.on || pressed ? t.raise : 'transparent', opacity: opts.disabled ? 0.35 : 1 })}
    >
      <Icon name={icon} size={18} color={opts.on ? t.mint : t['fg-2']} />
    </Pressable>
  );

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: t.panel }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      {/* Header */}
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingTop: (Platform.OS === 'ios' ? 0 : insets.top) + 14, paddingBottom: 14, paddingHorizontal: 16, borderBottomWidth: 1, borderBottomColor: t.line }}>
        <Mark size={30} />
        <View style={{ flex: 1, minWidth: 0 }}>
          <T w="semi">liu liu</T>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: t.pos }} />
            <T c="fg-3" size={12} numberOfLines={1} style={{ flexShrink: 1 }}>lê suas contas pelo Open Finance</T>
          </View>
        </View>
        <View style={{ flexDirection: 'row', gap: 2 }}>
          {action('plus', 'Nova conversa', startNew)}
          {action('history', 'Conversas anteriores', () => { setPanel(panel === 'history' ? 'chat' : 'history'); setConfirmDelete(false); }, { on: panel === 'history' })}
          {action('trash', 'Apagar esta conversa', () => setConfirmDelete((v) => !v), { disabled: !msgs?.length })}
          {action('close', 'Fechar conversa', () => router.back())}
        </View>
      </View>

      {confirmDelete && (
        <View accessibilityRole="alert" style={{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 8, paddingVertical: 10, paddingHorizontal: 16, borderBottomWidth: 1, borderBottomColor: t.line, backgroundColor: t.mix(t.neg, 8) }}>
          <T size={13} style={{ flexGrow: 1, flexBasis: 180 }}>Apagar esta conversa? Os gastos que ela registrou continuam salvos.</T>
          <Button title="Cancelar" onPress={() => setConfirmDelete(false)} style={{ paddingVertical: 6, paddingHorizontal: 12 }} />
          <Button title="Apagar" kind="danger" onPress={removeCurrent} style={{ paddingVertical: 6, paddingHorizontal: 12 }} />
        </View>
      )}

      {panel === 'history' ? (
        <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 16, paddingBottom: 16 + insets.bottom, gap: 4 }}>
          <Pressable onPress={startNew} style={({ pressed }) => ({ flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 12, paddingHorizontal: 12, borderRadius: 10, backgroundColor: pressed ? t.raise : 'transparent' })}>
            <Icon name="plus" size={14} color={t.mint} />
            <T c="mint" w="semi">Nova conversa</T>
          </Pressable>
          {convs.length === 0 && <T c="fg-3" style={{ paddingHorizontal: 12 }}>Nenhuma conversa anterior.</T>}
          {convs.map((c) => {
            const on = c.id === conv;
            return (
              <Pressable
                key={c.id}
                onPress={() => { setPanel('chat'); setConfirmDelete(false); setMsgs(null); load(c.id); }}
                style={({ pressed }) => ({ gap: 2, paddingVertical: 10, paddingHorizontal: 12, borderRadius: 10, borderWidth: 1, borderColor: on ? t['line-2'] : 'transparent', backgroundColor: on || pressed ? t.raise : 'transparent' })}
              >
                <T numberOfLines={1}>{c.title}</T>
                <T c="fg-3" size={12}>{when(c.updated_at)} · {c.messages} mensagens</T>
              </Pressable>
            );
          })}
        </ScrollView>
      ) : (
        <>
          <ScrollView
            ref={listRef}
            style={{ flex: 1 }}
            contentContainerStyle={{ paddingTop: 18, paddingHorizontal: 16, paddingBottom: 8, gap: 14 }}
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode="interactive"
            onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: true })}
          >
            {msgs === null && <T c="fg-3">Carregando…</T>}
            {msgs?.length === 0 && (
              <View style={{ maxWidth: '92%' }}>
                <T size={14.5}>Oi! Pergunte qualquer coisa sobre seu dinheiro, ou me conte um gasto (“almoço 42 no débito”) que eu anoto.</T>
              </View>
            )}
            {msgs?.map((m, i) =>
              m.role === 'user' ? (
                <View key={i} style={{ alignSelf: 'flex-end', maxWidth: '85%', backgroundColor: t['mint-dim'], paddingVertical: 9, paddingHorizontal: 13, borderTopLeftRadius: 14, borderTopRightRadius: 14, borderBottomRightRadius: 4, borderBottomLeftRadius: 14 }}>
                  <T size={14.5} selectable>{m.text}</T>
                </View>
              ) : (
                <View key={i} style={{ alignSelf: 'flex-start', maxWidth: '92%' }}>
                  {m.error ? <T c="neg" size={13} style={{ marginTop: 4 }}>{m.text}</T> : <Markdown text={m.text} />}
                  <T c="fg-3" size={11} style={{ marginTop: 4 }}>{m.time}</T>
                </View>
              ),
            )}
            {busy && <Typing />}
          </ScrollView>

          {sugs.length > 0 && msgs !== null && (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} keyboardShouldPersistTaps="handled" style={{ flexGrow: 0 }} contentContainerStyle={{ gap: 6, paddingHorizontal: 16, paddingBottom: 8 }}>
              {sugs.map((s) => (
                <Pressable key={s} onPress={() => send(s)} disabled={busy} style={({ pressed }) => ({ paddingVertical: 6, paddingHorizontal: 11, borderRadius: 999, borderWidth: 1, borderColor: pressed ? t.mint : t['line-2'], opacity: busy ? 0.5 : 1 })}>
                  <T c="fg-2" size={12.5}>{s}</T>
                </Pressable>
              ))}
            </ScrollView>
          )}

          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginHorizontal: 12, marginBottom: 12 + insets.bottom, padding: 5, paddingLeft: 4, borderWidth: 1, borderColor: t['line-2'], borderRadius: 14, backgroundColor: t.raise }}>
            <TextInput
              ref={inputRef}
              value={input}
              onChangeText={setInput}
              onSubmitEditing={submit}
              submitBehavior="submit"
              returnKeyType="send"
              autoComplete="off"
              autoCorrect
              placeholder="Pergunte ou anote: “almoço 42 no débito”"
              maxLength={2000}
              placeholderTextColor={t['fg-3']}
              style={{ flex: 1, minWidth: 0, color: t.fg, fontFamily: fonts.ui, fontSize: 15, paddingVertical: 7, paddingHorizontal: 10 }}
            />
            <Pressable
              onPress={submit}
              disabled={busy}
              accessibilityLabel="Enviar"
              style={({ pressed }) => ({ width: 36, height: 36, borderRadius: 10, backgroundColor: t.mint, alignItems: 'center', justifyContent: 'center', opacity: busy ? 0.5 : pressed ? 0.75 : 1 })}
            >
              <Icon name="send" size={18} color={t['mint-ink']} />
            </Pressable>
          </View>
        </>
      )}
    </KeyboardAvoidingView>
  );
}
