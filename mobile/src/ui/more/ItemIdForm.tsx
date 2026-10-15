import { useState } from 'react';
import { View } from 'react-native';
import { api, refreshAll } from '@/lib/api';
import { Button, Field, T } from '@/ui/kit';
import { fonts } from '@/ui/theme';

const ITEM_ID = /^[\w-]{8,64}$/;

/** Register an item that already exists in the Pluggy dashboard by pasting its ID (the web's ItemIdForm). */
export function ItemIdForm() {
  const [itemId, setItemId] = useState('');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  const submit = async () => {
    const id = itemId.trim();
    if (!id) return;
    // The web's pattern="[\w-]{8,64}"; the server answers the same check with "itemId inválido."
    if (!ITEM_ID.test(id)) return setMsg({ ok: false, text: 'itemId inválido.' });
    setBusy(true);
    setMsg(null);
    try {
      const r = await api<{ transactions: number; accounts: number }>('/api/pluggy/items', { method: 'POST', body: { itemId: id } });
      setMsg({ ok: true, text: `Importei ${r.transactions} transações de ${r.accounts} contas.` });
      refreshAll();
    } catch (e) {
      setMsg({ ok: false, text: (e as Error).message || 'Não consegui importar esse item.' });
    } finally {
      setBusy(false);
    }
  };

  return (
    <View style={{ gap: 10 }}>
      <T c="fg-3" size={12.5}>Já conectou pelo painel da Pluggy? Cole o ID do item (aparece acima do nome “MeuPluggy”):</T>
      <Field
        value={itemId}
        onChangeText={setItemId}
        onSubmitEditing={submit}
        placeholder="0880bcd8-a09e-4cc4-…"
        autoCapitalize="none"
        autoCorrect={false}
        maxLength={64}
        style={{ fontFamily: fonts.mono, fontSize: 12.5 }}
        accessibilityLabel="ID do item"
      />
      <Button title={busy ? 'Importando… (pode levar 1 min)' : 'Importar'} onPress={submit} disabled={busy || !itemId.trim()} />
      {msg && <T c={msg.ok ? 'pos' : 'neg'} size={13}>{msg.text}</T>}
    </View>
  );
}
