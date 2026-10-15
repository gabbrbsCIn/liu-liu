import { router, type Href } from 'expo-router';
import React, { useRef, useState } from 'react';
import { Pressable, View, type GestureResponderEvent, type LayoutChangeEvent } from 'react-native';
import Svg, { Circle, Line, Path, Rect, Text as SvgText } from 'react-native-svg';
import { group } from '@shared/categories';
import { BRL, BRLk } from '@shared/format';
import { txHref } from '@shared/txFilter';
import { T } from '../kit';
import { fonts, useTheme } from '../theme';

// Phone versions of the web's MonthLine, PaceChart and Heatmap (src/components/charts.tsx).
// Hover tooltips become tap-to-show; where the web links a mark, the tooltip carries the link.

const dayOf = (ym: string, d: number) => `${ym}-${String(d).padStart(2, '0')}`;
const dd = (d: number) => String(d).padStart(2, '0');

function niceMax(v: number) {
  if (v <= 0) return 100;
  const p = Math.pow(10, Math.floor(Math.log10(v)));
  for (const m of [1, 1.5, 2, 2.5, 3, 4, 5, 6, 8, 10]) if (m * p >= v) return m * p;
  return 10 * p;
}

function useWidth() {
  const [w, setW] = useState(0);
  return [w, (e: LayoutChangeEvent) => setW(Math.round(e.nativeEvent.layout.width))] as const;
}

/** Floating label above a point of a chart (.tip). With `href`, tapping it opens that list. */
function Tip({ x, y, h, width, lines, href, action = 'ver transações →' }: { x: number; y: number; h: number; width: number; lines: string[]; href?: string; action?: string }) {
  const t = useTheme();
  const [w, setW] = useState(0);
  const left = Math.max(0, Math.min(width - w, x - w / 2));
  const body = (
    <View
      onLayout={(e) => setW(e.nativeEvent.layout.width)}
      style={{ backgroundColor: t['raise-2'], borderColor: t['line-2'], borderWidth: 1, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6, opacity: w ? 1 : 0 }}
    >
      {lines.map((l, i) => <T key={i} size={12} style={{ lineHeight: 18 }}>{l}</T>)}
      {href && <T c="mint" size={12} w="medium" style={{ lineHeight: 18 }}>{action}</T>}
    </View>
  );
  return (
    <View style={{ position: 'absolute', left, bottom: h - y + 8, zIndex: 3 }} pointerEvents="box-none">
      {href ? <Pressable onPress={() => router.push(href as Href)} hitSlop={6}>{body}</Pressable> : body}
    </View>
  );
}

/** Chart container: Tips are positioned from its bottom so they sit right above the point. */
const tipBox = (h: number) => ({ position: 'relative' as const, height: h });

/** One bar per day, colored by the group with the most spending that day; income and bills marked as events. */
export function MonthLine(p: {
  ym: string;
  daily: number[];
  dominant: (string | null)[];
  today: number;
  monthShort: string;
  income: { day: number; label: string; amount: number }[];
  bills: { day: number; label: string }[];
}) {
  const t = useTheme();
  const [W, onLayout] = useWidth();
  const [sel, setSel] = useState<{ day: number; kind: 'out' | 'in' } | null>(null);
  const L = 2, R = 2, base = 130, topY = 40;
  const n = p.daily.length;
  const step = (W - L - R) / n, bw = Math.max(3, step - 3), r = Math.min(3, bw / 2);
  const nonzero = p.daily.slice(0, p.today).filter((v) => v > 0).sort((a, b) => a - b);
  const median = nonzero[Math.floor(nonzero.length / 2)] ?? 100;
  const cap = Math.max(300, niceMax(median * 3));
  const y = (v: number) => base - (Math.min(v, cap) / cap) * (base - topY);
  const cxOf = (d: number) => L + (d - 1) * step + step / 2;
  // Collapse income on the same day into one marker.
  const inc = new Map<number, number>();
  p.income.forEach((e) => inc.set(e.day, (inc.get(e.day) ?? 0) + e.amount));
  // Bill labels close to each other go one row lower.
  let lastBillX = -999, billRow = 0;
  const bills = [...p.bills].sort((a, b) => a.day - b.day).map((b) => {
    const cx = cxOf(b.day);
    billRow = cx - lastBillX < 64 ? billRow + 1 : 0;
    lastBillX = cx;
    return { ...b, cx, dy: billRow * 13 };
  });
  const H = base + 22 + (bills.length ? 14 + Math.max(...bills.map((b) => b.dy)) : 0);

  const onPress = (e: GestureResponderEvent) => {
    const { locationX, locationY } = e.nativeEvent;
    const day = Math.floor((locationX - L) / step) + 1;
    const next: typeof sel =
      locationY < 26 && inc.has(day) ? { day, kind: 'in' } : day >= 1 && day <= p.today && p.daily[day - 1] > 0 && p.dominant[day - 1] ? { day, kind: 'out' } : null;
    setSel(next && sel && next.day === sel.day && next.kind === sel.kind ? null : next);
  };

  let tip: React.ReactNode = null;
  if (sel && W) {
    const cx = cxOf(sel.day);
    if (sel.kind === 'in')
      tip = <Tip x={cx} y={8} h={H} width={W} lines={[`${dd(sel.day)} ${p.monthShort} · entrou ${BRL(inc.get(sel.day) ?? 0)}`]} href={txHref({ from: dayOf(p.ym, sel.day), kind: 'in' })} />;
    else {
      const v = p.daily[sel.day - 1];
      tip = <Tip x={cx} y={y(v) - (v > cap ? 14 : 0)} h={H} width={W} lines={[`${dd(sel.day)} ${p.monthShort} · ${BRL(v)}`, `mais em ${group(p.dominant[sel.day - 1]!).name}`]} href={txHref({ from: dayOf(p.ym, sel.day), kind: 'out' })} />;
    }
  }

  const ax = { fontFamily: fonts.mono, fontSize: 10 };
  return (
    <View onLayout={onLayout} style={[tipBox(H), { marginTop: 12 }]}>
      {W > 0 && (
        <Pressable onPress={onPress} accessibilityLabel="Gasto por dia no mês, com entradas e vencimentos marcados. Toque num dia para ver o valor.">
          <View pointerEvents="none">
            <Svg width={W} height={H}>
              <Line x1={L} x2={W - R} y1={base} y2={base} stroke={t.line} />
              {p.daily.map((v, i) => {
                const d = i + 1, x = L + i * step + (step - bw) / 2, cx = x + bw / 2;
                const g = p.dominant[i];
                if (d > p.today) return <Rect key={d} x={x} y={base - 14} width={bw} height={14} rx={r} fill="none" stroke={t['line-2']} strokeDasharray="3 3" />;
                if (!v || !g) return null;
                const yy = y(v), over = v > cap;
                const dim = sel?.kind === 'out' && sel.day !== d;
                return (
                  <React.Fragment key={d}>
                    <Path d={`M${x},${base}V${yy + r}q0,-${r} ${r},-${r}h${bw - 2 * r}q${r},0 ${r},${r}V${base}Z`} fill={t.color(group(g).color)} opacity={dim ? 0.4 : 1} />
                    {over && (
                      <>
                        <Path d={`M${x - 1},${yy + 12}l${bw + 2},-5v5l-${bw + 2},5z`} fill={t.panel} />
                        <SvgText {...ax} x={cx} y={yy - 5} textAnchor="middle" fill={t['fg-2']}>{BRLk(v)}</SvgText>
                      </>
                    )}
                  </React.Fragment>
                );
              })}
              {[...inc.entries()].map(([d, amount]) => {
                const cx = cxOf(d);
                const right = cx > W - 80;
                return (
                  <React.Fragment key={`in${d}`}>
                    <Path d={`M${cx},8l5,7h-10z`} fill={t.pos} />
                    <SvgText fontFamily={fonts.monoMedium} fontSize={10} x={right ? cx - 8 : cx + 8} y={16} textAnchor={right ? 'end' : 'start'} fill={t.pos}>{`+ ${BRL(amount).replace(',00', '')}`}</SvgText>
                    <Line x1={cx} x2={cx} y1={18} y2={base} stroke={t.pos} strokeDasharray="2 4" opacity={0.6} />
                  </React.Fragment>
                );
              })}
              {bills.map((b) => (
                <React.Fragment key={`b${b.day}${b.label}`}>
                  <Line x1={b.cx} x2={b.cx} y1={base + 4} y2={base + 20 + b.dy} stroke={t['fg-3']} />
                  <SvgText {...ax} x={Math.max(24, Math.min(W - 24, b.cx))} y={base + 30 + b.dy} textAnchor="middle" fill={t['fg-2']}>{b.label}</SvgText>
                </React.Fragment>
              ))}
              {[1, 8, 15, 22, p.today].filter((d, i, a) => d <= n && a.indexOf(d) === i && (d === p.today || Math.abs(d - p.today) > 2)).map((d) => (
                <SvgText key={`t${d}`} {...ax} x={cxOf(d)} y={base + 14} textAnchor="middle" fill={t['fg-3']}>{d === p.today ? 'hoje' : String(d)}</SvgText>
              ))}
            </Svg>
          </View>
        </Pressable>
      )}
      {tip}
    </View>
  );
}

/** Cumulative spending this month (solid) against last month (dashed). Tap or drag to read the values. */
export function PaceChart({ cum, prevCum, current, prevLabel }: { cum: number[]; prevCum: number[]; current: string; prevLabel: string }) {
  const t = useTheme();
  const [W, onLayout] = useWidth();
  const [hover, setHover] = useState<number | null>(null);
  const gesture = useRef({ moved: false, wasOn: null as number | null });
  const H = 190, L = 46, R = 8, Tp = 10, B = 22;
  const days = Math.max(prevCum.length, 30);
  const hi = niceMax(Math.max(...cum, ...prevCum, 1));
  const x = (d: number) => L + ((d - 1) * (W - L - R)) / (days - 1);
  const y = (v: number) => Tp + ((hi - v) * (H - Tp - B)) / hi;
  const path = (a: number[]) => (a.length ? 'M' + a.map((v, i) => `${x(i + 1).toFixed(1)},${y(v).toFixed(1)}`).join('L') : '');
  const dayAt = (px: number) => Math.max(1, Math.min(days, Math.round((px - L) / ((W - L - R) / (days - 1))) + 1));
  const d = hover ?? cum.length;
  const ticks = [0, hi / 4, hi / 2, (3 * hi) / 4, hi];
  const ax = { fontFamily: fonts.mono, fontSize: 10, fill: t['fg-3'] };
  const tipV = hover ? cum[hover - 1] ?? prevCum[hover - 1] ?? 0 : 0;
  return (
    <View onLayout={onLayout} style={[tipBox(H), { marginTop: 14 }]}>
      {W > 0 && (
        <View
          accessibilityLabel={`Gasto acumulado: ${current} ${BRL(cum[cum.length - 1] ?? 0)} até o dia ${cum.length}`}
          onStartShouldSetResponder={() => true}
          onResponderTerminationRequest={() => false}
          onResponderGrant={(e) => {
            const day = dayAt(e.nativeEvent.locationX);
            gesture.current = { moved: false, wasOn: hover === day ? day : null };
            setHover(day);
          }}
          onResponderMove={(e) => {
            gesture.current.moved = true;
            setHover(dayAt(e.nativeEvent.locationX));
          }}
          onResponderRelease={() => {
            if (!gesture.current.moved && gesture.current.wasOn != null) setHover(null);
          }}
        >
          <View pointerEvents="none">
            <Svg width={W} height={H}>
              {ticks.map((v) => (
                <React.Fragment key={v}>
                  <Line x1={L} x2={W - R} y1={y(v)} y2={y(v)} stroke={t.line} />
                  <SvgText {...ax} x={L - 6} y={y(v) + 3.5} textAnchor="end">{v ? BRLk(v) : 'R$ 0'}</SvgText>
                </React.Fragment>
              ))}
              {[1, 8, 15, 22, days].map((tk) => (
                <SvgText key={tk} {...ax} x={x(tk)} y={H - 4} textAnchor="middle">{String(tk)}</SvgText>
              ))}
              <Path d={path(prevCum)} fill="none" stroke={t['fg-3']} strokeWidth={1.6} strokeDasharray="4 4" />
              <Path d={path(cum)} fill="none" stroke={t.mint} strokeWidth={2} strokeLinejoin="round" />
              {hover && <Line x1={x(hover)} x2={x(hover)} y1={Tp} y2={H - B} stroke={t['fg-3']} />}
              {hover && prevCum[hover - 1] != null && <Circle r={3.5} fill={t['fg-3']} cx={x(hover)} cy={y(prevCum[hover - 1])} />}
              {cum[d - 1] != null && <Circle r={4.5} fill={t.mint} stroke={t.panel} strokeWidth={2} cx={x(d)} cy={y(cum[d - 1])} />}
            </Svg>
          </View>
        </View>
      )}
      {hover != null && W > 0 && (
        <Tip
          x={x(hover)}
          y={y(tipV)}
          h={H}
          width={W}
          lines={[`Dia ${hover}`, cum[hover - 1] != null ? `${current}: ${BRL(cum[hover - 1])}` : null, prevCum[hover - 1] != null ? `${prevLabel}: ${BRL(prevCum[hover - 1])}` : null].filter((l): l is string => !!l)}
        />
      )}
    </View>
  );
}

/** Shade for heatmap level 0–4, as the web's color-mix steps. */
export function heatShade(t: ReturnType<typeof useTheme>, l: number) {
  return [t.raise, t.mix(t.mint, 25, t.raise), t.mix(t.mint, 50, t.raise), t.mix(t.mint, 75, t.raise), t.mint][l];
}

/** Calendar of the month; tap a day to open its transactions, long-press to read its total. */
export function Heatmap({ ym, daily, firstWeekday, today, monthShort }: { ym: string; daily: number[]; firstWeekday: number; today: number; monthShort: string }) {
  const t = useTheme();
  const [W, onLayout] = useWidth();
  const [peek, setPeek] = useState<number | null>(null);
  const past = daily.slice(0, today).filter((v) => v > 0).sort((a, b) => b - a);
  const max = past[Math.min(2, past.length - 1)] ?? 1; // third-highest day, so one huge bill doesn't flatten the rest
  const gap = 4, cw = W ? (W - gap * 6) / 7 : 0, ch = cw / 1.35;
  const cell = { width: cw, height: ch, borderRadius: 5, paddingHorizontal: 5, paddingVertical: 3 };
  const num = { fontFamily: fonts.mono, fontSize: 10.5, lineHeight: 14 };
  return (
    <View onLayout={onLayout} style={{ marginTop: 12 }}>
      {W > 0 && (
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap }}>
          {['D', 'S', 'T', 'Q', 'Q', 'S', 'S'].map((d, i) => (
            <T key={`w${i}`} c="fg-3" mono size={10.5} center style={{ width: cw }}>{d}</T>
          ))}
          {Array.from({ length: firstWeekday }, (_, i) => <View key={`x${i}`} style={cell} />)}
          {daily.map((v, i) => {
            const d = i + 1;
            if (d > today)
              return (
                <View key={d} style={[cell, { borderWidth: 1, borderStyle: 'dashed', borderColor: t['line-2'] }]}>
                  <T c="fg-3" style={num}>{d}</T>
                </View>
              );
            const l = v > 0 ? Math.max(1, Math.min(4, Math.ceil((v / max) * 4))) : 0;
            return (
              <Pressable
                key={d}
                onPress={() => router.push(txHref({ from: dayOf(ym, d), kind: 'out' }) as Href)}
                onLongPress={() => setPeek(d)}
                onPressOut={() => setPeek(null)}
                accessibilityLabel={`Dia ${d}: ${BRL(v)}. Ver transações`}
                style={({ pressed }) => [cell, { backgroundColor: heatShade(t, l), opacity: pressed ? 0.7 : 1 }, d === today && { borderWidth: 1.5, borderColor: t.fg }]}
              >
                <T c={l >= 3 ? 'mint-ink' : 'fg-2'} style={num}>{d}</T>
              </Pressable>
            );
          })}
        </View>
      )}
      <T c="fg-3" size={11.5} style={{ marginTop: 8, minHeight: 16 }}>
        {peek ? `${dd(peek)} ${monthShort} · ${BRL(daily[peek - 1])}` : 'segure um dia para ver o total'}
      </T>
    </View>
  );
}
