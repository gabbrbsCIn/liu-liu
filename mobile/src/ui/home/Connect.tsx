import { useState } from 'react';
import { ActivityIndicator, Modal, Pressable, View } from 'react-native';
import { api, useApiMutation } from '@/lib/api';
import type { useConnectBank } from '@/lib/actions';
import { Button, Field, Mark, Panel, T } from '../kit';
import { fonts, useTheme } from '../theme';

type Connect = ReturnType<typeof useConnectBank>;

/** Progress of a bank connection, as the web's ConnectBank modal. Dismissable once it's done or failed. */
export function ConnectModal({ state, reset }: Pick<Connect, 'state' | 'reset'>) {
  const t = useTheme();
  const s = state;
  const busy = s.step === 'opening' || s.step === 'importing';
  return (
    <Modal transparent visible={s.step !== 'idle'} animationType="fade" onRequestClose={() => !busy && reset()}>
      <Pressable onPress={() => !busy && reset()} style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.55)', justifyContent: 'center', padding: 24 }}>
        <Pressable onPress={() => {}} accessibilityRole="alert">
          <Panel style={{ gap: 10, backgroundColor: t.raise }}>
            {s.step === 'opening' && (
              <View style={{ flexDirection: 'row', gap: 10, alignItems: 'center' }}>
                <ActivityIndicator color={t.mint} />
                <T c="fg-2">Abrindo a conexão segura…</T>
              </View>
            )}
            {s.step === 'importing' && (
              <>
                <T size={20} w="bold">Importando…</T>
                <T c="fg-2">Buscando os últimos 12 meses. Pode levar um minuto.</T>
                <ActivityIndicator color={t.mint} style={{ alignSelf: 'flex-start' }} />
              </>
            )}
            {s.step === 'done' && (
              <>
                <T size={20} w="bold">Pronto</T>
                <T c="fg-2">{s.text}</T>
              </>
            )}
            {s.step === 'error' && (
              <>
                <T size={20} w="bold">Algo deu errado</T>
                <T c="neg">{s.text}</T>
              </>
            )}
            <T c="fg-3" size={11.5}>Open Finance regulado pelo Banco Central · conexão pela Pluggy</T>
            {!busy && <Button title="Fechar" kind="primary" onPress={reset} style={{ alignSelf: 'flex-end' }} />}
          </Panel>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

/** Register an item that already exists in the Pluggy dashboard by pasting its ID (the web's ItemIdForm). */
export function ItemIdForm() {
  const [itemId, setItemId] = useState('');
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const imp = useApiMutation((id: string) => api<{ transactions: number; accounts: number }>('/api/pluggy/items', { method: 'POST', body: { itemId: id } }));
  const id = itemId.trim();
  const valid = /^[\w-]{8,64}$/.test(id);
  const submit = () => {
    if (!valid) return;
    setMsg(null);
    imp.mutate(id, {
      onSuccess: (r) => setMsg({ ok: true, text: `Importei ${r.transactions} transações de ${r.accounts} contas.` }),
      onError: (e) => setMsg({ ok: false, text: e.message || 'Não consegui importar esse item.' }),
    });
  };
  return (
    <View style={{ gap: 8, alignSelf: 'stretch', marginTop: 8 }}>
      <T c="fg-2" size={12.5} center>Já conectou pelo painel da Pluggy? Cole o ID do item (aparece acima do nome “MeuPluggy”):</T>
      <Field value={itemId} onChangeText={setItemId} placeholder="0880bcd8-a09e-4cc4-…" autoCapitalize="none" autoCorrect={false} onSubmitEditing={submit} style={{ fontFamily: fonts.mono, fontSize: 12.5 }} accessibilityLabel="ID do item da Pluggy" />
      <Button title={imp.isPending ? 'Importando… (pode levar 1 min)' : 'Importar'} onPress={submit} disabled={!valid || imp.isPending} />
      {msg && <T c={msg.ok ? 'pos' : 'neg'} center>{msg.text}</T>}
    </View>
  );
}

/** First run, before any bank is connected. */
export function Welcome({ configured, connect }: { configured: boolean | undefined; connect: Connect }) {
  return (
    <Panel style={{ marginTop: 12, paddingVertical: 32, paddingHorizontal: 22, alignItems: 'center', gap: 12 }}>
      <Mark size={44} />
      <T size={22} w="bold" center style={{ letterSpacing: -0.4 }}>Vamos conectar seus bancos</T>
      <T c="fg-2" center>
        O liu liu lê suas contas e cartões pelo Open Finance, com acesso só de leitura. Escolha <T c="fg" w="bold">MeuPluggy</T> na janela que abrir para trazer os bancos que você já conectou lá.
      </T>
      {configured === false ? (
        <T c="neg" center>Falta configurar PLUGGY_CLIENT_ID e PLUGGY_CLIENT_SECRET nas variáveis de ambiente.</T>
      ) : (
        <>
          <Button title="Conectar banco" kind="primary" onPress={connect.connect} disabled={configured === undefined} style={{ alignSelf: 'stretch' }} />
          <ItemIdForm />
        </>
      )}
      <ConnectModal state={connect.state} reset={connect.reset} />
    </Panel>
  );
}
