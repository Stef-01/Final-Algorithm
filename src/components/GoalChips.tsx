import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { GOALS } from '@/features/care/plan';
import { tap } from '@/lib/haptics';
import { colors, fonts } from '@/lib/theme';
import { Icon } from './Icon';
import { Appear, PressScale } from './motion';

// Goals as tappable chips: filled when chosen. No explanation needed. Once you've chosen some, only
// those show (plus any you touch this visit) with "+N" for the rest, so Profile doesn't open on a
// wall of chips every time.
export function GoalChips({ selected, onToggle }: { selected: string[]; onToggle: (id: string) => void }) {
  const [open, setOpen] = useState(false);
  const [touched, setTouched] = useState<string[]>([]);
  const collapsed = !open && selected.length > 0;
  const shown = collapsed ? GOALS.filter((g) => selected.includes(g.id) || touched.includes(g.id)) : GOALS;
  const hidden = GOALS.length - shown.length;
  return (
    <View style={styles.wrap}>
      {shown.map((g, i) => {
        const on = selected.includes(g.id);
        return (
          <Appear key={g.id} index={i} distance={6}>
            <PressScale
              onPress={() => {
                tap();
                setTouched((t) => (t.includes(g.id) ? t : [...t, g.id]));
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
      {collapsed && hidden > 0 ? (
        <PressScale onPress={() => setOpen(true)} accessibilityRole="button" accessibilityLabel={`Show ${hidden} more goals`} style={[styles.chip, styles.more]} scaleTo={0.94}>
          <Text style={styles.text}>+{hidden}</Text>
        </PressScale>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, paddingHorizontal: 16, paddingTop: 4, paddingBottom: 8 },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderRadius: 30,
    paddingHorizontal: 14,
    paddingVertical: 12,
    minHeight: 44,
    backgroundColor: colors.white,
  },
  on: { backgroundColor: colors.purple },
  more: { paddingHorizontal: 16 },
  text: { fontFamily: fonts.medium, fontSize: 14, color: colors.black },
  textOn: { color: colors.white },
});
