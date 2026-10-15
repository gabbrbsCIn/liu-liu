import { Link } from 'expo-router';
import { useRef, useState } from 'react';
import { Pressable, View } from 'react-native';
import { group } from '@shared/categories';
import { addMonths, dayShort, monthName, monthShort, weekday, ymOf } from '@shared/dates';
import { BRL } from '@shared/format';
import { txHref } from '@shared/txFilter';
import { useApi } from '@/lib/api';
import { askLiu, useConnectBank } from '@/lib/actions';
import type { HomeData, Overview, SessionData } from '@/lib/types';
import { BankTile, Bar, Big, Change, Dot, Foot, Label, Mark, MonthSwitch, More, Panel, PanelHead, Row, Screen, Status, T } from '@/ui/kit';
import { useTheme } from '@/ui/theme';
import { heatShade, Heatmap, MonthLine, PaceChart } from '@/ui/home/charts';
import { ConnectModal, Welcome } from '@/ui/home/Connect';
import { SavingsGoal } from '@/ui/home/SavingsGoal';

const WEEKDAYS = ['domingo', 'segunda', 'terça', 'quarta', 'quinta', 'sexta', 'sábado'];
const noCents = (v: number) => BRL(v).replace(/,\d\d$/, '');

export default function Home() {
  const [ym, setYm] = useState<string | null>(null);
  const [current, setCurrent] = useState<string | null>(null);
  const path = ym && ym !== current ? `/api/app/overview?m=${ym}` : '/api/app/overview';
  const q = useApi<HomeData>(path);
  // Keep showing the previous month while the next one loads.
  const last = useRef<HomeData | undefined>(undefined);
  if (q.data) last.current = q.data;
  const data = q.data ?? last.current;
  const connect = useConnectBank();
  const session = useApi<SessionData>(data?.empty ? '/api/app/session' : null);

  if (!data) return q.error ? <Status error={q.error} onRetry={q.refetch} /> : <Status loading />;
  if (current !== ymOf(data.today)) setCurrent(ymOf(data.today));

  return (
    <Screen refreshing={q.isRefetching} onRefresh={q.refetch}>
      {data.empty ? <Welcome configured={session.data?.pluggyConfigured} connect={connect} /> : <Dashboard o={data} onMonth={setYm} connect={connect} loading={q.isLoading} />}
    </Screen>
  );
}

function Dashboard({ o, onMonth, connect, loading }: { o: Overview; onMonth: (ym: string) => void; connect: ReturnType<typeof useConnectBank>; loading: boolean }) {
  const t = useTheme();
  const ym = o.ym;
  const prevName = monthName(addMonths(ym, -1));
  const diff = o.prevSpentSamePoint - o.spent;
  const income = o.spend.income;
  const free = Math.max(0, o.spend.free);
  const bankTotal = o.bank.reduce((s, a) => s + a.balance, 0);
  const limitTotal = o.cards.reduce((s, c) => s + (c.credit_limit ?? 0), 0);
  const available = o.cards.reduce((s, c) => s + (c.available_limit ?? 0), 0);
  const topGroups = o.groups.filter((g) => g.total > 0 || g.prev > 0).slice(0, 6);
  const nextDue = o.cards.map((c) => c.due_date).filter(Boolean).sort()[0];

  return (
    <>
      <View style={{ flexDirection: 'row', justifyContent: 'center', opacity: loading ? 0.5 : 1 }}>
        <MonthSwitch ym={ym} today={o.today} onChange={onMonth} />
      </View>

      <Panel>
        <PanelHead
          label={o.isCurrent ? 'Pode gastar hoje' : `Sobrou em ${monthName(ym)}`}
          right={o.isCurrent ? <More onPress={() => askLiu('Como você calculou quanto posso gastar por dia?')}>como calculei ↗</More> : undefined}
        />
        <T narrow size={58} style={{ lineHeight: 60, marginTop: 10, letterSpacing: -0.5 }} adjustsFontSizeToFit numberOfLines={1}>
          {BRL(o.isCurrent ? o.spend.perDay : Math.max(0, o.income - o.spent))}
        </T>
        <T c="fg-2" size={13} style={{ marginTop: 8 }}>
          {o.isCurrent
            ? o.savingsGoal > 0
              ? `Por dia, até o dia ${o.spend.daysLeft + o.day - 1}, e você ainda guarda os ${BRL(o.savingsGoal)} da meta.`
              : 'Por dia, até o fim do mês. Diga quanto quer guardar para eu descontar.'
            : `Entrou ${BRL(o.income)} e saiu ${BRL(o.spent)}.`}
        </T>
        {income > 0 && (
          <>
            <View style={{ flexDirection: 'row', height: 10, borderRadius: 5, overflow: 'hidden', gap: 2, marginTop: 18 }} accessibilityLabel={`Renda: ${BRL(o.spent)} gasto, ${BRL(o.savingsGoal)} meta, ${BRL(free)} livre`}>
              <View style={{ flex: Math.min(o.spent, income), backgroundColor: t['fg-3'] }} />
              {o.savingsGoal > 0 && <View style={{ flex: o.savingsGoal, backgroundColor: t['mint-dim'], borderWidth: 1, borderColor: t.mint }} />}
              {free > 0 && <View style={{ flex: free, backgroundColor: t.mint }} />}
            </View>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8, marginTop: 8 }}>
              <Key color={t['fg-3']}>Gasto {noCents(o.spent)}</Key>
              {o.savingsGoal > 0 && <Key color={t['mint-dim']} border={t.mint}>Meta {noCents(o.savingsGoal)}</Key>}
              <Key color={t.mint}>Livre {noCents(free)}</Key>
            </View>
          </>
        )}
        {o.isCurrent && <SavingsGoal key={o.savingsGoal} current={o.savingsGoal} />}
        <Foot>
          <T c="fg-2" size={12.5}>{o.income >= o.spend.income ? `Renda de ${monthName(ym)}` : 'Renda esperada (média de 3 meses)'}</T>
          <T mono w="medium" size={12.5}>{BRL(o.spend.income)}</T>
        </Foot>
      </Panel>

      <Panel>
        <T c="mint" size={21} w="medium" style={{ letterSpacing: -0.6, lineHeight: 25 }}>{o.headline.title}</T>
        <T size={15} style={{ marginTop: 10 }}>{o.headline.lede}</T>
        <View style={{ marginTop: 16, borderTopWidth: 1, borderTopColor: t.line }}>
          {o.notes.map((n) => (
            <Pressable key={n.text} onPress={() => askLiu(n.ask)} style={({ pressed }) => ({ flexDirection: 'row', alignItems: 'flex-start', gap: 12, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: t.line, opacity: pressed ? 0.6 : 1 })}>
              <View style={{ marginTop: 8 }}><Dot color={t['fg-3']} size={6} /></View>
              <T style={{ flex: 1 }}>{n.text}</T>
              <T c="fg-3" size={12} style={{ marginTop: 2 }}>perguntar →</T>
            </Pressable>
          ))}
        </View>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 14 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <Mark size={20} />
            <T c="fg-3" size={12}>liu liu</T>
          </View>
          <T c="fg-3" size={12}>{dayShort(o.today)}</T>
        </View>
      </Panel>

      <Panel>
        <Label>Linha do mês</Label>
        <T c="fg-3" size={12} style={{ marginTop: 4 }}>cada barra é um dia, na cor da categoria em que você mais gastou · toque para ver o dia</T>
        <MonthLine key={ym} ym={ym} daily={o.daily} dominant={o.dominant} today={o.day} monthShort={monthShort(ym)} income={o.incomeEvents} bills={o.billEvents} />
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', columnGap: 16, rowGap: 6, marginTop: 10 }}>
          {o.groups.filter((g) => g.total > 0).map((g) => {
            const gr = group(g.key);
            return (
              <Link key={g.key} href={txHref({ ym, kind: 'out', cats: [g.key] })} asChild>
                <Pressable hitSlop={4}>
                  <Key color={t.color(gr.color)} c="fg-2">
                    {gr.name}
                    {gr.note ? <T c="fg-3" size={12}>{` · nota de R$ ${gr.note}`}</T> : null}
                  </Key>
                </Pressable>
              </Link>
            );
          })}
        </View>
      </Panel>

      <Panel>
        <PanelHead label="Ritmo de gastos" right={<More href={`/categorias?m=${ym}`}>ver categorias ↗</More>} />
        <Big small={diff >= 0 ? 'abaixo' : 'acima'}>{BRL(Math.abs(diff))}</Big>
        <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center', marginTop: 8, flexWrap: 'wrap' }}>
          {o.prevSpentSamePoint > 0 && (
            <Change kind={diff >= 0 ? 'good' : 'bad'}>
              {diff >= 0 ? '↘' : '↗'} {Math.abs(Math.round((o.spent / o.prevSpentSamePoint - 1) * 1000) / 10).toLocaleString('pt-BR')}%
            </Change>
          )}
          <T c="fg-2" size={12} style={{ flexShrink: 1 }}>vs. {BRL(o.prevSpentSamePoint)} no mesmo dia de {prevName}</T>
        </View>
        <PaceChart key={ym} cum={o.cum} prevCum={o.prevCum} current={monthName(ym)} prevLabel={prevName} />
        <View style={{ flexDirection: 'row', gap: 16, marginTop: 10 }}>
          <LineKey color={t.mint}>{monthName(ym)}</LineKey>
          <LineKey color={t['fg-3']} dashed>{prevName}</LineKey>
        </View>
      </Panel>

      <Panel>
        <PanelHead
          label={
            <View style={{ flexShrink: 1 }}>
              <Label>Mapa de calor</Label>
              <T c="fg-3" size={11.5}>toque num dia</T>
            </View>
          }
          right={
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
              <T c="fg-3" size={11}>menos</T>
              {[0, 1, 2, 3, 4].map((l) => <View key={l} style={{ width: 12, height: 12, borderRadius: 3, backgroundColor: heatShade(t, l) }} />)}
              <T c="fg-3" size={11}>mais</T>
            </View>
          }
        />
        <Big small="por dia, em média">{BRL(o.day ? o.spent / o.day : 0)}</Big>
        {o.weekday.avg > 0 && (
          <T c="fg-2" size={12.5} style={{ marginTop: 4 }}>
            Tirando moradia e parcelas, <T size={12.5} w="semi">{WEEKDAYS[o.weekday.index]}</T> é seu dia mais caro: {BRL(o.weekday.avg)} em média.
          </T>
        )}
        <Heatmap ym={ym} daily={o.daily} firstWeekday={weekday(`${ym}-01`)} today={o.day} monthShort={monthShort(ym)} />
      </Panel>

      <Panel>
        <PanelHead label="Contas correntes" right={<More onPress={connect.connect}>+ conectar banco</More>} />
        <Big small="saldo total">{BRL(bankTotal)}</Big>
        <View style={{ marginTop: 6 }}>
          {o.bank.map((a, i) => (
            <Row key={a.id} href={txHref({ ym, accounts: [a.id] })} last={i === o.bank.length - 1}>
              <BankTile name={a.institution ?? a.name} color={a.color} />
              <View style={{ flex: 1 }}>
                <T w="medium">{a.institution ?? a.name}</T>
                <T c="fg-2" size={12.5}>{a.subtype === 'SAVINGS_ACCOUNT' ? 'Poupança' : 'Conta corrente'}</T>
              </View>
              <T mono w="medium">{BRL(a.balance)}</T>
            </Row>
          ))}
        </View>
        <Foot>
          <T c="fg-2" size={12.5}>{o.bank.length} {o.bank.length === 1 ? 'conta' : 'contas'} · via Open Finance</T>
          {o.invested > 0 && (
            <Link href="/investimentos">
              <T c="fg-2" size={12.5}>Investido: <T mono w="medium" size={12.5}>{BRL(o.invested)}</T> ↗</T>
            </Link>
          )}
        </Foot>
        <ConnectModal state={connect.state} reset={connect.reset} />
      </Panel>

      <Panel>
        <PanelHead label="Limite total disponível" right={<More href="/cartoes">ver cartões ↗</More>} />
        <Big>{BRL(available)}</Big>
        <T c="fg-2" size={12.5} style={{ marginTop: 4 }}>de {BRL(limitTotal)} de limite total</T>
        <View style={{ marginTop: 6 }}>
          {o.cards.map((c, i) => (
            <Row key={c.id} href={txHref({ ym, accounts: [c.id] })} last={i === o.cards.length - 1}>
              <BankTile name={c.institution ?? c.name} color={c.color} />
              <View style={{ flex: 1 }}>
                <T w="medium" numberOfLines={1}>{c.institution ?? c.name} {c.number ? `•••• ${c.number.slice(-4)}` : ''}</T>
                <Bar pct={c.credit_limit ? (Math.abs(c.balance) / c.credit_limit) * 100 : 0} color={t['fg-2']} style={{ marginTop: 6 }} />
                <T c="fg-2" size={12} style={{ marginTop: 4 }}>{c.due_date ? `Vence ${dayShort(c.due_date)} · ` : ''}fatura {BRL(Math.abs(c.balance))}</T>
              </View>
              <View style={{ alignItems: 'flex-end' }}>
                <T mono w="medium">{BRL(c.available_limit ?? 0)}</T>
                <T c="fg-2" size={12}>disponível</T>
              </View>
            </Row>
          ))}
        </View>
        <Foot>
          <T c="fg-2" size={12.5}>{o.cards.length} {o.cards.length === 1 ? 'cartão' : 'cartões'}</T>
          {nextDue && <T c="fg-2" size={12.5}>Próxima fatura: {dayShort(nextDue)}</T>}
        </Foot>
      </Panel>

      <Panel>
        <PanelHead label="Principais categorias" right={<More href={`/categorias?m=${ym}`}>ver todas ↗</More>} />
        <View style={{ flexDirection: 'row', gap: 12, marginTop: 14, paddingBottom: 6, borderBottomWidth: 1, borderBottomColor: t.line }}>
          <T c="fg-3" size={11.5} style={{ flex: 1 }}>Categoria</T>
          <T c="fg-3" size={11.5}>Atual</T>
          <T c="fg-3" size={11.5} style={{ width: 64, textAlign: 'right' }}>Variação</T>
        </View>
        {topGroups.map((g, i) => {
          const d = g.prev ? Math.round((g.total / g.prev - 1) * 100) : null;
          const kind = d === null || d === 0 ? 'flat' : d > 0 ? 'bad' : 'good';
          const gr = group(g.key);
          return (
            <Row key={g.key} href={txHref({ ym, kind: 'out', cats: [g.key] })} last={i === topGroups.length - 1}>
              <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Dot color={t.color(gr.color)} />
                <T numberOfLines={1} style={{ flexShrink: 1 }}>{gr.name}</T>
              </View>
              <T mono w="medium">{BRL(g.total)}</T>
              <View style={{ width: 64, alignItems: 'flex-end' }}>
                <View style={{ alignSelf: 'flex-end' }}>
                  <Change kind={kind}>{d === null ? 'novo' : `${d > 0 ? '+' : ''}${d}%`}</Change>
                </View>
              </View>
            </Row>
          );
        })}
      </Panel>

      <Panel>
        <PanelHead label="Próximos 14 dias" right={<T c="fg-3" size={12}>{BRL(o.upcoming.reduce((s, u) => s + u.amount, 0))} a sair</T>} />
        <View style={{ marginTop: 6 }}>
          {o.upcoming.length === 0 && <T c="fg-3" style={{ marginTop: 8 }}>Nenhuma conta prevista. Faturas e contas que se repetem todo mês aparecem aqui.</T>}
          {o.upcoming.map((u, i) => (
            <Row key={u.date + u.description} last={i === o.upcoming.length - 1}>
              <T mono c="fg-3" size={12.5} style={{ width: 48 }}>{dayShort(u.date)}</T>
              <View style={{ flex: 1 }}>
                <T w="medium" numberOfLines={1}>{u.description}</T>
                <T c="fg-2" size={12.5}>{u.detail}</T>
              </View>
              <T mono w="medium">{BRL(u.amount)}</T>
            </Row>
          ))}
        </View>
      </Panel>

      <Panel>
        <PanelHead label="Metas" right={<More onPress={() => askLiu('Quero criar uma meta de economia.')}>+ nova meta</More>} />
        {o.goals.length === 0 ? (
          <T c="fg-3" style={{ marginTop: 12 }}>Nenhuma meta ainda. Peça ao liu liu: “quero juntar R$ 10 mil para viajar até junho”.</T>
        ) : (
          <View style={{ gap: 18, marginTop: 16 }}>
            {o.goals.map((g) => (
              <View key={g.id}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 10 }}>
                  <T w="medium" style={{ flexShrink: 1 }}>{g.name}</T>
                  <T mono size={13}>
                    <T mono w="medium" size={13}>{BRL(g.saved)}</T>
                    <T mono c="fg-3" size={13}>{` / ${BRL(g.target)}`}</T>
                  </T>
                </View>
                <Bar pct={(g.saved / g.target) * 100} style={{ marginTop: 7, marginBottom: 5 }} />
                <T c="fg-2" size={12.5}>{g.deadline ? `até ${dayShort(g.deadline)} ${g.deadline.slice(0, 4)}` : 'sem prazo'}</T>
              </View>
            ))}
          </View>
        )}
      </Panel>
    </>
  );
}

/** Legend item: small square + text (.split-l / .legend .sq). */
function Key({ color, border, c = 'fg-3', children }: { color: string; border?: string; c?: 'fg-2' | 'fg-3'; children: React.ReactNode }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
      <View style={{ width: 9, height: 9, borderRadius: 2, backgroundColor: color, borderWidth: border ? 1 : 0, borderColor: border }} />
      <T c={c} size={12}>{children}</T>
    </View>
  );
}

/** Line legend for the pace chart (.legend .ln / .ln.dash). */
function LineKey({ color, dashed, children }: { color: string; dashed?: boolean; children: React.ReactNode }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 7 }}>
      <View style={{ width: 14, height: 0, borderTopWidth: 2, borderColor: color, borderStyle: dashed ? 'dashed' : 'solid' }} />
      <T c="fg-2" size={12}>{children}</T>
    </View>
  );
}
