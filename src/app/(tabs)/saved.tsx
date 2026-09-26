import { Image } from 'expo-image';
import { useCallback, useEffect, useRef, useState } from 'react';
import { router } from 'expo-router';
import { Platform, ScrollView, StyleSheet, Text, View } from 'react-native';

import { RatePractitioner } from '@/components/RatePractitioner';
import { Icon } from '@/components/Icon';
import { LikeButton } from '@/components/LikeButton';
import { SectionTitle } from '@/components/ListRow';
import { Appear, PressScale } from '@/components/motion';
import { ScreenHeader } from '@/components/ScreenHeader';
import { getClinician } from '@/data/clinicians';
import { useGoals } from '@/features/care/goals';
import { nextDue } from '@/features/care/plans';
import { loadAsked, markAsked, pickPrompt, promptRoll } from '@/features/care/ratePrompt';
import { pickCalendarFile } from '@/features/care/ics';
import { suggestSlot, slotLabel, type Busy } from '@/features/care/slots';
import { bookingPlan, CORE, goalsDraft, teamTemplate, type Slot, type Step, type TeamMember } from '@/features/care/plan';
import { useSaved } from '@/features/match/saved';
import { useSession } from '@/features/match/session';
import type { ProfessionChoice } from '@/features/match/sessionCore';
import { track } from '@/lib/analytics';
import { addToCalendar } from '@/lib/calendar';
import { busyTimes } from '@/lib/deviceCalendar';
import { article, capitalised, PROFESSION_INFO } from '@/lib/professions';
import { colors, fonts } from '@/lib/theme';

// My care: your care team at the top (people you added from their profile, plus a slot for each
// profession your goals point to) with next steps to book; below it, everyone you liked but haven't
// added. Stored on this device only.

const infoFor = (p: string) => PROFESSION_INFO.find((x) => x.id === p)!;
const DAY = new Intl.DateTimeFormat('en-AU', { weekday: 'short', day: 'numeric', month: 'short' });

export default function MyCare() {
  const { saved, toggle, setTeam } = useSaved();
  const { goals } = useGoals();
  const session = useSession();

  const members: TeamMember[] = saved
    .filter((s) => s.team)
    .flatMap((s) => {
      const c = getClinician(s.clinicianId);
      return c ? [{ clinicianId: c.id, profession: c.profession, name: c.name, firstName: c.firstName, bookingUrl: c.bookingUrl }] : [];
    });
  // The team as a template: who's on it, plus outlines for who could be (GP, psychiatrist,
  // psychologist). Collapsed, only those three show; Expand reveals everyone else and allied health.
  const [expanded, setExpanded] = useState(false);
  const full = teamTemplate(members, goals, true);
  const team = expanded ? full : full.filter((s) => CORE.includes(s.profession));
  const more = full.length - team.length;
  // Someone you've already booked: the next step is when you're due to see them again (as in Profile).
  const steps = bookingPlan(full).map((st) => {
    const item = saved.find((x) => x.clinicianId === st.member.clinicianId);
    const due = item ? nextDue(item, st.member.profession) : null;
    return due ? { ...st, on: new Date(`${due}T09:00:00`), label: 'Next visit' } : st;
  }).sort((a, b) => a.on.getTime() - b.on.getTime());
  const liked = saved.filter((s) => !s.team && getClinician(s.clinicianId));

  // Now and then, ask how it's going with someone on the team (once per visit at most).
  const [asking, setAsking] = useState<string | null>(null);
  const decided = useRef(false);
  const teamIds = members.map((m) => m.clinicianId).join(',');
  useEffect(() => {
    if (decided.current || !teamIds) return;
    decided.current = true;
    void loadAsked().then((asked) => {
      const id = pickPrompt(teamIds.split(','), asked, promptRoll());
      if (!id) return;
      void markAsked(id, asked);
      setAsking(id);
    });
  }, [teamIds]);
  // Your busy times, once you let WATL check your calendar (phones only). null = not checked.
  const [busy, setBusy] = useState<Busy[] | null>(null);
  const [checking, setChecking] = useState(false);
  const closeAsk = useCallback(() => setAsking(null), []);
  const checkCalendar = async () => {
    setChecking(true);
    const now = new Date();
    // Phones read the calendar itself; the web reads a calendar file you pick (.ics), on the device.
    const b = Platform.OS === 'web' ? await pickCalendarFile() : await busyTimes(now, new Date(now.getTime() + 70 * 24 * 60 * 60 * 1000));
    setChecking(false);
    if (b) setBusy(b);
    track('calendar_checked', { ok: !!b });
  };

  return (
    <View style={styles.root}>
      <ScreenHeader title="My care" />
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.teamHead}>
          <SectionTitle>Care team</SectionTitle>
          <PressScale
            onPress={() => setExpanded((e) => !e)}
            accessibilityRole="button"
            accessibilityState={{ expanded }}
            accessibilityLabel={expanded ? 'Collapse the care team' : `Expand the care team, ${more} more`}
            style={styles.expand}
            scaleTo={0.92}
          >
            <Text style={styles.expandText}>{expanded ? 'Less' : `+${more}`}</Text>
            <Icon name="icDownArrow" size={12} color={colors.black} style={expanded ? styles.flip : undefined} />
          </PressScale>
        </View>
        <View style={styles.team}>
          {team.map((slot, i) => (
            <Appear key={slot.member?.clinicianId ?? slot.profession} index={i} distance={10} style={styles.cell}>
              <TeamCard
                slot={slot}
                onFind={(p) => router.push(session.chooseProfession(p, goalsDraft(p, goals)))}
                onRemove={(id) => {
                  const item = saved.find((x) => x.clinicianId === id);
                  if (item) setTeam(item, false);
                }}
                onReplace={(id, p) => {
                  const item = saved.find((x) => x.clinicianId === id);
                  if (item) setTeam(item, false);
                  router.push(session.chooseProfession(p, goalsDraft(p, goals)));
                }}
              />
            </Appear>
          ))}
        </View>

        {steps.length > 0 ? (
          <>
            <SectionTitle>Next steps</SectionTitle>
            <View style={styles.steps}>
              {steps.map((s, i) => (
                <Appear key={s.member.clinicianId} index={i}>
                  <StepRow step={s} busy={busy} />
                </Appear>
              ))}
            </View>
            {busy === null ? (
              <PressScale onPress={checkCalendar} disabled={checking} accessibilityRole="button" style={styles.check} scaleTo={0.96}>
                <Icon name="icCalendar" size={16} color={colors.black} />
                <Text style={styles.checkText}>{checking ? 'Checking…' : 'Find times we’re both free'}</Text>
              </PressScale>
            ) : null}
            {busy === null && Platform.OS === 'web' ? <Text style={styles.fine}>Uses a calendar file (.ics). It stays on this device.</Text> : null}
            <Text style={styles.fine}>
              {busy
                ? 'From your calendar and each practice’s wait. Confirm when booking.'
                : 'From each practice’s wait. Confirm when booking.'}
            </Text>
          </>
        ) : null}

        {asking ? <RatePractitioner clinicianId={asking} onClose={closeAsk} /> : null}

        {liked.length > 0 ? (
          <>
            <SectionTitle>Liked</SectionTitle>
            <View style={styles.steps}>
              {liked.map((item, i) => (
                <Appear key={item.clinicianId} index={i}>
                  <LikedRow id={item.clinicianId} onUnlike={() => toggle(item)} />
                </Appear>
              ))}
            </View>
          </>
        ) : null}
      </ScrollView>
    </View>
  );
}

function TeamCard({
  slot,
  onFind,
  onRemove,
  onReplace,
}: {
  slot: Slot;
  onFind: (p: ProfessionChoice) => void;
  onRemove: (id: string) => void;
  onReplace: (id: string, p: ProfessionChoice) => void;
}) {
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
        <View style={styles.actions}>
          <PressScale onPress={() => onReplace(m.clinicianId, m.profession)} accessibilityRole="button" accessibilityLabel={`Swap ${m.firstName} for someone else`} style={styles.action} scaleTo={0.88}>
            <Text style={styles.actionText}>Swap</Text>
          </PressScale>
          <PressScale onPress={() => onRemove(m.clinicianId)} accessibilityRole="button" accessibilityLabel={`Remove ${m.firstName} from your team`} style={styles.action} scaleTo={0.88}>
            <Icon name="icClose" size={10} color={colors.black} />
          </PressScale>
        </View>
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

/** Someone you liked: tap to open their profile (and add them to your team from there). */
function LikedRow({ id, onUnlike }: { id: string; onUnlike: () => void }) {
  const c = getClinician(id)!;
  const info = infoFor(c.profession);
  return (
    <View style={styles.step}>
      <PressScale
        onPress={() => router.push(`/clinician/${id}`)}
        accessibilityRole="button"
        accessibilityLabel={`${c.name}, ${capitalised(info.one)}`}
        style={styles.likedMain}
        scaleTo={0.98}
      >
        <Image source={c.photo} style={styles.likedPhoto} contentFit="cover" accessibilityLabel="" />
        <View style={styles.fill}>
          <Text style={styles.stepTitle} numberOfLines={1}>
            {c.name}
          </Text>
          <Text style={[styles.cardRole, styles.left]}>{capitalised(info.one)}</Text>
        </View>
        <Icon name="icRightArrow" size={14} color={colors.muted} />
      </PressScale>
      <LikeButton liked onPress={onUnlike} label={`Unlike ${c.firstName}`} size={34} />
    </View>
  );
}

function StepRow({ step, busy }: { step: Step; busy: Busy[] | null }) {
  const { member: m } = step;
  const info = infoFor(m.profession);
  const c = getClinician(m.clinicianId);
  const slot = c ? suggestSlot({ from: step.on, waitDays: c.practical.daysUntilAvailable, weekends: c.practical.weekends, busy: busy ?? [] }) : null;
  const event = {
    title: `Book ${m.firstName} (${info.one})`,
    start: step.on,
    minutes: 15,
    details: `A reminder from WATL to book with ${m.name}.${slot ? ` Suggested time: ${slotLabel(slot)}.` : ''}`,
    url: m.bookingUrl ?? undefined,
  };
  const [added, setAdded] = useState(false);
  const add = (how: 'ics' | 'google') => {
    void addToCalendar(event, how).then((where) => {
      track('calendar_added', { profession: m.profession, how: where });
      setAdded(true);
    });
  };
  return (
    <View style={styles.step}>
      <View style={styles.when}>
        <Text style={styles.whenLabel}>{step.label}</Text>
      </View>
      <PressScale onPress={() => router.push(`/book/${m.clinicianId}`)} accessibilityRole="button" style={styles.stepMain} scaleTo={0.98}>
        <Text style={styles.stepTitle} numberOfLines={1}>
          Book {m.firstName}
        </Text>
        <Text style={styles.slot}>{slot ? `${busy ? 'Both free · ' : ''}${slotLabel(slot)}` : DAY.format(step.on)}</Text>
      </PressScale>
      <PressScale onPress={() => add('google')} accessibilityRole="button" accessibilityLabel={`Add a reminder to book ${m.firstName} to Google Calendar`} style={styles.cal} scaleTo={0.9}>
        <Icon name={added ? 'icCheck' : 'icCalendar'} size={18} color={colors.black} />
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
  team: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: 8, paddingBottom: 6 },
  cell: { width: '33.33%', padding: 4 },
  card: { minHeight: 156, backgroundColor: colors.white, borderRadius: 16, padding: 12, alignItems: 'center' },
  empty: { backgroundColor: 'transparent', borderWidth: 1, borderColor: colors.line, borderStyle: 'dashed', justifyContent: 'center' },
  photo: { width: 72, height: 72, borderRadius: 36, marginTop: 6 },
  emptyIcon: { width: 56, height: 56, borderRadius: 28, backgroundColor: colors.white, alignItems: 'center', justifyContent: 'center', marginBottom: 6 },
  cardName: { fontFamily: fonts.bold, fontSize: 14, lineHeight: 18, color: colors.black, marginTop: 10, textAlign: 'center' },
  cardRole: { fontFamily: fonts.regular, fontSize: 13, color: colors.muted, marginTop: 2, textAlign: 'center' },
  off: { color: colors.muted },
  teamHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingRight: 12 },
  expand: { flexDirection: 'row', alignItems: 'center', gap: 6, minHeight: 36, paddingHorizontal: 12, borderRadius: 18, backgroundColor: colors.white },
  expandText: { fontFamily: fonts.bold, fontSize: 13, color: colors.black },
  flip: { transform: [{ rotate: '180deg' }] },
  actions: { flexDirection: 'row', gap: 6, marginTop: 8 },
  action: { minWidth: 32, height: 28, borderRadius: 14, paddingHorizontal: 10, borderWidth: 1, borderColor: colors.line, alignItems: 'center', justifyContent: 'center' },
  actionText: { fontFamily: fonts.bold, fontSize: 12, color: colors.black },
  steps: { marginHorizontal: 12, backgroundColor: colors.white, borderRadius: 16, overflow: 'hidden' },
  // Wraps at large text sizes: the calendar buttons drop to a second line.
  step: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 10, paddingHorizontal: 14, paddingVertical: 12, borderTopWidth: 1, borderTopColor: colors.background },
  when: { width: 66 },
  whenLabel: { fontFamily: fonts.bold, fontSize: 12, color: colors.black },
  whenDate: { fontFamily: fonts.regular, fontSize: 12, color: colors.muted, marginTop: 2 },
  stepMain: { flex: 1, minWidth: 110, minHeight: 44, justifyContent: 'center' },
  stepTitle: { fontFamily: fonts.bold, fontSize: 15, color: colors.black },
  cal: { width: 44, height: 44, borderRadius: 22, borderWidth: 1, borderColor: colors.black, alignItems: 'center', justifyContent: 'center' },
  ics: { fontFamily: fonts.bold, fontSize: 12, color: colors.black },
  likedMain: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 52 },
  likedPhoto: { width: 44, height: 44, borderRadius: 22 },
  fill: { flex: 1 },
  left: { textAlign: 'left' },
  slot: { fontFamily: fonts.bold, fontSize: 13, color: colors.purpleText, marginTop: 3 },
  check: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, alignSelf: 'center', minHeight: 44, marginTop: 12, paddingHorizontal: 18, borderRadius: 22, borderWidth: 1, borderColor: colors.black, backgroundColor: colors.white },
  checkText: { fontFamily: fonts.bold, fontSize: 14, color: colors.black },
  fine: { fontFamily: fonts.regular, fontSize: 12, color: colors.muted, textAlign: 'center', marginTop: 12, paddingHorizontal: 24 },
});
