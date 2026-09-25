import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { NOTE_MAX, WHY, whyKind } from '@server/feedback';

import { Icon } from '@/components/Icon';
import { Appear, PressDepth, PressScale } from '@/components/motion';
import { ScreenHeader } from '@/components/ScreenHeader';
import { useSession } from '@/features/match/session';
import { colors, fonts } from '@/lib/theme';

// After a 5 ("What was good?") or a 1–2 ("What was off?"): tap any that apply, or Other to say it
// in your words. Skip sends the rating on its own. Nothing is sent until you choose.

export default function Rate() {
  const session = useSession();
  const insets = useSafeAreaInsets();
  const rating = Number(useLocalSearchParams<{ n: string }>().n);
  const kind = whyKind(rating);
  const [picked, setPicked] = useState<string[]>([]);
  const [other, setOther] = useState(false);
  const [note, setNote] = useState('');

  const done = (why?: { reasons: string[]; note?: string }) => {
    session.rateMatches(rating, why);
    router.back();
  };

  if (!kind) {
    return (
      <View style={styles.root}>
        <ScreenHeader title="Rating" back />
      </View>
    );
  }

  const toggle = (id: string) => setPicked((p) => (p.includes(id) ? p.filter((x) => x !== id) : [...p, id]));
  const text = other ? note.trim() : '';
  const any = picked.length > 0 || !!text;

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.root}>
      <ScreenHeader title={`${rating} out of 5`} back />
      <ScrollView contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 40 }]} keyboardShouldPersistTaps="handled">
        <Appear>
          <Text style={styles.title} accessibilityRole="header">
            {kind === 'good' ? 'What was good?' : 'What was off?'}
          </Text>
          <View style={styles.chips}>
            {WHY[kind].map((o) => {
              const on = picked.includes(o.id);
              return (
                <PressScale
                  key={o.id}
                  onPress={() => toggle(o.id)}
                  accessibilityRole="checkbox"
                  accessibilityState={{ checked: on }}
                  style={[styles.chip, on && styles.chipOn]}
                  scaleTo={0.94}
                  popOn={on}
                >
                  {on ? <Icon name="icCheck" size={12} color={colors.white} /> : null}
                  <Text style={[styles.chipText, on && styles.chipTextOn]}>{o.label}</Text>
                </PressScale>
              );
            })}
            <PressScale
              onPress={() => setOther((o) => !o)}
              accessibilityRole="checkbox"
              accessibilityState={{ checked: other }}
              style={[styles.chip, other && styles.chipOn]}
              scaleTo={0.94}
              popOn={other}
            >
              <Text style={[styles.chipText, other && styles.chipTextOn]}>Other</Text>
            </PressScale>
          </View>
        </Appear>

        {other ? (
          <Appear>
            <TextInput
              value={note}
              onChangeText={setNote}
              maxLength={NOTE_MAX}
              multiline
              autoFocus
              placeholder="In your words (no health details, please)"
              placeholderTextColor={colors.muted}
              accessibilityLabel="In your words"
              style={styles.input}
            />
          </Appear>
        ) : null}

        <PressDepth
          onPress={() => done({ reasons: picked, ...(text ? { note: text } : {}) })}
          disabled={!any}
          accessibilityRole="button"
          accessibilityState={{ disabled: !any }}
          containerStyle={styles.sendWrap}
          style={[styles.send, !any && styles.sendOff]}
          radius={28}
          lipColor={colors.purpleLip}
        >
          <Text style={styles.sendText}>Send</Text>
        </PressDepth>
        <PressScale onPress={() => done()} accessibilityRole="button" style={styles.skip}>
          <Text style={styles.skipText}>Skip</Text>
        </PressScale>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  content: { padding: 16, paddingTop: 28 },
  title: { fontFamily: fonts.serifSemiBold, fontSize: 28, lineHeight: 34, color: colors.black, marginBottom: 20 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    minHeight: 44,
    borderRadius: 30,
    borderWidth: 1,
    borderColor: colors.black,
    backgroundColor: colors.white,
    paddingHorizontal: 16,
  },
  chipOn: { backgroundColor: colors.purple, borderColor: colors.purple },
  chipText: { fontFamily: fonts.medium, fontSize: 15, color: colors.black },
  chipTextOn: { color: colors.white },
  input: {
    marginTop: 16,
    minHeight: 96,
    borderRadius: 12,
    backgroundColor: colors.white,
    padding: 14,
    fontFamily: fonts.regular,
    fontSize: 16,
    color: colors.black,
    textAlignVertical: 'top',
  },
  sendWrap: { marginTop: 28 },
  send: { height: 56, borderRadius: 28, backgroundColor: colors.purple, alignItems: 'center', justifyContent: 'center' },
  sendOff: { opacity: 0.4 },
  sendText: { fontFamily: fonts.bold, fontSize: 16, color: colors.white },
  skip: { alignSelf: 'center', minHeight: 44, justifyContent: 'center', paddingHorizontal: 20, marginTop: 8 },
  skipText: { fontFamily: fonts.bold, fontSize: 15, color: colors.purpleText },
});
