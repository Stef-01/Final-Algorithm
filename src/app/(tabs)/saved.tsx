import { Image } from 'expo-image';
import { router } from 'expo-router';
import { Platform, ScrollView, StyleSheet, Text, View } from 'react-native';

import { EmptyStateCard } from '@/components/EmptyStateCard';
import { Icon } from '@/components/Icon';
import { SectionTitle } from '@/components/ListRow';
import { Appear, PressScale } from '@/components/motion';
import { ScreenHeader } from '@/components/ScreenHeader';
import { getClinician } from '@/data/clinicians';
import { useGoals } from '@/features/care/goals';
import { bookingPlan, careTeam, type Slot, type Step, type TeamMember } from '@/features/care/plan';
import { useSaved } from '@/features/match/saved';
import { useSession } from '@/features/match/session';
import type { ProfessionChoice } from '@/features/match/sessionCore';
import { track } from '@/lib/analytics';
import { addToCalendar } from '@/lib/calendar';
import { article, capitalised, PROFESSION_INFO } from '@/lib/professions';
import { colors, fonts } from '@/lib/theme';

// My care: your team (saved clinicians, plus a slot for each profession your goals point to) and
// the next steps, each a reminder you can put in your calendar. Stored on this device only.

const infoFor = (p: string) => PROFESSION_INFO.find((x) => x.id === p)!;
const DAY = new Intl.DateTimeFormat('en-AU', { weekday: 'short', day: 'numeric', month: 'short' });

export default function MyCare() {
  const { saved } = useSaved();
  const { goals } = useGoals();
  const session = useSession();

  const members: TeamMember[] = saved.flatMap((s) => {
    const c = getClinician(s.clinicianId);
    return c ? [{ clinicianId: c.id, profession: c.profession, name: c.name, firstName: c.firstName, bookingUrl: c.bookingUrl }] : [];
  });
  const team = careTeam(members, goals);
  const steps = bookingPlan(team);

  if (team.length === 0) {
    return (
      <View style={styles.root}>
        <ScreenHeader title="My care" />
        <ScrollView contentContainerStyle={styles.content}>
          <EmptyStateCard
            title="Build your care team."
            body="Save people you like, or pick goals in Profile."
            action={{ label: 'Find someone', onPress: () => router.navigate('/') }}
            secondary={{ label: 'Set goals', onPress: () => router.navigate('/settings') }}
          />
        </ScrollView>
      </View>
    );
  }

  return (
    <View style={styles.root}>
      <ScreenHeader title="My care" />
      <ScrollView contentContainerStyle={styles.content}>
        <SectionTitle>Your team</SectionTitle>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.team}>
          {team.map((slot, i) => (
            <Appear key={slot.member?.clinicianId ?? slot.profession} index={i} distance={10}>
              <TeamCard slot={slot} onFind={(p) => router.push(session.chooseProfession(p))} />
            </Appear>
          ))}
        </ScrollView>

        {steps.length > 0 ? (
          <>
            <SectionTitle>Next steps</SectionTitle>
            <View style={styles.steps}>
              {steps.map((s, i) => (
                <Appear key={s.member.clinicianId} index={i}>
                  <StepRow step={s} />
                </Appear>
              ))}
            </View>
            <Text style={styles.fine}>Reminders to book. WATL can’t see your calendar.</Text>
          </>
        ) : null}
      </ScrollView>
    </View>
  );
}

function TeamCard({ slot, onFind }: { slot: Slot; onFind: (p: ProfessionChoice) => void }) {
  const info = infoFor(slot.profession);
  const m = slot.member;
  if (m) {
    const c = getClinician(m.clinicianId)!;
    return (
      <PressScale
        onPress={() => router.push(`/clinician/${m.clinicianId}`)}
        accessibilityRole="button"
        accessibilityLabel={`${m.name}, ${capitalised(info.one)}`}
        style={styles.card}
        scaleTo={0.96}
      >
        <Image source={c.photo} style={styles.photo} contentFit="cover" accessibilityLabel="" />
        <Text style={styles.cardName} numberOfLines={1}>
          {m.firstName}
        </Text>
        <Text style={styles.cardRole} numberOfLines={1}>
          {capitalised(info.one)}
        </Text>
      </PressScale>
    );
  }
  return (
    <PressScale
      onPress={info.available ? () => onFind(slot.profession as ProfessionChoice) : undefined}
      disabled={!info.available}
      accessibilityRole="button"
      accessibilityLabel={info.available ? `Add ${article(info.one)} ${info.one}` : `${capitalised(info.one)}: not in the network yet`}
      style={[styles.card, styles.empty]}
      scaleTo={0.96}
    >
      <View style={styles.emptyIcon}>
        <Icon name={info.icon} size={24} color={info.available ? colors.black : colors.muted} />
      </View>
      <Text style={[styles.cardName, !info.available && styles.off]} numberOfLines={2}>
        {info.available ? `Add ${article(info.one)} ${info.one}` : capitalised(info.one)}
      </Text>
      <Text style={styles.cardRole}>{info.available ? info.for : 'Soon'}</Text>
    </PressScale>
  );
}

function StepRow({ step }: { step: Step }) {
  const { member: m } = step;
  const info = infoFor(m.profession);
  const event = {
    title: `Book ${m.firstName} (${info.one})`,
    start: step.on,
    minutes: 15,
    details: `A reminder from WATL to book with ${m.name}.`,
    url: m.bookingUrl ?? undefined,
  };
  const add = (how: 'ics' | 'google') => {
    track('calendar_added', { profession: m.profession, how });
    addToCalendar(event, how);
  };
  return (
    <View style={styles.step}>
      <View style={styles.when}>
        <Text style={styles.whenLabel}>{step.label}</Text>
        <Text style={styles.whenDate}>{DAY.format(step.on)}</Text>
      </View>
      <PressScale onPress={() => router.push(`/book/${m.clinicianId}`)} accessibilityRole="button" style={styles.stepMain} scaleTo={0.98}>
        <Text style={styles.stepTitle} numberOfLines={1}>
          Book {m.firstName}
        </Text>
        <Text style={styles.cardRole}>{capitalised(info.one)}</Text>
      </PressScale>
      <PressScale onPress={() => add('google')} accessibilityRole="button" accessibilityLabel={`Add a reminder to book ${m.firstName} to Google Calendar`} style={styles.cal} scaleTo={0.9}>
        <Icon name="icCalendar" size={18} color={colors.black} />
      </PressScale>
      {Platform.OS === 'web' ? (
        <PressScale onPress={() => add('ics')} accessibilityRole="button" accessibilityLabel={`Download a calendar reminder to book ${m.firstName}`} style={styles.cal} scaleTo={0.9}>
          <Text style={styles.ics}>.ics</Text>
        </PressScale>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  content: { paddingBottom: 100 }, // clear of the floating assistant button
  team: { paddingHorizontal: 12, gap: 10, paddingBottom: 6 },
  card: { width: 132, minHeight: 164, backgroundColor: colors.white, borderRadius: 16, padding: 12, alignItems: 'center' },
  empty: { backgroundColor: 'transparent', borderWidth: 1, borderColor: colors.line, borderStyle: 'dashed', justifyContent: 'center' },
  photo: { width: 72, height: 72, borderRadius: 36, marginTop: 6 },
  emptyIcon: { width: 56, height: 56, borderRadius: 28, backgroundColor: colors.white, alignItems: 'center', justifyContent: 'center', marginBottom: 6 },
  cardName: { fontFamily: fonts.bold, fontSize: 15, color: colors.black, marginTop: 10, textAlign: 'center' },
  cardRole: { fontFamily: fonts.regular, fontSize: 13, color: colors.muted, marginTop: 2, textAlign: 'center' },
  off: { color: colors.muted },
  steps: { marginHorizontal: 12, backgroundColor: colors.white, borderRadius: 16, overflow: 'hidden' },
  // Wraps at large text sizes: the calendar buttons drop to a second line.
  step: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 10, paddingHorizontal: 14, paddingVertical: 12, borderTopWidth: 1, borderTopColor: colors.background },
  when: { width: 78 },
  whenLabel: { fontFamily: fonts.bold, fontSize: 12, color: colors.black },
  whenDate: { fontFamily: fonts.regular, fontSize: 12, color: colors.muted, marginTop: 2 },
  stepMain: { flex: 1, minWidth: 110, minHeight: 44, justifyContent: 'center' },
  stepTitle: { fontFamily: fonts.bold, fontSize: 15, color: colors.black },
  cal: { width: 44, height: 44, borderRadius: 22, borderWidth: 1, borderColor: colors.black, alignItems: 'center', justifyContent: 'center' },
  ics: { fontFamily: fonts.bold, fontSize: 12, color: colors.black },
  fine: { fontFamily: fonts.regular, fontSize: 12, color: colors.muted, textAlign: 'center', marginTop: 12, paddingHorizontal: 24 },
});
