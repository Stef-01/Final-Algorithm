import { Redirect, router } from 'expo-router';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { AlsoCouldHelp } from '@/components/AlsoCouldHelp';
import { FiltersButton } from '@/components/FiltersButton';
import { MatchRow } from '@/components/MatchRow';
import { Appear } from '@/components/motion';
import { ScreenHeader } from '@/components/ScreenHeader';
import { getClinician } from '@/data/clinicians';
import { useSession } from '@/features/match/session';
import { copyFor } from '@/lib/professions';
import { colors, fonts } from '@/lib/theme';

// Everyone who meets the patient's requirements, in priority order. The first three are the
// featured matches; the rest are here so nobody is hidden, just ranked.
export default function AllMatches() {
  const { state, loaded } = useSession();
  if (!loaded) return null;
  const r = state.result;
  if (r?.status !== 'matches') return <Redirect href="/matches" />;
  const all = [...r.matches, ...r.more];
  const { many } = copyFor(state.profession);

  return (
    <View style={styles.root}>
      <ScreenHeader title={`All ${all.length} ${many}`} back />
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.note}>Everyone who fits, best first.</Text>
        <View style={styles.filters}>
          <FiltersButton />
        </View>
        {all.map((m, i) => {
          const startsExplained = r.matches.some((x) => x.reasons.length > 0);
          const c = getClinician(m.clinicianId);
          if (!c) return null;
          return (
            <View key={m.clinicianId}>
              {i === 0 ? <Text style={styles.section}>{startsExplained ? "I'd start with" : 'Listed first'}</Text> : null}
              {i === r.matches.length ? <Text style={styles.section}>Also a fit</Text> : null}
              <Appear index={i}>
                <MatchRow clinician={c} match={m} rank={i + 1} onPress={() => router.push(`/clinician/${c.id}`)} />
              </Appear>
            </View>
          );
        })}
        <AlsoCouldHelp />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  filters: { marginHorizontal: 12, marginTop: 4, marginBottom: 4 },
  root: { flex: 1, backgroundColor: colors.background },
  content: { paddingBottom: 100 }, // clear of the floating assistant button
  note: { fontFamily: fonts.regular, fontSize: 14, lineHeight: 20, color: colors.black, margin: 20, marginBottom: 4 },
  section: {
    fontFamily: fonts.bold,
    fontSize: 13,
    color: colors.muted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginTop: 20,
    marginHorizontal: 20,
  },
});
