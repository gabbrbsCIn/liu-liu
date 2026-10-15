import { Link } from 'expo-router';
import { useRef, useState } from 'react';
import { Pressable, View } from 'react-native';
import { group, type GroupKey } from '@shared/categories';
import { monthName } from '@shared/dates';
import { BRL } from '@shared/format';
import { txHref } from '@shared/txFilter';
import { useApi } from '@/lib/api';
import type { CategoriesData } from '@/lib/types';
import { Bar, Icon, Label, MonthSwitch, Panel, Screen, Status, T } from '@/ui/kit';
import { Legend, pct1, Ruler } from '@/ui/money/charts';
import { useTheme } from '@/ui/theme';

type Group = CategoriesData['groups'][number];

export default function Categorias() {
  const t = useTheme();
  const [ym, setYm] = useState<string | null>(null);
  const { data, error, isLoading, refetch, isRefetching } = useApi<CategoriesData>(ym ? `/api/app/categories?m=${ym}` : '/api/app/categories');
  // Keep showing the last month while the next one loads, instead of blanking the screen.
  const last = useRef<CategoriesData | undefined>(undefined);
  if (data) last.current = data;
  const v = data ?? last.current;

  if (!v && isLoading) return <Status loading />;
  if (!v) return <Status error={error} onRetry={refetch} />;

  const { spent, groups } = v;
  const shown = groups.filter((g) => g.total > 0);
  return (
    <Screen refreshing={isRefetching} onRefresh={refetch}>
      <Panel>
        <View style={{ gap: 14 }}>
          <View>
            <T narrow size={34} style={{ lineHeight: 38 }}>{BRL(spent)}</T>
            <T c="fg-3" size={12.5} style={{ marginTop: 2 }}>gasto em {monthName(v.ym)} de {v.ym.slice(0, 4)}</T>
          </View>
          <MonthSwitch ym={v.ym} today={v.today} onChange={setYm} />
        </View>
        {spent > 0 && (
          <>
            <Ruler
              segments={shown.map((g) => ({
                key: g.key,
                value: g.total,
                color: t.color(group(g.key).color),
                tip: `${group(g.key).name} · ${BRL(g.total)} · ${pct1(g.total / spent)}`,
                href: txHref({ ym: v.ym, kind: 'out', cats: [g.key] }),
              }))}
            />
            <RulerLegend ym={v.ym} groups={shown} total={spent} />
          </>
        )}
        {error && <T c="neg" size={12.5} style={{ marginTop: 10 }}>{error.message}</T>}
      </Panel>
      <Panel flush>
        <View style={{ paddingHorizontal: 16, paddingTop: 16, paddingBottom: 8, gap: 4 }}>
          <Label>Categorias</Label>
          <T c="fg-3" size={12}>toque para abrir · toque numa subcategoria para ver as transações</T>
        </View>
        <CategoryGroups key={v.ym} ym={v.ym} groups={shown} total={spent || 1} />
      </Panel>
    </Screen>
  );
}

function RulerLegend({ ym, groups, total }: { ym: string; groups: Group[]; total: number }) {
  const t = useTheme();
  return (
    <Legend style={{ marginTop: 0 }}>
      {groups.map((g) => (
        <Link key={g.key} href={txHref({ ym, kind: 'out', cats: [g.key] })} asChild>
          <Pressable hitSlop={4} style={{ flexDirection: 'row', alignItems: 'center', gap: 7 }}>
            <View style={{ width: 9, height: 9, borderRadius: 2, backgroundColor: t.color(group(g.key).color) }} />
            <T c="fg-2" size={12}>
              {group(g.key).name} <T c="fg-3" size={12} mono>{Math.round((g.total / total) * 100)}%</T>
            </T>
          </Pressable>
        </Link>
      ))}
    </Legend>
  );
}

function CategoryGroups({ ym, groups, total }: { ym: string; groups: Group[]; total: number }) {
  const t = useTheme();
  const [open, setOpen] = useState<Set<string>>(() => new Set(groups.slice(0, 3).map((g) => g.key)));
  const max = groups[0]?.total ?? 1;
  if (!groups.length) return <T c="fg-3" style={{ paddingHorizontal: 16, paddingBottom: 16 }}>Nenhum gasto neste mês.</T>;
  const toggle = (k: string) => setOpen((s) => { const n = new Set(s); if (n.has(k)) n.delete(k); else n.add(k); return n; });
  return (
    <View>
      {groups.map((g, gi) => {
        const meta = group(g.key as GroupKey);
        const color = t.color(meta.color);
        const isOpen = open.has(g.key);
        return (
          <View key={g.key} style={{ borderTopWidth: gi ? 1 : 0, borderTopColor: t.line }}>
            <Pressable
              onPress={() => toggle(g.key)}
              accessibilityState={{ expanded: isOpen }}
              style={({ pressed }) => ({ paddingHorizontal: 14, paddingVertical: 13, gap: 9, backgroundColor: pressed ? t.raise : 'transparent' })}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                <View style={{ transform: [{ rotate: isOpen ? '90deg' : '0deg' }] }}>
                  <Icon name="chev" size={16} color={t['fg-3']} />
                </View>
                <View style={{ minWidth: 44, height: 26, paddingHorizontal: 6, borderRadius: 7, backgroundColor: color, alignItems: 'center', justifyContent: 'center' }}>
                  <T narrow size={12} style={{ color: '#fff', lineHeight: 15 }}>{meta.note ? `R$ ${meta.note}` : '···'}</T>
                </View>
                <View style={{ flex: 1, minWidth: 0 }}>
                  <T w="semi" size={15} numberOfLines={1}>{meta.name}</T>
                  <T c="fg-3" size={12}>
                    {g.subs.length} {g.subs.length === 1 ? 'subcategoria' : 'subcategorias'} · {pct1(g.total / total)}
                  </T>
                </View>
                <T mono w="medium" size={15}>{BRL(g.total)}</T>
              </View>
              <Bar pct={(g.total / max) * 100} color={color} style={{ marginLeft: 80 }} />
            </Pressable>
            {isOpen && (
              <View style={{ paddingLeft: 40, paddingRight: 14, paddingBottom: 10 }}>
                {g.subs.map((s) => (
                  <Link key={s.label} href={txHref({ ym, kind: 'out', cats: [`${g.key}:${s.label}`] })} asChild>
                    <Pressable
                      accessibilityLabel={`Ver transações de ${s.label}`}
                      style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 9, paddingLeft: 16, borderLeftWidth: 1, borderLeftColor: t['line-2'] }}
                    >
                      <T c="fg-2" size={13.5} style={{ flex: 1 }} numberOfLines={1}>{s.label}</T>
                      <T mono w="medium" size={13.5}>{BRL(s.total)}</T>
                    </Pressable>
                  </Link>
                ))}
                <Link href={txHref({ ym, kind: 'out', cats: [g.key] })} style={{ marginTop: 8, paddingVertical: 4 }}>
                  <T c="mint" size={12.5} w="medium">Ver todas as transações de {meta.name} →</T>
                </Link>
              </View>
            )}
          </View>
        );
      })}
    </View>
  );
}
