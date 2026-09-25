import { useEffect, useState } from 'react';
import { AccessibilityInfo, Animated, Easing, Pressable, StyleSheet, Text, View } from 'react-native';

import { useSpeechToText } from '@/features/voice/useSpeechToText';
import { colors, fonts } from '@/lib/theme';
import { Icon } from './Icon';

type Props = {
  /** Called with what was said when the patient taps Done (or pauses long enough). */
  onTranscript: (text: string) => void;
  onStart?: () => void;
  compact?: boolean;
};

// Voice-first, text-equal (PRD §4.10, §9): a prominent mic, a live transcript in plain text,
// and only Done / Cancel while listening. Renders nothing where the browser can't transcribe.
export function VoiceInput({ onTranscript, onStart, compact }: Props) {
  const speech = useSpeechToText(onTranscript);
  const [pulse] = useState(() => new Animated.Value(0));
  const [reduceMotion, setReduceMotion] = useState(false);

  useEffect(() => {
    AccessibilityInfo.isReduceMotionEnabled?.().then(setReduceMotion).catch(() => {});
  }, []);

  useEffect(() => {
    if (!speech.listening || reduceMotion) {
      pulse.setValue(0);
      return;
    }
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1, duration: 900, easing: Easing.out(Easing.quad), useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 0, duration: 900, easing: Easing.in(Easing.quad), useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [speech.listening, reduceMotion, pulse]);

  if (!speech.supported) return null;

  const size = compact ? 56 : 76;
  const ring = {
    transform: [{ scale: pulse.interpolate({ inputRange: [0, 1], outputRange: [1, 1.18] }) }],
    opacity: pulse.interpolate({ inputRange: [0, 1], outputRange: [0.35, 0] }),
  };

  if (speech.listening) {
    return (
      <View style={styles.block}>
        <Text style={styles.transcript} accessibilityLiveRegion="polite">
          {speech.transcript || 'Listening…'}
        </Text>
        <View style={styles.row}>
          <View style={{ width: size, height: size }}>
            <Animated.View style={[styles.ring, { width: size, height: size, borderRadius: size / 2 }, ring]} />
            <View style={[styles.mic, { width: size, height: size, borderRadius: size / 2 }]}>
              <Icon name="icMic" size={size * 0.42} color={colors.white} />
            </View>
          </View>
          <View style={styles.actions}>
            <Pressable onPress={speech.done} accessibilityRole="button" style={styles.done}>
              <Text style={styles.doneText}>Done</Text>
            </Pressable>
            <Pressable onPress={speech.cancel} accessibilityRole="button" hitSlop={8}>
              <Text style={styles.cancel}>Cancel</Text>
            </Pressable>
          </View>
        </View>
        <Text style={styles.notice}>{NOTICE}</Text>
      </View>
    );
  }

  return (
    <View style={styles.block}>
      <View style={styles.row}>
        <Pressable
          onPress={() => {
            onStart?.();
            speech.start();
          }}
          accessibilityRole="button"
          accessibilityLabel="Tap to speak"
          style={[styles.mic, { width: size, height: size, borderRadius: size / 2 }]}
        >
          <Icon name="icMic" size={size * 0.42} color={colors.white} />
        </Pressable>
        <View style={styles.labels}>
          <Text style={styles.label}>Tap to speak</Text>
          <Text style={styles.orType}>or type below</Text>
        </View>
      </View>
      {speech.error ? <Text style={styles.error}>{speech.error}</Text> : null}
      <Text style={styles.notice}>{NOTICE}</Text>
    </View>
  );
}

// PRD §45: say plainly that voice is transcribed, and by whom (docs/PLAN.md §7, decision D7).
const NOTICE =
  "Voice is turned into text by your browser's speech service. You can edit the text before sending, and WATL keeps only what you send.";

const styles = StyleSheet.create({
  block: { marginBottom: 20 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  mic: { backgroundColor: colors.purple, alignItems: 'center', justifyContent: 'center' },
  ring: { position: 'absolute', backgroundColor: colors.purple },
  labels: { gap: 2 },
  label: { fontFamily: fonts.bold, fontSize: 18, color: colors.black },
  orType: { fontFamily: fonts.regular, fontSize: 14, color: colors.line },
  transcript: { fontFamily: fonts.regular, fontSize: 20, lineHeight: 28, color: colors.black, marginBottom: 16, minHeight: 28 },
  actions: { flexDirection: 'row', alignItems: 'center', gap: 20 },
  done: { backgroundColor: colors.black, borderRadius: 30, paddingVertical: 12, paddingHorizontal: 28 },
  doneText: { fontFamily: fonts.bold, fontSize: 15, color: colors.white },
  cancel: { fontFamily: fonts.bold, fontSize: 15, color: colors.purpleText },
  error: { fontFamily: fonts.regular, fontSize: 14, color: '#C62828', marginTop: 10 },
  notice: { fontFamily: fonts.regular, fontSize: 12, lineHeight: 17, color: colors.line, marginTop: 10 },
});
