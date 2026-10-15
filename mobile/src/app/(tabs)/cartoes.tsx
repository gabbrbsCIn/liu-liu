import { View } from 'react-native';
import Svg, { Defs, LinearGradient, Rect, Stop } from 'react-native-svg';
import { dayShort, monthShort, ymOf } from '@shared/dates';
import { BRL } from '@shared/format';
import { txHref } from '@shared/txFilter';
import { useApi } from '@/lib/api';
import type { CardsData } from '@/lib/types';
import { Bar, Foot, More, Panel, PanelHead, Screen, Status, T } from '@/ui/kit';
import { BillsChart } from '@/ui/money/charts';
import { useTheme } from '@/ui/theme';

type Card = CardsData['cards'][number];

export default function Cartoes() {
  const { data, error, isLoading, refetch, isRefetching } = useApi<CardsData>('/api/app/cards');
  if (isLoading) return <Status loading />;
  if (!data) return <Status error={error} onRetry={refetch} />;
  if (!data.cards.length)
    return <Status title="Nenhum cartão conectado" text="Os cartões de crédito dos bancos conectados aparecem aqui, com limite, fatura e datas." />;
  return (
    <Screen refreshing={isRefetching} onRefresh={refetch}>
      {data.cards.map((c) => <CardPanel key={c.card.id} {...c} holder={data.holder} today={data.today} />)}
    </Screen>
  );
}

function CardPanel({ card: c, bills, nextCommitted, holder, today }: Card & { holder: string; today: string }) {
  const fat = Math.abs(c.balance);
  const currentBill = bills.find((b) => c.due_date && b.due_date === c.due_date);
  const hist = bills.map((b) => ({ label: monthShort(ymOf(b.due_date)), total: b.total_amount, current: b === currentBill }));
  if (!currentBill && c.due_date) hist.push({ label: monthShort(ymOf(c.due_date)), total: fat, current: true });
  const used = c.credit_limit ? c.credit_limit - (c.available_limit ?? 0) : 0;
  const kv = (k: string, v: string) => (
    <View style={{ flex: 1, minWidth: 0 }}>
      <T c="fg-3" size={11}>{k}</T>
      <T w="semi" numberOfLines={1}>{v}</T>
    </View>
  );
  return (
    <Panel style={{ gap: 14 }}>
      <Plastic id={`g-${c.id.replace(/\W/g, '')}`} color={c.color ?? '#3a4a5c'} bank={c.institution ?? c.name} last4={c.number?.slice(-4) ?? '····'} available={c.available_limit ?? 0} holder={holder} />
      {c.credit_limit ? (
        <View>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 8 }}>
            <T c="fg-3" size={12}>Limite usado</T>
            <T c="fg-3" size={12} mono>{BRL(used)} de {BRL(c.credit_limit)}</T>
          </View>
          <Bar pct={(used / c.credit_limit) * 100} style={{ marginTop: 6 }} />
        </View>
      ) : null}
      <View style={{ flexDirection: 'row', gap: 8 }}>
        {kv('Fatura atual', BRL(fat))}
        {kv('Fecha', c.close_date ? dayShort(c.close_date) : '—')}
        {kv('Vence', c.due_date ? dayShort(c.due_date) : '—')}
      </View>
      <Foot style={{ marginTop: 0, alignItems: 'center' }}>
        <T c="fg-2" size={12.5}>Compras deste cartão</T>
        <More href={txHref({ ym: ymOf(today), accounts: [c.id] })}>ver transações ↗</More>
      </Foot>
      <View>
        <PanelHead label="Últimas faturas" right={<T c="fg-3" size={12}>tracejado: já comprometido</T>} />
        <BillsChart bills={hist} next={nextCommitted && nextCommitted.total > 0 ? { label: monthShort(nextCommitted.ym), total: nextCommitted.total } : null} />
      </View>
    </Panel>
  );
}

/** The card's plastic: gradient from its color to the same color darkened. */
function Plastic({ id, color, bank, last4, available, holder }: { id: string; color: string; bank: string; last4: string; available: number; holder: string }) {
  const t = useTheme();
  return (
    <View style={{ width: '100%', maxWidth: 340, aspectRatio: 1.586, borderRadius: 14, overflow: 'hidden', paddingVertical: 16, paddingHorizontal: 18, justifyContent: 'space-between' }}>
      <Svg style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }} width="100%" height="100%">
        <Defs>
          <LinearGradient id={id} x1="0" y1="0" x2="1" y2="1">
            <Stop offset="0" stopColor={color} />
            <Stop offset="1" stopColor={t.mix(color, 45, '#000000')} />
          </LinearGradient>
        </Defs>
        <Rect width="100%" height="100%" fill={`url(#${id})`} />
      </Svg>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
        <T w="bold" size={15} style={{ color: '#fff', letterSpacing: -0.3 }}>{bank}</T>
        <View style={{ width: 30, height: 22, borderRadius: 5, backgroundColor: '#ffffff38' }} />
      </View>
      <View>
        <T mono size={13} style={{ color: '#fff', opacity: 0.85, letterSpacing: 1.5 }}>•••• •••• •••• {last4}</T>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', marginTop: 8, gap: 8 }}>
          <View>
            <T size={11} style={{ color: '#fff', opacity: 0.75 }}>disponível</T>
            <T narrow size={22} style={{ color: '#fff', lineHeight: 26 }}>{BRL(available)}</T>
          </View>
          <T size={11} numberOfLines={1} style={{ color: '#fff', opacity: 0.75, flexShrink: 1 }}>{holder}</T>
        </View>
      </View>
    </View>
  );
}
