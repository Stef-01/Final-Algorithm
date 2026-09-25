import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput } from 'react-native';

import { OnboardingStep, VisibleOnProfile } from '@/components/OnboardingStep';
import { useProfile } from '@/lib/profile';
import { colors, fonts } from '@/lib/theme';

export default function Name() {
  const { update } = useProfile();
  const [first, setFirst] = useState('');
  const [last, setLast] = useState('');
  const [error, setError] = useState(false);
  const valid = first.trim().length >= 3;

  const next = async () => {
    if (!valid) return setError(true);
    await update({ firstName: first.trim(), ...(last.trim() ? { lastName: last.trim() } : null) });
    router.push('/onboarding/email');
  };

  return (
    <OnboardingStep icon="icText" title="What's your name?" onNext={next} nextEnabled={valid} dots={2}>
      <TextInput
        value={first}
        onChangeText={(t) => {
          setFirst(t);
          setError(false);
        }}
        placeholder="First name"
        placeholderTextColor={colors.line}
        autoFocus
        autoCapitalize="words"
        style={styles.input}
      />
      {error ? <Text style={styles.error}>Please enter valid name</Text> : null}
      <TextInput
        value={last}
        onChangeText={setLast}
        placeholder="Last name"
        placeholderTextColor={colors.line}
        autoCapitalize="words"
        style={styles.input}
      />
      <Text style={styles.note}>Last name is optional, and only shared with matches.</Text>
      <Pressable onPress={() => router.push('/profile/why-last-name')} hitSlop={8}>
        <Text style={styles.why}>why?</Text>
      </Pressable>
      <VisibleOnProfile icon="icLock" />
    </OnboardingStep>
  );
}

const styles = StyleSheet.create({
  input: {
    fontFamily: fonts.medium,
    fontSize: 28,
    color: colors.black,
    borderBottomWidth: 1,
    borderBottomColor: '#B0B0B0',
    paddingVertical: 8,
    marginBottom: 20,
  },
  note: { fontFamily: fonts.regular, fontSize: 16, color: colors.line },
  why: { fontFamily: fonts.bold, fontSize: 18, color: colors.purpleText, marginTop: 8 },
  error: { fontFamily: fonts.regular, color: '#C62828', marginTop: -12, marginBottom: 16 },
});
