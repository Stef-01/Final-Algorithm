import { StyleSheet, Text, TextStyle, StyleProp } from 'react-native';

import { fonts } from '@/lib/theme';

type Props = {
  /** `mark` is the compact "W" used in the tab bar; `wordmark` is the full "WATL". */
  variant?: 'wordmark' | 'mark';
  color?: string;
  size?: number;
  style?: StyleProp<TextStyle>;
};

export function WatlLogo({ variant = 'wordmark', color = '#000', size = 48, style }: Props) {
  return (
    <Text
      accessibilityRole="image"
      accessibilityLabel="WATL logo"
      style={[styles.logo, { color, fontSize: size, lineHeight: size * 1.15 }, style]}
    >
      {variant === 'wordmark' ? 'WATL' : 'W'}
    </Text>
  );
}

const styles = StyleSheet.create({
  logo: {
    fontFamily: fonts.serifSemiBold,
    letterSpacing: 1,
  },
});
