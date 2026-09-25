import { ReactNode } from 'react';
import {
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { colors, fonts } from '@/lib/theme';
import { Icon } from './Icon';
import { IconName } from './icons';

type Props = {
  icon: IconName;
  title: string;
  children: ReactNode;
  /** Omit to hide the round "next" button (e.g. choice screens that advance on tap). */
  onNext?: () => void;
  nextEnabled?: boolean;
  /** Number of grey progress dots after the icon. */
  dots?: number;
  /** Short line under the title (e.g. an acknowledgement or subtext). */
  note?: string;
};

// Shared scaffold for the matching conversation: circled icon, big serif question, round next button.
export function ConversationStep({ icon, title, children, onNext, nextEnabled = false, dots = 1, note }: Props) {
  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <View style={styles.progress}>
            <View style={styles.iconCircle}>
              <Icon name={icon} size={22} />
            </View>
            {Array.from({ length: dots }, (_, i) => (
              <View key={i} style={styles.dot} />
            ))}
          </View>
          <Text style={styles.title} accessibilityRole="header">{title}</Text>
          {note ? <Text style={styles.note}>{note}</Text> : null}
          {children}
        </ScrollView>
        {onNext ? (
          <Pressable
            onPress={onNext}
            accessibilityRole="button"
            accessibilityLabel="Next"
            accessibilityState={{ disabled: !nextEnabled }}
            style={styles.next}
          >
            <Image
              source={
                nextEnabled
                  ? require('../../assets/images/phone_next_black.png')
                  : require('../../assets/images/phone_next_white.png')
              }
              style={styles.nextImage}
              aria-hidden
            />
          </Pressable>
        ) : null}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

export function ChoicePill({
  label,
  onPress,
  removed,
}: {
  label: string;
  onPress: () => void;
  /** Shown struck through, e.g. a priority the patient said doesn't matter. */
  removed?: boolean;
}) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={removed === undefined ? undefined : { selected: !removed }}
      style={({ pressed }) => [styles.pill, pressed && styles.pillPressed, removed && styles.pillRemoved]}
    >
      <Text style={[styles.pillText, removed && styles.pillTextRemoved]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.white },
  flex: { flex: 1 },
  content: { paddingHorizontal: 32, paddingTop: 48, paddingBottom: 120 },
  progress: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 28 },
  iconCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: 3,
    borderColor: colors.black,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dot: { width: 10, height: 10, borderRadius: 5, backgroundColor: colors.chip },
  title: { fontFamily: fonts.serifSemiBold, fontSize: 30, lineHeight: 38, color: colors.black, marginBottom: 32 },
  note: { fontFamily: fonts.regular, fontSize: 16, lineHeight: 22, color: colors.muted, marginTop: -20, marginBottom: 28 },
  next: { position: 'absolute', right: 28, bottom: 28 },
  nextImage: { width: 64, height: 64 },
  pill: {
    backgroundColor: colors.chip,
    borderRadius: 150,
    paddingVertical: 14,
    paddingHorizontal: 24,
    marginBottom: 12,
  },
  pillPressed: { backgroundColor: colors.line },
  pillRemoved: { backgroundColor: colors.background },
  pillTextRemoved: { color: colors.muted, textDecorationLine: 'line-through' },
  pillText: { fontFamily: fonts.medium, fontSize: 18, color: colors.black },
});
