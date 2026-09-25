import { router } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { ConversationStep } from '@/components/ConversationStep';
import { Icon } from '@/components/Icon';
import { Appear, PressScale } from '@/components/motion';
import { useSession } from '@/features/match/session';
import type { ProfessionChoice } from '@/features/match/sessionCore';
import { capitalised, PROFESSION_INFO } from '@/lib/professions';
import { colors, fonts } from '@/lib/theme';

// Discovery: every kind of professional who might help, as a grid of tiles (icon, name, what for).
// Tap one to search it; "Not sure yet" searches everyone. Kinds with nobody in the network yet are
// shown, marked "Soon", but can't be searched.
export default function WhoAreYouLookingFor() {
  const session = useSession();

  return (
    <ConversationStep icon="icQuestion" title="Who could help?" dots={0}>
      <View style={styles.grid}>
        {PROFESSION_INFO.map((p, i) => (
          <Appear key={p.id} index={i} style={styles.cell}>
            <PressScale
              onPress={p.available ? () => router.push(session.chooseProfession(p.id as ProfessionChoice)) : undefined}
              disabled={!p.available}
              accessibilityRole="button"
              accessibilityLabel={`${capitalised(p.one)}. ${p.for}${p.available ? '' : '. Not in the network yet'}`}
              accessibilityState={{ disabled: !p.available }}
              style={[styles.tile, !p.available && styles.tileOff]}
              scaleTo={0.95}
            >
              <View style={styles.tileTop}>
                <Icon name={p.icon} size={26} color={p.available ? colors.black : colors.muted} />
                {!p.available ? <Text style={styles.soon}>Soon</Text> : null}
              </View>
              <Text style={[styles.name, !p.available && styles.off]}>{capitalised(p.one)}</Text>
              <Text style={styles.for}>{p.for}</Text>
            </PressScale>
          </Appear>
        ))}
      </View>
      <Appear index={PROFESSION_INFO.length}>
        <PressScale onPress={() => router.push(session.chooseProfession('either'))} accessibilityRole="button" style={styles.unsure} scaleTo={0.97}>
          <Text style={styles.unsureText}>Not sure yet</Text>
        </PressScale>
      </Appear>
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
  unsure: { marginTop: 10, borderRadius: 150, borderWidth: 1, borderColor: colors.black, paddingVertical: 16, alignItems: 'center' },
  unsureText: { fontFamily: fonts.bold, fontSize: 16, color: colors.black },
  demo: { fontFamily: fonts.bold, fontSize: 16, color: colors.purpleText, marginTop: 8, paddingVertical: 12 },
});
