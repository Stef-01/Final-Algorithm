import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { StyleSheet, Text, TextInput, View } from 'react-native';

import { ConversationStep } from '@/components/ConversationStep';
import { VoiceInput } from '@/components/VoiceInput';
import { demoById } from '@/features/match/demos';
import { claudeEnabled, extractRemote } from '@/features/match/remoteExtract';
import { useGoals } from '@/features/care/goals';
import { useSession } from '@/features/match/session';
import { copyFor } from '@/lib/professions';
import { colors, fonts } from '@/lib/theme';

// Screen 01 — open conversation: voice where the browser can transcribe, text always.
export default function Describe() {
  const session = useSession();
  const { goals } = useGoals();
  const { state } = session;
  const copy = copyFor(state.profession);
  const demo = state.input.demoId ? demoById(state.input.demoId) : undefined;

  // Shows a demo patient's words, or what was said before, until the patient starts typing.
  const [draft, setText] = useState<string | null>(null);
  const text = draft ?? state.draft ?? state.input.texts[0] ?? '';
  const ready = text.trim().length > 0;

  const [reading, setReading] = useState(false);
  const [claude, setClaude] = useState(false);
  useEffect(() => {
    let alive = true;
    void claudeEnabled().then((on) => alive && setClaude(on));
    return () => {
      alive = false;
    };
  }, []);
  const submit = async () => {
    if (!ready || reading) return;
    // Demo patients have scripted signals; everyone else is read by Claude when it's switched on.
    const scripted = demo && demo.text === text.trim();
    setReading(true);
    const extracted = scripted ? null : await extractRemote(text.trim(), state.profession === 'either' ? undefined : state.profession);
    setReading(false);
    router.push(session.submitText(text, extracted, goals));
  };

  return (
    <ConversationStep
      icon="icText"
      title={copy.title}
      note="In your own words."
      onNext={submit}
      nextEnabled={ready && !reading}
      progress={0.4}
    >
      {demo && draft === null ? (
        <View style={styles.demoNote}>
          <Text style={styles.demoLabel}>Demo patient: {demo.title}</Text>
          <Text style={styles.demoBody}>Tap the arrow to start, or edit the words to try your own.</Text>
        </View>
      ) : null}
      <VoiceInput onTranscript={(said) => setText(text.trim() && draft !== null ? `${text.trim()} ${said}` : said)} />
      <TextInput
        value={text}
        onChangeText={setText}
        placeholder={copy.prompt}
        placeholderTextColor={colors.muted}
        multiline
        style={styles.input}
        accessibilityLabel="What you're looking for"
      />
      <Text style={styles.hint} accessibilityLiveRegion="polite">
        {reading ? 'Reading what you wrote…' : 'Takes about a minute'}
      </Text>
      {claude ? (
        <Text style={styles.notice}>Read by Claude (Anthropic). Not stored by WATL.</Text>
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
  hint: { fontFamily: fonts.regular, fontSize: 14, color: colors.muted, marginTop: 12 },
  notice: { fontFamily: fonts.regular, fontSize: 12, lineHeight: 17, color: colors.muted, marginTop: 8 },
  demoNote: { backgroundColor: colors.background, borderRadius: 10, padding: 14, marginBottom: 16 },
  demoLabel: { fontFamily: fonts.bold, fontSize: 14, color: colors.purpleText },
  demoBody: { fontFamily: fonts.regular, fontSize: 14, color: colors.black, marginTop: 4 },
});
