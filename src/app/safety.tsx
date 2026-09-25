import { router } from 'expo-router';
import { Text } from 'react-native';

import { PillButton, Sheet, sheetText } from '@/components/Sheet';
import { signalsFor } from '@/features/match/agent';
import { useSession } from '@/features/match/session';

// Safety pause (PRD §44). Wording and numbers must be reviewed by a clinical advisor before real users.
export default function Safety() {
  const session = useSession();
  const { input } = session.state;
  // Reached from the matching flow (urgent wording), rather than from Settings → Help and safety.
  const pausedFlow = input.texts.length > 0 && signalsFor(input).safetyFlag?.level === 'urgent';

  const continueFlow = () => {
    const next = session.acknowledgeSafety();
    router.back();
    router.push(next);
  };

  return (
    <Sheet>
      <Text style={sheetText.heading} accessibilityRole="header">Let&apos;s pause for a moment.</Text>
      <Text style={sheetText.body}>
        WATL helps you find a GP or psychologist, but it can&apos;t help with urgent medical concerns. If you&apos;re in danger or this
        is an emergency, call 000. If you&apos;re thinking about suicide or self-harm, call Lifeline on 13 11 14.
      </Text>
      {pausedFlow ? (
        <>
          <PillButton label="Continue my search" onPress={continueFlow} />
          <PillButton label="Go back" variant="text" onPress={() => router.back()} />
        </>
      ) : (
        <PillButton label="Done" onPress={() => router.back()} />
      )}
    </Sheet>
  );
}
