import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BRL } from '@shared/format';
import { api, refreshAll, useApiMutation } from '@/lib/api';
import type { CategoryOption } from '@/lib/types';
import { Button, Field, Icon, Label, T } from '@/ui/kit';
import { useTheme } from '@/ui/theme';
import { CategoryPicker, type CatValue } from '@/ui/tx/CategoryPicker';
import { DateField, Toggle } from '@/ui/tx/common';
import { txStore } from '@/ui/tx/store';

type Call = { path: string; method: 'POST' | 'PATCH' | 'DELETE'; body?: unknown };

/** Edit a transaction, or create one (`?new=1`). The list hands the transaction over through txStore. */
export default function TransacaoModal() {
  const params = useLocalSearchParams<{ id?: string; new?: string }>();
  const open = txStore.get();
  const ok = !!open && (params.new === '1' ? open.tx === null : !!open.tx && open.tx.id === params.id);

  // Nothing to show (e.g. the page was reloaded on the web): go back to the list.
  useEffect(() => {
    if (ok) return;
    if (router.canGoBack()) router.back();
    else router.replace('/transacoes');
  }, [ok]);

  if (!ok || !open) return null;
  return <Editor key={open.tx?.id ?? 'new'} {...open} />;
}

function Editor({ tx, options: initialOptions, today }: NonNullable<ReturnType<typeof txStore.get>>) {
  const t = useTheme();
  const insets = useSafeAreaInsets();
  const creating = tx === null;
  const [options, setOptions] = useState<CategoryOption[]>(initialOptions);
  const [description, setDescription] = useState(tx?.description ?? '');
  const [amount, setAmount] = useState(tx ? tx.amount.toFixed(2).replace('.', ',') : '');
  const [date, setDate] = useState(tx?.date ?? today);
  const [direction, setDirection] = useState<'in' | 'out'>(tx?.direction ?? 'out');
  const [cat, setCat] = useState<CatValue>(tx ? { group_key: tx.group_key, label: tx.sub_label } : { group_key: 'outros', label: 'Sem categoria' });
  const [rule, setRule] = useState(false);
  const [hidden, setHidden] = useState(tx?.hidden ?? false);
  const [note, setNote] = useState(tx?.note ?? '');
  const [err, setErr] = useState<string | null>(null);
  const [confirmDel, setConfirmDel] = useState(false);
  const m = useApiMutation((c: Call) => api(c.path, { method: c.method, body: c.body }));
  const busy = m.isPending;

  const value = Number(amount.replace(/\./g, '').replace(',', '.'));
  const catChanged = !!tx && (cat.group_key !== tx.group_key || cat.label !== tx.sub_label);
  const url = tx ? `/api/transactions/${encodeURIComponent(tx.id)}` : '';

  const close = () => (router.canGoBack() ? router.back() : router.replace('/transacoes'));

  async function run(c: Call) {
    setErr(null);
    try {
      await m.mutateAsync(c);
      close();
    } catch (e) {
      setErr((e as Error).message || 'Não deu para salvar.');
    }
  }

  function save() {
    setErr(null);
    if (!description.trim()) return setErr('Dê um nome para a transação.');
    if (!Number.isFinite(value) || value <= 0) return setErr('Digite um valor válido, ex.: 42,90');
    if (creating) return run({ path: '/api/transactions', method: 'POST', body: { description, amount: value, date, direction, group_key: direction === 'out' ? cat.group_key : 'entrada', sub_label: direction === 'out' ? cat.label : undefined, note } });
    run({
      path: url,
      method: 'PATCH',
      body: {
        description: description.trim() === tx.original_description ? null : description,
        amount: Math.abs(value - tx.original_amount) < 0.005 ? null : value,
        date: date === tx.original_date ? null : date,
        hidden,
        note,
        ...(catChanged ? { group_key: cat.group_key, sub_label: cat.label, rule } : {}),
      },
    });
  }

  async function createCat(v: CatValue) {
    const j = await api<{ group_key: string; label: string }>('/api/categories', { method: 'POST', body: v });
    const o = { group_key: j.group_key, label: j.label, custom: true };
    setOptions((p) => [o, ...p]);
    txStore.addOption(o);
    refreshAll();
  }

  const signColor = direction === 'in' ? t.pos : t.neg;
  const sign = <T size={15} w="bold" style={{ color: signColor }}>{direction === 'in' ? '+ R$' : '− R$'}</T>;
  const lbl = (s: string) => <Label style={{ marginTop: 14, marginBottom: 6 }}>{s}</Label>;

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: t.panel }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 18, paddingTop: (Platform.OS === 'android' ? insets.top : 0) + 16, paddingBottom: 10, borderBottomWidth: 1, borderBottomColor: t.line }}>
        <T size={18} w="bold">{creating ? 'Nova transação' : 'Detalhes da transação'}</T>
        <Pressable onPress={close} hitSlop={10} accessibilityLabel="Fechar">
          <Icon name="close" color={t['fg-2']} />
        </Pressable>
      </View>

      <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ padding: 18, paddingBottom: 24 + insets.bottom }}>
        <Label style={{ marginBottom: 6 }}>Descrição</Label>
        <Field value={description} onChangeText={setDescription} maxLength={120} autoFocus={creating} />
        {tx && description.trim() !== tx.original_description && <T c="fg-3" size={12} style={{ marginTop: 4 }}>No banco: {tx.original_description}</T>}

        <View style={{ flexDirection: 'row', gap: 12, flexWrap: 'wrap' }}>
          <View style={{ flex: 1, minWidth: 160 }}>
            {lbl('Valor')}
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              {creating ? (
                <Pressable onPress={() => setDirection((d) => (d === 'in' ? 'out' : 'in'))} accessibilityHint="Trocar entre saída e entrada" style={{ borderWidth: 1, borderColor: t['line-2'], borderRadius: 8, paddingHorizontal: 8, paddingVertical: 10, minWidth: 54, alignItems: 'center' }}>
                  {sign}
                </Pressable>
              ) : (
                <View style={{ minWidth: 46 }}>{sign}</View>
              )}
              <Field style={{ flex: 1 }} keyboardType="decimal-pad" value={amount} onChangeText={setAmount} placeholder="0,00" />
            </View>
            {tx && Math.abs(value - tx.original_amount) >= 0.005 && <T c="fg-3" size={12} style={{ marginTop: 4 }}>No banco: {BRL(tx.original_amount)}</T>}
          </View>
          <View style={{ width: 160 }}>
            {lbl('Data')}
            <DateField value={date} onChange={setDate} label="Data" />
          </View>
        </View>

        {tx && (
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 10, marginTop: 16, paddingVertical: 9, borderTopWidth: 1, borderBottomWidth: 1, borderColor: t.line }}>
            <T c="fg-3" size={13}>Conta</T>
            <T size={13} style={{ flexShrink: 1, textAlign: 'right' }}>
              {tx.account.name}{tx.account.type === 'CREDIT' ? ' · crédito' : ''}{tx.installment ? ` · parcela ${tx.installment}` : ''}
            </T>
          </View>
        )}

        {direction === 'out' && (
          <>
            {lbl('Categoria')}
            <CategoryPicker value={cat} options={options} onChange={setCat} onCreate={createCat} />
            {catChanged && <Toggle value={rule} onChange={setRule}>Aplicar também às transações parecidas (passadas e futuras)</Toggle>}
          </>
        )}

        {lbl('Observação')}
        <Field value={note} onChangeText={setNote} maxLength={500} placeholder="Opcional" multiline style={{ minHeight: 64, textAlignVertical: 'top' }} />

        {tx && <Toggle value={hidden} onChange={setHidden}>Ocultar (some da lista e não entra nas contas)</Toggle>}

        {err && <T c="neg" size={13} style={{ marginTop: 12 }} accessibilityRole="alert">{err}</T>}

        {confirmDel ? (
          <View style={{ marginTop: 18, padding: 12, borderRadius: 10, backgroundColor: t.mix(t.neg, 8), gap: 10 }}>
            <T size={13.5}>Apagar esta transação?</T>
            <View style={{ flexDirection: 'row', gap: 8, justifyContent: 'flex-end' }}>
              <Button title="Cancelar" onPress={() => setConfirmDel(false)} />
              <Button title="Apagar" kind="danger" loading={busy} onPress={() => run({ path: url, method: 'DELETE' })} />
            </View>
          </View>
        ) : (
          <View style={{ marginTop: 18, gap: 10 }}>
            {tx && (tx.source !== 'pluggy' || tx.edited) && (
              <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap' }}>
                {tx.source !== 'pluggy' && <Button title="Apagar" onPress={() => setConfirmDel(true)} />}
                {tx.edited && <Button title="Restaurar original" accessibilityHint="Volta descrição, valor e data ao que veio do banco" disabled={busy} onPress={() => run({ path: url, method: 'PATCH', body: { description: null, amount: null, date: null } })} />}
              </View>
            )}
            <View style={{ flexDirection: 'row', gap: 8 }}>
              <Button title="Cancelar" style={{ flex: 1 }} onPress={close} />
              <Button title={busy ? 'Salvando…' : 'Salvar'} kind="primary" style={{ flex: 1 }} disabled={busy} onPress={save} />
            </View>
          </View>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
