import { useColorScheme } from 'react-native';

// Same tokens as src/app/globals.css. Category colors come from Brazilian banknotes.
const dark = {
  bg: '#0c131b', panel: '#121b25', raise: '#18232f', 'raise-2': '#203040',
  line: '#1d2935', 'line-2': '#2a3846',
  fg: '#eef2f5', 'fg-2': '#9fb0be', 'fg-3': '#647686',
  mint: '#4fd3a0', 'mint-dim': '#4fd3a024', 'mint-ink': '#062a1d',
  pos: '#5fd39a', neg: '#ff7d72', warn: '#e8b52e',
  'c-moradia': '#2a8fb3', 'c-alim': '#e0546e', 'c-compras': '#b3900e', 'c-saude': '#5b7fc0',
  'c-lazer': '#b8702f', 'c-transp': '#9a6fc2', 'c-outros': '#66717d',
};

const light: typeof dark = {
  bg: '#eef2f5', panel: '#ffffff', raise: '#f1f4f7', 'raise-2': '#e3e9ee',
  line: '#e1e7ec', 'line-2': '#cfd8df',
  fg: '#0d1620', 'fg-2': '#4a5a68', 'fg-3': '#7f8e9b',
  mint: '#0f9466', 'mint-dim': '#0f946618', 'mint-ink': '#ffffff',
  pos: '#12804f', neg: '#c93a3a', warn: '#9c7400',
  'c-moradia': '#1f7fa3', 'c-alim': '#d2434a', 'c-compras': '#c9a21a', 'c-saude': '#4b6fb0',
  'c-lazer': '#a85f20', 'c-transp': '#8458b0', 'c-outros': '#8a939c',
};

export type Palette = typeof dark;
export type Token = keyof Palette;

export const fonts = {
  ui: 'Archivo_400Regular',
  uiMedium: 'Archivo_500Medium',
  uiSemi: 'Archivo_600SemiBold',
  uiBold: 'Archivo_700Bold',
  uiHeavy: 'Archivo_800ExtraBold',
  // Big numbers: the web uses Archivo at font-stretch ~75%; Archivo Narrow is the closest static cut.
  narrow: 'ArchivoNarrow_700Bold',
  narrowSemi: 'ArchivoNarrow_600SemiBold',
  mono: 'GeistMono_400Regular',
  monoMedium: 'GeistMono_500Medium',
};

export type Theme = Palette & {
  scheme: 'dark' | 'light';
  /** Resolves "var(--c-alim)" (as sent by the shared modules and the API) or a plain color. */
  color: (v: string | null | undefined, fallback?: string) => string;
  /** Like CSS color-mix(in srgb, a pct%, b). */
  mix: (a: string, pct: number, b?: string) => string;
};

function hex(c: string): [number, number, number, number] {
  const h = c.replace('#', '');
  const full = h.length === 3 ? h.split('').map((x) => x + x).join('') : h;
  const n = (i: number) => parseInt(full.slice(i, i + 2), 16);
  return [n(0), n(2), n(4), full.length >= 8 ? n(6) / 255 : 1];
}

function mixColors(a: string, pct: number, b: string): string {
  if (b === 'transparent') {
    const [r, g, bl, al] = hex(a);
    return `rgba(${r},${g},${bl},${((al * pct) / 100).toFixed(3)})`;
  }
  const x = hex(a), y = hex(b), k = pct / 100;
  const ch = (i: number) => Math.round(x[i] * k + y[i] * (1 - k)).toString(16).padStart(2, '0');
  return `#${ch(0)}${ch(1)}${ch(2)}`;
}

function build(p: Palette, scheme: 'dark' | 'light'): Theme {
  const color = (v: string | null | undefined, fallback = p['raise-2']) => {
    if (!v) return fallback;
    const m = v.match(/^var\(--([\w-]+)\)$/);
    if (m) return (p as Record<string, string>)[m[1]] ?? fallback;
    return v;
  };
  return { ...p, scheme, color, mix: (a, pct, b = 'transparent') => mixColors(color(a), pct, b === 'transparent' ? b : color(b)) };
}

const themes = { dark: build(dark, 'dark'), light: build(light, 'light') };

export function useTheme(): Theme {
  return useColorScheme() === 'light' ? themes.light : themes.dark;
}
