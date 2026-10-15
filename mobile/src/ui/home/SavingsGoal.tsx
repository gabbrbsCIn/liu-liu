import { useState } from 'react';
import { View } from 'react-native';
import { api, useApiMutation } from '@/lib/api';
import { Button, Field, More, T } from '../kit';

/** "Quero guardar por mês R$ …" (the web's SavingsGoalForm). Key it by `current` so it closes after saving. */
export function SavingsGoal({ current }: { current: number }) {
  const [editing, setEditing] = useState(current === 0);
  const [value, setValue] = useState(current ? String(current) : '');
  const [err, setErr] = useState<string | null>(null);
  const save = useApiMutation((savings_goal: number) => api('/api/settings', { method: 'POST', body: { savings_goal } }));
  if (!editing)
    return (
      <View style={{ marginTop: 14, alignSelf: 'flex-start' }}>
        <More onPress={() => setEditing(true)}>mudar meta de poupança</More>
      </View>
    );
  const submit = () => {
    const v = Number(value.replace(/\./g, '').replace(',', '.'));
    if (!value.trim() || !Number.isFinite(v)) return setErr('Digite um valor em reais, ex.: 3000');
    setErr(null);
    save.mutate(v, { onSuccess: () => setEditing(false), onError: () => setErr('Digite um valor em reais, ex.: 3000') });
  };
  return (
    <View style={{ marginTop: 14, gap: 8 }}>
      <T c="fg-2" size={12.5}>Quero guardar por mês R$</T>
      <View style={{ flexDirection: 'row', gap: 8 }}>
        <Field value={value} onChangeText={setValue} keyboardType="decimal-pad" placeholder="3.000" onSubmitEditing={submit} returnKeyType="done" style={{ flex: 1 }} accessibilityLabel="Quero guardar por mês R$" />
        <Button title="Salvar" kind="primary" onPress={submit} loading={save.isPending} />
      </View>
      {err && <T c="neg" size={12.5}>{err}</T>}
    </View>
  );
}
