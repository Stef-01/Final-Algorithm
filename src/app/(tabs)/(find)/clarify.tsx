import { Redirect, router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput } from 'react-native';

import { ChoicePill, ConversationStep } from '@/components/ConversationStep';
import { VoiceInput } from '@/components/VoiceInput';
import { questionById } from '@/features/match/sessionCore';
import { useSession } from '@/features/match/session';
import { track } from '@/lib/analytics';
import { colors, fonts } from '@/lib/theme';

// Screen 02 — adaptive clarification. A tapped answer moves on immediately; no next button.
export default function Clarify() {
  const session = useSession();
  const { q, own } = useLocalSearchParams<{ q?: string; own?: string }>();
  const question = questionById(session.state, q);
  const [ownWords, setOwnWords] = useState(own === '1');
  const [text, setText] = useState('');
  const number = session.state.asked.findIndex((x) => x.id === q) + 1;

  useEffect(() => {
    if (q && number > 0) track('followup_asked', { question: q, number });
  }, [q, number]);

  if (!session.loaded) return null;
  if (!question) return <Redirect href="/" />;

  const freeTextOnly = question.options.length === 0;
  const typing = freeTextOnly || ownWords;
  const send = (value: string) => {
    if (value.trim()) router.push(session.answer(question.id, value));
  };

  return (
    <ConversationStep
      icon="icQuestion"
      title={question.text}
      note={question.ack}
      onNext={typing ? () => send(text) : undefined}
      nextEnabled={text.trim().length > 0}
    >
      {typing ? (
        <>
        <VoiceInput compact onTranscript={(said) => setText(text.trim() ? `${text.trim()} ${said}` : said)} />
        <TextInput
          value={text}
          onChangeText={setText}
          placeholder="In your own words"
          placeholderTextColor={colors.line}
          multiline
          autoFocus
          style={styles.input}
          accessibilityLabel="Your answer"
        />
        </>
      ) : (
        <>
          {question.options.map((o) => (
            <ChoicePill key={o} label={o} onPress={() => send(o)} />
          ))}
          <Pressable onPress={() => setOwnWords(true)} hitSlop={8} accessibilityRole="button">
            <Text style={styles.ownWords}>Explain in your own words</Text>
          </Pressable>
        </>
      )}
    </ConversationStep>
  );
}

const styles = StyleSheet.create({
  input: {
    minHeight: 100,
    fontFamily: fonts.regular,
    fontSize: 20,
    lineHeight: 28,
    color: colors.black,
    borderBottomWidth: 1,
    borderBottomColor: '#B0B0B0',
    paddingVertical: 8,
    textAlignVertical: 'top',
  },
  ownWords: { fontFamily: fonts.bold, fontSize: 16, color: colors.purpleText, marginTop: 12 },
});
