import { Redirect, router } from 'expo-router';
import { useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { AlsoCouldHelp } from '@/components/AlsoCouldHelp';
import { FiltersButton } from '@/components/FiltersButton';
import { MatchRow } from '@/components/MatchRow';
import { Icon } from '@/components/Icon';
import { Appear, PressDepth, PressScale, ScreenIn } from '@/components/motion';
import { ScreenHeader } from '@/components/ScreenHeader';
import { getClinician } from '@/data/clinicians';
import { useSession } from '@/features/match/session';
import { track } from '@/lib/analytics';
import { copyFor } from '@/lib/professions';
import { colors, fonts } from '@/lib/theme';

// Everyone who meets the patient's requirements, in priority order. The first three are the
// featured matches; the rest are here so nobody is hidden, just ranked.
export default function AllMatches() {
  const { state, loaded } = useSession();
  // Compare: tap "Compare", pick two or three, then see them side by side.
  const [picking, setPicking] = useState(false);
  const [picked, setPicked] = useState<string[]>([]);
  if (!loaded) return null;
  const r = state.result;
  if (r?.status !== 'matches') return <Redirect href="/matches" />;
  const all = [...r.matches, ...r.more];
  const { many } = copyFor(state.profession);

  return (
    <View style={styles.root}>
      <ScreenHeader
        title={`All ${all.length} ${many}`}
        back
        right={
          all.length > 1 ? (
            <PressScale
              onPress={() => {
                setPicking((p) => !p);
                setPicked([]);
              }}
              accessibilityRole="button"
              style={styles.compare}
              scaleTo={0.92}
            >
              <Text style={styles.compareText}>{picking ? 'Cancel' : 'Compare'}</Text>
            </PressScale>
          ) : undefined
        }
      />
      <ScreenIn>
      <ScrollView contentContainerStyle={styles.content}>
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
                <View>
                  <MatchRow
                    clinician={c}
                    match={m}
                    rank={i + 1}
                    onPress={() =>
                      picking
                        ? setPicked((p) => (p.includes(c.id) ? p.filter((x) => x !== c.id) : p.length < 3 ? [...p, c.id] : p))
                        : router.push(`/clinician/${c.id}`)
                    }
                  />
                  {picking ? (
                    <View pointerEvents="none" style={[styles.tick, picked.includes(c.id) && styles.tickOn]}>
                      {picked.includes(c.id) ? <Icon name="icCheck" size={12} color={colors.white} /> : null}
                    </View>
                  ) : null}
                </View>
              </Appear>
            </View>
          );
        })}
        <AlsoCouldHelp />
      </ScrollView>
      </ScreenIn>
      {picking && picked.length >= 2 ? (
        <Appear distance={30} style={styles.bar}>
          <PressDepth
            onPress={() => {
              track('compared', { count: picked.length });
              router.push(`/compare?ids=${picked.join(',')}`);
            }}
            accessibilityRole="button"
            radius={28}
            lipColor={colors.purpleLip}
            style={styles.barButton}
          >
            <Text style={styles.barText}>Compare {picked.length}</Text>
          </PressDepth>
        </Appear>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  compare: { minHeight: 40, justifyContent: 'center', paddingHorizontal: 6 },
  compareText: { fontFamily: fonts.bold, fontSize: 16, color: colors.purpleText },
  tick: { position: 'absolute', top: 14, right: 26, width: 24, height: 24, borderRadius: 12, borderWidth: 2, borderColor: colors.line, backgroundColor: colors.white, alignItems: 'center', justifyContent: 'center' },
  tickOn: { backgroundColor: colors.purple, borderColor: colors.purple },
  bar: { position: 'absolute', left: 16, right: 16, bottom: 24 },
  barButton: { height: 56, backgroundColor: colors.purple, alignItems: 'center', justifyContent: 'center' },
  barText: { fontFamily: fonts.bold, fontSize: 16, color: colors.white },
  filters: { marginHorizontal: 12, marginTop: 16, marginBottom: 4 },
  root: { flex: 1, backgroundColor: colors.background },
  content: { paddingBottom: 100 }, // clear of the floating assistant button
  note: { fontFamily: fonts.regular, fontSize: 14, lineHeight: 20, color: colors.black, margin: 20, marginBottom: 4 },
  section: {
    fontFamily: fonts.bold,
    fontSize: 14,
    color: colors.muted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginTop: 20,
    marginHorizontal: 20,
  },
});
