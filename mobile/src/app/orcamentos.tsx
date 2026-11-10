import { Link } from 'expo-router';
import { useState } from 'react';
import { Pressable, View } from 'react-native';
import { group } from '@shared/categories';
import { BRL } from '@shared/format';
import { txHref } from '@shared/txFilter';
import { api, useApi, useApiMutation } from '@/lib/api';
import type { BudgetLine, BudgetsData, GroupBudget } from '@/lib/types';
import { Big, Button, Change, Field, Label, MonthSwitch, Panel, PanelHead, Screen, Status, T } from '@/ui/kit';
import { useTheme } from '@/ui/theme';

const STATUS = { ok: ['no ritmo', 'good'], pace: ['acima do ritmo', 'warn'], over: ['estourou', 'bad'] } as const;

const parseMoney = (s: string) => {
  const v = s.trim();
  if (!v) return null;
  const n = Number(v.replace(/[R$\s]/g, '').replace(/\.(?=\d{3}(\D|$))/g, '').replace(',', '.'));
  return Number.isFinite(n) && n >= 0 ? n : NaN;
};

/** Spent against the budget: the category color, the part over it in red, a tick where your usual pace is today. */
function Meter({ l, color }: { l: BudgetLine; color: string }) {
  const t = useTheme();
  if (l.budget == null) return null;
  const scale = Math.max(l.budget, l.spent);
  const within = Math.min(l.spent, l.budget), over = Math.max(0, l.spent - l.budget);
  return (
    <View style={{ height: 8, borderRadius: 4, backgroundColor: t['raise-2'], flexDirection: 'row', gap: 2, marginTop: 8 }} accessibilityLabel={`${BRL(l.spent)} de ${BRL(l.budget)}`}>
      <View style={{ width: `${(within / scale) * 100}%`, borderRadius: 4, backgroundColor: color, minWidth: 2 }} />
      {over > 0 && <View style={{ width: `${(over / scale) * 100}%`, borderRadius: 4, backgroundColor: t.neg }} />}
      {l.expected != null && l.status !== 'over' && (
        <View style={{ position: 'absolute', left: `${(l.expected / scale) * 100}%`, top: -3, bottom: -3, width: 2, marginLeft: -1, borderRadius: 1, backgroundColor: t.fg }} />
      )}
    </View>
  );
}

function Detail({ l, current }: { l: BudgetLine; current: boolean }) {
  if (l.budget == null) return <T c="fg-3" size={12.5}>{l.suggestion > 0 ? `média dos últimos 3 meses: ${BRL(l.suggestion)}` : 'sem gastos nos últimos 3 meses'}</T>;
  if (l.remaining! < 0) return <T c="fg-2" size={12.5}>passou <T c="neg" w="semi" size={12.5}>{BRL(-l.remaining!)}</T></T>;
  return (
    <T c="fg-2" size={12.5}>
      {current ? 'sobram' : 'sobrou'} <T w="semi" size={12.5}>{BRL(l.remaining!)}</T>
      {current && l.perDay != null ? <T c="fg-3" size={12.5}> · {BRL(l.perDay)}/dia</T> : null}
    </T>
  );
}

function Badge({ l, current }: { l: BudgetLine; current: boolean }) {
  if (l.status === 'none') return null;
  const [label, kind] = current ? STATUS[l.status] : l.status === 'over' ? STATUS.over : (['dentro', 'good'] as const);
  return <Change kind={kind}>{label}</Change>;
}

/** The budget amount; tap it to open the form below the row. */
function AmountButton({ l, onPress }: { l: BudgetLine; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} hitSlop={8} accessibilityRole="button" accessibilityLabel={l.budget == null ? `Definir orçamento de ${l.label}` : `Mudar orçamento de ${l.label}`}>
      {l.budget == null ? <T c="mint" size={13}>+ orçar</T> : <T c="fg-2" size={13}>de <T w="semi" size={13}>{BRL(l.budget)}</T></T>}
    </Pressable>
  );
}

/** Change the budget, with the 3-month average as a shortcut. */
function AmountForm({ l, onSave, onClose }: { l: BudgetLine; onSave: (v: number | null) => Promise<unknown>; onClose: () => void }) {
  const t = useTheme();
  const [value, setValue] = useState(l.budget ? String(l.budget).replace('.', ',') : '');
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const save = async (v: number | null) => {
    if (Number.isNaN(v)) return setErr('Digite um valor, ex.: 800');
    setBusy(true);
    setErr(null);
    try {
      await onSave(v);
      onClose();
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setBusy(false);
    }
  };
  return (
    <View style={{ gap: 8, marginTop: 10 }}>
      <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
        <T c="fg-3" size={13}>R$</T>
        <Field value={value} onChangeText={setValue} keyboardType="decimal-pad" autoFocus placeholder={l.suggestion ? String(Math.round(l.suggestion)) : '800'} style={{ flex: 1 }} onSubmitEditing={() => save(parseMoney(value))} />
        <Button title="Salvar" kind="primary" loading={busy} onPress={() => save(parseMoney(value))} />
      </View>
      <View style={{ flexDirection: 'row', gap: 16, flexWrap: 'wrap' }}>
        {l.suggestion > 0 && <Pressable onPress={() => setValue(String(Math.round(l.suggestion)))}><T c="mint" size={12.5}>usar média ({BRL(Math.round(l.suggestion)).replace(',00', '')})</T></Pressable>}
        {l.budget != null && <Pressable onPress={() => save(null)} disabled={busy}><T c="neg" size={12.5}>remover</T></Pressable>}
        <Pressable onPress={onClose}><T c="fg-3" size={12.5}>cancelar</T></Pressable>
      </View>
      {err && <T c="neg" size={12.5} style={{ color: t.neg }}>{err}</T>}
    </View>
  );
}

function GroupRow({ g, ym, current, first, save }: { g: GroupBudget; ym: string; current: boolean; first: boolean; save: (group: string, sub?: string) => (v: number | null) => Promise<unknown> }) {
  const t = useTheme();
  const [open, setOpen] = useState(false);
  // Which amount is being edited: "" for the group, or a subcategory's name.
  const [editing, setEditing] = useState<string | null>(null);
  const color = t.color(group(g.group_key).color);
  return (
    <View style={{ paddingHorizontal: 16, paddingVertical: 14, borderTopWidth: first ? 0 : 1, borderTopColor: t.line }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
        <View style={{ width: 10, height: 10, borderRadius: 3, backgroundColor: color }} />
        <Link href={txHref({ ym, kind: 'out', cats: [g.group_key] })}><T w="semi" size={15}>{g.label}</T></Link>
        <Badge l={g} current={current} />
        <View style={{ marginLeft: 'auto', flexDirection: 'row', alignItems: 'baseline', gap: 6 }}>
          <T mono w="semi" size={13.5}>{BRL(g.spent)}</T>
          <AmountButton l={g} onPress={() => setEditing(editing === '' ? null : '')} />
        </View>
      </View>
      {editing === '' && <AmountForm l={g} onSave={save(g.group_key)} onClose={() => setEditing(null)} />}
      <Meter l={g} color={color} />
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 8, marginTop: 7, flexWrap: 'wrap' }}>
        <Detail l={g} current={current} />
        {g.subs.length > 0 && <Pressable onPress={() => setOpen((v) => !v)} hitSlop={6}><T c="mint" size={12.5}>{open ? 'esconder' : `subcategorias (${g.subs.length})`}</T></Pressable>}
      </View>
      {open && (
        <View style={{ marginTop: 10, marginLeft: 4, paddingLeft: 12, borderLeftWidth: 1, borderLeftColor: t['line-2'], gap: 12 }}>
          {g.subs.map((s) => (
            <View key={s.key}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                <Link href={txHref({ ym, kind: 'out', cats: [s.key] })}><T size={13.5}>{s.label}</T></Link>
                <Badge l={s} current={current} />
                <View style={{ marginLeft: 'auto', flexDirection: 'row', alignItems: 'baseline', gap: 6 }}>
                  <T mono size={13}>{BRL(s.spent)}</T>
                  <AmountButton l={s} onPress={() => setEditing(editing === s.sub_label ? null : s.sub_label)} />
                </View>
              </View>
              {editing === s.sub_label && <AmountForm l={s} onSave={save(g.group_key, s.sub_label)} onClose={() => setEditing(null)} />}
              <Meter l={s} color={t.mix(color, 70)} />
              {s.budget != null && <View style={{ marginTop: 6 }}><Detail l={s} current={current} /></View>}
            </View>
          ))}
        </View>
      )}
    </View>
  );
}

export default function Orcamentos() {
  const t = useTheme();
  // Start on the server's current month; the switch then picks others.
  const [picked, setPicked] = useState<string | null>(null);
  const { data: v, error, isLoading, refetch, isRefetching } = useApi<BudgetsData>(`/api/budgets${picked ? `?m=${picked}` : ''}`);
  const m = useApiMutation((b: { group_key: string; sub_label: string; amount: number | null }) => api('/api/budgets', { method: 'PUT', body: b }));
  if (isLoading) return <Status loading />;
  if (!v) return <Status error={error} onRetry={refetch} />;

  const ym = v.ym;
  const current = v.day != null;
  const save = (group_key: string, sub_label = '') => (amount: number | null) => m.mutateAsync({ group_key, sub_label, amount });
  const budgeted = v.groups.filter((g) => g.budget != null || g.subs.some((s) => s.budget != null));
  const rest = v.groups.filter((g) => !budgeted.includes(g));
  const list = (gs: GroupBudget[]) => gs.map((g, i) => <GroupRow key={`${ym}${g.group_key}`} g={g} ym={ym} current={current} first={i === 0} save={save} />);

  return (
    <Screen refreshing={isRefetching} onRefresh={refetch}>
      <View style={{ alignItems: 'center', marginBottom: 4 }}>
        <MonthSwitch ym={ym} today={v.today} onChange={setPicked} />
      </View>
      <Panel>
        <Label>Orçamento do mês</Label>
        {v.total.budget == null ? (
          <T c="fg-2" style={{ marginTop: 8 }}>Defina quanto quer gastar por mês em cada categoria. O liu liu acompanha o ritmo e avisa quando uma passar do ponto. A média dos últimos 3 meses aparece como sugestão.</T>
        ) : (
          <>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
              <Big>{BRL(v.total.spent)}</Big>
              <Badge l={v.total} current={current} />
            </View>
            <T c="fg-2" size={13}>de {BRL(v.total.budget)}</T>
            <Meter l={v.total} color={t['fg-2']} />
            <View style={{ marginTop: 8 }}><Detail l={v.total} current={current} /></View>
            {current && <T c="fg-3" size={12} style={{ marginTop: 6 }}>Tracinho: onde você costuma estar no dia {v.day}, pelo ritmo dos últimos 3 meses.</T>}
          </>
        )}
      </Panel>
      {budgeted.length > 0 && (
        <Panel flush>
          <PanelHead label="Com orçamento" right={<T c="fg-3" size={12}>toque no valor para mudar</T>} style={{ paddingHorizontal: 16, paddingTop: 16, paddingBottom: 4 }} />
          {list(budgeted)}
        </Panel>
      )}
      {rest.length > 0 && (
        <Panel flush>
          <PanelHead label="Sem orçamento" style={{ paddingHorizontal: 16, paddingTop: 16, paddingBottom: 4 }} />
          {list(rest)}
        </Panel>
      )}
    </Screen>
  );
}
