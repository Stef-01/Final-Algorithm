import { router } from 'expo-router';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Icon } from '@/components/Icon';
import { Appear, PressScale } from '@/components/motion';
import { ScreenHeader } from '@/components/ScreenHeader';
import { useGoals } from '@/features/care/goals';
import { goalsDraft } from '@/features/care/plan';
import { useSession } from '@/features/match/session';
import type { ProfessionChoice } from '@/features/match/sessionCore';
import { capitalised, PROFESSION_INFO } from '@/lib/professions';
import { colors, fonts } from '@/lib/theme';

// Who could help: a grid of boxes, one per kind of professional. Tap one to search that kind.
export default function Discover() {
  const session = useSession();
  const { goals } = useGoals();
  const insets = useSafeAreaInsets();

  const find = (id: ProfessionChoice) => router.push(session.chooseProfession(id, goalsDraft(id, goals)));

  return (
    <View style={styles.root}>
      <ScreenHeader title="Explore" back />
      <ScrollView contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 40 }]}>
        <Text style={styles.title} accessibilityRole="header">
          Who could help?
        </Text>
        <View style={styles.grid}>
          {PROFESSION_INFO.map((p, n) => (
            <Appear key={p.id} index={n} distance={8} style={styles.cell}>
              <PressScale
                onPress={() => find(p.id as ProfessionChoice)}
                disabled={!p.available}
                accessibilityRole="button"
                accessibilityLabel={p.available ? `Find ${p.many}` : `${capitalised(p.one)}, coming soon`}
                accessibilityState={{ disabled: !p.available }}
                style={[styles.box, !p.available && styles.boxOff]}
                scaleTo={0.96}
              >
                <View style={styles.top}>
                  <Icon name={p.icon} size={30} color={p.available ? colors.black : colors.muted} />
                  {!p.available ? <Text style={styles.soon}>Soon</Text> : null}
                </View>
                <View style={styles.text}>
                  <Text style={[styles.name, !p.available && styles.off]}>{capitalised(p.one)}</Text>
                  <Text style={styles.for}>{p.for}</Text>
                </View>
              </PressScale>
            </Appear>
          ))}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  content: { paddingHorizontal: 20, paddingTop: 12 },
  title: { fontFamily: fonts.serifSemiBold, fontSize: 30, lineHeight: 38, color: colors.black, marginBottom: 20 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', rowGap: 14 },
  cell: { width: '48.5%' },
  box: {
    minHeight: 150,
    borderRadius: 20,
    backgroundColor: colors.white,
    padding: 18,
    justifyContent: 'space-between',
    borderBottomWidth: 4,
    borderBottomColor: 'rgba(0,0,0,0.08)',
  },
  boxOff: { backgroundColor: 'transparent', borderWidth: 1, borderStyle: 'dashed', borderColor: colors.muted, borderBottomWidth: 1, borderBottomColor: colors.muted },
  top: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  soon: { fontFamily: fonts.bold, fontSize: 12, color: colors.muted, borderWidth: 1, borderColor: colors.muted, borderRadius: 12, paddingHorizontal: 8, paddingVertical: 2 },
  text: { marginTop: 16, gap: 4 },
  name: { fontFamily: fonts.bold, fontSize: 17, color: colors.black },
  off: { color: colors.muted },
  for: { fontFamily: fonts.regular, fontSize: 15, color: colors.muted },
});
