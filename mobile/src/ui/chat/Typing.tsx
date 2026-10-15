import { useEffect, useRef } from 'react';
import { Animated, View } from 'react-native';
import { useTheme } from '@/ui/theme';

const CYCLE = 1100;
const DELAYS = [0, 150, 300];

/** Three blinking dots while liu liu is thinking (the web's .typing: .25 → 1 at 40% → .25 at 80%). */
export function Typing() {
  const t = useTheme();
  const dots = useRef(DELAYS.map(() => new Animated.Value(0.25))).current;
  useEffect(() => {
    const anims = dots.map((v, i) =>
      Animated.sequence([
        Animated.delay(DELAYS[i]),
        Animated.loop(
          Animated.sequence([
            Animated.timing(v, { toValue: 1, duration: CYCLE * 0.4, useNativeDriver: false }),
            Animated.timing(v, { toValue: 0.25, duration: CYCLE * 0.4, useNativeDriver: false }),
            Animated.delay(CYCLE * 0.2),
          ]),
        ),
      ]),
    );
    anims.forEach((a) => a.start());
    return () => anims.forEach((a) => a.stop());
  }, [dots]);
  return (
    <View style={{ flexDirection: 'row', gap: 4, paddingVertical: 6 }} accessibilityLabel="liu liu está escrevendo" accessibilityLiveRegion="polite">
      {dots.map((v, i) => (
        <Animated.View key={i} style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: t['fg-3'], opacity: v }} />
      ))}
    </View>
  );
}
