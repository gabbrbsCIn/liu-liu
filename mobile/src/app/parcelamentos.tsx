import { Link } from 'expo-router';
import { View } from 'react-native';
import { group } from '@shared/categories';
import { addMonths, monthName, monthShort, monthStart, ymOf } from '@shared/dates';
import { BRL } from '@shared/format';
import { txHref } from '@shared/txFilter';
import { useApi } from '@/lib/api';
import type { InstallmentsData } from '@/lib/types';
import { BankTile, Big, Foot, Label, Panel, PanelHead, Screen, Status, T } from '@/ui/kit';
import { CommittedChart, Legend, LegendItem, pct1 } from '@/ui/money/charts';
import { useTheme } from '@/ui/theme';

type Plan = InstallmentsData['plans'][number];

export default function Parcelamentos() {
  const t = useTheme();
  const { data: v, error, isLoading, refetch, isRefetching } = useApi<InstallmentsData>('/api/app/installments');
  if (isLoading) return <Status loading />;
  if (!v) return <Status error={error} onRetry={refetch} />;

  const byId = new Map(v.accounts.map((a) => [a.id, a]));
  const last = v.plans.reduce((m, p) => (p.endYm > m ? p.endYm : m), v.ym);
  const legend = [...new Map(v.plans.filter((p) => p.remaining > 0).map((p) => [p.group_key, p])).values()];
  return (
    <Screen refreshing={isRefetching} onRefresh={refetch}>
      <Panel>
        <Label>Em parcelas este mês</Label>
        <Big>{BRL(v.thisMonth)}</Big>
        {v.income > 0 && <T c="fg-2" size={12.5} style={{ marginTop: 4 }}>{pct1(v.thisMonth / v.income)} da sua renda média</T>}
        <Foot style={{ marginTop: 18 }}>
          <T c="fg-2" size={12.5}>Ainda a pagar</T>
          <T mono w="medium" size={13}>{BRL(v.stillToPay)}</T>
        </Foot>
        <Foot style={{ borderTopWidth: 0, paddingTop: 6, marginTop: 0 }}>
          <T c="fg-2" size={12.5}>Última parcela</T>
          <T w="semi" size={13}>{v.plans.length ? `${monthName(last)} de ${last.slice(0, 4)}` : '—'}</T>
        </Foot>
      </Panel>

      <Panel>
        <PanelHead label="Quanto já está comprometido" right={<T c="fg-3" size={12}>próximos 8 meses</T>} />
        <CommittedChart months={v.committed.map((c) => ({ label: monthShort(c.ym), total: c.total, items: c.items }))} />
        <Legend>
          {legend.map((p) => <LegendItem key={p.group_key} color={t.color(group(p.group_key).color)}>{group(p.group_key).name}</LegendItem>)}
        </Legend>
      </Panel>

      <Panel flush>
        <PanelHead label="Compras parceladas ativas" style={{ paddingHorizontal: 16, paddingTop: 16, paddingBottom: 6 }} />
        {v.plans.length === 0 && (
          <T c="fg-3" style={{ paddingHorizontal: 16, paddingBottom: 16 }}>Nenhuma compra parcelada no cartão. Quando houver, aparece aqui com quantas parcelas faltam.</T>
        )}
        {v.plans.map((p, i) => <PlanRow key={p.key} p={p} first={i === 0} today={v.today} account={byId.get(p.account_id)} />)}
      </Panel>
    </Screen>
  );
}

function PlanRow({ p, first, today, account: a }: { p: Plan; first: boolean; today: string; account?: InstallmentsData['accounts'][number] }) {
  const t = useTheme();
  const href = txHref({ from: monthStart(addMonths(ymOf(p.lastDate), 1 - p.current)), to: today, q: p.description, accounts: [p.account_id], installments: true });
  return (
    <View style={{ paddingHorizontal: 16, paddingVertical: 14, gap: 10, borderTopWidth: first ? 0 : 1, borderTopColor: t.line }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
        <BankTile name={a?.name ?? '?'} color={a?.color ?? null} />
        <View style={{ flex: 1, minWidth: 0 }}>
          <Link href={href} accessibilityHint="Ver as parcelas já pagas">
            <T w="medium" numberOfLines={1}>{p.description}</T>
          </Link>
          <T c="fg-3" size={12} numberOfLines={1}>{a?.name ?? ''} · {p.total}× de {BRL(p.value)}</T>
        </View>
        <View style={{ alignItems: 'flex-end' }}>
          <T mono w="medium">{BRL(p.value)}</T>
          <T c="fg-3" size={12}>{p.remaining ? `${BRL(p.value * p.remaining)} a pagar` : 'quitado'}</T>
        </View>
      </View>
      <View>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 8 }}>
          <T c="fg-3" size={12}>parcela <T w="semi" size={12}>{p.current} de {p.total}</T></T>
          <T c="fg-3" size={12}>{p.remaining === 0 ? 'última parcela' : `termina em ${monthShort(p.endYm)}/${p.endYm.slice(0, 4)}`}</T>
        </View>
        <View style={{ flexDirection: 'row', gap: 3, marginTop: 8 }}>
          {Array.from({ length: p.total }, (_, i) => (
            <View key={i} style={{ flex: 1, height: 6, borderRadius: 2, backgroundColor: i < p.current - 1 ? t['fg-2'] : i === p.current - 1 ? t.mint : t['raise-2'] }} />
          ))}
        </View>
      </View>
    </View>
  );
}
