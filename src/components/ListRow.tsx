import { Pressable, StyleSheet, Text, View } from 'react-native';

import { colors, fonts } from '@/lib/theme';

type Props = {
  label: string;
  value?: string;
  onPress?: () => void;
  /** Colour of the label; defaults to black. */
  tone?: string;
};

export function SectionTitle({ children }: { children: string }) {
  return <Text style={styles.section}>{children}</Text>;
}

export function ListRow({ label, value, onPress, tone }: Props) {
  return (
    <Pressable
      onPress={onPress}
      disabled={!onPress}
      accessibilityRole={onPress ? 'button' : undefined}
      accessibilityLabel={value ? `${label}. ${value}` : label}
      style={({ pressed }) => [styles.row, pressed && styles.pressed]}
    >
      <Text style={[styles.label, tone ? { color: tone } : null]}>{label}</Text>
      {value ? <Text style={styles.value}>{value}</Text> : null}
    </Pressable>
  );
}

export function ListGroup({ children }: { children: React.ReactNode }) {
  return <View style={styles.group}>{children}</View>;
}

const styles = StyleSheet.create({
  section: {
    fontFamily: fonts.bold,
    fontSize: 14,
    color: colors.muted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginTop: 28,
    marginBottom: 8,
    marginHorizontal: 20,
  },
  group: { backgroundColor: colors.white },
  row: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.background,
  },
  pressed: { backgroundColor: colors.background },
  label: { fontFamily: fonts.medium, fontSize: 18, color: colors.black },
  value: { fontFamily: fonts.regular, fontSize: 16, color: colors.muted, marginTop: 4 },
});
