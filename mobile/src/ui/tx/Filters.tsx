import { useMemo, useState } from 'react';
import { Pressable, View } from 'react-native';
import { normalize } from '@shared/categorize';
import { addDays, addMonths, monthEnd, monthStart, ymOf } from '@shared/dates';
import type { TxFilter } from '@shared/txFilter';
import type { AccountOption, CategoryOption, TxView } from '@/lib/types';
import { BankTile, Button, Dot, Field, Icon, T } from '@/ui/kit';
import { useTheme } from '@/ui/theme';
import { CAT_GROUPS, Check, DateField, money } from './common';

/** Pill button that opens a filter sheet (.fm-btn), with the count of active choices. */
export function FilterButton({ label, count = 0, onPress }: { label: string; count?: number; onPress: () => void }) {
  const t = useTheme();
  return (
    <Pressable onPress={onPress} style={({ pressed }) => ({ flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 7, paddingLeft: 12, paddingRight: 10, borderRadius: 999, borderWidth: 1, borderColor: count ? t.mint : t['line-2'], opacity: pressed ? 0.7 : 1 })}>
      <T c={count ? 'fg' : 'fg-2'} size={13}>{label}</T>
      {count > 0 && (
        <View style={{ minWidth: 18, height: 18, paddingHorizontal: 5, borderRadius: 9, backgroundColor: t.mint, alignItems: 'center', justifyContent: 'center' }}>
          <T c="mint-ink" size={11} w="bold" style={{ lineHeight: 14 }}>{count}</T>
        </View>
      )}
      <View style={{ transform: [{ rotate: '90deg' }] }}>
        <Icon name="chev" size={13} color={t['fg-3']} />
      </View>
    </Pressable>
  );
}

/** Small section heading inside a sheet (.cp-h). */
const H = ({ children }: { children: React.ReactNode }) => (
  <T c="fg-3" size={11} style={{ letterSpacing: 0.7, textTransform: 'uppercase', paddingTop: 10, paddingBottom: 6, paddingHorizontal: 6 }}>{children}</T>
);

export function PeriodPanel({ f, today, onPick }: { f: TxFilter; today: string; onPick: (from: string, to: string) => void }) {
  const t = useTheme();
  const ym = ymOf(today);
  const [from, setFrom] = useState(f.from);
  const [to, setTo] = useState(f.to);
  const presets: [string, string, string][] = [
    ['Este mês', monthStart(ym), monthEnd(ym)],
    ['Mês passado', monthStart(addMonths(ym, -1)), monthEnd(addMonths(ym, -1))],
    ['Hoje', today, today],
    ['Últimos 7 dias', addDays(today, -6), today],
    ['Últimos 30 dias', addDays(today, -29), today],
    ['Últimos 3 meses', monthStart(addMonths(ym, -2)), monthEnd(ym)],
    ['Este ano', `${today.slice(0, 4)}-01-01`, `${today.slice(0, 4)}-12-31`],
  ];
  return (
    <View>
      {presets.map(([l, a, b]) => {
        const on = a === f.from && b === f.to;
        return (
          <Pressable key={l} onPress={() => onPick(a, b)} style={({ pressed }) => ({ paddingVertical: 11, paddingHorizontal: 8, borderRadius: 8, backgroundColor: pressed ? t.raise : 'transparent' })}>
            <T c={on ? 'mint' : 'fg'} w={on ? 'semi' : 'regular'} size={14.5}>{l}</T>
          </Pressable>
        );
      })}
      <View style={{ borderTopWidth: 1, borderTopColor: t.line, marginTop: 8, paddingTop: 4 }}>
        <H>Personalizado</H>
        <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
          <DateField value={from} onChange={setFrom} max={today} label="De" style={{ flex: 1 }} />
          <T c="fg-3">a</T>
          <DateField value={to} onChange={setTo} label="Até" style={{ flex: 1 }} />
        </View>
        <Button title="Aplicar" kind="primary" style={{ marginTop: 10 }} onPress={() => from && to && onPick(from <= to ? from : to, from <= to ? to : from)} />
      </View>
    </View>
  );
}

export function CategoryPanel({ txs, f, options, onChange }: { txs: TxView[]; f: TxFilter; options: CategoryOption[]; onChange: (cats: string[]) => void }) {
  const t = useTheme();
  const [q, setQ] = useState('');
  const nq = normalize(q);
  // Subcategories with transactions in this period first (with counts), then your own categories.
  const tree = useMemo(() => {
    const counts = new Map<string, Map<string, number>>();
    for (const x of txs) {
      if (x.hidden && !f.hidden) continue;
      const m = counts.get(x.group_key) ?? new Map<string, number>();
      m.set(x.sub_label, (m.get(x.sub_label) ?? 0) + 1);
      counts.set(x.group_key, m);
    }
    for (const o of options) if (o.custom) counts.set(o.group_key, (counts.get(o.group_key) ?? new Map()).set(o.label, counts.get(o.group_key)?.get(o.label) ?? 0));
    return CAT_GROUPS.map((g) => {
      const subs = [...(counts.get(g.key) ?? new Map<string, number>()).entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
      return { ...g, total: subs.reduce((s, [, n]) => s + n, 0), subs };
    }).filter((g) => g.subs.length || f.cats.some((c) => c === g.key || c.startsWith(`${g.key}:`)));
  }, [txs, options, f.hidden, f.cats]);

  const has = (token: string) => f.cats.includes(token);
  const toggle = (token: string) => {
    if (has(token)) return onChange(f.cats.filter((c) => c !== token));
    // Picking a whole group replaces any of its single subcategories.
    onChange([...f.cats.filter((c) => token.includes(':') || !c.startsWith(`${token}:`)), token]);
  };

  return (
    <View>
      <SearchField value={q} onChangeText={setQ} placeholder="Buscar categoria…" />
      {tree.map((g) => {
        const groupHit = !nq || normalize(g.name).includes(nq);
        const subs = g.subs.filter(([s]) => groupHit || normalize(s).includes(nq));
        if (!groupHit && !subs.length) return null;
        const whole = has(g.key);
        return (
          <View key={g.key}>
            <Check checked={whole} onPress={() => toggle(g.key)}>
              <Dot color={t.color(g.color)} />
              <T w="semi" size={14} numberOfLines={1} style={{ flex: 1 }}>{g.name}</T>
              <T c="fg-3" size={12.5} mono>{g.total || ''}</T>
            </Check>
            {subs.map(([s, n]) => (
              <Check key={s} checked={whole || has(`${g.key}:${s}`)} disabled={whole} onPress={() => toggle(`${g.key}:${s}`)} style={{ paddingLeft: 28 }}>
                <T c="fg-2" size={14} numberOfLines={1} style={{ flex: 1 }}>{s}</T>
                <T c="fg-3" size={12.5} mono>{n || ''}</T>
              </Check>
            ))}
          </View>
        );
      })}
      {!tree.length && <T c="fg-3" style={{ padding: 6 }}>Nenhuma categoria neste período.</T>}
      {f.cats.length > 0 && <ClearLink onPress={() => onChange([])}>Limpar categorias</ClearLink>}
    </View>
  );
}

export function AccountPanel({ txs, accounts, selected, onChange }: { txs: TxView[]; accounts: AccountOption[]; selected: string[]; onChange: (a: string[]) => void }) {
  const counts = new Map<string, number>();
  for (const x of txs) counts.set(x.account.id, (counts.get(x.account.id) ?? 0) + 1);
  return (
    <View>
      {accounts.map((a) => (
        <Check key={a.id} checked={selected.includes(a.id)} onPress={() => onChange(selected.includes(a.id) ? selected.filter((x) => x !== a.id) : [...selected, a.id])}>
          <BankTile name={a.name} color={a.color} small />
          <T size={14} numberOfLines={1} style={{ flex: 1 }}>{a.label}</T>
          <T c="fg-3" size={12.5} mono>{counts.get(a.id) ?? ''}</T>
        </Check>
      ))}
      {!accounts.length && <T c="fg-3" style={{ padding: 6 }}>Nenhuma conta conectada.</T>}
    </View>
  );
}

export function MorePanel({ f, set }: { f: TxFilter; set: (p: Partial<TxFilter>) => void }) {
  const fmt = (v: number | null) => (v == null ? '' : String(v).replace('.', ','));
  const [min, setMin] = useState(fmt(f.min));
  const [max, setMax] = useState(fmt(f.max));
  return (
    <View>
      <H>Valor (R$)</H>
      <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
        <Field style={{ flex: 1 }} keyboardType="decimal-pad" placeholder="de" value={min} onChangeText={setMin} onBlur={() => set({ min: money(min) })} accessibilityLabel="Valor mínimo" />
        <T c="fg-3">a</T>
        <Field style={{ flex: 1 }} keyboardType="decimal-pad" placeholder="até" value={max} onChangeText={setMax} onBlur={() => set({ max: money(max) })} accessibilityLabel="Valor máximo" />
      </View>
      <Button title="Aplicar valor" style={{ marginTop: 10 }} onPress={() => set({ min: money(min), max: money(max) })} />
      <View style={{ marginTop: 10 }}>
        <Check checked={f.installments} onPress={() => set({ installments: !f.installments })}><T size={14}>Só compras parceladas</T></Check>
        <Check checked={f.edited} onPress={() => set({ edited: !f.edited })}><T size={14}>Só as que você editou</T></Check>
        <Check checked={f.noted} onPress={() => set({ noted: !f.noted })}><T size={14}>Com observação</T></Check>
      </View>
    </View>
  );
}

/** Rounded search box with the magnifier (.search). */
export function SearchField({ value, onChangeText, placeholder, autoFocus, grow }: { value: string; onChangeText: (v: string) => void; placeholder: string; autoFocus?: boolean; grow?: boolean }) {
  const t = useTheme();
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, borderWidth: 1, borderColor: t['line-2'], borderRadius: 999, paddingLeft: 14, paddingRight: 6, minWidth: 0, ...(grow ? { flex: 1 } : { marginBottom: 6 }) }}>
      <Icon name="search" size={16} color={t['fg-3']} />
      <Field value={value} onChangeText={onChangeText} placeholder={placeholder} autoFocus={autoFocus} autoCorrect={false} returnKeyType="search" style={{ flex: 1, backgroundColor: 'transparent', borderWidth: 0, paddingHorizontal: 0, paddingVertical: 9, minWidth: 0 }} />
      {!!value && (
        <Pressable onPress={() => onChangeText('')} hitSlop={8} accessibilityLabel="Limpar busca" style={{ padding: 4 }}>
          <Icon name="close" size={14} color={t['fg-3']} />
        </Pressable>
      )}
    </View>
  );
}

/** Underlined mint text action (.pill-clear / .linkish). */
export const ClearLink = ({ children, onPress }: { children: React.ReactNode; onPress: () => void }) => (
  <Pressable onPress={onPress} hitSlop={6} style={{ paddingVertical: 6, paddingHorizontal: 6 }}>
    <T c="mint" size={12.5} style={{ textDecorationLine: 'underline' }}>{children}</T>
  </Pressable>
);
