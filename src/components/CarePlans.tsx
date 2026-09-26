import { Image } from 'expo-image';
import { router } from 'expo-router';
import { StyleSheet, Switch, Text, View } from 'react-native';

import { getClinician } from '@/data/clinicians';
import { booked, lastSeen, nextDue, PLANS, rebate, usePlans } from '@/features/care/plans';
import { useSaved } from '@/features/match/saved';
import { colors, fonts } from '@/lib/theme';
import { Appear, PressScale } from './motion';
import { StepProgress } from './StepProgress';

// Profile → Care plans: which Medicare plans you have, how many visits are booked against them this
// year, what each covered person's practice says you get back, and when you last saw / next see
// each person on your team. Few words; numbers do the talking.

const DAY = new Intl.DateTimeFormat('en-AU', { day: 'numeric', month: 'short' });
const short = (d: string) => {
  const parts = DAY.formatToParts(new Date(`${d}T00:00:00`));
  return `${parts.find((p) => p.type === 'day')?.value} ${parts.find((p) => p.type === 'month')?.value}`;
};
// react-native-web colours the "on" thumb separately.
const webThumb = { activeThumbColor: colors.white } as object;

export function CarePlans() {
  const { saved } = useSaved();
  const { plans, toggle } = usePlans();
  const team = saved.flatMap((item) => {
    const c = item.team ? getClinician(item.clinicianId) : undefined;
    return c ? [{ item, c, role: c.profession }] : [];
  });

  return (
    <View style={styles.wrap}>
      {PLANS.map((plan, i) => {
        const on = plans.includes(plan.id);
        const covered = team.filter((t) => plan.covers.includes(t.role));
        const n = booked(plan, team);
        return (
          <Appear key={plan.id} index={i} style={styles.card}>
            <View style={styles.head}>
              <Text style={styles.title}>{plan.title}</Text>
              <Switch
                value={on}
                onValueChange={() => toggle(plan.id)}
                accessibilityLabel={`I have a ${plan.title.toLowerCase()}`}
                trackColor={{ true: colors.purple, false: colors.line }}
                thumbColor={colors.white}
                {...webThumb}
              />
            </View>
            <View style={styles.chips}>
              {plan.chips.map((c) => (
                <Text key={c} style={styles.chip}>
                  {c}
                </Text>
              ))}
            </View>
            {on ? (
              <Appear>
                <View style={styles.progressRow}>
                  <StepProgress value={Math.min(1, n / plan.sessions)} />
                  <Text style={styles.count} accessibilityLabel={`${n} of ${plan.sessions} booked this year`}>
                    {n}/{plan.sessions}
                  </Text>
                </View>
                {covered.map(({ c }) => {
                  const back = rebate(c.practical.fee, c.practical.gapAfterMedicare);
                  return (
                    <View key={c.id} style={styles.row}>
                      <Text style={styles.name}>{c.firstName}</Text>
                      <Text style={[styles.value, !back && styles.muted]}>{back ? `$${back} back` : 'Rebate: ask'}</Text>
                    </View>
                  );
                })}
              </Appear>
            ) : null}
          </Appear>
        );
      })}

      <Appear index={PLANS.length} style={styles.card}>
        <Text style={styles.title}>Your people</Text>
        {team.length === 0 ? (
          <PressScale onPress={() => router.navigate('/')} accessibilityRole="button" style={styles.emptyRow}>
            <Text style={styles.muted}>Book someone to start</Text>
          </PressScale>
        ) : (
          team.map(({ item, c, role }) => {
            const last = lastSeen(item);
            const next = nextDue(item, role);
            return (
              <PressScale key={c.id} onPress={() => router.push(`/clinician/${c.id}`)} accessibilityRole="button" style={styles.person} scaleTo={0.98}>
                <Image source={c.photo} style={styles.photo} contentFit="cover" accessibilityLabel="" />
                <Text style={[styles.name, styles.fill]} numberOfLines={1}>
                  {c.firstName}
                </Text>
                <View style={styles.when}>
                  <Text style={styles.whenLabel}>Last</Text>
                  <Text style={styles.whenValue}>{last ? short(last) : '—'}</Text>
                </View>
                <View style={styles.when}>
                  <Text style={styles.whenLabel}>Next</Text>
                  <Text style={[styles.whenValue, styles.next]}>{next ? short(next) : '—'}</Text>
                </View>
              </PressScale>
            );
          })
        )}
      </Appear>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { paddingHorizontal: 12, gap: 10 },
  card: { backgroundColor: colors.white, borderRadius: 16, padding: 16 },
  head: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  title: { fontFamily: fonts.bold, fontSize: 16, color: colors.black },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 8 },
  chip: { fontFamily: fonts.medium, fontSize: 12, color: colors.black, backgroundColor: colors.background, borderRadius: 10, paddingHorizontal: 8, paddingVertical: 4, overflow: 'hidden' },
  progressRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 14 },
  count: { fontFamily: fonts.bold, fontSize: 14, color: colors.purpleText, minWidth: 36, textAlign: 'right' },
  row: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 10 },
  name: { fontFamily: fonts.medium, fontSize: 14, color: colors.black },
  value: { fontFamily: fonts.bold, fontSize: 14, color: colors.black },
  muted: { fontFamily: fonts.regular, fontSize: 13, color: colors.muted },
  emptyRow: { minHeight: 44, justifyContent: 'center' },
  person: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 12, minHeight: 44 },
  photo: { width: 36, height: 36, borderRadius: 18 },
  fill: { flex: 1 },
  when: { alignItems: 'flex-end', minWidth: 52 },
  whenLabel: { fontFamily: fonts.medium, fontSize: 10, letterSpacing: 0.5, textTransform: 'uppercase', color: colors.muted },
  whenValue: { fontFamily: fonts.bold, fontSize: 13, color: colors.black },
  next: { color: colors.purpleText },
});
