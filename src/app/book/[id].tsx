import * as Linking from 'expo-linking';
import { useLocalSearchParams } from 'expo-router';
import { Text } from 'react-native';

import { PillButton, Sheet, sheetText } from '@/components/Sheet';
import { getClinician } from '@/data/clinicians';
import { useSaved } from '@/features/match/saved';
import { useSession } from '@/features/match/session';
import { findMatch } from '@/features/match/sessionCore';
import { track } from '@/lib/analytics';
import { goBack } from '@/lib/nav';

// Booking hands off to the practice's own booking page (PRD §7). WATL takes no part of the fee.
export default function BookingHandoff() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const c = getClinician(id);
  const session = useSession();
  const { saved, booked } = useSaved();
  const name = c?.firstName ?? 'this clinician';
  const practice = c?.practice ?? 'the practice';

  return (
    <Sheet closeButton>
      <Text style={sheetText.heading} accessibilityRole="header">Booking with {name}</Text>
      <Text style={sheetText.body}>
        {c?.bookingUrl
          ? `This opens ${practice}'s booking page. Fees and times are set by the practice, and WATL receives no part of what you pay.`
          : `${practice} arranges appointments directly. Fees and times are set by the practice.`}
      </Text>
      {c?.bookingUrl ? (
        <PillButton
          label="Open booking page"
          onPress={() => {
            track('booking_clicked', { clinician: c.id });
            // Booking puts them in your care team and marks today as a visit.
            booked({ clinicianId: c.id, fit: findMatch(session.state, c.id)?.fit ?? saved.find((s) => s.clinicianId === c.id)?.fit ?? 'Possible fit' });
            Linking.openURL(c.bookingUrl!);
            goBack('/saved');
          }}
        />
      ) : null}
      <PillButton label="Not now" variant="text" onPress={() => goBack('/saved')} />
    </Sheet>
  );
}
