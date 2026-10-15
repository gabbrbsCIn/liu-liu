import { useState } from 'react';
import { Pressable, View } from 'react-native';
import { dayShort } from '@shared/dates';
import { BRL } from '@shared/format';
import { shortName } from '@shared/investments';
import { askLiu } from '@/lib/actions';
import { useApi } from '@/lib/api';
import type { InvestmentsData, PositionGroup } from '@/lib/types';
import { Big, Dot, Foot, Icon, Label, More, Panel, PanelHead, Row, Screen, Status, T } from '@/ui/kit';
import { HistoryChart, MaturityChart, pct1, Ruler } from '@/ui/money/charts';
import { useTheme } from '@/ui/theme';

export default function Investimentos() {
  const t = useTheme();
  const { data: v, error, isLoading, refetch, isRefetching } = useApi<InvestmentsData>('/api/app/investments');
  if (isLoading) return <Status loading />;
  if (!v) return <Status error={error} onRetry={refetch} />;
  if (!v.groups.length)
    return (
      <Status
        title="Nenhum investimento encontrado"
        text="Quando a sua conexão pelo MeuPluggy incluir investimentos (CDB, Tesouro, ações, fundos), eles aparecem aqui depois da próxima atualização."
      />
    );

  const count = v.groups.reduce((s, g) => s + g.items.length, 0);
  return (
    <Screen refreshing={isRefetching} onRefresh={refetch}>
      <Panel>
        <PanelHead label="Investido hoje" right={<More onPress={() => askLiu('Como estão meus investimentos?')}>perguntar ↗</More>} />
        <Big>{BRL(v.total)}</Big>
        <T c="fg-2" size={12.5} style={{ marginTop: 4 }}>líquido de IR estimado · bruto {BRL(v.gross)}</T>
        {v.investedKnown > 0 && (
          <View style={{ marginTop: 10 }}>
            <Row>
              <T c="fg-2" style={{ flex: 1 }}>Você aplicou</T>
              <T mono w="medium">{BRL(v.investedKnown)}</T>
            </Row>
            <Row last>
              <T c="fg-2" style={{ flex: 1 }}>Rendeu até agora</T>
              <T mono w="medium" c={v.profitKnown >= 0 ? 'pos' : 'neg'}>
                {v.profitKnown >= 0 ? '+ ' : '− '}{BRL(Math.abs(v.profitKnown))} <T c="fg-3" mono>({pct1(v.profitPct)})</T>
              </T>
            </Row>
          </View>
        )}
        <Foot>
          <T c="fg-2" size={12.5}>{v.coverage < 0.999 ? 'Ações e ETFs não informam o valor aplicado' : 'Valores líquidos do IR estimado'}</T>
          {v.next && <T c="fg-2" size={12.5}>Próximo vencimento: {dayShort(v.next.due_date!)} {v.next.due_date!.slice(0, 4)}</T>}
        </Foot>
      </Panel>

      <Panel>
        <PanelHead label="Onde está o dinheiro" right={<T c="fg-3" size={12}>{count} aplicações</T>} />
        <Ruler style={{ marginTop: 18 }} segments={v.byClass.map((c) => ({ key: c.key, value: c.total, color: t.color(c.color), tip: `${c.name} · ${BRL(c.total)}` }))} />
        <View>
          {v.byClass.map((c, i) => (
            <Row key={c.key} last={i === v.byClass.length - 1}>
              <Dot color={t.color(c.color)} />
              <T style={{ flex: 1 }} numberOfLines={1}>{c.name}</T>
              <T c="fg-3" size={12.5} mono>{pct1(c.total / v.total)}</T>
              <T mono w="medium" style={{ minWidth: 104, textAlign: 'right' }}>{BRL(c.total)}</T>
            </Row>
          ))}
        </View>
      </Panel>

      <Panel>
        <PanelHead label="Quando o dinheiro fica livre" right={<T c="fg-3" size={12}>por ano de vencimento</T>} />
        <MaturityChart years={v.maturities} noDue={v.noDue} />
        {v.next && (
          <T c="fg-3" size={12.5} style={{ marginTop: 8 }}>
            O próximo a vencer é {shortName(v.next)} ({BRL(v.next.balance)}) em {dayShort(v.next.due_date!)} de {v.next.due_date!.slice(0, 4)}.
          </T>
        )}
      </Panel>

      <Panel>
        <PanelHead label="Evolução" right={<T c="fg-3" size={12}>total investido</T>} />
        {v.history.length >= 2 ? (
          <HistoryChart points={v.history} />
        ) : (
          <T c="fg-3" style={{ marginTop: 14 }}>
            O histórico começa {v.history[0] ? `em ${dayShort(v.history[0].day)}` : 'na próxima atualização'}. A cada atualização eu guardo o total do dia, e a curva aparece aqui a partir do segundo dia.
          </T>
        )}
      </Panel>

      <Panel flush>
        <PanelHead label="Aplicações" right={<T c="fg-3" size={12}>toque para ver cada compra</T>} style={{ paddingHorizontal: 16, paddingTop: 16, paddingBottom: 8 }} />
        <InvestmentGroups groups={v.groups} />
      </Panel>
    </Screen>
  );
}

const d = (s: string | null) => (s ? `${s.slice(8, 10)}/${s.slice(5, 7)}/${s.slice(0, 4)}` : '—');

function Gain({ balance, invested, size = 12.5 }: { balance: number; invested: number | null; size?: number }) {
  if (invested == null || invested <= 0) return <T c="fg-3" size={size} mono>—</T>;
  const g = balance - invested;
  return (
    <T c={g >= 0 ? 'pos' : 'neg'} size={size} mono>
      {g >= 0 ? '+' : '−'} {BRL(Math.abs(g))} <T c="fg-3" size={size} mono>({((g / invested) * 100).toFixed(1).replace('.', ',')}%)</T>
    </T>
  );
}

/**
 * The web's six-column table, stacked for a phone: label and today's value on the first line,
 * rate/count and amount applied on the second, then yield and next maturity.
 */
function InvestmentGroups({ groups }: { groups: PositionGroup[] }) {
  const t = useTheme();
  const [open, setOpen] = useState<Set<string>>(new Set());
  const toggle = (k: string) => setOpen((s) => { const n = new Set(s); if (n.has(k)) n.delete(k); else n.add(k); return n; });
  const num = (label: string, value: React.ReactNode, right?: boolean) => (
    <View style={{ alignItems: right ? 'flex-end' : 'flex-start', flexShrink: 1 }}>
      <T c="fg-3" size={11}>{label}</T>
      {value}
    </View>
  );
  return (
    <View>
      {groups.map((g, gi) => {
        const isOpen = open.has(g.key);
        const many = g.items.length > 1;
        return (
          <View key={g.key} style={{ borderTopWidth: gi ? 1 : 0, borderTopColor: t.line }}>
            <Pressable
              disabled={!many}
              onPress={() => toggle(g.key)}
              accessibilityState={many ? { expanded: isOpen } : undefined}
              style={({ pressed }) => ({ flexDirection: 'row', gap: 10, paddingHorizontal: 14, paddingVertical: 12, backgroundColor: pressed ? t.raise : 'transparent' })}
            >
              <View style={{ width: 16, paddingTop: 3, alignItems: 'center' }}>
                {many ? (
                  <View style={{ transform: [{ rotate: isOpen ? '90deg' : '0deg' }] }}><Icon name="chev" size={15} color={t['fg-3']} /></View>
                ) : (
                  <View style={{ paddingTop: 4 }}><Dot color={t.color(g.cls.color)} /></View>
                )}
              </View>
              <View style={{ flex: 1, minWidth: 0, gap: 8 }}>
                <View style={{ flexDirection: 'row', gap: 10 }}>
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <T w="medium" size={13.5}>{g.label}</T>
                    <T c="fg-3" size={12}>{g.rate}{many ? ` · ${g.items.length} aplicações` : ''}</T>
                  </View>
                  {num('Hoje', <T mono w="medium" size={13.5}>{BRL(g.balance)}</T>, true)}
                </View>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap' }}>
                  {num('Aplicado', <T c="fg-3" mono size={12.5}>{g.invested == null ? '—' : BRL(g.invested)}</T>)}
                  {num('Rendimento', <Gain balance={g.balance} invested={g.invested} />)}
                  {num('Próximo vencimento', <T c="fg-3" mono size={12.5}>{d(g.nextDue)}</T>, true)}
                </View>
              </View>
            </Pressable>
            {isOpen &&
              g.items.map((i) => (
                <View key={i.id} style={{ paddingLeft: 40, paddingRight: 14, paddingVertical: 8, gap: 4, backgroundColor: t.mix(t.raise, 50), borderTopWidth: 1, borderTopColor: t.line }}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 10 }}>
                    <T c="fg-2" size={12}>aplicado em {d(i.purchase_date)}</T>
                    <T mono size={12.5}>{BRL(i.balance)}</T>
                  </View>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap' }}>
                    <T c="fg-3" mono size={12}>{i.invested == null ? '—' : BRL(i.invested)}</T>
                    <Gain balance={i.balance} invested={i.invested} size={12} />
                    <T c="fg-3" mono size={12}>{d(i.due_date)}</T>
                  </View>
                </View>
              ))}
          </View>
        );
      })}
    </View>
  );
}
