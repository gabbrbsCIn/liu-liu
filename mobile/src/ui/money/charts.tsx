import { router, type Href } from 'expo-router';
import { useRef, useState } from 'react';
import { Pressable, View, type StyleProp, type ViewStyle } from 'react-native';
import Svg, { Circle, G, Line, Path, Rect, Text as SvgText } from 'react-native-svg';
import { group } from '@shared/categories';
import { BRL, BRLk } from '@shared/format';
import { T } from '../kit';
import { fonts, useTheme } from '../theme';

// Phone versions of the web's charts (src/components/charts.tsx). Hover tooltips become tap-to-show:
// tap a mark to see its data-t text, tap anywhere else in the chart to hide it.

type TipState = { x: number; y: number; text: string } | null;

export function niceMax(v: number) {
  if (v <= 0) return 100;
  const p = Math.pow(10, Math.floor(Math.log10(v)));
  for (const m of [1, 1.5, 2, 2.5, 3, 4, 5, 6, 8, 10]) if (m * p >= v) return m * p;
  return 10 * p;
}

/** "x,y%" with one decimal, as the web prints percentages. */
export const pct1 = (x: number) => `${(x * 100).toFixed(1).replace('.', ',')}%`;

/** Bar with rounded top corners, from baseline y0 up to yTop. */
const topBar = (x: number, y0: number, yTop: number, bw: number, r: number) => {
  const rr = Math.max(0, Math.min(r, (y0 - yTop) / 2, bw / 2));
  return `M${x},${y0}V${yTop + rr}q0,${-rr} ${rr},${-rr}h${bw - 2 * rr}q${rr},0 ${rr},${rr}V${y0}Z`;
};

/** Small floating label above a point, kept inside the chart's width. */
function Tip({ tip, width }: { tip: NonNullable<TipState>; width: number }) {
  const t = useTheme();
  const [size, setSize] = useState({ w: 0, h: 0 });
  const left = Math.max(0, Math.min(width - size.w, tip.x - size.w / 2));
  return (
    <View
      pointerEvents="none"
      onLayout={(e) => setSize({ w: e.nativeEvent.layout.width, h: e.nativeEvent.layout.height })}
      style={{ position: 'absolute', left, top: tip.y - size.h - 8, opacity: size.w ? 1 : 0, backgroundColor: t['raise-2'], borderColor: t['line-2'], borderWidth: 1, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6, zIndex: 3 }}
    >
      {tip.text.split('\n').map((l, i) => <T key={i} size={12} style={{ lineHeight: 18 }}>{l}</T>)}
    </View>
  );
}

type Show = (x: number, y: number, text: string) => void;

/**
 * Measures its width and hosts a tooltip. `children(width, show)` draws the chart; marks call `show`
 * from their onPress. Pressing the chart outside a mark hides the tooltip.
 */
export function ChartBox({ height, children, style }: { height: number; children: (w: number, show: Show) => React.ReactNode; style?: StyleProp<ViewStyle> }) {
  const [w, setW] = useState(0);
  const [tip, setTip] = useState<TipState>(null);
  const last = useRef(0);
  const show: Show = (x, y, text) => {
    last.current = Date.now();
    setTip((cur) => (cur && cur.text === text ? null : { x, y, text }));
  };
  return (
    <Pressable
      onLayout={(e) => setW(Math.round(e.nativeEvent.layout.width))}
      onPress={() => Date.now() - last.current > 250 && setTip(null)}
      style={[{ height, marginTop: 12 }, style]}
    >
      {w > 0 && children(w, show)}
      {tip && <Tip tip={tip} width={w} />}
    </Pressable>
  );
}

/** Axis text (.ax). */
function Ax({ x, y, anchor = 'start', fill, children }: { x: number; y: number; anchor?: 'start' | 'middle' | 'end'; fill?: string; children: string }) {
  const t = useTheme();
  return <SvgText x={x} y={y} textAnchor={anchor} fill={fill ?? t['fg-3']} fontSize={10.5} fontFamily={fonts.mono}>{children}</SvgText>;
}

/** Legend entry: colored square + text (.legend .sq). */
export function LegendItem({ color, children, dashed }: { color: string; children: React.ReactNode; dashed?: boolean }) {
  const t = useTheme();
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 7 }}>
      <View style={[{ width: 9, height: 9, borderRadius: 2, backgroundColor: color }, dashed && { backgroundColor: 'transparent', borderWidth: 1, borderStyle: 'dashed', borderColor: t['fg-3'] }]} />
      <T c="fg-2" size={12}>{children}</T>
    </View>
  );
}

export const Legend = ({ children, style }: { children: React.ReactNode; style?: StyleProp<ViewStyle> }) => (
  <View style={[{ flexDirection: 'row', flexWrap: 'wrap', columnGap: 16, rowGap: 6, marginTop: 10 }, style]}>{children}</View>
);

export type RulerSegment = { key: string; value: number; color: string; tip: string; href?: Href };

/**
 * Proportion bar (.ruler). Segments with `href` open it on tap (long-press shows the tooltip);
 * the others show the tooltip on tap.
 */
export function Ruler({ segments, style }: { segments: RulerSegment[]; style?: StyleProp<ViewStyle> }) {
  const t = useTheme();
  const [w, setW] = useState(0);
  const [tip, setTip] = useState<TipState>(null);
  const total = segments.reduce((s, x) => s + x.value, 0) || 1;
  const gaps = Math.max(0, segments.length - 1) * 2;
  let acc = 0;
  const pos = segments.map((s) => {
    const sw = Math.max(3, ((w - gaps) * s.value) / total);
    const x = acc;
    acc += sw + 2;
    return { x, w: sw };
  });
  return (
    <View onLayout={(e) => setW(e.nativeEvent.layout.width)} style={[{ marginTop: 16, marginBottom: 10 }, style]}>
      <View style={{ flexDirection: 'row', gap: 2, height: 14 }}>
        {segments.map((s, i) => {
          const showTip = () => setTip((cur) => (cur?.text === s.tip ? null : { x: pos[i].x + pos[i].w / 2, y: 0, text: s.tip }));
          return (
            <Pressable
              key={s.key}
              accessibilityLabel={s.tip}
              onPress={s.href ? () => router.push(s.href!) : showTip}
              onLongPress={s.href ? showTip : undefined}
              hitSlop={{ top: 10, bottom: 10 }}
              style={({ pressed }) => ({ flex: s.value, minWidth: 3, height: '100%', borderRadius: 3, backgroundColor: pressed ? t.mix(s.color, 80, '#ffffff') : s.color })}
            />
          );
        })}
      </View>
      {tip && <Tip tip={tip} width={w} />}
    </View>
  );
}

type CommittedItem = { key: string; description: string; group_key: string; value: number };

/** Installments already committed in the coming months, stacked per purchase. */
/** Value above a bar; narrow columns drop the "R$ " so neighbouring labels don't overlap. */
const barLabel = (v: number, step: number) => (step < 56 ? BRLk(v).replace('R$ ', '') : BRLk(v));

export function CommittedChart({ months }: { months: { label: string; total: number; items: CommittedItem[] }[] }) {
  const t = useTheme();
  const H = 190, L = 46, R = 4, Tp = 18, B = 22;
  const hi = niceMax(Math.max(...months.map((m) => m.total), 100));
  const y = (v: number) => Tp + ((hi - v) * (H - Tp - B)) / hi;
  return (
    <ChartBox height={H}>
      {(W, show) => {
        const step = (W - L - R) / Math.max(months.length, 1), bw = Math.max(8, Math.min(26, step - 8));
        return (
          <Svg width={W} height={H}>
            {[0, hi / 3, (2 * hi) / 3, hi].map((v) => (
              <G key={v}>
                <Line x1={L} x2={W - R} y1={y(v)} y2={y(v)} stroke={t.line} strokeWidth={1} />
                <Ax x={L - 6} y={y(v) + 3.5} anchor="end">{v ? BRLk(v) : 'R$ 0'}</Ax>
              </G>
            ))}
            {months.map((m, k) => {
              const cx = L + step * k + step / 2;
              let acc = 0;
              return (
                <G key={m.label + k}>
                  {m.items.map((it, j) => {
                    const y0 = y(acc), y1 = y(acc + it.value) + (acc > 0 ? 1 : 0);
                    acc += it.value;
                    const fill = t.color(group(it.group_key).color);
                    const text = `${it.description} · ${BRL(it.value)}`;
                    const press = () => show(cx, y1, text);
                    return j === m.items.length - 1 ? (
                      <Path key={it.key} d={topBar(cx - bw / 2, y0, y1, bw, 4)} fill={fill} onPress={press} />
                    ) : (
                      <Rect key={it.key} x={cx - bw / 2} y={y1} width={bw} height={Math.max(0, y0 - y1 - 2)} fill={fill} onPress={press} />
                    );
                  })}
                  <Ax x={cx} y={y(m.total) - 6} anchor="middle" fill={m.total ? t['fg-2'] : undefined}>{m.total ? barLabel(m.total, step) : 'livre'}</Ax>
                  <Ax x={cx} y={H - 4} anchor="middle">{m.label}</Ax>
                </G>
              );
            })}
          </Svg>
        );
      }}
    </ChartBox>
  );
}

/** Last bills of a card, plus a dashed bar with what next month's bill already has in installments. */
export function BillsChart({ bills, next }: { bills: { label: string; total: number; current: boolean }[]; next: { label: string; total: number } | null }) {
  const t = useTheme();
  const H = 150, bw = 30;
  const hi = niceMax(Math.max(...bills.map((b) => b.total), next?.total ?? 0, 100));
  const cols = bills.length + (next ? 1 : 0);
  const y = (v: number) => 8 + ((hi - v) * (H - 30)) / hi;
  return (
    <ChartBox height={H}>
      {(W, show) => {
        const step = W / Math.max(cols, 1);
        return (
          <Svg width={W} height={H}>
            {[0, hi / 2, hi].map((v) => <Line key={v} x1={0} x2={W} y1={y(v)} y2={y(v)} stroke={t.line} strokeWidth={1} />)}
            {bills.map((b, i) => {
              const x = step * i + step / 2 - bw / 2;
              return (
                <G key={b.label + i}>
                  <Path d={topBar(x, y(0), y(b.total), bw, 3)} fill={b.current ? t.mint : t['raise-2']} onPress={() => show(x + bw / 2, y(b.total), `Fatura ${b.label} · ${BRL(b.total)}`)} />
                  <Ax x={x + bw / 2} y={H - 6} anchor="middle">{b.label}</Ax>
                </G>
              );
            })}
            {next && (() => {
              const x = step * bills.length + step / 2 - bw / 2;
              return (
                <G>
                  <Path d={topBar(x, y(0), y(next.total), bw, 3)} fill="transparent" stroke={t['fg-3']} strokeDasharray="3 3" onPress={() => show(x + bw / 2, y(next.total), `${next.label}: já comprometido em parcelas · ${BRL(next.total)}`)} />
                  <Ax x={x + bw / 2} y={H - 6} anchor="middle">{next.label}</Ax>
                </G>
              );
            })()}
          </Svg>
        );
      }}
    </ChartBox>
  );
}

/** Money that becomes available each year, from fixed-income maturities. */
export function MaturityChart({ years, noDue }: { years: { year: string; total: number }[]; noDue: number }) {
  const t = useTheme();
  const cols = [...years.map((y) => ({ label: y.year, total: y.total, free: false })), ...(noDue > 0 ? [{ label: 'sem prazo', total: noDue, free: true }] : [])];
  const H = 180, L = 46, R = 4, Tp = 18, B = 22;
  const hi = niceMax(Math.max(...cols.map((c) => c.total), 100));
  const y = (v: number) => Tp + ((hi - v) * (H - Tp - B)) / hi;
  return (
    <ChartBox height={H}>
      {(W, show) => {
        const step = (W - L - R) / Math.max(cols.length, 1), bw = Math.max(8, Math.min(36, step - 12));
        return (
          <Svg width={W} height={H}>
            {[0, hi / 2, hi].map((v) => (
              <G key={v}>
                <Line x1={L} x2={W - R} y1={y(v)} y2={y(v)} stroke={t.line} strokeWidth={1} />
                <Ax x={L - 6} y={y(v) + 3.5} anchor="end">{v ? BRLk(v) : 'R$ 0'}</Ax>
              </G>
            ))}
            {cols.map((c, k) => {
              const x = L + step * k + step / 2 - bw / 2;
              const text = c.free ? `Sem vencimento (ações, liquidez diária) · ${BRL(c.total)}` : `Vence em ${c.label} · ${BRL(c.total)}`;
              return (
                <G key={c.label}>
                  <Path
                    d={topBar(x, y(0), y(c.total), bw, 4)}
                    fill={c.free ? 'transparent' : t.mint}
                    stroke={c.free ? t['fg-3'] : undefined}
                    strokeDasharray={c.free ? '3 3' : undefined}
                    onPress={() => show(x + bw / 2, y(c.total), text)}
                  />
                  <Ax x={x + bw / 2} y={y(c.total) - 6} anchor="middle" fill={t['fg-2']}>{barLabel(c.total, step)}</Ax>
                  <Ax x={x + bw / 2} y={H - 4} anchor="middle">{c.label}</Ax>
                </G>
              );
            })}
          </Svg>
        );
      }}
    </ChartBox>
  );
}

/** Invested total over time, from the daily snapshots taken at each sync. */
export function HistoryChart({ points }: { points: { day: string; total: number }[] }) {
  const t = useTheme();
  const H = 170, L = 48, R = 8, Tp = 10, B = 22;
  const vals = points.map((p) => p.total);
  const lo = Math.min(...vals), hiV = Math.max(...vals);
  const pad = Math.max((hiV - lo) * 0.15, hiV * 0.01, 1);
  const min = Math.max(0, lo - pad), max = hiV + pad;
  const y = (v: number) => Tp + ((max - v) * (H - Tp - B)) / (max - min);
  const dm = (d: string) => `${d.slice(8, 10)}/${d.slice(5, 7)}`;
  return (
    <ChartBox height={H}>
      {(W, show) => {
        const x = (i: number) => L + (i * (W - L - R)) / Math.max(points.length - 1, 1);
        const line = points.map((p, i) => `${x(i).toFixed(1)},${y(p.total).toFixed(1)}`).join('L');
        const lastI = points.length - 1;
        return (
          <Svg width={W} height={H}>
            {[min, (min + max) / 2, max].map((v) => (
              <G key={v}>
                <Line x1={L} x2={W - R} y1={y(v)} y2={y(v)} stroke={t.line} strokeWidth={1} />
                <Ax x={L - 6} y={y(v) + 3.5} anchor="end">{BRLk(v)}</Ax>
              </G>
            ))}
            <Path d={`M${line}L${x(lastI)},${H - B}L${L},${H - B}Z`} fill={t['mint-dim']} />
            <Path d={`M${line}`} fill="none" stroke={t.mint} strokeWidth={2} />
            {points.map((p, i) => (
              <Circle key={p.day} cx={x(i)} cy={y(p.total)} r={i === lastI ? 4.5 : 9} fill={i === lastI ? t.mint : 'transparent'} onPress={() => show(x(i), y(p.total) - 4, `${dm(p.day)} · ${BRL(p.total)}`)} />
            ))}
            <Ax x={L} y={H - 4}>{dm(points[0].day)}</Ax>
            <Ax x={W - R} y={H - 4} anchor="end">{dm(points[lastI].day)}</Ax>
          </Svg>
        );
      }}
    </ChartBox>
  );
}
