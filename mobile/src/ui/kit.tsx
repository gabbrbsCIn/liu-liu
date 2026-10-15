import { Link, router, type Href } from 'expo-router';
import { ActivityIndicator, Pressable, RefreshControl, ScrollView, StyleSheet, Text, TextInput, View, type PressableProps, type StyleProp, type TextInputProps, type TextProps, type TextStyle, type ViewStyle } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Circle, Path, Rect } from 'react-native-svg';
import { addMonths, monthLabel, ymOf } from '@shared/dates';
import { fonts, useTheme, type Token } from './theme';

// Building blocks that mirror the web's CSS classes (.p, .lbl, .big, .row, .more, .chg…).

type TProps = TextProps & { c?: Token; size?: number; w?: 'regular' | 'medium' | 'semi' | 'bold' | 'heavy'; mono?: boolean; narrow?: boolean; center?: boolean };

const weightFont = { regular: fonts.ui, medium: fonts.uiMedium, semi: fonts.uiSemi, bold: fonts.uiBold, heavy: fonts.uiHeavy };

/** Text in the app's font and colors. `mono` for figures in tables, `narrow` for the big condensed numbers. */
export function T({ c = 'fg', size = 14, w = 'regular', mono, narrow, center, style, ...rest }: TProps) {
  const t = useTheme();
  const fontFamily = narrow ? (w === 'semi' || w === 'medium' ? fonts.narrowSemi : fonts.narrow) : mono ? (w === 'regular' ? fonts.mono : fonts.monoMedium) : weightFont[w];
  return <Text {...rest} style={[{ color: t[c], fontSize: size, fontFamily, lineHeight: Math.round(size * 1.4), fontVariant: ['tabular-nums'] }, center && { textAlign: 'center' }, style]} />;
}

/** Uppercase section label (.lbl). */
export const Label = ({ children, style }: { children: React.ReactNode; style?: StyleProp<TextStyle> }) => (
  <T c="fg-2" size={11.5} w="medium" style={[{ letterSpacing: 0.8, textTransform: 'uppercase' }, style]}>{children}</T>
);

/** A panel (.p). */
export function Panel({ children, style, flush }: { children: React.ReactNode; style?: StyleProp<ViewStyle>; flush?: boolean }) {
  const t = useTheme();
  return <View style={[{ backgroundColor: t.panel, borderColor: t.line, borderWidth: StyleSheet.hairlineWidth * 2, borderRadius: 14, padding: flush ? 0 : 18 }, style]}>{children}</View>;
}

/** Panel header: label on the left, an action on the right (.ph). */
export const PanelHead = ({ label, right, style }: { label: React.ReactNode; right?: React.ReactNode; style?: StyleProp<ViewStyle> }) => (
  <View style={[{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 10 }, style]}>
    {typeof label === 'string' ? <Label>{label}</Label> : label}
    {right}
  </View>
);

/** Big condensed figure with an optional small caption after it (.big + small). */
export const Big = ({ children, small, size = 34, style }: { children: React.ReactNode; small?: string; size?: number; style?: StyleProp<TextStyle> }) => (
  <T narrow size={size} style={[{ marginTop: 8, lineHeight: Math.round(size * 1.1) }, style]}>
    {children}
    {small ? <T c="fg-2" size={14}>{` ${small}`}</T> : null}
  </T>
);

/** Mint text action (.more). Navigates with `href`, or runs `onPress`. */
export function More({ children, href, onPress }: { children: React.ReactNode; href?: Href; onPress?: () => void }) {
  const text = <T c="mint" size={12.5} w="medium">{children}</T>;
  if (href) return <Link href={href}>{text}</Link>;
  return <Pressable onPress={onPress} hitSlop={10}>{text}</Pressable>;
}

/** Footer line of a panel (.foot). */
export function Foot({ children, style }: { children: React.ReactNode; style?: StyleProp<ViewStyle> }) {
  const t = useTheme();
  return <View style={[{ borderTopWidth: 1, borderTopColor: t.line, marginTop: 14, paddingTop: 12, flexDirection: 'row', justifyContent: 'space-between', gap: 8, flexWrap: 'wrap' }, style]}>{children}</View>;
}

/** A list row; pressable when it has `href` or `onPress`. */
export function Row({ children, href, onPress, style, last }: { children: React.ReactNode; href?: Href; onPress?: () => void; style?: StyleProp<ViewStyle>; last?: boolean }) {
  const t = useTheme();
  const base: StyleProp<ViewStyle> = [{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 11, borderBottomWidth: last ? 0 : 1, borderBottomColor: t.line }, style];
  // Not <Link asChild>: on web it drops the Pressable's style function and the row loses its layout.
  const press = href ? () => router.push(href) : onPress;
  if (press) return <Pressable onPress={press} accessibilityRole={href ? 'link' : 'button'} style={({ pressed }) => [base, pressed && { opacity: 0.6 }]}>{children}</Pressable>;
  return <View style={base}>{children}</View>;
}

/** Percentage change badge (.chg good/bad/flat). */
export function Change({ kind, children }: { kind: 'good' | 'bad' | 'flat'; children: React.ReactNode }) {
  const t = useTheme();
  const c = kind === 'good' ? t.pos : kind === 'bad' ? t.neg : t['fg-2'];
  return (
    <View style={{ backgroundColor: kind === 'flat' ? t['raise-2'] : t.mix(c, 16), borderRadius: 6, paddingHorizontal: 7, paddingVertical: 2, alignSelf: 'flex-start' }}>
      <Text style={{ color: c, fontSize: 12, fontFamily: fonts.mono }}>{children}</Text>
    </View>
  );
}

/** Thin progress bar (.bar). */
export function Bar({ pct, color, style, height = 6 }: { pct: number; color?: string; style?: StyleProp<ViewStyle>; height?: number }) {
  const t = useTheme();
  return (
    <View style={[{ height, borderRadius: height / 2, backgroundColor: t.raise, overflow: 'hidden' }, style]}>
      <View style={{ width: `${Math.max(0, Math.min(100, pct))}%`, height: '100%', borderRadius: height / 2, backgroundColor: color ?? t.mint }} />
    </View>
  );
}

/** Colored dot (.cdot). */
export const Dot = ({ color, size = 8 }: { color: string; size?: number }) => <View style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: color }} />;

const KNOWN: Record<string, string> = { nubank: 'nu', 'itaú': 'itaú', itau: 'itaú', inter: 'in', bradesco: 'bra', santander: 'san', 'c6 bank': 'c6', btg: 'btg', xp: 'xp', 'mercado pago': 'mp', picpay: 'pic', caixa: 'cx', 'banco do brasil': 'bb', dinheiro: 'R$' };

/** The bank's square with its short name (same rules as the web's BankTile). */
export function BankTile({ name, color, small }: { name: string; color: string | null; small?: boolean }) {
  const t = useTheme();
  const n = name.toLowerCase().replace(/^banco\s+(?!do brasil)/, '').trim();
  const s = (KNOWN[n] ?? n.slice(0, 3)).slice(0, small ? 2 : 3);
  const size = small ? 18 : 34;
  return (
    <View style={{ width: size, height: size, borderRadius: small ? 5 : 9, backgroundColor: color ?? t['raise-2'], alignItems: 'center', justifyContent: 'center' }}>
      <Text style={{ color: color ? '#fff' : t.fg, fontFamily: fonts.uiBold, fontSize: small ? 8.5 : 12, letterSpacing: -0.3 }}>{s}</Text>
    </View>
  );
}

/** The "ll" mark with mint dots. */
export function Mark({ size = 26 }: { size?: number }) {
  const t = useTheme();
  return (
    <Svg width={size} height={size} viewBox="0 0 64 64">
      <Rect width={64} height={64} rx={15} fill={t.fg} />
      <Rect x={20} y={22} width={8.5} height={30} rx={4.25} fill={t.bg} />
      <Rect x={35.5} y={22} width={8.5} height={30} rx={4.25} fill={t.bg} />
      <Circle cx={24.25} cy={13.5} r={4.75} fill={t.mint} />
      <Circle cx={39.75} cy={13.5} r={4.75} fill={t.mint} />
    </Svg>
  );
}

/** "liu liu" wordmark: dotless i's with mint dots. */
export function Wordmark({ size = 24 }: { size?: number }) {
  const t = useTheme();
  const word = (k: string) => (
    <View key={k} style={{ flexDirection: 'row', alignItems: 'flex-end' }}>
      <T size={size} w="heavy" style={{ lineHeight: size * 1.15, letterSpacing: -0.6 }}>l</T>
      <View>
        <View style={{ position: 'absolute', top: size * 0.2, left: '50%', marginLeft: -size * 0.12, width: size * 0.24, height: size * 0.24, borderRadius: size, backgroundColor: t.mint }} />
        <T size={size} w="heavy" style={{ lineHeight: size * 1.15 }}>ı</T>
      </View>
      <T size={size} w="heavy" style={{ lineHeight: size * 1.15, letterSpacing: -0.6 }}>u</T>
    </View>
  );
  return <View style={{ flexDirection: 'row', gap: size * 0.22 }} accessibilityLabel="liu liu">{[word('a'), word('b')]}</View>;
}

const PATHS: Record<string, string> = {
  home: 'M4 20V10M10 20V4M16 20v-7M21 20H3',
  tx: 'M4 7h13M14 4l3 3-3 3M20 17H7M10 14l-3 3 3 3',
  inst: 'M5 6h14a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2zM3 10h18',
  cats: 'M3 12V4h8l10 10-8 8zM7.5 8.5h.01',
  plus: 'M12 5v14M5 12h14',
  history: 'M3 12a9 9 0 1 0 3-6.7L3 8M3 3v5h5M12 7v5l3 2',
  trash: 'M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3',
  invest: 'M3 17l6-6 4 4 8-8M15 7h6v6',
  cards: 'M5 5h11a2 2 0 0 1 2 2v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2zM7 19h12a2 2 0 0 0 2-2V9',
  search: 'M11 4.5a6.5 6.5 0 1 1 0 13 6.5 6.5 0 0 1 0-13zM20 20l-4.2-4.2',
  send: 'M5 12h13M13 6l6 6-6 6',
  close: 'M6 6l12 12M18 6L6 18',
  sync: 'M20 11a8 8 0 0 0-14.9-3M4 13a8 8 0 0 0 14.9 3M4 4v4h4M20 20v-4h-4',
  chev: 'M9 6l6 6-6 6',
  back: 'M15 6l-6 6 6 6',
  lock: 'M7 11h10a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2zM8 11V8a4 4 0 0 1 8 0v3',
  more: 'M5 12h.01M12 12h.01M19 12h.01',
  chat: 'M4 5h16v11H9l-5 4z',
  filter: 'M4 6h16M7 12h10M10 18h4',
  bank: 'M3 10l9-6 9 6M5 10v8M9 10v8M15 10v8M19 10v8M3 20h18',
  logout: 'M15 4h3a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-3M10 16l-4-4 4-4M6 12h10',
};

export type IconName = keyof typeof PATHS;

/** Line icons, same drawings as the web (24×24, 1.6 stroke). */
export function Icon({ name, size = 18, color, strokeWidth = 1.7 }: { name: IconName; size?: number; color?: string; strokeWidth?: number }) {
  const t = useTheme();
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color ?? t.fg} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round">
      <Path d={PATHS[name]} />
    </Svg>
  );
}

/** Button (.btn / .btn.pri / .btn.danger). */
export function Button({ title, kind = 'default', loading, disabled, style, ...rest }: PressableProps & { title: string; kind?: 'default' | 'primary' | 'danger'; loading?: boolean; style?: StyleProp<ViewStyle> }) {
  const t = useTheme();
  const bg = kind === 'primary' ? t.mint : kind === 'danger' ? t.neg : t.raise;
  const fg = kind === 'primary' ? t['mint-ink'] : kind === 'danger' ? '#fff' : t.fg;
  return (
    <Pressable
      {...rest}
      disabled={disabled || loading}
      style={({ pressed }) => [{ backgroundColor: bg, borderRadius: 10, paddingHorizontal: 16, paddingVertical: 12, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 8, borderWidth: kind === 'default' ? 1 : 0, borderColor: t['line-2'], opacity: disabled ? 0.5 : pressed ? 0.75 : 1 }, style]}
    >
      {loading && <ActivityIndicator size="small" color={fg} />}
      <Text style={{ color: fg, fontFamily: fonts.uiSemi, fontSize: 15 }}>{title}</Text>
    </Pressable>
  );
}

/** Text field (.field). */
export function Field({ style, ...rest }: TextInputProps) {
  const t = useTheme();
  return (
    <TextInput
      placeholderTextColor={t['fg-3']}
      {...rest}
      style={[{ backgroundColor: t.raise, borderColor: t['line-2'], borderWidth: 1, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 11, color: t.fg, fontFamily: fonts.ui, fontSize: 15 }, style]}
    />
  );
}

/**
 * Scrollable screen body with pull-to-refresh. Wrap each tab/screen in it.
 * `refreshing`/`onRefresh` usually come from the screen's useApi() (isRefetching / refetch).
 */
export function Screen({ children, refreshing = false, onRefresh, contentStyle, scroll = true }: { children: React.ReactNode; refreshing?: boolean; onRefresh?: () => void; contentStyle?: StyleProp<ViewStyle>; scroll?: boolean }) {
  const t = useTheme();
  const insets = useSafeAreaInsets();
  const pad: ViewStyle = { padding: 14, paddingBottom: 110 + insets.bottom, gap: 12 };
  if (!scroll) return <View style={[{ flex: 1, backgroundColor: t.bg }, pad, contentStyle]}>{children}</View>;
  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: t.bg }}
      contentContainerStyle={[pad, contentStyle]}
      refreshControl={onRefresh ? <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={t.mint} colors={[t.mint]} /> : undefined}
    >
      {children}
    </ScrollView>
  );
}

/** Loading / error / empty state for a whole screen. */
export function Status({ loading, error, onRetry, title, text, children }: { loading?: boolean; error?: { message: string } | null; onRetry?: () => void; title?: string; text?: string; children?: React.ReactNode }) {
  const t = useTheme();
  return (
    <View style={{ flex: 1, backgroundColor: t.bg, alignItems: 'center', justifyContent: 'center', padding: 28, gap: 12 }}>
      {loading ? (
        <ActivityIndicator color={t.mint} />
      ) : (
        <>
          <Mark size={34} />
          {(title || error) && <T size={18} w="semi" center>{error ? 'Algo deu errado' : title}</T>}
          {(text || error) && <T c={error ? 'neg' : 'fg-2'} center style={{ maxWidth: 320 }}>{error ? error.message : text}</T>}
          {children}
          {error && onRetry && <Button title="Tentar de novo" onPress={onRetry} />}
        </>
      )}
    </View>
  );
}

/** ‹ Setembro 2026 › — the month switch used by home and categories. Never goes past the current month. */
export function MonthSwitch({ ym, today, onChange }: { ym: string; today: string; onChange: (ym: string) => void }) {
  const t = useTheme();
  const current = ymOf(today);
  const next = addMonths(ym, 1);
  const btn = (label: string, to: string | null, a11y: string) => (
    <Pressable onPress={() => to && onChange(to)} disabled={!to} hitSlop={8} accessibilityLabel={a11y} style={{ width: 34, height: 34, borderRadius: 9, alignItems: 'center', justifyContent: 'center', backgroundColor: t.raise, opacity: to ? 1 : 0.3 }}>
      <Icon name={label === '‹' ? 'back' : 'chev'} size={16} color={t['fg-2']} />
    </Pressable>
  );
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
      {btn('‹', addMonths(ym, -1), 'Mês anterior')}
      <T w="semi" center style={{ minWidth: 140 }}>{monthLabel(ym)}</T>
      {btn('›', next <= current ? next : null, 'Próximo mês')}
    </View>
  );
}
