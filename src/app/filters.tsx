import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Icon } from '@/components/Icon';
import { Appear, PressDepth, PressScale, ScreenIn } from '@/components/motion';
import { ScreenHeader } from '@/components/ScreenHeader';
import { pool, signalsFor } from '@/features/match/agent';
import { currentValues, filterDefs, type Filters } from '@/features/match/filters';
import { useSession } from '@/features/match/session';
import { countWithFilters } from '@/features/match/sessionCore';
import { colors, fonts } from '@/lib/theme';
import { goBack } from '@/lib/nav';

// Filters: the old app's Preferences screen, for health. A row per filter showing its current value
// ("Open to all" by default); tap to choose. "Show N" updates as you go.

const LANGUAGES = [...new Set(pool.flatMap((c) => c.practical.languages))].sort();

export default function FiltersScreen() {
  const session = useSession();
  const insets = useSafeAreaInsets();
  const { state } = session;
  const [draft, setDraft] = useState<Filters>(state.input.filters ?? {});
  const [open, setOpen] = useState<keyof Filters | null>(null);
  const defs = useMemo(() => filterDefs(LANGUAGES), []);
  const values = currentValues(signalsFor({ ...state.input, filters: draft }));
  const count = useMemo(() => (state.result ? countWithFilters(state, draft) : 0), [state, draft]);

  if (!state.result) {
    return (
      <View style={styles.root}>
        <ScreenHeader title="Filters" back />
        <Text style={styles.empty}>Search first, then filter.</Text>
      </View>
    );
  }

  return (
    <View style={styles.root}>
      <ScreenHeader
        title="Filters"
        back
        right={
          <Pressable onPress={() => setDraft({ mode: 'any', cost: 'any', gender: 'any', distance: 'any', language: 'any', wheelchair: 'any', weekends: 'any' })} accessibilityRole="button" style={styles.reset}>
            <Text style={styles.resetText}>Reset</Text>
          </Pressable>
        }
      />
      <ScreenIn>
      <ScrollView contentContainerStyle={{ paddingBottom: insets.bottom + 110 }}>
        <View style={styles.group}>
          {/* Distance only means something once there's a place to measure from. */}
          {defs.filter((d) => d.key !== 'distance' || values.near).map((d, i) => {
            const v = values[d.key];
            const label = d.options.find((o) => o.value === v)?.label ?? (d.key === 'near' ? 'Anywhere' : 'Open to all');
            const expanded = open === d.key;
            const narrowing = v !== undefined && v !== 'any' && d.key !== 'near';
            // Distance needs somewhere to measure from.
            const disabled = d.key === 'distance' && !values.near && !signalsFor(state.input).constraints.origin;
            return (
              <View key={d.key} style={[styles.row, i > 0 && styles.divider]}>
                <Pressable
                  onPress={() => !disabled && setOpen(expanded ? null : d.key)}
                  accessibilityRole="button"
                  accessibilityLabel={`${d.label}: ${disabled ? 'pick Near first' : label}`}
                  accessibilityState={{ expanded, disabled }}
                  style={styles.head}
                >
                  <Text style={[styles.label, disabled && styles.muted]}>{d.label}</Text>
                  <Text style={[styles.value, narrowing && styles.valueOn]}>{disabled ? 'Pick Near first' : label}</Text>
                </Pressable>
                {expanded ? (
                  <Appear distance={6} style={styles.chips}>
                    {d.options.map((o) => {
                      const on = o.value === v;
                      return (
                        <PressScale
                          key={String(o.value)}
                          onPress={() => {
                            setDraft((f) => ({ ...f, [d.key]: o.value }));
                            setOpen(null);
                          }}
                          accessibilityRole="button"
                          accessibilityLabel={`${d.label}: ${o.label}`}
                          accessibilityState={{ selected: on }}
                          style={[styles.chip, on && styles.chipOn]}
                          scaleTo={0.94}
                          popOn={on}
                        >
                          <Text style={[styles.chipText, on && styles.chipTextOn]}>{o.label}</Text>
                        </PressScale>
                      );
                    })}
                  </Appear>
                ) : null}
              </View>
            );
          })}
        </View>
      </ScrollView>
      </ScreenIn>
      <View style={[styles.footer, { paddingBottom: insets.bottom + 12 }]}>
        <PressDepth
          onPress={() => {
            goBack('/matches');
            router.navigate(session.setFilters(draft) as never);
          }}
          disabled={count === 0}
          accessibilityRole="button"
          radius={28}
          lipColor={colors.purpleLip}
          style={[styles.show, count === 0 && styles.showOff]}
        >
          <Icon name="icFilter" size={18} color={colors.white} />
          {/* The count rises into place each time it changes. */}
          <Appear key={count} distance={10}>
            <Text style={styles.showText}>{count === 0 ? 'Nobody fits all of that' : `Show ${count}`}</Text>
          </Appear>
        </PressDepth>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  empty: { fontFamily: fonts.regular, fontSize: 16, color: colors.black, textAlign: 'center', marginTop: 60 },
  reset: { minHeight: 44, justifyContent: 'center', paddingHorizontal: 8 },
  resetText: { fontFamily: fonts.bold, fontSize: 15, color: colors.purpleText },
  group: { backgroundColor: colors.white, marginTop: 16 },
  row: { paddingHorizontal: 20 },
  divider: { borderTopWidth: 1, borderTopColor: colors.background },
  head: { flexDirection: 'row', alignItems: 'center', minHeight: 58, gap: 12 },
  label: { flex: 1, fontFamily: fonts.medium, fontSize: 16, color: colors.black },
  muted: { color: colors.muted },
  value: { fontFamily: fonts.regular, fontSize: 15, color: colors.muted },
  valueOn: { fontFamily: fonts.bold, color: colors.purpleText },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, paddingBottom: 16 },
  chip: { borderWidth: 1, borderColor: colors.black, borderRadius: 30, paddingHorizontal: 14, minHeight: 44, justifyContent: 'center' },
  chipOn: { backgroundColor: colors.purple, borderColor: colors.purple },
  chipText: { fontFamily: fonts.medium, fontSize: 14, color: colors.black },
  chipTextOn: { color: colors.white },
  footer: { position: 'absolute', left: 0, right: 0, bottom: 0, paddingHorizontal: 20, paddingTop: 10, backgroundColor: colors.background },
  show: { height: 56, borderRadius: 28, backgroundColor: colors.purple, flexDirection: 'row', gap: 10, alignItems: 'center', justifyContent: 'center' },
  showOff: { backgroundColor: colors.muted },
  showText: { fontFamily: fonts.bold, fontSize: 16, color: colors.white },
});
