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
};

// Shared scaffold for the sign-up flow: circled icon, big serif question, round next button.
export function OnboardingStep({ icon, title, children, onNext, nextEnabled = false, dots = 1 }: Props) {
  return (
    <SafeAreaView style={styles.safe}>
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
          <Text style={styles.title}>{title}</Text>
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
            />
          </Pressable>
        ) : null}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

export function ChoicePill({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      style={({ pressed }) => [styles.pill, pressed && styles.pillPressed]}
    >
      <Text style={styles.pillText}>{label}</Text>
    </Pressable>
  );
}

export function VisibleOnProfile({ icon = 'icCheck' }: { icon?: IconName }) {
  return (
    <View style={styles.visible}>
      <View style={styles.visibleCircle}>
        <Icon name={icon} size={16} color={colors.white} />
      </View>
      <Text style={styles.visibleText}>Visible on profile</Text>
    </View>
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
  pillText: { fontFamily: fonts.medium, fontSize: 18, color: colors.black },
  visible: { flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 24 },
  visibleCircle: {
    width: 35,
    height: 35,
    borderRadius: 18,
    backgroundColor: colors.purpleText,
    alignItems: 'center',
    justifyContent: 'center',
  },
  visibleText: { fontFamily: fonts.regular, fontSize: 18, color: '#696969' },
});
