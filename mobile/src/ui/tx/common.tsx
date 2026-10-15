import DateTimePicker from '@react-native-community/datetimepicker';
import { useState } from 'react';
import { Modal, Platform, Pressable, ScrollView, Switch, View, type StyleProp, type ViewStyle } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { GROUPS, group } from '@shared/categories';
import { Field, Icon, T } from '@/ui/kit';
import { useTheme } from '@/ui/theme';

// Groups you can filter by: the spending groups plus income and moves between your own accounts.
export const CAT_GROUPS = [...GROUPS.map((g) => ({ key: g.key as string, name: g.name, color: g.color })), { key: 'entrada', name: 'Entradas', color: 'var(--pos)' }, { key: 'transfer', name: 'Entre suas contas', color: 'var(--line-2)' }];
export const groupMeta = (key: string) => CAT_GROUPS.find((g) => g.key === key) ?? { key, name: group(key).name, color: group(key).color };

const WD = ['domingo', 'segunda', 'terça', 'quarta', 'quinta', 'sexta', 'sábado'];
const MON = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];
export const dm = (d: string) => `${Number(d.slice(8, 10))} ${MON[Number(d.slice(5, 7)) - 1]}`;

export function dayTitle(d: string, today: string) {
  const label = `${WD[new Date(`${d}T12:00:00Z`).getUTCDay()]}, ${dm(d)}`;
  return d === today ? `Hoje · ${label}` : label[0].toUpperCase() + label.slice(1);
}

/** "12,34" → 12.34; empty or invalid → null. */
export const money = (v: string) => {
  const n = Number(v.replace(/\./g, '').replace(',', '.'));
  return v.trim() && Number.isFinite(n) && n >= 0 ? n : null;
};

/** Bottom sheet (the web's dropdown panels): slides up, closes on the backdrop or ✕. */
export function Sheet({ visible, title, onClose, children, scroll = true }: { visible: boolean; title: string; onClose: () => void; children: React.ReactNode; scroll?: boolean }) {
  const t = useTheme();
  const insets = useSafeAreaInsets();
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={{ flex: 1, justifyContent: 'flex-end' }}>
        <Pressable style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: '#0008' }} onPress={onClose} accessibilityLabel="Fechar" />
        <View style={{ maxHeight: '85%', backgroundColor: t.panel, borderTopLeftRadius: 18, borderTopRightRadius: 18, borderColor: t['line-2'], borderWidth: 1, paddingBottom: insets.bottom + 12 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingTop: 14, paddingBottom: 8 }}>
            <T size={16} w="semi">{title}</T>
            <Pressable onPress={onClose} hitSlop={10} accessibilityLabel="Fechar">
              <Icon name="close" color={t['fg-2']} />
            </Pressable>
          </View>
          {scroll ? (
            <ScrollView contentContainerStyle={{ paddingHorizontal: 12, paddingBottom: 8 }} keyboardShouldPersistTaps="handled">
              {children}
            </ScrollView>
          ) : (
            <View style={{ paddingHorizontal: 12, paddingBottom: 8, flexShrink: 1 }}>{children}</View>
          )}
        </View>
      </View>
    </Modal>
  );
}

/** Checkbox row (.fm-row). */
export function Check({ checked, onPress, disabled, children, style }: { checked: boolean; onPress: () => void; disabled?: boolean; children: React.ReactNode; style?: StyleProp<ViewStyle> }) {
  const t = useTheme();
  return (
    <Pressable onPress={onPress} disabled={disabled} accessibilityRole="checkbox" accessibilityState={{ checked, disabled }} style={({ pressed }) => [{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 9, paddingHorizontal: 6, borderRadius: 8, opacity: disabled ? 0.55 : 1 }, pressed && { backgroundColor: t.raise }, style]}>
      <View style={{ width: 20, height: 20, borderRadius: 5, borderWidth: 1.5, borderColor: checked ? t.mint : t['line-2'], backgroundColor: checked ? t.mint : 'transparent', alignItems: 'center', justifyContent: 'center' }}>
        {checked && <T c="mint-ink" size={13} w="bold" style={{ lineHeight: 15 }}>✓</T>}
      </View>
      {children}
    </Pressable>
  );
}

/** Label + switch row (the web's .check). */
export function Toggle({ value, onChange, children }: { value: boolean; onChange: (v: boolean) => void; children: React.ReactNode }) {
  const t = useTheme();
  return (
    <Pressable onPress={() => onChange(!value)} style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 10 }}>
      <T c="fg-2" size={13} style={{ flex: 1 }}>{children}</T>
      <Switch value={value} onValueChange={onChange} trackColor={{ true: t.mint, false: t['raise-2'] }} thumbColor="#fff" />
    </Pressable>
  );
}

const pad = (n: number) => String(n).padStart(2, '0');
const toDay = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

/** A YYYY-MM-DD date: the system picker on phones, a text field on the web. */
export function DateField({ value, onChange, max, label, style }: { value: string; onChange: (d: string) => void; max?: string; label?: string; style?: StyleProp<ViewStyle> }) {
  const t = useTheme();
  const [open, setOpen] = useState(false);
  const [text, setText] = useState(value);
  if (Platform.OS === 'web')
    return (
      <Field
        value={text}
        placeholder="AAAA-MM-DD"
        accessibilityLabel={label}
        maxLength={10}
        style={style}
        onChangeText={(v) => {
          setText(v);
          if (/^\d{4}-\d{2}-\d{2}$/.test(v) && !Number.isNaN(Date.parse(`${v}T12:00:00Z`))) onChange(v);
        }}
      />
    );
  const date = new Date(`${value}T12:00:00`);
  const maximumDate = max ? new Date(`${max}T12:00:00`) : undefined;
  if (Platform.OS === 'ios')
    return (
      <View style={[{ alignItems: 'flex-start', justifyContent: 'center' }, style]}>
        <DateTimePicker value={date} mode="date" display="compact" maximumDate={maximumDate} themeVariant={t.scheme} accentColor={t.mint} onChange={(_, d) => d && onChange(toDay(d))} />
      </View>
    );
  return (
    <>
      <Pressable onPress={() => setOpen(true)} accessibilityLabel={label} style={[{ backgroundColor: t.raise, borderColor: t['line-2'], borderWidth: 1, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 11 }, style]}>
        <T size={15}>{value.split('-').reverse().join('/')}</T>
      </Pressable>
      {open && (
        <DateTimePicker
          value={date}
          mode="date"
          maximumDate={maximumDate}
          onChange={(e, d) => {
            setOpen(false);
            if (e.type === 'set' && d) onChange(toDay(d));
          }}
        />
      )}
    </>
  );
}
