import type { BottomTabBarProps } from 'expo-router/tabs';
import { Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { colors } from '@/lib/theme';
import { Icon } from './Icon';
import { IconName } from './icons';
import { WatlLogo } from './WatlLogo';

const tabIcons: Record<string, IconName | 'logo'> = {
  discover: 'logo',
  standouts: 'icStarBottomAction',
  likes: 'icLikeBottomAction',
  matches: 'icMessageBottomAction',
  settings: 'icSettingBottomAction',
};

// Dark bottom bar from the Android layouts: active icon white, the rest grey.
export function TabBar({ state, descriptors, navigation }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();
  return (
    <View style={[styles.bar, { paddingBottom: insets.bottom }]}>
      {state.routes.map((route, index) => {
        const focused = state.index === index;
        const color = focused ? colors.white : colors.tabInactive;
        const icon = tabIcons[route.name];
        const onPress = () => {
          const event = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
          if (!focused && !event.defaultPrevented) navigation.navigate(route.name);
        };
        return (
          <Pressable
            key={route.key}
            onPress={onPress}
            accessibilityRole="tab"
            accessibilityState={{ selected: focused }}
            accessibilityLabel={descriptors[route.key].options.title}
            style={styles.tab}
          >
            {icon === 'logo' ? (
              <WatlLogo variant="mark" color={color} size={26} />
            ) : (
              <Icon name={icon} size={24} color={color} />
            )}
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  bar: { flexDirection: 'row', backgroundColor: colors.tabBar },
  tab: { flex: 1, height: 58, alignItems: 'center', justifyContent: 'center' },
});
