import { StyleSheet, Text } from 'react-native';

import { colors, fonts } from '@/lib/theme';

// Marks screens that are wired up but not built yet (see docs/PLAN.md §12).
export function Placeholder({ phase }: { phase: number }) {
  return <Text style={styles.text}>Placeholder — built in Phase {phase}.</Text>;
}

const styles = StyleSheet.create({
  text: { fontFamily: fonts.regular, fontSize: 13, color: colors.line, marginTop: 16 },
});
