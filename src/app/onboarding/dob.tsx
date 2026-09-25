import { router } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, Text } from 'react-native';

import { DatePicker } from '@/components/DatePicker';
import { OnboardingStep } from '@/components/OnboardingStep';
import { useProfile } from '@/lib/profile';
import { colors, fonts } from '@/lib/theme';

function ageOn(birth: Date, today = new Date()) {
  let age = today.getFullYear() - birth.getFullYear();
  const beforeBirthday =
    today.getMonth() < birth.getMonth() ||
    (today.getMonth() === birth.getMonth() && today.getDate() < birth.getDate());
  return beforeBirthday ? age - 1 : age;
}

export default function DateOfBirth() {
  const { update } = useProfile();
  const [birth, setBirth] = useState(() => new Date(2000, 0, 1));
  const age = ageOn(birth);
  const valid = age >= 18;

  const next = async () => {
    if (!valid) return;
    await update({ age: String(age) });
    router.push('/onboarding/ethnicity');
  };

  return (
    <OnboardingStep icon="icBirthdayCake" title="What's your date of birth?" onNext={next} nextEnabled={valid} dots={2}>
      <DatePicker value={birth} onChange={setBirth} maximumDate={new Date()} />
      <Text style={styles.age}>Age {age}</Text>
      <Text style={styles.note}>
        {valid ? "This can't be changed later" : 'You must be 18 or older to use WATL'}
      </Text>
    </OnboardingStep>
  );
}

const styles = StyleSheet.create({
  age: { fontFamily: fonts.serifSemiBold, fontSize: 30, color: colors.black, marginTop: 24 },
  note: { fontFamily: fonts.regular, fontSize: 18, color: colors.line, marginTop: 8 },
});
