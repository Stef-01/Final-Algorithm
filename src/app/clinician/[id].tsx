import { router, useLocalSearchParams } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ChipsCard, PhotoCard, PromptCard, TextCard } from '@/components/cards';
import { placeLine, practicalChips } from '@/components/ClinicianCards';
import { EmptyStateCard } from '@/components/EmptyStateCard';
import { FitLabel } from '@/components/FitLabel';
import { ScreenHeader } from '@/components/ScreenHeader';
import { PillButton } from '@/components/Sheet';
import { getClinician } from '@/data/clinicians';
import { useSaved } from '@/features/match/saved';
import { useSession } from '@/features/match/session';
import { findMatch } from '@/features/match/sessionCore';
import { colors, fonts } from '@/lib/theme';

// Screen 06 — clinician detail, in the same card language as the matches.
// Layer 1: who and why they fit. Layer 2: practice, experience, costs. Layer 3: bio and qualifications.
export default function ClinicianDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const session = useSession();
  const { saved, isSaved, toggle } = useSaved();
  const insets = useSafeAreaInsets();
  const c = getClinician(id);
  const match = findMatch(session.state, id) ?? saved.find((m) => m.clinicianId === id);

  if (!c) {
    return (
      <View style={styles.root}>
        <ScreenHeader title="Clinician" back />
        <EmptyStateCard title="I can't find that clinician." body="They may no longer be available." />
      </View>
    );
  }

  const p = c.practical;
  const like = match
    ? { onLike: () => toggle(match), liked: isSaved(c.id), likeLabel: isSaved(c.id) ? `Saved ${c.firstName}` : `Save ${c.firstName}` }
    : {};

  // "See next match" only when this clinician is the current match and another follows.
  const result = session.state.result;
  const current = result?.status === 'matches' ? result.matches[session.state.index] : undefined;
  const hasNext =
    result?.status === 'matches' && current?.clinicianId === c.id && session.state.index + 1 < result.matches.length;

  return (
    <View style={styles.root}>
      <ScreenHeader title={c.name} back right={match ? <FitLabel fit={match.fit} /> : undefined} />
      <ScrollView contentContainerStyle={[styles.content, { paddingBottom: 140 + insets.bottom }]}>
        <PhotoCard caption={placeLine(c)} source={c.photo} {...like} />

        {match ? (
          <>
            <Text style={styles.section}>Why I matched you</Text>
            {match.reasons.slice(0, 3).map((r) => (
              <PromptCard key={r.evidenceId} title={r.signal} answer={r.evidence} {...like} />
            ))}
          </>
        ) : null}

        <PromptCard title={`How ${c.firstName} practises`} answer={c.practiceStyle.slice(0, 5).join(' · ')} />
        <ChipsCard
          chips={practicalChips(c)}
          rowsTitle="Particularly experienced with"
          rows={c.experiencedWith.slice(0, 4).map((area) => ({ icon: 'icCheck', label: area }))}
        />
        <ChipsCard
          chips={[]}
          rowsTitle="Practical details"
          rows={[
            { icon: 'icCalendar', label: `Next available: ${p.nextAvailable}` },
            { icon: 'icVideo', label: p.modes.join(' · ') },
            {
              icon: 'icCost',
              label:
                p.gapAfterMedicare === 0
                  ? 'Bulk billed, no out-of-pocket cost'
                  : `$${p.fee} · approx. $${p.gapAfterMedicare} after Medicare`,
            },
            { icon: 'icLocation', label: `${c.suburb}, ${c.city}` },
          ]}
        />
        <TextCard title={`About ${c.firstName}`} body={c.bio} />
        <ChipsCard
          chips={[]}
          rowsTitle="Qualifications"
          rows={c.credentials.map((q) => ({ icon: 'icEducation', label: q }))}
        />
      </ScrollView>

      <View style={[styles.footer, { paddingBottom: 12 + insets.bottom }]}>
        <PillButton label={`Book with ${c.firstName}`} onPress={() => router.push(`/book/${c.id}`)} />
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
  section: { fontFamily: fonts.serifSemiBold, fontSize: 24, color: colors.black, marginTop: 28, marginHorizontal: 27 },
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
  nextText: { fontFamily: fonts.bold, fontSize: 15, color: colors.purpleText, textAlign: 'center', paddingVertical: 12 },
});
