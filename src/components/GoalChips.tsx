import { StyleSheet, Text, View } from 'react-native';

import { GOALS } from '@/features/care/plan';
import { tap } from '@/lib/haptics';
import { colors, fonts } from '@/lib/theme';
import { Icon } from './Icon';
import { Appear, PressScale } from './motion';

// Goals as tappable chips: filled when chosen. No explanation needed.
export function GoalChips({ selected, onToggle }: { selected: string[]; onToggle: (id: string) => void }) {
  return (
    <View style={styles.wrap}>
      {GOALS.map((g, i) => {
        const on = selected.includes(g.id);
        return (
          <Appear key={g.id} index={i} distance={6}>
            <PressScale
              onPress={() => {
                tap();
                onToggle(g.id);
              }}
              accessibilityRole="button"
              accessibilityLabel={g.label}
              accessibilityState={{ selected: on }}
              style={[styles.chip, on && styles.on]}
              scaleTo={0.94}
              popOn={on}
            >
              <Icon name={g.icon} size={16} color={on ? colors.white : colors.black} />
              <Text style={[styles.text, on && styles.textOn]}>{g.label}</Text>
            </PressScale>
          </Appear>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, paddingHorizontal: 16, paddingTop: 4, paddingBottom: 8 },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderWidth: 1,
    borderColor: colors.black,
    borderRadius: 30,
    paddingHorizontal: 14,
    paddingVertical: 13,
    backgroundColor: colors.white,
  },
  on: { backgroundColor: colors.purple, borderColor: colors.purple },
  text: { fontFamily: fonts.medium, fontSize: 14, color: colors.black },
  textOn: { color: colors.white },
});
