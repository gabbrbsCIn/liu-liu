import { router, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, RefreshControl, ScrollView, SectionList, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { normalize } from '@shared/categorize';
import { monthLabel, ymOf } from '@shared/dates';
import { BRL } from '@shared/format';
import { emptyFilter, filterQuery, isWholeMonth, matches, parseFilter, shiftPeriod, type TxFilter } from '@shared/txFilter';
import { queryClient, useApi } from '@/lib/api';
import type { TransactionsData, TxView } from '@/lib/types';
import { Button, Dot, Icon, Label, Panel, Status, T } from '@/ui/kit';
import { useTheme } from '@/ui/theme';
import { dayTitle, dm, groupMeta, Sheet, Toggle } from '@/ui/tx/common';
import { AccountPanel, CategoryPanel, ClearLink, FilterButton, MorePanel, PeriodPanel, SearchField } from '@/ui/tx/Filters';
import { txStore } from '@/ui/tx/store';
import { TxRow } from '@/ui/tx/TxRow';

type Params = Record<string, string | string[] | undefined>;

const KINDS: [TxFilter['kind'], string][] = [['all', 'Todas'], ['out', 'Saídas'], ['in', 'Entradas'], ['moved', 'Entre contas']];
// Every URL key the filter uses (see txFilter.ts); absent ones are cleared from the route params.
const KEYS = ['m', 'de', 'ate', 'cat', 'conta', 'tipo', 'q', 'min', 'max', 'parc', 'editadas', 'obs', 'ocultas'];
const ENDPOINT = '/api/app/transactions?';

function periodLabel(from: string, to: string, today: string) {
  if (isWholeMonth(from, to)) return monthLabel(ymOf(from));
  if (from === to) return `${dayTitle(from, today)}${from.slice(0, 4) !== today.slice(0, 4) ? ` ${from.slice(0, 4)}` : ''}`;
  const y = (d: string) => (from.slice(0, 4) !== to.slice(0, 4) || d.slice(0, 4) !== today.slice(0, 4) ? ` ${d.slice(0, 4)}` : '');
  return `${dm(from)}${from.slice(0, 4) !== to.slice(0, 4) ? y(from) : ''} – ${dm(to)}${y(to)}`;
}

/** Only the period keys: before the first response we don't know `today`, so the server parses them. */
function periodQuery(p: Params) {
  const s = new URLSearchParams();
  for (const k of ['m', 'de', 'ate']) for (const v of Array.isArray(p[k]) ? p[k] : p[k] ? [p[k]] : []) s.append(k, v);
  return s.toString();
}

function routeParams(f: TxFilter) {
  const out: Record<string, string | string[] | undefined> = Object.fromEntries(KEYS.map((k) => [k, undefined]));
  new URLSearchParams(filterQuery(f)).forEach((v, k) => {
    out[k] = k === 'cat' || k === 'conta' ? [...((out[k] as string[] | undefined) ?? []), v] : v;
  });
  return out;
}

type SheetKind = 'period' | 'cat' | 'acc' | 'more' | null;

export default function Transacoes() {
  const t = useTheme();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams() as Params;
  const [f, setF] = useState<TxFilter | null>(null);
  const [sheet, setSheet] = useState<SheetKind>(null);
  const set = useCallback((patch: Partial<TxFilter>) => setF((p) => (p ? { ...p, ...patch } : p)), []);

  // The period decides what the server loads; every other filter is applied here, as on the web.
  const path = ENDPOINT + (f ? filterQuery({ from: f.from, to: f.to }) : periodQuery(params));
  const q = useApi<TransactionsData>(path);
  const lastRef = useRef<TransactionsData | null>(null);
  if (q.data) lastRef.current = q.data;
  const last = q.data ?? lastRef.current;
  const today = last?.today ?? null;

  // The first response is also the answer for its canonical period key: no second request.
  useEffect(() => {
    const d = q.data;
    if (!d) return;
    const key = ENDPOINT + filterQuery({ from: d.filter.from, to: d.filter.to });
    if (key !== path && !queryClient.getQueryData([key])) queryClient.setQueryData([key], d);
  }, [q.data, path]);

  // Route params → filter. A new href from outside (another screen, the back button) replaces the filter;
  // the echo of our own setParams is ignored.
  const fromParams = today ? filterQuery(parseFilter(params, today)) : null;
  const latestParams = useRef(fromParams);
  latestParams.current = fromParams;
  const echoes = useRef<string[]>([]);
  useEffect(() => {
    if (!today || fromParams == null) return;
    const i = echoes.current.indexOf(fromParams);
    if (i >= 0) {
      echoes.current.splice(0, i + 1);
      return;
    }
    setF((cur) => (cur && filterQuery(cur) === fromParams ? cur : parseFilter(params, today)));
  }, [fromParams, today]); // eslint-disable-line react-hooks/exhaustive-deps

  // Filter → route params, so the state survives and the tab can be reopened as it was.
  useEffect(() => {
    if (!f) return;
    const qs = filterQuery(f);
    if (qs === latestParams.current) return;
    echoes.current = [...echoes.current.slice(-8), qs];
    router.setParams(routeParams(f));
  }, [f]);

  const txs = useMemo(() => q.data?.txs ?? [], [q.data]);
  const accounts = last?.accounts ?? [];
  const options = last?.options ?? [];

  const searchText = useMemo(() => new Map(txs.map((x) => [x.id, normalize(`${x.description} ${x.original_description} ${x.sub_label} ${groupMeta(x.group_key).name} ${x.note ?? ''} ${x.amount.toFixed(2).replace('.', ',')}`)])), [txs]);
  const shown = useMemo(() => {
    if (!f) return [];
    const nq = normalize(f.q);
    return txs.filter((x) => matches(x, f, () => !nq || (searchText.get(x.id) ?? '').includes(nq)));
  }, [txs, f, searchText]);

  const hiddenCount = txs.filter((x) => x.hidden).length;
  const sums = useMemo(() => {
    const counted = shown.filter((x) => !x.excluded);
    const out = counted.filter((x) => x.direction === 'out').reduce((s, x) => s + x.amount, 0);
    const inc = counted.filter((x) => x.direction === 'in').reduce((s, x) => s + x.amount, 0);
    return { count: shown.length, out, inc, net: inc - out };
  }, [shown]);

  const sections = useMemo(() => {
    const m = new Map<string, TxView[]>();
    for (const x of shown) m.set(x.date, [...(m.get(x.date) ?? []), x]);
    return [...m.entries()].map(([day, data]) => ({ day, data, out: data.filter((x) => x.direction === 'out' && !x.excluded).reduce((s, x) => s + x.amount, 0) }));
  }, [shown]);

  const openTx = useCallback(
    (tx: TxView) => {
      if (!today) return;
      txStore.open({ tx, options, today });
      router.push({ pathname: '/transacao', params: { id: tx.id } });
    },
    [options, today],
  );

  if (!f || !today) {
    if (q.error && !last) return <Status error={q.error} onRetry={() => q.refetch()} />;
    return <Status loading />;
  }

  const goPeriod = (from: string, to: string) => set({ from, to });
  const prev = shiftPeriod(f.from, f.to, -1);
  const next = shiftPeriod(f.from, f.to, 1);

  const pills: { key: string; label: React.ReactNode; clear: () => void }[] = [
    ...f.cats.map((c) => {
      const [g, sub] = c.includes(':') ? [c.slice(0, c.indexOf(':')), c.slice(c.indexOf(':') + 1)] : [c, null];
      return {
        key: `c${c}`,
        label: (
          <>
            <Dot color={t.color(groupMeta(g).color)} />
            <T size={12.5}>{sub ? `${groupMeta(g).name} › ${sub}` : groupMeta(g).name}</T>
          </>
        ),
        clear: () => set({ cats: f.cats.filter((x) => x !== c) }),
      };
    }),
    ...f.accounts.map((a) => ({ key: `a${a}`, label: accounts.find((x) => x.id === a)?.label ?? 'Conta', clear: () => set({ accounts: f.accounts.filter((x) => x !== a) }) })),
    ...(f.min != null || f.max != null ? [{ key: 'v', label: f.min != null && f.max != null ? `${BRL(f.min)} a ${BRL(f.max)}` : f.min != null ? `a partir de ${BRL(f.min)}` : `até ${BRL(f.max!)}`, clear: () => set({ min: null, max: null }) }] : []),
    ...(f.installments ? [{ key: 'p', label: 'Só parceladas', clear: () => set({ installments: false }) }] : []),
    ...(f.edited ? [{ key: 'e', label: 'Só editadas', clear: () => set({ edited: false }) }] : []),
    ...(f.noted ? [{ key: 'o', label: 'Com observação', clear: () => set({ noted: false }) }] : []),
  ];
  const anyFilter = pills.length > 0 || f.kind !== 'all' || !!f.q.trim();
  const clearAll = () => setF({ ...emptyFilter(today), from: f.from, to: f.to, hidden: f.hidden });
  const moreCount = [f.min != null || f.max != null, f.installments, f.edited, f.noted].filter(Boolean).length;

  const mbtn = (dir: 'back' | 'chev', to: { from: string; to: string }, disabled: boolean, label: string) => (
    <Pressable onPress={() => goPeriod(to.from, to.to)} disabled={disabled} hitSlop={8} accessibilityLabel={label} style={{ width: 34, height: 34, borderRadius: 9, alignItems: 'center', justifyContent: 'center', backgroundColor: t.raise, opacity: disabled ? 0.3 : 1 }}>
      <Icon name={dir} size={16} color={t['fg-2']} />
    </Pressable>
  );

  const sum = (label: string, value: string, c: 'fg' | 'pos' | 'neg') => (
    <Panel style={{ flexBasis: '46%', flexGrow: 1, paddingVertical: 12, paddingHorizontal: 14, gap: 4 }}>
      <Label>{label}</Label>
      <T c={c} narrow size={19} style={{ lineHeight: 23 }}>{value}</T>
    </Panel>
  );

  const header = (
    <View style={{ gap: 12, paddingBottom: 4 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
        {mbtn('back', prev, false, 'Período anterior')}
        <T w="semi" center numberOfLines={1} style={{ flex: 1 }}>{periodLabel(f.from, f.to, today)}</T>
        {mbtn('chev', next, next.from > today, 'Próximo período')}
        <FilterButton label="Período" onPress={() => setSheet('period')} />
      </View>
      <T c="fg-3" size={12.5}>toque numa transação para ver e editar</T>

      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
        {sum('Transações', String(sums.count), 'fg')}
        {sum('Saídas', BRL(sums.out), 'neg')}
        {sum('Entradas', BRL(sums.inc), 'pos')}
        {sum('Saldo', `${sums.net >= 0 ? '' : '− '}${BRL(Math.abs(sums.net))}`, sums.net >= 0 ? 'pos' : 'neg')}
      </View>

      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
        <SearchField grow value={f.q} onChangeText={(v) => set({ q: v })} placeholder="Buscar loja, categoria, observação ou valor" />
        <Pressable
          onPress={() => {
            txStore.open({ tx: null, options, today });
            router.push({ pathname: '/transacao', params: { new: '1' } });
          }}
          accessibilityLabel="Nova transação"
          style={({ pressed }) => ({ width: 42, height: 42, borderRadius: 21, backgroundColor: t.mint, alignItems: 'center', justifyContent: 'center', opacity: pressed ? 0.75 : 1 })}
        >
          <Icon name="plus" size={20} color={t['mint-ink']} strokeWidth={2.2} />
        </Pressable>
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginHorizontal: -14 }} contentContainerStyle={{ paddingHorizontal: 14, gap: 6, alignItems: 'center' }}>
        {KINDS.map(([k, l]) => {
          const on = f.kind === k;
          return (
            <Pressable key={k} onPress={() => set({ kind: k })} accessibilityState={{ selected: on }} style={{ paddingVertical: 7, paddingHorizontal: 12, borderRadius: 999, borderWidth: 1, borderColor: on ? t.fg : t['line-2'], backgroundColor: on ? t.fg : 'transparent' }}>
              <T c={on ? 'bg' : 'fg-2'} size={13}>{l}</T>
            </Pressable>
          );
        })}
        <View style={{ width: 1, height: 22, backgroundColor: t['line-2'], marginHorizontal: 4 }} />
        <FilterButton label="Categoria" count={f.cats.length} onPress={() => setSheet('cat')} />
        <FilterButton label="Conta" count={f.accounts.length} onPress={() => setSheet('acc')} />
        <FilterButton label="Mais filtros" count={moreCount} onPress={() => setSheet('more')} />
      </ScrollView>

      <Toggle value={f.hidden} onChange={(v) => set({ hidden: v })}>Mostrar ocultas{hiddenCount ? ` (${hiddenCount})` : ''}</Toggle>

      {anyFilter && (
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, alignItems: 'center' }}>
          {pills.map((p) => (
            <Pressable key={p.key} onPress={p.clear} accessibilityHint="Tirar este filtro" style={({ pressed }) => ({ flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 5, paddingLeft: 10, paddingRight: 8, borderRadius: 999, backgroundColor: t.raise, borderWidth: 1, borderColor: pressed ? t['fg-3'] : t['line-2'] })}>
              {typeof p.label === 'string' ? <T size={12.5}>{p.label}</T> : p.label}
              <Icon name="close" size={12} color={t['fg-3']} />
            </Pressable>
          ))}
          <ClearLink onPress={clearAll}>Limpar filtros</ClearLink>
        </View>
      )}
    </View>
  );

  const empty = !q.data ? (
    q.error ? (
      <Panel style={{ alignItems: 'center', gap: 10 }}>
        <T c="neg" center>{q.error.message}</T>
        <Button title="Tentar de novo" onPress={() => q.refetch()} />
      </Panel>
    ) : (
      <ActivityIndicator color={t.mint} style={{ marginTop: 30 }} />
    )
  ) : (
    <Panel style={{ alignItems: 'center', gap: 4 }}>
      <T c="fg-3" center>{txs.length === 0 ? 'Nenhuma transação neste período.' : 'Nada com esses filtros.'}</T>
      {anyFilter && <ClearLink onPress={clearAll}>Limpar filtros</ClearLink>}
    </Panel>
  );

  return (
    <View style={{ flex: 1, backgroundColor: t.bg }}>
      <SectionList
        sections={q.data ? sections : []}
        keyExtractor={(x) => x.id}
        stickySectionHeadersEnabled={false}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        contentContainerStyle={{ padding: 14, paddingBottom: 110 + insets.bottom }}
        ListHeaderComponent={header}
        ListEmptyComponent={empty}
        renderSectionHeader={({ section }) => (
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingTop: 16, paddingBottom: 6, paddingHorizontal: 2 }}>
            <T c="fg-3" size={12}>{dayTitle(section.day, today)}</T>
            <T c="fg-3" size={12} mono>{section.out ? `saiu ${BRL(section.out)}` : ''}</T>
          </View>
        )}
        renderItem={({ item, index, section }) => <TxRow tx={item} first={index === 0} last={index === section.data.length - 1} onPress={openTx} />}
        refreshControl={<RefreshControl refreshing={q.isRefetching && !!q.data} onRefresh={() => q.refetch()} tintColor={t.mint} colors={[t.mint]} />}
        initialNumToRender={20}
      />

      <Sheet visible={sheet === 'period'} title="Período" onClose={() => setSheet(null)}>
        <PeriodPanel f={f} today={today} onPick={(a, b) => { setSheet(null); goPeriod(a, b); }} />
      </Sheet>
      <Sheet visible={sheet === 'cat'} title="Categoria" onClose={() => setSheet(null)}>
        <CategoryPanel txs={txs} f={f} options={options} onChange={(cats) => set({ cats })} />
      </Sheet>
      <Sheet visible={sheet === 'acc'} title="Conta" onClose={() => setSheet(null)}>
        <AccountPanel txs={txs} accounts={accounts} selected={f.accounts} onChange={(a) => set({ accounts: a })} />
      </Sheet>
      <Sheet visible={sheet === 'more'} title="Mais filtros" onClose={() => setSheet(null)}>
        <MorePanel f={f} set={set} />
      </Sheet>
    </View>
  );
}
