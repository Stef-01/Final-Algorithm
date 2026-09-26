import { router } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { AustraliaMap } from '@/components/AustraliaMap';
import { ConversationStep } from '@/components/ConversationStep';
import { Icon } from '@/components/Icon';
import type { IconName } from '@/components/icons';
import { Appear, PressDepth, PressScale } from '@/components/motion';
import { pool } from '@/features/match/agent';
import { AREAS_NEAR, type AreaId } from '@/features/match/filters';
import { useSession } from '@/features/match/session';
import type { ProfessionChoice } from '@/features/match/sessionCore';
import { copyFor } from '@/lib/professions';
import { colors, fonts } from '@/lib/theme';

// Straight after picking a profession: does where they are matter? Most offer telehealth, so
// "Anywhere" is the easy yes. "Near a place" opens a map of Australia to tap.

export default function Where() {
  const session = useSession();
  const { state } = session;
  const had = state.input.filters?.near ?? null;
  const [near, setNear] = useState(had !== null);
  const [area, setArea] = useState<AreaId | null>(had);
  const note = telehealthNote(state.profession);

  const go = (a: AreaId | null) => router.push(session.setWhere(a));

  return (
    <ConversationStep
      icon="icLocation"
      title="Does location matter?"
      note={note}
      onNext={near ? () => area && go(area) : undefined}
      nextEnabled={!!area}
      progress={0.2}
    >
      <View style={styles.options}>
        <Option icon="icVideo" title="Anywhere" sub="Telehealth is fine" on={!near} onPress={() => go(null)} />
        <Option icon="icLocation" title="Near a place" sub="In person if I can" on={near} onPress={() => setNear(true)} />
      </View>

      {near ? (
        <Appear distance={24}>
          <AustraliaMap value={area} onChange={setArea} />
          <View style={styles.chips} accessibilityRole="radiogroup">
            {AREAS_NEAR.map((a) => (
              <PressScale
                key={a.id}
                onPress={() => setArea(a.id)}
                accessibilityRole="radio"
                accessibilityState={{ selected: area === a.id }}
                style={[styles.chip, area === a.id && styles.chipOn]}
                scaleTo={0.92}
                popOn={area === a.id}
              >
                <Text style={[styles.chipText, area === a.id && styles.chipTextOn]}>{a.label}</Text>
              </PressScale>
            ))}
          </View>
          <Text style={styles.fine}>Telehealth options still show.</Text>
        </Appear>
      ) : null}
    </ConversationStep>
  );
}

/** From the network itself: how many of this kind of professional offer telehealth. */
export function telehealthNote(profession: ProfessionChoice | undefined) {
  const here = pool.filter((c) => !profession || profession === 'either' || c.profession === profession);
  const n = here.filter((c) => c.practical.modes.includes('telehealth')).length;
  const { one, many } = copyFor(profession);
  if (here.length === 0) return undefined;
  if (here.length === 1) return n ? `The ${one} here offers telehealth.` : `The ${one} here sees people in person.`;
  if (n === 0) return `The ${many} here see people in person.`;
  if (n === here.length) return `All the ${many} here offer telehealth.`;
  return `${n} of ${here.length} ${many} here offer telehealth.`;
}

function Option({ icon, title, sub, on, onPress }: { icon: IconName; title: string; sub: string; on: boolean; onPress: () => void }) {
  return (
    <PressDepth
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected: on }}
      accessibilityLabel={`${title}: ${sub}`}
      lipColor={on ? colors.purpleText : colors.line}
      containerStyle={styles.optionWrap}
      style={[styles.option, on && styles.optionOn]}
    >
      <View style={[styles.optionIcon, on && styles.optionIconOn]}>
        <Icon name={icon} size={22} color={on ? colors.white : colors.black} />
      </View>
      <Text style={styles.optionTitle}>{title}</Text>
      <Text style={styles.optionSub}>{sub}</Text>
    </PressDepth>
  );
}

const styles = StyleSheet.create({
  options: { flexDirection: 'row', gap: 12, marginTop: 8 },
  optionWrap: { flex: 1 },
  option: { backgroundColor: colors.white, borderWidth: 2, borderColor: colors.line, padding: 16, alignItems: 'flex-start', minHeight: 132 },
  optionOn: { borderColor: colors.purple },
  optionIcon: { width: 44, height: 44, borderRadius: 22, backgroundColor: colors.background, alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
  optionIconOn: { backgroundColor: colors.purple },
  optionTitle: { fontFamily: fonts.bold, fontSize: 17, color: colors.black },
  optionSub: { fontFamily: fonts.regular, fontSize: 14, color: colors.muted, marginTop: 2 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 12 },
  chip: { minHeight: 44, justifyContent: 'center', borderRadius: 22, paddingHorizontal: 14, backgroundColor: colors.background },
  chipOn: { backgroundColor: colors.purple },
  chipText: { fontFamily: fonts.medium, fontSize: 14, color: colors.black },
  chipTextOn: { color: colors.white },
  fine: { fontFamily: fonts.regular, fontSize: 13, color: colors.muted, marginTop: 14 },
});
