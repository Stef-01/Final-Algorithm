import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput } from 'react-native';

import { ConversationStep } from '@/components/ConversationStep';
import { DEMO_TEXT } from '@/features/match/fixtureAgent';
import { useSession } from '@/features/match/session';
import { devToolsEnabled } from '@/lib/devtools';
import { colors, fonts } from '@/lib/theme';

// Screen 01 — open conversation. Voice arrives in Phase 4; text is fully functional.
export default function OpenConversation() {
  const session = useSession();
  // Coming back to edit (e.g. from the confirmation screen) shows what was said before,
  // until the patient starts typing.
  const [draft, setText] = useState<string | null>(null);
  const text = draft ?? session.state.input.texts[0] ?? '';
  const ready = text.trim().length > 0;

  const submit = () => {
    if (ready) router.push(session.submitText(text));
  };

  return (
    <ConversationStep
      icon="icText"
      title="Find a GP who fits you."
      note="Tell me what you're looking for. You don't need to know exactly what to ask for."
      onNext={submit}
      nextEnabled={ready}
      dots={0}
    >
      <TextInput
        value={text}
        onChangeText={setText}
        placeholder="What are you hoping a new GP will be better at for you?"
        placeholderTextColor={colors.line}
        multiline
        style={styles.input}
        accessibilityLabel="What you're looking for"
      />
      <Text style={styles.hint}>Takes about a minute</Text>
      {devToolsEnabled ? (
        <Pressable onPress={() => setText(DEMO_TEXT)} hitSlop={8} accessibilityRole="button">
          <Text style={styles.demo}>Use the demo example</Text>
        </Pressable>
      ) : null}
    </ConversationStep>
  );
}

const styles = StyleSheet.create({
  input: {
    minHeight: 120,
    fontFamily: fonts.regular,
    fontSize: 20,
    lineHeight: 28,
    color: colors.black,
    borderBottomWidth: 1,
    borderBottomColor: '#B0B0B0',
    paddingVertical: 8,
    textAlignVertical: 'top',
  },
  hint: { fontFamily: fonts.regular, fontSize: 14, color: colors.line, marginTop: 12 },
  demo: { fontFamily: fonts.bold, fontSize: 14, color: colors.purpleText, marginTop: 24 },
});
