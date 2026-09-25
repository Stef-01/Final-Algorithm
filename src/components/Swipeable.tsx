import { forwardRef, ReactNode, useEffect, useImperativeHandle, useMemo, useRef, useState } from 'react';
import { Animated, PanResponder, StyleProp, StyleSheet, useWindowDimensions, View, ViewStyle } from 'react-native';

import { tap } from '@/lib/haptics';
import { colors } from '@/lib/theme';
import { Icon } from './Icon';
import { useReducedMotion } from './motion';

// A match you can swipe: left for no, right for yes. It follows the finger with a slight tilt,
// shows which way it's going (✕ or ✓, growing as you drag), and flies off past a threshold or on a quick flick; otherwise
// it springs back. Only a clearly sideways drag takes over, so scrolling still works.

export type SwipeableHandle = { fling: (dir: -1 | 1) => void };

type Props = {
  children: ReactNode;
  onLeft: () => void;
  onRight: () => void;
  style?: StyleProp<ViewStyle>;
};

export const Swipeable = forwardRef<SwipeableHandle, Props>(function Swipeable({ children, onLeft, onRight, style }, ref) {
  const { width } = useWindowDimensions();
  const reduced = useReducedMotion();
  const x = useState(() => new Animated.Value(0))[0];
  const handlers = useRef({ onLeft, onRight, width, reduced });
  useEffect(() => {
    handlers.current = { onLeft, onRight, width, reduced };
  }, [onLeft, onRight, width, reduced]);

  const api = useMemo(() => {
    const done = (dir: -1 | 1) => {
      tap(dir > 0 ? 'save' : 'light');
      return dir < 0 ? handlers.current.onLeft() : handlers.current.onRight();
    };
    const fling = (dir: -1 | 1) => {
      if (handlers.current.reduced) return done(dir);
      Animated.timing(x, { toValue: dir * handlers.current.width * 1.2, duration: 220, useNativeDriver: false }).start(() => {
        done(dir);
        x.setValue(0);
      });
    };
    const settle = () => Animated.spring(x, { toValue: 0, damping: 16, stiffness: 220, useNativeDriver: false }).start();
    const pan = PanResponder.create({
      // Capture phase: the scroll view inside would otherwise keep the gesture. Sideways only.
      onMoveShouldSetPanResponderCapture: (_e, g) => Math.abs(g.dx) > 14 && Math.abs(g.dx) > Math.abs(g.dy) * 1.6,
      onPanResponderTerminationRequest: () => false,
      onPanResponderMove: (_e, g) => x.setValue(g.dx),
      onPanResponderRelease: (_e, g) => {
        const far = handlers.current.width * 0.28;
        if (g.dx < -far || g.vx < -0.8) fling(-1);
        else if (g.dx > far || g.vx > 0.8) fling(1);
        else settle();
      },
      onPanResponderTerminate: settle,
    });
    return { fling, pan };
  }, [x]);

  useImperativeHandle(ref, () => ({ fling: api.fling }), [api]);

  const rotate = x.interpolate({ inputRange: [-width, 0, width], outputRange: ['-7deg', '0deg', '7deg'] });
  const pass = x.interpolate({ inputRange: [-120, -30, 0], outputRange: [1, 0, 0], extrapolate: 'clamp' });
  const save = x.interpolate({ inputRange: [0, 30, 120], outputRange: [0, 0, 1], extrapolate: 'clamp' });
  const passScale = x.interpolate({ inputRange: [-160, -30, 0], outputRange: [1.15, 0.6, 0.6], extrapolate: 'clamp' });
  const saveScale = x.interpolate({ inputRange: [0, 30, 160], outputRange: [0.6, 0.6, 1.15], extrapolate: 'clamp' });

  return (
    <Animated.View
      {...api.pan.panHandlers}
      // Screen readers can't swipe: the same two moves as named actions.
      accessibilityActions={[
        { name: 'pass', label: 'Pass' },
        { name: 'save', label: 'Save' },
      ]}
      onAccessibilityAction={(e) => api.fling(e.nativeEvent.actionName === 'save' ? 1 : -1)}
      style={[styles.fill, style, { transform: [{ translateX: x }, { rotate }] }]}
    >
      {children}
      <Animated.View pointerEvents="none" style={[styles.stamp, styles.left, { opacity: pass, transform: [{ scale: passScale }, { rotate: '-12deg' }] }]}>
        <View style={[styles.circle, styles.passCircle]}>
          <Icon name="icClose" size={22} color={colors.white} />
        </View>
      </Animated.View>
      <Animated.View pointerEvents="none" style={[styles.stamp, styles.right, { opacity: save, transform: [{ scale: saveScale }, { rotate: '12deg' }] }]}>
        <View style={[styles.circle, styles.saveCircle]}>
          <Icon name="icCheck" size={26} color={colors.white} />
        </View>
      </Animated.View>
    </Animated.View>
  );
});

const styles = StyleSheet.create({
  fill: { flex: 1 },
  stamp: { position: 'absolute', top: 24 },
  left: { left: 24 },
  right: { right: 24 },
  circle: { width: 56, height: 56, borderRadius: 28, alignItems: 'center', justifyContent: 'center' },
  passCircle: { backgroundColor: colors.black },
  saveCircle: { backgroundColor: colors.purple },
});
