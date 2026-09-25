import { Pressable, StyleSheet, Text, View } from 'react-native';

import { colors, fonts } from '@/lib/theme';
import { PressDepth } from './motion';

type Props = {
  title: string;
  body: string;
  action?: { label: string; onPress: () => void };
  /** Optional text link under the button (one primary action per screen). */
  secondary?: { label: string; onPress: () => void };
};

// The Standouts "Fresh out of Standouts!" card: serif title, short body, one purple action.
export function EmptyStateCard({ title, body, action, secondary }: Props) {
  return (
    <View style={styles.card}>
      <Text style={styles.title} accessibilityRole="header">{title}</Text>
      <Text style={styles.body}>{body}</Text>
      {action ? (
        <PressDepth style={styles.button} accessibilityRole="button" onPress={action.onPress} radius={30} lipColor={colors.purpleLip}>
          <Text style={styles.buttonText}>{action.label}</Text>
        </PressDepth>
      ) : null}
      {secondary ? (
        <Pressable onPress={secondary.onPress} accessibilityRole="button" hitSlop={8}>
          <Text style={styles.secondary}>{secondary.label}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    marginHorizontal: 12,
    marginTop: 20,
    minHeight: 360,
    borderRadius: 10,
    backgroundColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
  },
  title: {
    fontFamily: fonts.serifSemiBold,
    fontSize: 26,
    lineHeight: 32,
    color: colors.black,
    textAlign: 'center',
    marginBottom: 16,
  },
  body: {
    fontFamily: fonts.regular,
    fontSize: 16,
    lineHeight: 23,
    color: colors.black,
    textAlign: 'center',
    marginBottom: 32,
  },
  button: { backgroundColor: colors.purple, borderRadius: 30, paddingVertical: 16, paddingHorizontal: 36 },
  buttonText: { fontFamily: fonts.bold, fontSize: 15, color: colors.white },
  secondary: { fontFamily: fonts.bold, fontSize: 15, color: colors.purpleText, marginTop: 8, paddingVertical: 12 },
});
