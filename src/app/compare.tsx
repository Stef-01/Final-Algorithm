import { Image } from 'expo-image';
import { router, useLocalSearchParams } from 'expo-router';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { costLabel } from '@/components/ClinicianCards';
import { FitLabel } from '@/components/FitLabel';
import { Appear, PressScale, ScreenIn } from '@/components/motion';
import { ScreenHeader } from '@/components/ScreenHeader';
import { getClinician } from '@/data/clinicians';
import { useSession } from '@/features/match/session';
import { findMatch } from '@/features/match/sessionCore';
import { colors, fonts } from '@/lib/theme';

// Two or three people side by side: one row per question patients ask, one column per person.
// Everything is what their profile or the search already says; "—" where it doesn't.

type Row = { label: string; value: (id: string) => string };

export default function Compare() {
  const { ids } = useLocalSearchParams<{ ids?: string }>();
  const { state } = useSession();
  const people = (ids ?? '')
    .split(',')
    .map((id) => getClinician(id))
    .filter((c): c is NonNullable<typeof c> => !!c)
    .slice(0, 3);

  const rows: Row[] = [
    { label: 'Why they fit', value: (id) => findMatch(state, id)?.reasons[0]?.evidence ?? '—' },
    { label: 'Cost', value: (id) => costLabel(getClinician(id)!) },
    { label: 'Next available', value: (id) => getClinician(id)!.practical.nextAvailableShort },
    { label: 'Sessions', value: (id) => getClinician(id)!.practical.modes.join(' · ') },
    { label: 'Approach', value: (id) => getClinician(id)!.practiceStyle.slice(0, 3).join(' · ') || '—' },
    { label: 'Experienced with', value: (id) => getClinician(id)!.experiencedWith.slice(0, 3).join(' · ') || '—' },
  ];
  // A row where everyone's the same tells you nothing: leave it out.
  const differing = rows.filter((r) => new Set(people.map((c) => r.value(c.id))).size > 1);

  return (
    <View style={styles.root}>
      <ScreenHeader title="Compare" back />
      <ScreenIn>
        <ScrollView contentContainerStyle={styles.content}>
          <View style={styles.row}>
            {people.map((c, i) => {
              const fit = findMatch(state, c.id)?.fit;
              return (
                <Appear key={c.id} index={i} style={styles.cell}>
                  <PressScale onPress={() => router.push(`/clinician/${c.id}`)} accessibilityRole="button" accessibilityLabel={`${c.name}, open profile`} style={styles.head} scaleTo={0.95}>
                    <Image source={c.photo} style={styles.photo} contentFit="cover" accessibilityLabel="" />
                    <Text style={styles.name} numberOfLines={2}>
                      {c.name}
                    </Text>
                    {fit ? <FitLabel fit={fit} /> : null}
                  </PressScale>
                </Appear>
              );
            })}
          </View>
          {differing.map((r, i) => (
            <Appear key={r.label} index={i + 1} style={styles.block}>
              <Text style={styles.label}>{r.label}</Text>
              <View style={styles.row}>
                {people.map((c) => (
                  <Text key={c.id} style={[styles.cell, styles.value]}>
                    {r.value(c.id)}
                  </Text>
                ))}
              </View>
            </Appear>
          ))}
        </ScrollView>
      </ScreenIn>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  content: { padding: 12, paddingBottom: 60 },
  row: { flexDirection: 'row', gap: 10 },
  cell: { flex: 1 },
  head: { alignItems: 'center', gap: 6, backgroundColor: colors.white, borderRadius: 16, paddingVertical: 14, paddingHorizontal: 8 },
  photo: { width: 64, height: 64, borderRadius: 32 },
  name: { fontFamily: fonts.bold, fontSize: 14, lineHeight: 18, color: colors.black, textAlign: 'center' },
  block: { backgroundColor: colors.white, borderRadius: 16, padding: 12, marginTop: 10 },
  label: { fontFamily: fonts.bold, fontSize: 11, letterSpacing: 1, textTransform: 'uppercase', color: colors.muted, marginBottom: 8 },
  value: { fontFamily: fonts.regular, fontSize: 14, lineHeight: 18, color: colors.black },
});
