import { router } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Icon } from '@/components/Icon';
import { Appear, PressScale, useReducedMotion } from '@/components/motion';
import { refineSuggestions, SUGGESTION_TEXT, type ChatTurn } from '@/features/match/refine';
import { extractRemote } from '@/features/match/remoteExtract';
import { useSession } from '@/features/match/session';
import { refineGreeting } from '@/features/match/sessionCore';
import { colors, fonts } from '@/lib/theme';

// The refine conversation, opened from the floating assistant button. Say what to change and the
// list re-ranks; every reply says exactly what changed and how many now fit.

const THINK_MS = 550;

export default function Refine() {
  const session = useSession();
  const insets = useSafeAreaInsets();
  const reduced = useReducedMotion();
  const [draft, setDraft] = useState('');
  const [pending, setPending] = useState<string | null>(null);
  const scroll = useRef<ScrollView>(null);
  const { state } = session;
  const profession = state.profession === 'either' ? undefined : state.profession;
  const hasResults = state.result?.status === 'matches';
  const chat: ChatTurn[] = [{ from: 'agent', text: refineGreeting(state) }, ...(state.chat ?? [])];

  useEffect(() => {
    const t = setTimeout(() => scroll.current?.scrollToEnd({ animated: !reduced }), 30);
    return () => clearTimeout(t);
  }, [chat.length, pending, reduced]);

  const send = (message: string) => {
    const text = message.trim();
    if (!text || pending) return;
    setDraft('');
    setPending(text);
    // Chips are exact; typed messages are read by Claude when it's switched on. The reply waits
    // at least a beat so it reads as a conversation, never longer than the reading takes.
    const reading = text in SUGGESTION_TEXT ? Promise.resolve(null) : extractRemote(text, profession);
    const beat = new Promise((r) => setTimeout(r, reduced ? 0 : THINK_MS));
    void Promise.all([reading, beat]).then(([extracted]) => {
      const route = session.refine(text, extracted);
      setPending(null);
      if (route !== '/refine') {
        router.back();
        router.push(route as never);
      }
    });
  };

  const seeMatches = () => {
    router.back();
    router.navigate('/matches');
  };

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.scrim}>
      <Pressable style={StyleSheet.absoluteFill} onPress={() => router.back()} accessibilityRole="button" accessibilityLabel="Close" />
      <Appear distance={40} style={[styles.card, { paddingBottom: insets.bottom + 12, marginTop: insets.top + 60 }]}>
        <View style={styles.header}>
          <View style={styles.badge}>
            <Icon name="icSparkle" size={16} color={colors.white} />
          </View>
          <Text style={styles.title} accessibilityRole="header">
            Refine with WATL
          </Text>
          <Pressable onPress={() => router.back()} accessibilityRole="button" accessibilityLabel="Close" style={styles.close}>
            <Icon name="icClose" size={16} />
          </Pressable>
        </View>

        <ScrollView ref={scroll} style={styles.thread} contentContainerStyle={styles.threadContent} keyboardShouldPersistTaps="handled">
          {chat.map((turn, i) => (
            <Appear key={`${i}-${turn.text}`} distance={8}>
              <Bubble turn={turn} onSeeMatches={seeMatches} />
            </Appear>
          ))}
          {pending ? (
            <>
              <Appear distance={8}>
                <Bubble turn={{ from: 'you', text: pending }} />
              </Appear>
              <Appear distance={8} delay={120}>
                <Typing />
              </Appear>
            </>
          ) : null}
        </ScrollView>

        {hasResults ? (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips} keyboardShouldPersistTaps="handled">
            {refineSuggestions(profession).map((s) => (
              <PressScale key={s} onPress={() => send(s)} accessibilityRole="button" style={styles.chip}>
                <Text style={styles.chipText}>{s}</Text>
              </PressScale>
            ))}
          </ScrollView>
        ) : null}

        <View style={styles.inputRow}>
          <TextInput
            value={draft}
            onChangeText={setDraft}
            onSubmitEditing={() => send(draft)}
            placeholder={hasResults ? 'e.g. someone gentler, or online only' : "What's going on, and what are you hoping for?"}
            placeholderTextColor={colors.muted}
            style={styles.input}
            returnKeyType="send"
            accessibilityLabel="Message the assistant"
          />
          <PressScale
            onPress={() => send(draft)}
            accessibilityRole="button"
            accessibilityLabel="Send"
            accessibilityState={{ disabled: !draft.trim() }}
            style={[styles.send, !draft.trim() && styles.sendOff]}
            scaleTo={0.88}
          >
            <Icon name="icSend" size={20} color={colors.white} />
          </PressScale>
        </View>
        <Text style={styles.fine}>Suggestions only. The assistant re-ranks your list; it doesn&apos;t give medical advice.</Text>
      </Appear>
    </KeyboardAvoidingView>
  );
}

function Bubble({ turn, onSeeMatches }: { turn: ChatTurn; onSeeMatches?: () => void }) {
  const mine = turn.from === 'you';
  return (
    <View style={[styles.bubbleRow, mine && styles.bubbleRowMine]}>
      <View style={[styles.bubble, mine ? styles.mine : styles.theirs]}>
        <Text style={[styles.bubbleText, mine && styles.mineText]}>{turn.text}</Text>
        {turn.action === 'see_matches' && onSeeMatches ? (
          <Pressable onPress={onSeeMatches} accessibilityRole="button" style={styles.action}>
            <Text style={styles.actionText}>See matches</Text>
          </Pressable>
        ) : null}
      </View>
    </View>
  );
}

/** Three dots while the assistant "thinks" — short, and only for a moment. */
function Typing() {
  return (
    <View style={styles.bubbleRow} accessibilityLabel="The assistant is replying">
      <View style={[styles.bubble, styles.theirs, styles.typing]}>
        {[0, 1, 2].map((i) => (
          <Appear key={i} delay={i * 120} distance={4}>
            <View style={styles.dot} />
          </Appear>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  scrim: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'flex-end' },
  card: { flexShrink: 1, maxHeight: '88%', backgroundColor: colors.white, borderTopLeftRadius: 18, borderTopRightRadius: 18 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 20,
    paddingTop: 14,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.background,
  },
  badge: { width: 28, height: 28, borderRadius: 14, backgroundColor: colors.black, alignItems: 'center', justifyContent: 'center' },
  title: { flex: 1, fontFamily: fonts.serifSemiBold, fontSize: 20, color: colors.black },
  close: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center', marginRight: -12 },
  thread: { flexGrow: 0, minHeight: 180 },
  threadContent: { padding: 16, gap: 10 },
  bubbleRow: { flexDirection: 'row' },
  bubbleRowMine: { justifyContent: 'flex-end' },
  bubble: { maxWidth: '84%', borderRadius: 18, paddingHorizontal: 14, paddingVertical: 10 },
  theirs: { backgroundColor: colors.background, borderBottomLeftRadius: 6 },
  mine: { backgroundColor: colors.black, borderBottomRightRadius: 6 },
  bubbleText: { fontFamily: fonts.regular, fontSize: 16, lineHeight: 22, color: colors.black },
  mineText: { color: colors.white },
  action: { marginTop: 8, alignSelf: 'flex-start', borderWidth: 1, borderColor: colors.black, borderRadius: 30, paddingHorizontal: 14, paddingVertical: 10 },
  actionText: { fontFamily: fonts.bold, fontSize: 14, color: colors.black },
  typing: { flexDirection: 'row', gap: 5, paddingVertical: 14 },
  dot: { width: 7, height: 7, borderRadius: 4, backgroundColor: colors.muted },
  chips: { paddingHorizontal: 16, paddingVertical: 8, gap: 8 },
  chip: { borderWidth: 1, borderColor: colors.black, borderRadius: 30, paddingHorizontal: 14, paddingVertical: 12 },
  chipText: { fontFamily: fonts.medium, fontSize: 14, color: colors.black },
  inputRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 16, paddingTop: 8 },
  input: {
    flex: 1,
    minHeight: 48,
    borderRadius: 24,
    backgroundColor: colors.background,
    paddingHorizontal: 18,
    fontFamily: fonts.regular,
    fontSize: 16,
    color: colors.black,
  },
  send: { width: 48, height: 48, borderRadius: 24, backgroundColor: colors.black, alignItems: 'center', justifyContent: 'center' },
  sendOff: { opacity: 0.35 },
  fine: { fontFamily: fonts.regular, fontSize: 12, color: colors.muted, textAlign: 'center', marginTop: 10, paddingHorizontal: 24 },
});
