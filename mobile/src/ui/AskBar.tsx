import { Pressable } from 'react-native';
import { askLiu } from '@/lib/actions';
import { Mark, T } from './kit';
import { useTheme } from './theme';

/** Floating "Conversar com o liu liu" pill above the tab bar (the web's .ask button). */
export function AskBar({ bottom }: { bottom: number }) {
  const t = useTheme();
  return (
    <Pressable
      onPress={() => askLiu()}
      style={({ pressed }) => ({
        position: 'absolute', alignSelf: 'center', bottom, flexDirection: 'row', alignItems: 'center', gap: 10,
        backgroundColor: t['raise-2'], borderColor: t['line-2'], borderWidth: 1, borderRadius: 999, paddingVertical: 8, paddingLeft: 8, paddingRight: 18,
        shadowColor: '#000', shadowOpacity: 0.3, shadowRadius: 12, shadowOffset: { width: 0, height: 4 }, elevation: 6, opacity: pressed ? 0.8 : 1,
      })}
    >
      <Mark size={26} />
      <T w="medium">Conversar com o liu liu</T>
    </Pressable>
  );
}
