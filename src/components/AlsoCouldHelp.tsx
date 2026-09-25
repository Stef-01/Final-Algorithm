import { router } from 'expo-router';
import { useMemo } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { useSession } from '@/features/match/session';
import { alsoCouldHelp } from '@/features/match/sessionCore';
import { capitalised, PROFESSION_INFO } from '@/lib/professions';
import { colors, fonts } from '@/lib/theme';
import { Icon } from './Icon';
import { Kicker } from './cards';
import { Appear, PressScale } from './motion';

// Other kinds of professional who suit what you said, with how many fit. One tap searches them,
// keeping your words. Hidden when there's nothing to suggest.
export function AlsoCouldHelp({ inset = 12 }: { inset?: number }) {
  const session = useSession();
  const { state } = session;
  const others = useMemo(() => alsoCouldHelp(state), [state]);
  if (others.length === 0) return null;

  return (
    <View style={styles.wrap}>
      <Kicker label="Also could help" style={{ marginHorizontal: inset + 3 }} />
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={[styles.row, { paddingHorizontal: inset }]}>
        {others.map((o, i) => {
          const info = PROFESSION_INFO.find((x) => x.id === o.profession)!;
          return (
            <Appear key={o.profession} index={i} from="right" distance={16}>
              <PressScale
                onPress={() => router.push(session.switchProfession(o.profession))}
                accessibilityRole="button"
                accessibilityLabel={`${capitalised(info.many)}: ${o.count} fit`}
                style={styles.chip}
                scaleTo={0.95}
              >
                <Icon name={info.icon} size={18} color={colors.black} />
                <Text style={styles.name}>{capitalised(info.many)}</Text>
                <Text style={styles.count}>{o.count}</Text>
              </PressScale>
            </Appear>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { marginTop: 18 },
  row: { gap: 8 },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: colors.white,
    borderRadius: 30,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  name: { fontFamily: fonts.medium, fontSize: 14, color: colors.black },
  count: { fontFamily: fonts.bold, fontSize: 12, color: colors.white, backgroundColor: colors.black, borderRadius: 10, minWidth: 20, textAlign: 'center', paddingHorizontal: 6, paddingVertical: 1, overflow: 'hidden' },
});
