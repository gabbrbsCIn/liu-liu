import { useMemo, useState } from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import { GROUPS, group } from '@shared/categories';
import { normalize } from '@shared/categorize';
import type { CategoryOption } from '@/lib/types';
import { Button, Dot, Icon, T } from '@/ui/kit';
import { useTheme } from '@/ui/theme';
import { Sheet } from './common';
import { SearchField } from './Filters';

export type CatValue = { group_key: string; label: string };

const TRANSFER: CatValue = { group_key: 'transfer', label: 'Entre suas contas' };

/** Category button that opens a searchable list; typing a name that does not exist offers to create it in a group. */
export function CategoryPicker({ value, options, onChange, onCreate }: { value: CatValue; options: CategoryOption[]; onChange: (v: CatValue) => void; onCreate: (v: CatValue) => Promise<void> }) {
  const t = useTheme();
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState('');
  const [newGroup, setNewGroup] = useState(value.group_key !== 'transfer' && value.group_key !== 'entrada' ? value.group_key : 'outros');
  const [creating, setCreating] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const nq = normalize(q);
  const filtered = useMemo(() => options.filter((o) => !nq || normalize(`${o.label} ${group(o.group_key).name}`).includes(nq)), [options, nq]);
  const exact = options.some((o) => normalize(o.label) === nq);
  const mine = filtered.filter((o) => o.custom);

  const close = () => {
    setOpen(false);
    setQ('');
    setErr(null);
  };
  const pick = (v: CatValue) => {
    onChange(v);
    close();
  };
  const create = async () => {
    const v = { group_key: newGroup, label: q.trim() };
    setCreating(true);
    setErr(null);
    try {
      await onCreate(v);
      pick(v);
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setCreating(false);
    }
  };

  const color = value.group_key === 'transfer' ? t['line-2'] : value.group_key === 'entrada' ? t.pos : t.color(group(value.group_key).color);
  const opt = (o: CatValue, key: string, extra?: string, text?: string) => {
    const on = o.group_key === value.group_key && o.label === value.label;
    return (
      <Pressable key={key} onPress={() => pick(o)} style={({ pressed }) => ({ flexDirection: 'row', alignItems: 'baseline', gap: 8, paddingVertical: 10, paddingLeft: 26, paddingRight: 8, borderRadius: 8, backgroundColor: pressed ? t.raise : 'transparent' })}>
        <T c={on ? 'mint' : 'fg'} w={on ? 'semi' : 'regular'} size={14.5} style={{ flexShrink: 1 }}>{text ?? o.label}</T>
        {extra ? <T c="fg-3" size={11.5}>{extra}</T> : null}
      </Pressable>
    );
  };
  const head = (label: string, dot?: string) => (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 7, paddingTop: 12, paddingBottom: 4, paddingHorizontal: 6 }}>
      {dot && <Dot color={dot} />}
      <T c="fg-3" size={11} style={{ letterSpacing: 0.7, textTransform: 'uppercase' }}>{label}</T>
    </View>
  );

  return (
    <>
      <Pressable onPress={() => setOpen(true)} style={({ pressed }) => ({ flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 12, paddingHorizontal: 12, borderWidth: 1, borderColor: t['line-2'], borderRadius: 10, backgroundColor: t.raise, opacity: pressed ? 0.75 : 1 })}>
        <Dot color={color} />
        <T w="medium" numberOfLines={1} style={{ flex: 1 }}>{value.label}</T>
        <T c="fg-3" size={12}>{value.group_key === 'transfer' ? 'fora dos gastos' : value.group_key === 'entrada' ? 'entrada' : group(value.group_key).name}</T>
        <View style={{ transform: [{ rotate: '90deg' }] }}>
          <Icon name="chev" size={14} color={t['fg-3']} />
        </View>
      </Pressable>

      <Sheet visible={open} title="Categoria" onClose={close} scroll={false}>
        <SearchField value={q} onChangeText={setQ} placeholder="Buscar ou digitar nova categoria…" />
        <ScrollView keyboardShouldPersistTaps="handled" style={{ flexShrink: 1 }} contentContainerStyle={{ paddingBottom: 12 }}>
          {q.trim().length >= 2 && !exact && (
            <View style={{ gap: 8, paddingVertical: 10, paddingHorizontal: 6, borderBottomWidth: 1, borderBottomColor: t.line }}>
              <T size={13.5}>Criar <T size={13.5} w="bold">“{q.trim()}”</T> em</T>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} keyboardShouldPersistTaps="handled" contentContainerStyle={{ gap: 6 }}>
                {GROUPS.map((g) => {
                  const on = newGroup === g.key;
                  return (
                    <Pressable key={g.key} onPress={() => setNewGroup(g.key)} accessibilityState={{ selected: on }} style={{ flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 6, paddingHorizontal: 10, borderRadius: 999, borderWidth: 1, borderColor: on ? t.mint : t['line-2'], backgroundColor: on ? t['mint-dim'] : 'transparent' }}>
                      <Dot color={t.color(g.color)} />
                      <T c={on ? 'fg' : 'fg-2'} size={12.5}>{g.name}</T>
                    </Pressable>
                  );
                })}
              </ScrollView>
              <Button title="Criar" kind="primary" loading={creating} onPress={create} style={{ alignSelf: 'flex-start', paddingVertical: 8 }} />
              {err && <T c="neg" size={13}>{err}</T>}
            </View>
          )}
          {mine.length > 0 && (
            <>
              {head('✦ Suas categorias')}
              {mine.map((o) => opt(o, `m${o.group_key}${o.label}`, group(o.group_key).name))}
            </>
          )}
          {GROUPS.map((g) => {
            const list = filtered.filter((o) => o.group_key === g.key && !o.custom);
            if (!list.length) return null;
            return (
              <View key={g.key}>
                {head(g.name, t.color(g.color))}
                {list.map((o) => opt(o, o.label))}
              </View>
            );
          })}
          {(!nq || normalize('fora dos gastos entre suas contas transferencia').includes(nq)) && (
            <>
              {head('Fora dos gastos')}
              {opt(TRANSFER, 'transfer', undefined, 'Entre suas contas (não conta como gasto)')}
            </>
          )}
          {!filtered.length && q.trim().length < 2 && <T c="fg-3" style={{ padding: 8 }}>Nada encontrado.</T>}
        </ScrollView>
      </Sheet>
    </>
  );
}
