import { router } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { ConversationStep } from '@/components/ConversationStep';
import { Icon } from '@/components/Icon';
import { Appear, PressDepth } from '@/components/motion';
import { useGoals } from '@/features/care/goals';
import { goalsDraft } from '@/features/care/plan';
import { useSession } from '@/features/match/session';
import type { ProfessionChoice } from '@/features/match/sessionCore';
import { capitalised, PROFESSION_INFO } from '@/lib/professions';
import { colors, fonts } from '@/lib/theme';

// Home. One big "Find someone" first, the quickest way in: describe what you need and WATL searches
// every kind of professional. Below it, "Who could help?": a tile per kind (icon, name, what for)
// to search just that kind. Kinds with nobody in the network yet show as "Soon".
export default function WhoAreYouLookingFor() {
  const session = useSession();
  const { goals } = useGoals();

  return (
    <ConversationStep icon="icSparkle" title="Find someone who fits you.">
      <PressDepth
        onPress={() => router.push(session.chooseProfession('either'))}
        accessibilityRole="button"
        radius={30}
        lipColor={colors.purpleLip}
        style={styles.find}
      >
        <Icon name="icSparkle" size={20} color={colors.white} />
        <Text style={styles.findText}>Find someone</Text>
      </PressDepth>
      <Text style={styles.findSub}>Say what you need. We’ll search every kind of professional.</Text>

      <Text style={styles.section} accessibilityRole="header">
        Who could help?
      </Text>
      <View style={styles.grid}>
        {PROFESSION_INFO.map((p, i) => (
          <Appear key={p.id} index={i} style={styles.cell}>
            <PressDepth
              onPress={p.available ? () => router.push(session.chooseProfession(p.id as ProfessionChoice, goalsDraft(p.id, goals))) : undefined}
              disabled={!p.available}
              accessibilityRole="button"
              accessibilityLabel={`${capitalised(p.one)}. ${p.for}${p.available ? '' : '. Not in the network yet'}`}
              accessibilityState={{ disabled: !p.available }}
              lipColor={colors.chip}
              depth={p.available ? 4 : 0}
              style={[styles.tile, !p.available && styles.tileOff]}
            >
              <View style={styles.tileTop}>
                <Icon name={p.icon} size={26} color={p.available ? colors.black : colors.muted} />
                {!p.available ? <Text style={styles.soon}>Soon</Text> : null}
              </View>
              <Text style={[styles.name, !p.available && styles.off]}>{capitalised(p.one)}</Text>
              <Text style={styles.for}>{p.for}</Text>
            </PressDepth>
          </Appear>
        ))}
      </View>
      <Pressable onPress={() => router.push('/discover')} accessibilityRole="button">
        <Text style={styles.demo}>Explore who does what</Text>
      </Pressable>
      <Pressable onPress={() => router.push('/demos')} accessibilityRole="button">
        <Text style={styles.demo}>Try a demo patient</Text>
      </Pressable>
    </ConversationStep>
  );
}

const styles = StyleSheet.create({
  grid: { flexDirection: 'row', flexWrap: 'wrap', marginHorizontal: -5 },
  cell: { width: '50%', padding: 5 },
  tile: { backgroundColor: colors.background, borderRadius: 16, padding: 14, minHeight: 128, justifyContent: 'space-between' },
  tileOff: { backgroundColor: colors.white, borderWidth: 1, borderColor: colors.chip, borderStyle: 'dashed' },
  tileTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  name: { fontFamily: fonts.bold, fontSize: 15, lineHeight: 19, color: colors.black, marginTop: 10 },
  off: { color: colors.muted },
  for: { fontFamily: fonts.regular, fontSize: 13, color: colors.muted, marginTop: 2 },
  soon: { fontFamily: fonts.bold, fontSize: 11, color: colors.muted, borderWidth: 1, borderColor: colors.line, borderRadius: 20, paddingHorizontal: 7, paddingVertical: 1 },
  find: { height: 60, backgroundColor: colors.purple, flexDirection: 'row', gap: 10, alignItems: 'center', justifyContent: 'center' },
  findText: { fontFamily: fonts.bold, fontSize: 18, color: colors.white },
  findSub: { fontFamily: fonts.regular, fontSize: 14, color: colors.muted, textAlign: 'center', marginTop: 10 },
  section: { fontFamily: fonts.serifSemiBold, fontSize: 24, lineHeight: 30, color: colors.black, marginTop: 36, marginBottom: 12 },
  demo: { fontFamily: fonts.bold, fontSize: 16, color: colors.purpleText, marginTop: 8, paddingVertical: 12 },
});
