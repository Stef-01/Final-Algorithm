import { router } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { ClinicianCards } from '@/components/ClinicianCards';
import { EmptyStateCard } from '@/components/EmptyStateCard';
import { FitLabel } from '@/components/FitLabel';
import { Icon } from '@/components/Icon';
import { ScreenHeader } from '@/components/ScreenHeader';
import { PillButton } from '@/components/Sheet';
import { getClinician } from '@/data/clinicians';
import { useSaved } from '@/features/match/saved';
import { useSession } from '@/features/match/session';
import type { NoMatchAction } from '@/features/match/types';
import { colors, fonts } from '@/lib/theme';

const ACTION_LABEL: Record<NoMatchAction, string> = {
  answer_more: 'Answer one more question',
  include_telehealth: 'Include telehealth',
  expand_distance: 'Expand distance',
};

function headline(count: number) {
  if (count === 3) return "I found 3 clinicians I'd start with.";
  return count === 1 ? "I found 1 clinician I'd recommend." : `I found ${count} clinicians I'd recommend.`;
}

// Screen 05 — top matches, one clinician at a time in the Discover layout.
export default function Matches() {
  const session = useSession();
  const { isSaved, toggle } = useSaved();
  const { state } = session;

  const startOver = () => {
    session.reset();
    router.navigate('/');
  };

  if (!session.loaded) return <View style={styles.root} />;

  const result = state.result;
  if (!result) {
    return (
      <Shell title="Your matches">
        <EmptyStateCard
          title="Tell me what you're looking for first."
          body="Describe what you need from a GP and I'll suggest up to three clinicians."
          action={{ label: 'Find a GP', onPress: () => router.navigate('/') }}
        />
      </Shell>
    );
  }

  // PRD §42: never force weak recommendations; offer one useful next action.
  if (result.status === 'none') {
    const action = result.actions[0];
    return (
      <Shell title="Your matches">
        <EmptyStateCard
          title="I don't have a strong enough match yet."
          body={
            action
              ? 'One small change could help me find someone who fits.'
              : 'Try describing what you need in a bit more detail.'
          }
          action={
            action
              ? { label: ACTION_LABEL[action], onPress: () => router.push(session.noMatchAction(action)) }
              : { label: 'Start over', onPress: startOver }
          }
        />
      </Shell>
    );
  }

  const { matches, more } = result;
  const m = matches[state.index];

  if (!m) {
    return (
      <Shell title="Your matches">
        <EmptyStateCard
          title="That's everyone I'd start with."
          body={
            more.length > 0
              ? "Save anyone you'd like to come back to, or see a few more options."
              : "Save anyone you'd like to come back to. They'll be in the Saved tab."
          }
          action={more.length > 0 ? { label: 'See more options', onPress: session.showMore } : undefined}
          secondary={{ label: 'Start over', onPress: startOver }}
        />
      </Shell>
    );
  }

  const clinician = getClinician(m.clinicianId)!;
  const open = () => router.push(`/clinician/${clinician.id}`);

  return (
    <View style={styles.root}>
      <ScreenHeader title={clinician.name} right={<FitLabel fit={m.fit} />} />
      <ScrollView key={state.index} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {state.index === 0 ? (
          <View style={styles.intro}>
            <Text style={styles.introTitle}>{headline(matches.length)}</Text>
            {matches.length > 1 ? <Text style={styles.introBody}>Each fits for slightly different reasons.</Text> : null}
          </View>
        ) : (
          <Text style={styles.position}>
            {state.index + 1} of {matches.length}
          </Text>
        )}
        <ClinicianCards
          clinician={clinician}
          match={m}
          onOpen={open}
          saved={isSaved(clinician.id)}
          onSave={() => toggle(m)}
        />
        <View style={styles.view}>
          <PillButton label={`View ${clinician.firstName}`} onPress={open} />
        </View>
      </ScrollView>
      <Pressable
        onPress={session.nextMatch}
        accessibilityRole="button"
        accessibilityLabel="Next match"
        style={styles.next}
      >
        <Icon name="icDecline" size={24} />
      </Pressable>
    </View>
  );
}

function Shell({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={styles.root}>
      <ScreenHeader title={title} />
      <ScrollView contentContainerStyle={styles.content}>{children}</ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  content: { paddingBottom: 110 },
  intro: { marginHorizontal: 12, marginTop: 20, paddingHorizontal: 15 },
  introTitle: { fontFamily: fonts.serifSemiBold, fontSize: 24, lineHeight: 30, color: colors.black },
  introBody: { fontFamily: fonts.regular, fontSize: 15, color: colors.black, marginTop: 6 },
  position: { fontFamily: fonts.medium, fontSize: 14, color: colors.line, marginTop: 16, marginHorizontal: 27 },
  view: { marginHorizontal: 12, marginTop: 24 },
  next: {
    position: 'absolute',
    left: 20,
    bottom: 20,
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 6,
  },
});
