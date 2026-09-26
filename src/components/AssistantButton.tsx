import { router, usePathname } from 'expo-router';
import { useEffect, useState } from 'react';
import { Animated, Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useSession } from '@/features/match/session';
import { track } from '@/lib/analytics';
import { colors } from '@/lib/theme';
import { Icon } from './Icon';
import { Pulse, useReducedMotion } from './motion';

// The always-there assistant: a small floating button, top-right on every main screen, that opens
// the refine conversation.

const SIZE = 56;
/** Resting size: small enough to sit in the header's corner. */
const SMALL = 36;
/** Screens where it would cover something, or where a conversation makes no sense. */
const HIDDEN = [/^\/refine/, /^\/matching/, /^\/safety/, /^\/book\//, /^\/dev\//, /^\/clinician\//, /^\/discover/, /^\/join/, /^\/filters/, /^\/rate/, /^\/connect/, /^\/settings/, /^\/saved/];

/** Whether the floating assistant shows on this route (headers leave room for it when it does). */
export const assistantShownOn = (path: string) => !HIDDEN.some((re) => re.test(path));

// Floating top-right on the search and matches screens: small, grows to full size under the pointer,
// and opens the conversation on click (a tap on phones). Not on profiles, My care or Profile.
export function AssistantButton() {
  const path = usePathname();
  const insets = useSafeAreaInsets();
  const { state, loaded } = useSession();
  const reduced = useReducedMotion();
  const enter = useState(() => new Animated.Value(0))[0];
  const grow = useState(() => new Animated.Value(0))[0];
  const hidden = !loaded || !assistantShownOn(path);

  useEffect(() => {
    if (hidden) return;
    enter.setValue(reduced ? 1 : 0);
    if (!reduced) Animated.spring(enter, { toValue: 1, damping: 14, stiffness: 180, delay: 250, useNativeDriver: false }).start();
  }, [hidden, reduced, enter]);

  if (hidden) return null;

  const hasResults = state.result?.status === 'matches';
  // Draw the eye once results arrive and the patient hasn't used it yet.
  const invite = hasResults && !state.chat?.length && path === '/matches';
  const to = (v: number) => (reduced ? grow.setValue(v) : Animated.spring(grow, { toValue: v, damping: 13, stiffness: 260, useNativeDriver: false }).start());
  const size = grow.interpolate({ inputRange: [0, 1], outputRange: [SMALL, SIZE] });

  return (
    <View pointerEvents="box-none" style={[styles.wrap, { top: insets.top + (55 - SMALL) / 2, right: 12 }]}>
      <Animated.View style={{ transform: [{ scale: enter }], opacity: enter, alignItems: 'flex-end' }}>
        <View style={styles.pulse} pointerEvents="none">
          <Pulse size={SMALL} active={invite} />
        </View>
        <Pressable
          onHoverIn={() => to(1)}
          onHoverOut={() => to(0)}
          onPress={() => {
            track('assistant_opened', { hasResults });
            router.push('/refine');
          }}
          accessibilityRole="button"
          accessibilityLabel={hasResults ? 'Refine your matches with the assistant' : 'Ask the assistant'}
          hitSlop={6}
        >
          <Animated.View style={[styles.button, { width: size, height: size, borderRadius: SIZE }]}>
            <Icon name="icSparkle" size={18} color={colors.white} />
          </Animated.View>
        </Pressable>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { position: 'absolute', zIndex: 20 },
  pulse: { position: 'absolute', top: 0, right: 0, width: SMALL, height: SMALL, alignItems: 'center', justifyContent: 'center' },
  button: {
    width: SIZE,
    height: SIZE,
    borderRadius: SIZE / 2,
    backgroundColor: colors.black,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.25,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 8,
  },
});
