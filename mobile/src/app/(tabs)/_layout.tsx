import { Tabs } from 'expo-router';
import { View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppHeader } from '@/ui/AppHeader';
import { AskBar } from '@/ui/AskBar';
import { Icon, type IconName } from '@/ui/kit';
import { fonts, useTheme } from '@/ui/theme';

const TABS: [string, string, IconName, string?][] = [
  ['index', 'Início', 'home'],
  ['transacoes', 'Transações', 'tx', 'Transações'],
  ['categorias', 'Categorias', 'cats', 'Categorias'],
  ['cartoes', 'Cartões', 'cards', 'Cartões'],
  ['mais', 'Mais', 'more', 'Mais'],
];

export default function TabsLayout() {
  const t = useTheme();
  const insets = useSafeAreaInsets();
  const tabBarHeight = 56 + insets.bottom;
  return (
    <View style={{ flex: 1, backgroundColor: t.bg }}>
      <Tabs
        screenOptions={{
          sceneStyle: { backgroundColor: t.bg },
          tabBarStyle: { backgroundColor: t.panel, borderTopColor: t.line, height: tabBarHeight, paddingTop: 6 },
          tabBarActiveTintColor: t.mint,
          tabBarInactiveTintColor: t['fg-3'],
          tabBarLabelStyle: { fontFamily: fonts.uiMedium, fontSize: 11 },
        }}
      >
        {TABS.map(([name, label, icon, title]) => (
          <Tabs.Screen
            key={name}
            name={name}
            options={{ title: label, header: () => <AppHeader title={title} />, tabBarIcon: ({ color }) => <Icon name={icon} color={String(color)} size={22} /> }}
          />
        ))}
      </Tabs>
      <AskBar bottom={tabBarHeight + 12} />
    </View>
  );
}
