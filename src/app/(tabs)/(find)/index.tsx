import { router } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, Text, TextInput } from 'react-native';

import { ConversationStep } from '@/components/ConversationStep';
import { Placeholder } from '@/components/Placeholder';
import { colors, fonts } from '@/lib/theme';

// Screen 01 — open conversation. Voice arrives in Phase 4; text works now.
export default function OpenConversation() {
  const [text, setText] = useState('');
  const ready = text.trim().length > 0;

  return (
    <ConversationStep
      icon="icText"
      title="Find a GP who fits you."
      note="Tell me what you're looking for. You don't need to know exactly what to ask for."
      onNext={() => ready && router.push('/clarify')}
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
      <Placeholder phase={1} />
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
});
