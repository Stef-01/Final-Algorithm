import { router, useLocalSearchParams } from 'expo-router';
import { Text } from 'react-native';

import { PillButton, Sheet, sheetText } from '@/components/Sheet';
import { getClinician } from '@/data/clinicians';

// Booking hands off to the clinic's own system (PRD §7). The prototype's clinicians are fictional.
export default function BookingHandoff() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const c = getClinician(id);
  const name = c?.firstName ?? 'this clinician';

  return (
    <Sheet closeButton>
      <Text style={sheetText.heading}>Booking with {name}</Text>
      <Text style={sheetText.body}>
        In the real product this opens {name}&apos;s booking page at the clinic. The clinicians in this prototype are
        fictional, so there&apos;s nothing to book yet.
      </Text>
      <PillButton label="Done" onPress={() => router.back()} />
    </Sheet>
  );
}
