import * as Linking from 'expo-linking';
import { router, useLocalSearchParams } from 'expo-router';
import { Text } from 'react-native';

import { PillButton, Sheet, sheetText } from '@/components/Sheet';
import { getClinician } from '@/data/clinicians';

// Booking hands off to the practice's own booking page (PRD §7). WATL takes no part of the fee.
export default function BookingHandoff() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const c = getClinician(id);
  const name = c?.firstName ?? 'this clinician';
  const practice = c?.practice ?? 'the practice';

  return (
    <Sheet closeButton>
      <Text style={sheetText.heading}>Booking with {name}</Text>
      <Text style={sheetText.body}>
        {c?.bookingUrl
          ? `This opens ${practice}'s booking page. Fees and times are set by the practice, and WATL receives no part of what you pay.`
          : `${practice} arranges appointments directly. Fees and times are set by the practice.`}
      </Text>
      {c?.bookingUrl ? (
        <PillButton
          label="Open booking page"
          onPress={() => {
            Linking.openURL(c.bookingUrl!);
            router.back();
          }}
        />
      ) : null}
      <PillButton label="Not now" variant="text" onPress={() => router.back()} />
    </Sheet>
  );
}
