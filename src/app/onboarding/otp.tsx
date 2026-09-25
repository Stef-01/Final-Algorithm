import { router } from 'expo-router';
import { useRef, useState } from 'react';
import { Animated, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { OnboardingStep } from '@/components/OnboardingStep';
import { useProfile } from '@/lib/profile';
import { colors, fonts } from '@/lib/theme';

const LENGTH = 6;

export default function VerificationCode() {
  const { profile } = useProfile();
  const [code, setCode] = useState('');
  const input = useRef<TextInput>(null);
  const [shake] = useState(() => new Animated.Value(0));

  const onChange = (text: string) => {
    const digits = text.replace(/\D/g, '').slice(0, LENGTH);
    setCode(digits);
    // Any complete code is accepted — there's no SMS backend, same as the Android app.
    if (digits.length === LENGTH) router.push('/onboarding/verified');
  };

  const triggerError = () => {
    Animated.sequence(
      [10, -10, 8, -8, 0].map((toValue) =>
        Animated.timing(shake, { toValue, duration: 50, useNativeDriver: true }),
      ),
    ).start();
  };

  return (
    <OnboardingStep icon="icSecurity" title="Enter your verification code" onNext={triggerError} dots={0}>
      <View style={styles.sentRow}>
        <Text style={styles.sent}>sent to +91 {profile.phoneNumber}</Text>
        <Pressable onPress={() => router.back()} hitSlop={8}>
          <Text style={styles.link}>Edit</Text>
        </Pressable>
      </View>

      <Pressable onPress={() => input.current?.focus()}>
        <Animated.View style={[styles.boxes, { transform: [{ translateX: shake }] }]}>
          {Array.from({ length: LENGTH }, (_, i) => (
            <View key={i} style={[styles.box, i === code.length && styles.boxActive]}>
              <Text style={styles.digit}>{code[i] ?? ''}</Text>
            </View>
          ))}
        </Animated.View>
      </Pressable>
      <TextInput
        ref={input}
        value={code}
        onChangeText={onChange}
        keyboardType="number-pad"
        textContentType="oneTimeCode"
        autoComplete="sms-otp"
        maxLength={LENGTH}
        autoFocus
        style={styles.hidden}
        accessibilityLabel="Verification code"
      />
      <Text style={[styles.link, styles.resend]}>Didn&apos;t get a code?</Text>
    </OnboardingStep>
  );
}

const styles = StyleSheet.create({
  sentRow: { flexDirection: 'row', gap: 12, marginBottom: 48 },
  sent: { fontFamily: fonts.regular, fontSize: 15, color: colors.line },
  link: { fontFamily: fonts.medium, fontSize: 15, color: colors.purpleText },
  boxes: { flexDirection: 'row', justifyContent: 'space-between' },
  box: {
    width: 42,
    height: 56,
    borderBottomWidth: 2,
    borderBottomColor: colors.chip,
    alignItems: 'center',
    justifyContent: 'center',
  },
  boxActive: { borderBottomColor: colors.black },
  digit: { fontFamily: fonts.medium, fontSize: 30, color: colors.black },
  hidden: { position: 'absolute', opacity: 0, height: 1, width: 1 },
  resend: { marginTop: 40 },
});
