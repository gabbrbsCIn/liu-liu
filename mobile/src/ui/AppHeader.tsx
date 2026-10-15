import { useState } from 'react';
import { Pressable, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ago, syncNow } from '@/lib/actions';
import { useApi } from '@/lib/api';
import type { SessionData } from '@/lib/types';
import { Icon, T, Wordmark } from './kit';
import { useTheme } from './theme';

/** Top bar of the tabs: wordmark, "atualizado há…" (tap to sync) and your initials. */
export function AppHeader({ title }: { title?: string }) {
  const t = useTheme();
  const insets = useSafeAreaInsets();
  const { data } = useApi<SessionData>('/api/app/session');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const sync = async () => {
    setBusy(true);
    const m = await syncNow();
    setBusy(false);
    setMsg(m);
    setTimeout(() => setMsg(null), 9000);
  };

  return (
    <View style={{ backgroundColor: t.bg, paddingTop: insets.top + 6, paddingHorizontal: 16, paddingBottom: 10 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
        {title ? <T size={22} w="bold" style={{ letterSpacing: -0.4 }}>{title}</T> : <Wordmark size={24} />}
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          {data?.pluggyConfigured ? (
            <Pressable onPress={sync} disabled={busy} hitSlop={8} style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }} accessibilityLabel="Buscar transações novas nos bancos">
              <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: t.pos }} />
              <T c="fg-3" size={12}>{busy ? 'atualizando…' : ago(data.lastSync)}</T>
              <Icon name="sync" size={13} color={t['fg-3']} />
            </Pressable>
          ) : null}
          <View style={{ width: 30, height: 30, borderRadius: 15, backgroundColor: t['raise-2'], alignItems: 'center', justifyContent: 'center' }}>
            <T c="fg-2" size={11} w="semi">{data?.initials ?? ''}</T>
          </View>
        </View>
      </View>
      {msg && (
        <View style={{ marginTop: 10, backgroundColor: t['raise-2'], borderColor: t['line-2'], borderWidth: 1, borderRadius: 10, padding: 10 }}>
          <T size={12.5}>{msg}</T>
        </View>
      )}
    </View>
  );
}
