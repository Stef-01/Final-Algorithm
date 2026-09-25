import { router, useLocalSearchParams } from 'expo-router';
import { useEffect } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AssistantMark } from '@/components/AssistantButton';
import { ChipsCard, NoteCard, PhotoCard, PromptCard, QualificationsCard, TagsCard, TextCard } from '@/components/cards';
import { caveatLines, costLabel, noReasonLine, placeLine, placeName, practicalChips, reasonKicker } from '@/components/ClinicianCards';
import { EmptyStateCard } from '@/components/EmptyStateCard';
import { FitLabel } from '@/components/FitLabel';
import { ScreenHeader } from '@/components/ScreenHeader';
import { PillButton } from '@/components/Sheet';
import { getClinician } from '@/data/clinicians';
import { useSaved } from '@/features/match/saved';
import { useSession } from '@/features/match/session';
import { deckOf, findMatch } from '@/features/match/sessionCore';
import { track } from '@/lib/analytics';
import { colors, fonts } from '@/lib/theme';

// Screen 06 — clinician detail, in the same card language as the matches.
// Layer 1: who and why they fit. Layer 2: practice, experience, costs. Layer 3: bio and qualifications.
export default function ClinicianDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const session = useSession();
  const { saved, isSaved, toggle } = useSaved();
  const insets = useSafeAreaInsets();
  const c = getClinician(id);
  // Why they fit comes only from the current search; Saved keeps the label, not the reasons.
  const match = findMatch(session.state, id);
  const savedItem = saved.find((m) => m.clinicianId === id);
  const fit = match?.fit ?? savedItem?.fit ?? 'none';
  const likeTarget = match ?? savedItem;

  useEffect(() => {
    if (c) track('clinician_viewed', { clinician: c.id, fit });
  }, [c, fit]);

  if (!c) {
    return (
      <View style={styles.root}>
        <ScreenHeader title="Clinician" back />
        <EmptyStateCard title="I can't find that clinician." body="They may no longer be available." />
      </View>
    );
  }

  const p = c.practical;
  const like = likeTarget
    ? { onLike: () => toggle(likeTarget), liked: isSaved(c.id), likeLabel: isSaved(c.id) ? `Saved ${c.firstName}` : `Save ${c.firstName}` }
    : {};

  // "See next match" only when this clinician is the current match and another follows.
  const deck = deckOf(session.state);
  const current = deck[session.state.index];
  const hasNext =
    current?.clinicianId === c.id && session.state.index + 1 < deck.length;

  return (
    <View style={styles.root}>
      <ScreenHeader title={c.name} back right={fit !== 'none' ? <FitLabel fit={fit} /> : undefined} />
      <ScrollView contentContainerStyle={[styles.content, { paddingBottom: 140 + insets.bottom }]}>
        <PhotoCard caption={placeLine(c)} source={c.photo} {...like} />

        {match ? (
          <>
            {match.reasons.length > 0 ? (
              match.reasons.slice(0, 3).map((r, i, all) => (
                <PromptCard key={r.evidenceId} kicker={reasonKicker(i, all.length)} title={r.signal} answer={r.evidence} {...like} />
              ))
            ) : (
              <TextCard kicker="Why they're here" title="Meets what you asked for" body={noReasonLine(c)} />
            )}
            {caveatLines(match).map((line) => (
              <NoteCard key={line} title="Worth checking" body={line} />
            ))}
          </>
        ) : null}

        <TagsCard kicker="How they practise" title={`How ${c.firstName} works`} tags={c.practiceStyle.slice(0, 5)} />
        <ChipsCard
          kicker="The practicals"
          chips={practicalChips(c)}
          rowsTitle="Particularly experienced with"
          rows={c.experiencedWith.slice(0, 4).map((area) => ({ icon: 'icCheck', label: area }))}
        />
        <ChipsCard
          chips={[]}
          rowsTitle="Practical details"
          rows={[
            ...(c.practice ? [{ icon: 'icHometown' as const, label: c.practice }] : []),
            { icon: 'icCalendar', label: p.nextAvailable },
            { icon: 'icVideo', label: p.modes.join(' · ') },
            { icon: 'icCost', label: p.billingNote ?? costLabel(c) },
            { icon: 'icLocation', label: placeName(c) },
          ]}
        />
        <TextCard kicker="In their words" title={`About ${c.firstName}`} body={c.bio} lines={4} />
        <QualificationsCard items={c.qualifications} />
      </ScrollView>

      <View style={[styles.footer, { paddingBottom: 12 + insets.bottom }]}>
        <View style={styles.footerRow}>
          <AssistantMark />
          <View style={styles.book}>
            <PillButton label={`Book with ${c.firstName}`} onPress={() => router.push(`/book/${c.id}`)} />
          </View>
        </View>
        {hasNext ? (
          <Pressable
            onPress={() => {
              session.nextMatch();
              router.back();
            }}
            accessibilityRole="button"
            hitSlop={8}
          >
            <Text style={styles.nextText}>See next match</Text>
          </Pressable>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  content: {},
  footerRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  book: { flex: 1, marginTop: -8 },
  footer: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: 24,
    paddingTop: 8,
    backgroundColor: colors.white,
    borderTopWidth: 1,
    borderTopColor: colors.background,
  },
  nextText: { fontFamily: fonts.bold, fontSize: 15, color: colors.purpleText, textAlign: 'center', paddingVertical: 14 },
});
