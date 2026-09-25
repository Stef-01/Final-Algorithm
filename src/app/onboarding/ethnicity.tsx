import { router } from 'expo-router';

import { ChoicePill, OnboardingStep, VisibleOnProfile } from '@/components/OnboardingStep';
import { useProfile } from '@/lib/profile';

// [label shown, value saved]
const options: [string, string][] = [
  ['American Indian', 'American Indian'],
  ['East Asian', 'East Asian'],
  ['Middle Eastern', 'Middle Eastern'],
  ['South Asian', 'South Asian'],
  ['African Descent', 'African Descent'],
  ['Hispanic', 'Hispanic'],
  ['Pacific Islander', 'Pacific Islander'],
  ['White/Caucasian', 'Caucasian'],
  ['Other', 'other'],
  ['Prefer Not to Say', 'Prefer Not to Say'],
];

export default function Ethnicity() {
  const { update } = useProfile();

  const choose = async (value: string) => {
    await update({ ethnicity: value });
    router.replace('/discover');
  };

  return (
    <OnboardingStep icon="icGlobe" title="What's your ethnicity?" dots={2}>
      {options.map(([label, value]) => (
        <ChoicePill key={label} label={label} onPress={() => choose(value)} />
      ))}
      <VisibleOnProfile />
    </OnboardingStep>
  );
}
