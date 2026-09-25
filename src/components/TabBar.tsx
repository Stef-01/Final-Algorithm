import type { BottomTabBarProps } from 'expo-router/tabs';
import { useEffect, useState } from 'react';
import { Animated, Platform, Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { colors } from '@/lib/theme';
import { Icon } from './Icon';
import { IconName } from './icons';
import { useReducedMotion } from './motion';
import { WatlLogo } from './WatlLogo';

const tabIcons: Record<string, IconName | 'logo'> = {
  '(find)': 'logo',
  saved: 'icLikeBottomAction',
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
            <Bounce on={focused}>
              {icon === 'logo' ? <WatlLogo variant="mark" color={color} size={26} /> : <Icon name={icon} size={24} color={color} />}
            </Bounce>
          </Pressable>
        );
      })}
    </View>
  );
}

/** A small springy lift when a tab becomes the current one. */
function Bounce({ on, children }: { on: boolean; children: React.ReactNode }) {
  const reduced = useReducedMotion();
  const v = useState(() => new Animated.Value(on ? 1 : 0))[0];
  useEffect(() => {
    if (reduced) return v.setValue(on ? 1 : 0);
    Animated.spring(v, { toValue: on ? 1 : 0, damping: 9, stiffness: 220, useNativeDriver: Platform.OS !== 'web' }).start();
  }, [on, v, reduced]);
  const scale = v.interpolate({ inputRange: [0, 1], outputRange: [1, 1.12] });
  const translateY = v.interpolate({ inputRange: [0, 1], outputRange: [0, -2] });
  return <Animated.View style={{ transform: [{ translateY }, { scale }] }}>{children}</Animated.View>;
}

const styles = StyleSheet.create({
  bar: { flexDirection: 'row', backgroundColor: colors.tabBar },
  tab: { flex: 1, height: 58, alignItems: 'center', justifyContent: 'center' },
});
