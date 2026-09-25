import { router } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, Text, TextInput, View } from 'react-native';

import { Icon } from '@/components/Icon';
import { OnboardingStep } from '@/components/OnboardingStep';
import { useProfile } from '@/lib/profile';
import { colors, fonts } from '@/lib/theme';

export default function PhoneNumber() {
  const { update } = useProfile();
  const [phone, setPhone] = useState('');
  const [error, setError] = useState(false);
  const valid = phone.trim().length === 10;

  const next = async () => {
    if (!valid) return setError(true);
    await update({ phoneNumber: phone.trim() });
    router.push('/onboarding/otp');
  };

  return (
    <OnboardingStep icon="icTelephone" title="What's your phone number?" onNext={next} nextEnabled={valid} dots={0}>
      <Text style={styles.note}>
        WATL will send you a text with a verification code. Message and data rates may apply.
      </Text>
      <View style={styles.row}>
        <View style={styles.code}>
          <Icon name="icIndia" size={28} />
          <Text style={styles.codeText}>+91</Text>
          <Icon name="icDownArrow" size={12} />
        </View>
        <TextInput
          value={phone}
          onChangeText={(t) => {
            setPhone(t.replace(/\D/g, ''));
            setError(false);
          }}
          keyboardType="phone-pad"
          maxLength={10}
          autoFocus
          style={styles.input}
          accessibilityLabel="Phone number"
        />
      </View>
      {error ? <Text style={styles.error}>Enter valid Phone number</Text> : null}
    </OnboardingStep>
  );
}

const styles = StyleSheet.create({
  note: { fontFamily: fonts.regular, fontSize: 15, lineHeight: 21, color: colors.line, marginBottom: 32 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  code: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderBottomWidth: 2,
    borderBottomColor: colors.black,
    paddingBottom: 6,
  },
  codeText: { fontFamily: fonts.medium, fontSize: 28, color: colors.black },
  input: {
    flex: 1,
    minWidth: 0,
    fontFamily: fonts.medium,
    fontSize: 28,
    color: colors.black,
    borderBottomWidth: 2,
    borderBottomColor: colors.black,
    paddingBottom: 6,
  },
  error: { fontFamily: fonts.regular, color: '#C62828', marginTop: 12 },
});
