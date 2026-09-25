import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { Icon } from '@/components/Icon';
import { OnboardingStep } from '@/components/OnboardingStep';
import { useProfile } from '@/lib/profile';
import { colors, fonts } from '@/lib/theme';

export default function Email() {
  const { update } = useProfile();
  const [email, setEmail] = useState('');
  const [optOut, setOptOut] = useState(false);
  const [error, setError] = useState(false);
  const valid = email.trim().includes('@');

  const next = async () => {
    if (!valid) return setError(true);
    await update({ email: email.trim() });
    router.push('/onboarding/dob');
  };

  return (
    <OnboardingStep icon="icEnvelope" title="What's your email?" onNext={next} nextEnabled={valid} dots={2}>
      <TextInput
        value={email}
        onChangeText={(t) => {
          setEmail(t);
          setError(false);
        }}
        placeholder="Enter email"
        placeholderTextColor={colors.line}
        keyboardType="email-address"
        autoCapitalize="none"
        autoComplete="email"
        autoFocus
        style={styles.input}
      />
      {error ? <Text style={styles.error}>Enter valid Email address</Text> : null}
      <Pressable
        onPress={() => setOptOut((v) => !v)}
        accessibilityRole="checkbox"
        accessibilityState={{ checked: optOut }}
        style={styles.optOut}
      >
        <View style={[styles.checkbox, optOut && styles.checkboxOn]}>
          {optOut ? <Icon name="icCheck" size={14} color={colors.white} /> : null}
        </View>
        <Text style={styles.optOutText}>
          If you do not wish to receive marketing communications about our products and services, check this box
        </Text>
      </Pressable>
    </OnboardingStep>
  );
}

const styles = StyleSheet.create({
  input: {
    fontFamily: fonts.medium,
    fontSize: 26,
    color: colors.black,
    borderBottomWidth: 1,
    borderBottomColor: '#B0B0B0',
    paddingVertical: 8,
  },
  error: { fontFamily: fonts.regular, color: '#C62828', marginTop: 8 },
  optOut: { flexDirection: 'row', gap: 14, marginTop: 32, alignItems: 'flex-start' },
  checkbox: {
    width: 26,
    height: 26,
    borderRadius: 13,
    borderWidth: 2,
    borderColor: colors.line,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxOn: { backgroundColor: colors.purpleText, borderColor: colors.purpleText },
  optOutText: { flex: 1, fontFamily: fonts.regular, fontSize: 16, lineHeight: 22, color: '#A0A0A0' },
});
