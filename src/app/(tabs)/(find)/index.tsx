import { router } from 'expo-router';
import { Pressable, StyleSheet, Text } from 'react-native';

import { ChoicePill, ConversationStep } from '@/components/ConversationStep';
import { useSession } from '@/features/match/session';
import { PROFESSION_OPTIONS } from '@/lib/professions';
import { colors, fonts } from '@/lib/theme';

// The funnel: pick the kind of professional first, then describe what you need.
export default function WhoAreYouLookingFor() {
  const session = useSession();

  return (
    <ConversationStep
      icon="icQuestion"
      title="Who are you looking for?"
      note="WATL can help you find a GP or a psychologist."
      dots={0}
    >
      {PROFESSION_OPTIONS.map((o) => (
        <ChoicePill key={o.choice} label={o.label} onPress={() => router.push(session.chooseProfession(o.choice))} />
      ))}
      <Pressable onPress={() => router.push('/demos')} hitSlop={8} accessibilityRole="button">
        <Text style={styles.demo}>Try a demo patient</Text>
      </Pressable>
    </ConversationStep>
  );
}

const styles = StyleSheet.create({
  demo: { fontFamily: fonts.bold, fontSize: 16, color: colors.purpleText, marginTop: 20 },
});
