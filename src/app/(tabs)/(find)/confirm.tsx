import { Redirect, router } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, Text } from 'react-native';

import { ChoicePill, ConversationStep } from '@/components/ConversationStep';
import { PillButton } from '@/components/Sheet';
import { useSession } from '@/features/match/session';
import { colors, fonts } from '@/lib/theme';

// Screen 03 — preference confirmation. Only reached when an uncertain inference could change the matches.
export default function ConfirmPreferences() {
  const session = useSession();
  const [removed, setRemoved] = useState<string[]>([]);
  const priorities = session.state.priorities.slice(0, 5);

  if (!session.loaded) return null;
  if (priorities.length === 0) return <Redirect href="/" />;

  const toggle = (p: string) =>
    setRemoved((r) => (r.includes(p) ? r.filter((x) => x !== p) : [...r, p]));

  return (
    <ConversationStep
      icon="icCheck"
      title="Here's what seems to matter most."
      note="Anything wrong? Tap one to remove it."
    >
      {priorities.map((p) => (
        <ChoicePill key={p} label={p} removed={removed.includes(p)} onPress={() => toggle(p)} />
      ))}
      <PillButton label="Find my matches" onPress={() => router.push(session.confirmPriorities(removed))} />
      <Pressable onPress={() => router.navigate('/')} hitSlop={8} accessibilityRole="button">
        <Text style={styles.edit}>Edit what I said</Text>
      </Pressable>
    </ConversationStep>
  );
}

const styles = StyleSheet.create({
  edit: { fontFamily: fonts.bold, fontSize: 16, color: colors.purpleText, textAlign: 'center', marginTop: 20 },
});
