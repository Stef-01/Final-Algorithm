import { router, usePathname } from 'expo-router';
import type { BottomTabBarProps } from 'expo-router/tabs';
import { useEffect, useState } from 'react';
import { Animated, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useSaved } from '@/features/match/saved';
import { colors, fonts } from '@/lib/theme';
import { Icon } from './Icon';
import { IconName } from './icons';
import { useReducedMotion } from './motion';
import { WatlLogo } from './WatlLogo';

const INDICATOR = 28;

const tabIcons: Record<string, IconName | 'logo'> = {
  '(find)': 'logo',
  saved: 'icLikeBottomAction',
  settings: 'icSettingBottomAction',
};

// Dark bottom bar from the Android layouts: active icon white, the rest grey.
export function TabBar({ state, descriptors, navigation }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();
  const path = usePathname();
  const { saved } = useSaved();
  const reduced = useReducedMotion();
  const [width, setWidth] = useState(0);
  const at = useState(() => new Animated.Value(state.index))[0];
  useEffect(() => {
    if (reduced) return at.setValue(state.index);
    Animated.spring(at, { toValue: state.index, damping: 16, stiffness: 180, useNativeDriver: Platform.OS !== 'web' }).start();
  }, [state.index, at, reduced]);
  const tabWidth = width / state.routes.length;
  return (
    <View style={[styles.bar, { paddingBottom: insets.bottom }]} onLayout={(e) => setWidth(e.nativeEvent.layout.width)}>
      {/* A short bar that slides under the current tab. */}
      {width ? (
        <Animated.View
          pointerEvents="none"
          style={[styles.indicator, { transform: [{ translateX: Animated.add(Animated.multiply(at, tabWidth), (tabWidth - INDICATOR) / 2) }] }]}
        />
      ) : null}
      {state.routes.map((route, index) => {
        const focused = state.index === index;
        const color = focused ? colors.white : colors.tabInactive;
        const icon = tabIcons[route.name];
        const onPress = () => {
          const event = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
          if (event.defaultPrevented) return;
          if (!focused) navigation.navigate(route.name);
          // Tapping Find again, mid-search, goes back to its start (the usual tab-bar behaviour).
          else if (route.name === '(find)' && path !== '/') router.navigate('/');
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
              {route.name === 'saved' && saved.length > 0 ? <Badge count={saved.length} /> : null}
            </Bounce>
          </Pressable>
        );
      })}
    </View>
  );
}

/** How many people you've liked; hops each time it changes. */
function Badge({ count }: { count: number }) {
  const reduced = useReducedMotion();
  const v = useState(() => new Animated.Value(1))[0];
  useEffect(() => {
    if (reduced) return;
    v.setValue(0.4);
    Animated.spring(v, { toValue: 1, damping: 5, stiffness: 320, useNativeDriver: Platform.OS !== 'web' }).start();
  }, [count, v, reduced]);
  return (
    <Animated.View style={[styles.badge, { transform: [{ scale: v }] }]} accessibilityElementsHidden importantForAccessibility="no">
      <Text style={styles.badgeText}>{count > 9 ? '9+' : count}</Text>
    </Animated.View>
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
  indicator: { position: 'absolute', top: 0, left: 0, width: INDICATOR, height: 3, borderBottomLeftRadius: 3, borderBottomRightRadius: 3, backgroundColor: colors.white },
  badge: { position: 'absolute', top: -6, right: -10, minWidth: 18, height: 18, borderRadius: 9, paddingHorizontal: 4, backgroundColor: colors.purple, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: colors.tabBar },
  badgeText: { fontFamily: fonts.bold, fontSize: 10, color: colors.white },
});
