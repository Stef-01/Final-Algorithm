import { router } from 'expo-router';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { ClinicianCards } from '@/components/ClinicianCards';
import { AlsoCouldHelp } from '@/components/AlsoCouldHelp';
import { FiltersButton } from '@/components/FiltersButton';
import { EmptyStateCard } from '@/components/EmptyStateCard';
import { RatingCard } from '@/components/Feedback';
import { FitLabel } from '@/components/FitLabel';
import { ScreenHeader } from '@/components/ScreenHeader';
import { PillButton } from '@/components/Sheet';
import { whyKind } from '@server/feedback';

import { getClinician } from '@/data/clinicians';
import { useSaved } from '@/features/match/saved';
import { useSession } from '@/features/match/session';
import { deckOf } from '@/features/match/sessionCore';
import type { NoMatchAction } from '@/features/match/types';
import { copyFor, matchesHeadline, matchesSubline } from '@/lib/professions';
import { colors, fonts } from '@/lib/theme';

const ACTION_LABEL: Record<NoMatchAction, string> = {
  answer_more: 'Answer one more question',
  include_telehealth: 'Include telehealth',
  expand_distance: 'Look further away',
  any_cost: 'Show them at any cost',
  any_gender: 'Include any gender',
  any_profession: 'Include GPs and psychologists',
};

/** What's ruling everyone out, in the patient's terms (the first change that would help). */
function blocker(action: NoMatchAction | undefined, many: string) {
  switch (action) {
    case 'any_cost':
      return `None of the ${many} here publishes a fee within what you asked for.`;
    case 'any_gender':
      return `Nobody who fits the rest matches the clinician gender you asked for.`;
    case 'include_telehealth':
      return `Nobody who fits sees people in person where you are, but some do telehealth.`;
    case 'expand_distance':
      return `Nobody who fits is close enough, but some are a little further away.`;
    case 'any_profession':
      return `No ${many} fit all of that, but someone in the other profession does.`;
    case 'answer_more':
      return 'One more answer could help me find someone who fits.';
    default:
      return 'Try describing what you need in a bit more detail, or tell the assistant what you could be flexible on.';
  }
}


// Screen 05 — top matches as one vertical list, best first.
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
          body={`Describe what you need and I'll find ${copyFor(state.profession).many} who fit, best first.`}
          action={{ label: 'Get started', onPress: () => router.navigate('/') }}
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
          title="Nobody fits all of that yet."
          body={blocker(action, copyFor(state.profession).many)}
          action={
            action
              ? { label: ACTION_LABEL[action], onPress: () => router.push(session.noMatchAction(action)) }
              : { label: 'Change what I asked for', onPress: () => router.push('/refine') }
          }
          secondary={action ? { label: 'Change something else', onPress: () => router.push('/refine') } : { label: 'Start over', onPress: startOver }}
        />
      </Shell>
    );
  }

  const { matches, more } = result;
  // The whole list, best first: the top matches, then everyone else who fits.
  const deckList = deckOf(state);
  const explained = matches.filter((x) => x.reasons.length > 0).length;
  const subline = matchesSubline(matches.length, explained);
  const headline = matchesHeadline(deckList.length, state.profession, explained);

  if (deckList.length === 0) {
    return (
      <Shell title="Your matches">
        <EmptyStateCard title="That's everyone who fits." body="Anyone you liked is in My care." secondary={{ label: 'Start over', onPress: startOver }} />
        <AlsoCouldHelp />
      </Shell>
    );
  }

  // Everyone who fits, best first, in one list: scroll down for the next profile.
  return (
    <View style={styles.root}>
      <ScreenHeader title="Your matches" onBack={() => router.navigate('/describe')} backLabel="Back to your search" />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.intro}>
          {headline ? <Text style={styles.introTitle}>{headline}</Text> : null}
          {subline ? <Text style={styles.introBody}>{subline}</Text> : null}
          {more.length > 0 ? (
            <Text style={styles.seeAll} onPress={() => router.push('/all')} accessibilityRole="link">
              See all {matches.length + more.length} who fit
            </Text>
          ) : null}
        </View>
        <View style={styles.filters}>
          <FiltersButton />
        </View>
        <AlsoCouldHelp />
        {deckList.map((m, n) => {
          const clinician = getClinician(m.clinicianId);
          if (!clinician) return null;
          const open = () => router.push(`/clinician/${clinician.id}`);
          return (
            <View key={clinician.id} style={styles.profile}>
              <View style={styles.position}>
                <Text style={styles.name} accessibilityRole="header">
                  {clinician.name}
                </Text>
                <FitLabel fit={m.fit} />
              </View>
              {n === matches.length ? <Text style={[styles.also, styles.position]}>Also a fit</Text> : null}
              <ClinicianCards clinician={clinician} match={m} onOpen={open} saved={isSaved(clinician.id)} onSave={() => toggle(m)} />
              <View style={styles.view}>
                <PillButton label={`View ${clinician.firstName}`} onPress={open} />
              </View>
            </View>
          );
        })}
        <View style={styles.end}>
          <Text style={styles.introBody}>That’s everyone who fits.</Text>
          <Text style={styles.seeAll} onPress={startOver} accessibilityRole="link">
            Start over
          </Text>
        </View>
        <RatingCard value={state.feedback.rating} onRate={(n) => (whyKind(n) ? router.push(`/rate?n=${n}`) : session.rateMatches(n))} />
      </ScrollView>
    </View>
  );
}

function Shell({ title, children }: { title: string; children: React.ReactNode }) {
  const toSearch = () => router.navigate('/describe');
  return (
    <View style={styles.root}>
      <ScreenHeader title={title} onBack={toSearch} backLabel="Back to your search" />
      <ScrollView contentContainerStyle={styles.content}>{children}</ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  filters: { marginHorizontal: 12, marginTop: 14 },
  content: { paddingBottom: 110 },
  intro: { marginHorizontal: 12, marginTop: 20, paddingHorizontal: 15 },
  introTitle: { fontFamily: fonts.serifSemiBold, fontSize: 22, lineHeight: 30, color: colors.black },
  introBody: { fontFamily: fonts.regular, fontSize: 16, color: colors.black, marginTop: 6 },
  seeAll: { fontFamily: fonts.bold, fontSize: 16, color: colors.purpleText, marginTop: 2, paddingVertical: 14 },
  name: { flex: 1, fontFamily: fonts.serifSemiBold, fontSize: 20, color: colors.black },
  count: { fontFamily: fonts.medium, fontSize: 14, color: colors.muted },
  also: { fontFamily: fonts.bold, fontSize: 14, color: colors.purpleText, marginTop: 6 },
  view: { marginHorizontal: 12, marginTop: 24 },
  profile: { marginTop: 32 },
  position: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginHorizontal: 27, marginBottom: 8 },
  end: { alignItems: 'center', marginTop: 40 },
});
