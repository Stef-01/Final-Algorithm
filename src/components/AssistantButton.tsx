import { router, usePathname } from 'expo-router';
import { useEffect, useState } from 'react';
import { Animated, Platform, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useSession } from '@/features/match/session';
import { track } from '@/lib/analytics';
import { colors } from '@/lib/theme';
import { Icon } from './Icon';
import { PressScale, Pulse, useReducedMotion } from './motion';

// The always-there assistant: a floating button on every main screen that opens the refine
// conversation. Sits bottom-right, lifted clear of each screen's own bottom controls.

const SIZE = 56;
const TAB_BAR = 58;
/** Screens where it would cover something, or where a conversation makes no sense. */
const HIDDEN = [/^\/refine/, /^\/matching/, /^\/safety/, /^\/book\//, /^\/dev\//];
/** Screens with the round Next button bottom-right (ConversationStep). */
const HAS_NEXT = ['/', '/describe', '/clarify', '/confirm'];

export function AssistantButton() {
  const path = usePathname();
  const insets = useSafeAreaInsets();
  const { state, loaded } = useSession();
  const reduced = useReducedMotion();
  const enter = useState(() => new Animated.Value(0))[0];
  const hidden = !loaded || HIDDEN.some((re) => re.test(path));

  useEffect(() => {
    if (hidden) return;
    enter.setValue(reduced ? 1 : 0);
    if (!reduced) Animated.spring(enter, { toValue: 1, damping: 14, stiffness: 180, delay: 250, useNativeDriver: Platform.OS !== 'web' }).start();
  }, [hidden, reduced, enter]);

  if (hidden) return null;

  const onProfile = path.startsWith('/clinician/');
  const bottom = onProfile ? insets.bottom + 150 : insets.bottom + TAB_BAR + (HAS_NEXT.includes(path) ? 112 : 20);
  const hasResults = state.result?.status === 'matches';
  // Draw the eye once results arrive and the patient hasn't used it yet.
  const invite = hasResults && !(state.chat?.length) && path === '/matches';

  return (
    <View pointerEvents="box-none" style={[styles.wrap, { bottom }]}>
      <Animated.View style={{ transform: [{ scale: enter }], opacity: enter, alignItems: 'center', justifyContent: 'center' }}>
        <Pulse size={SIZE} active={invite} />
        <PressScale
          onPress={() => {
            track('assistant_opened', { hasResults });
            router.push('/refine');
          }}
          accessibilityRole="button"
          accessibilityLabel={hasResults ? 'Refine your matches with the assistant' : 'Ask the assistant'}
          style={styles.button}
          scaleTo={0.9}
        >
          <Icon name="icSparkle" size={24} color={colors.white} />
        </PressScale>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { position: 'absolute', right: 20 },
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
