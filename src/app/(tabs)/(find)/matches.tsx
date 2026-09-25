import { useRef } from 'react';
import { router } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { ClinicianCards } from '@/components/ClinicianCards';
import { AlsoCouldHelp } from '@/components/AlsoCouldHelp';
import { FiltersButton } from '@/components/FiltersButton';
import { ProgressDots } from '@/components/ProgressDots';
import { Appear } from '@/components/motion';
import { Swipeable, type SwipeableHandle } from '@/components/Swipeable';
import { EmptyStateCard } from '@/components/EmptyStateCard';
import { MatchFeedback, RatingCard } from '@/components/Feedback';
import { FitLabel } from '@/components/FitLabel';
import { Icon } from '@/components/Icon';
import { ScreenHeader } from '@/components/ScreenHeader';
import { PillButton } from '@/components/Sheet';
import { getClinician } from '@/data/clinicians';
import { useSaved } from '@/features/match/saved';
import { useSession } from '@/features/match/session';
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


// Screen 05 — top matches, one clinician at a time in the Discover layout.
export default function Matches() {
  const session = useSession();
  const deck = useRef<SwipeableHandle>(null);
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
  const m = matches[state.index];
  const explained = matches.filter((x) => x.reasons.length > 0).length;
  const subline = matchesSubline(matches.length, explained);

  if (!m) {
    return (
      <Shell title="Your matches">
        <EmptyStateCard
          title="That's everyone I'd start with."
          body={
            more.length > 0
              ? `${more.length} more ${more.length === 1 ? copyFor(state.profession).one : copyFor(state.profession).many} fit, ranked behind these.`
              : 'Anyone you save is in My care.'
          }
          action={more.length > 0 ? { label: `See all ${matches.length + more.length}`, onPress: () => router.push('/all') } : undefined}
          secondary={{ label: 'Start over', onPress: startOver }}
        />
        <AlsoCouldHelp />
        <RatingCard value={state.feedback.rating} onRate={session.rateMatches} />
      </Shell>
    );
  }

  const clinician = getClinician(m.clinicianId)!;
  const open = () => router.push(`/clinician/${clinician.id}`);

  return (
    <View style={styles.root}>
      <ScreenHeader
        title={clinician.name}
        right={<FitLabel fit={m.fit} />}
        // Always a way back: the previous match, or from the first one, back to the search to redo it.
        onBack={state.index > 0 ? session.prevMatch : () => router.navigate('/describe')}
        backLabel={state.index > 0 ? 'Previous match' : 'Back to your search'}
      />
      <Swipeable
        key={state.index}
        ref={deck}
        onLeft={session.nextMatch}
        onRight={() => {
          if (!isSaved(m.clinicianId)) toggle(m);
          session.nextMatch();
        }}
      >
        {/* The next match slides in from where the last one went. */}
        <Appear from="right" distance={state.index > 0 ? 60 : 0} style={styles.fill}>
          <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
            {state.index === 0 ? (
              <View style={styles.intro}>
                <Text style={styles.introTitle}>{matchesHeadline(matches.length, state.profession, explained)}</Text>
                {subline ? <Text style={styles.introBody}>{subline}</Text> : null}
                {explained === 0 ? (
                  <Text style={styles.seeAll} onPress={() => router.push('/refine')} accessibilityRole="link">
                    Tell the assistant what matters
                  </Text>
                ) : null}
                {more.length > 0 ? (
                  <Text style={styles.seeAll} onPress={() => router.push('/all')} accessibilityRole="link">
                    See all {matches.length + more.length} who fit
                  </Text>
                ) : null}
              </View>
            ) : (
              <View style={styles.position}>
                <ProgressDots count={matches.length} index={state.index} label={`Match ${state.index + 1} of ${matches.length}`} />
              </View>
            )}
            {state.index === 0 ? (
              <View style={styles.filters}>
                <FiltersButton />
              </View>
            ) : null}
            {state.index === 0 ? <AlsoCouldHelp /> : null}
            <ClinicianCards
              key={clinician.id}
              clinician={clinician}
              match={m}
              onOpen={open}
              saved={isSaved(clinician.id)}
              onSave={() => toggle(m)}
            />
            <View style={styles.view}>
              <PillButton label={`View ${clinician.firstName}`} onPress={open} />
            </View>
            <MatchFeedback value={state.feedback.thumbs[clinician.id]} onChoose={(dir) => session.thumb(clinician.id, dir)} />
          </ScrollView>
        </Appear>
      </Swipeable>
      <Pressable
        onPress={() => deck.current?.fling(-1)}
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
  fill: { flex: 1 },
  filters: { marginHorizontal: 12, marginTop: 14 },
  content: { paddingBottom: 110 },
  intro: { marginHorizontal: 12, marginTop: 20, paddingHorizontal: 15 },
  introTitle: { fontFamily: fonts.serifSemiBold, fontSize: 24, lineHeight: 30, color: colors.black },
  introBody: { fontFamily: fonts.regular, fontSize: 15, color: colors.black, marginTop: 6 },
  seeAll: { fontFamily: fonts.bold, fontSize: 15, color: colors.purpleText, marginTop: 2, paddingVertical: 14 },
  position: { marginTop: 16, marginHorizontal: 27 },
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
