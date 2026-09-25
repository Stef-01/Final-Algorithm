import { router } from 'expo-router';
import { Text } from 'react-native';

import { Placeholder } from '@/components/Placeholder';
import { PillButton, Sheet, sheetText } from '@/components/Sheet';

// Safety pause (PRD §44). Final wording to be reviewed by a clinical advisor before real users.
export default function Safety() {
  return (
    <Sheet>
      <Text style={sheetText.heading}>Let&apos;s pause for a moment.</Text>
      <Text style={sheetText.body}>
        WATL helps you find a GP, but it can&apos;t help with urgent medical concerns. If this is an emergency,
        call 000.
      </Text>
      <PillButton label="Continue finding a GP" onPress={() => router.back()} />
      <Placeholder phase={3} />
    </Sheet>
  );
}
