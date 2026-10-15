import { useState } from 'react';
import { Alert, Platform, View } from 'react-native';
import { ago, askLiu, syncNow, useConnectBank } from '@/lib/actions';
import { useApi } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import type { SessionData } from '@/lib/types';
import { ItemIdForm } from '@/ui/more/ItemIdForm';
import { Button, Icon, Label, Mark, Panel, Row, Screen, T, type IconName } from '@/ui/kit';
import { useTheme } from '@/ui/theme';

/** The "Mais" tab: screens that don't fit the tab bar, bank connection, sync and your account. */
export default function More() {
  const t = useTheme();
  const { server, signOut } = useAuth();
  const session = useApi<SessionData>('/api/app/session');
  const { state, connect, reset } = useConnectBank();
  const [syncing, setSyncing] = useState(false);
  const [syncMsg, setSyncMsg] = useState<string | null>(null);
  const [showItemId, setShowItemId] = useState(false);
  const s = session.data;
  const configured = !!s?.pluggyConfigured;

  const sync = async () => {
    setSyncing(true);
    setSyncMsg(await syncNow());
    setSyncing(false);
  };

  const confirmSignOut = () => {
    const q = 'Sair do liu liu neste aparelho?';
    if (Platform.OS === 'web') {
      if (window.confirm(q)) signOut();
      return;
    }
    Alert.alert('Sair', q, [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Sair', style: 'destructive', onPress: () => signOut() },
    ]);
  };

  const line = (icon: IconName, title: string, sub?: string | null, color?: string) => (
    <>
      <View style={{ width: 34, height: 34, borderRadius: 9, backgroundColor: t.raise, alignItems: 'center', justifyContent: 'center' }}>
        <Icon name={icon} size={18} color={color ?? t['fg-2']} />
      </View>
      <View style={{ flex: 1, minWidth: 0 }}>
        <T w="medium" style={color ? { color } : undefined}>{title}</T>
        {sub ? <T c="fg-3" size={12.5}>{sub}</T> : null}
      </View>
    </>
  );
  const chev = <Icon name="chev" size={16} color={t['fg-3']} />;
  const busyConnect = state.step === 'opening' || state.step === 'importing';

  return (
    <Screen refreshing={session.isRefetching} onRefresh={() => session.refetch()}>
      <Panel style={{ paddingVertical: 4 }}>
        <Row href="/parcelamentos">{line('inst', 'Parcelamentos')}{chev}</Row>
        <Row href="/investimentos">{line('invest', 'Investimentos')}{chev}</Row>
        <Row onPress={() => askLiu()} last>{line('chat', 'Conversar com o liu liu')}{chev}</Row>
      </Panel>

      <Label style={{ marginTop: 6, marginLeft: 4 }}>Bancos</Label>
      <Panel style={{ paddingVertical: 4 }}>
        {configured ? (
          <>
            <Row onPress={busyConnect ? undefined : connect}>
              {line('bank', 'Conectar banco', busyConnect ? (state.step === 'opening' ? 'Abrindo a conexão segura…' : 'Importando…') : 'Open Finance, acesso só de leitura')}
              {!busyConnect && chev}
            </Row>
            {state.step !== 'idle' && (
              <View style={{ paddingVertical: 12, gap: 6, borderBottomWidth: 1, borderBottomColor: t.line }} accessibilityLiveRegion="polite">
                {state.step === 'opening' && <T c="fg-2">Abrindo a conexão segura…</T>}
                {state.step === 'importing' && (
                  <>
                    <T size={16} w="semi">Importando…</T>
                    <T c="fg-2">Buscando os últimos 12 meses. Pode levar um minuto.</T>
                  </>
                )}
                {state.step === 'done' && (
                  <>
                    <T size={16} w="semi">Pronto</T>
                    <T c="fg-2">{state.text}</T>
                  </>
                )}
                {state.step === 'error' && (
                  <>
                    <T size={16} w="semi">Algo deu errado</T>
                    <T c="neg" size={13}>{state.text}</T>
                  </>
                )}
                <T c="fg-3" size={11.5} style={{ marginTop: 4 }}>Open Finance regulado pelo Banco Central · conexão pela Pluggy</T>
                {!busyConnect && <Button title="Fechar" kind="primary" onPress={reset} style={{ marginTop: 6, alignSelf: 'flex-start' }} />}
              </View>
            )}
            <Row onPress={() => setShowItemId((v) => !v)} last={!showItemId}>
              {line('lock', 'Importar pelo ID do item')}
              <Icon name="chev" size={16} color={t['fg-3']} />
            </Row>
            {showItemId && (
              <View style={{ paddingTop: 4, paddingBottom: 14, borderBottomWidth: 1, borderBottomColor: t.line }}>
                <ItemIdForm />
              </View>
            )}
            <Row onPress={syncing ? undefined : sync} last>
              {line('sync', syncing ? 'atualizando…' : 'Atualizar agora', ago(s?.lastSync ?? null))}
            </Row>
            {syncMsg && (
              <View style={{ marginBottom: 12, backgroundColor: t['raise-2'], borderColor: t['line-2'], borderWidth: 1, borderRadius: 10, padding: 10 }} accessibilityRole="alert">
                <T size={12.5}>{syncMsg}</T>
              </View>
            )}
          </>
        ) : (
          <Row last>{line('bank', 'Conectar banco', s ? 'Pluggy não configurada' : 'Carregando…')}</Row>
        )}
      </Panel>
      {configured && state.step === 'idle' && <T c="fg-3" size={11.5} center>Open Finance regulado pelo Banco Central · conexão pela Pluggy</T>}

      <Label style={{ marginTop: 6, marginLeft: 4 }}>Conta</Label>
      <Panel style={{ paddingVertical: 4 }}>
        <Row>
          <View style={{ width: 34, height: 34, borderRadius: 17, backgroundColor: t['raise-2'], alignItems: 'center', justifyContent: 'center' }}>
            {s?.initials ? <T c="fg-2" size={12} w="semi">{s.initials}</T> : <Mark size={20} />}
          </View>
          <View style={{ flex: 1, minWidth: 0 }}>
            <T w="medium">{s?.name ?? ' '}</T>
            <T c="fg-3" size={12.5} mono numberOfLines={1}>{server.replace(/^https?:\/\//, '')}</T>
          </View>
        </Row>
        <Row onPress={confirmSignOut} last>{line('logout', 'Sair', null, t.neg)}</Row>
      </Panel>
    </Screen>
  );
}
