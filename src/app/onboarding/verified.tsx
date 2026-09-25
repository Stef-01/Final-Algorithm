import { router } from 'expo-router';

import { ChoicePill, OnboardingStep } from '@/components/OnboardingStep';

export default function Verified() {
  const next = () => router.push('/onboarding/name');
  return (
    <OnboardingStep icon="icSecurity" title={'You are verified.\nwhat next?'}>
      <ChoicePill label="Create account" onPress={next} />
      <ChoicePill label="Pre-fill with Facebook" onPress={next} />
    </OnboardingStep>
  );
}
