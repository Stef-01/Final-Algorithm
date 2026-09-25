import { router } from 'expo-router';
import { ReactNode } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { colors, fonts } from '@/lib/theme';
import { Icon } from './Icon';
import { PressDepth } from './motion';

/** The darker edge a purple button sits on. */
const LIP = '#3F1A39';

// Grey scrim + white rounded card, the pattern the Android "dialog" activities used.
export function Sheet({ children, closeButton }: { children: ReactNode; closeButton?: boolean }) {
  const insets = useSafeAreaInsets();
  return (
    <View style={styles.scrim}>
      <Pressable style={StyleSheet.absoluteFill} onPress={() => router.back()} accessibilityRole="button" accessibilityLabel="Close" />
      <View style={[styles.card, { marginTop: insets.top + 40 }]}>
        <ScrollView contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 32 }]}>
          {children}
        </ScrollView>
        {closeButton ? (
          <Pressable onPress={() => router.back()} hitSlop={12} accessibilityRole="button" accessibilityLabel="Close" style={styles.close}>
            <Icon name="icClose" size={18} />
          </Pressable>
        ) : null}
      </View>
    </View>
  );
}

export function PillButton({
  label,
  onPress,
  variant = 'purple',
}: {
  label: string;
  onPress: () => void;
  variant?: 'purple' | 'black' | 'text';
}) {
  return (
    <PressDepth
      onPress={onPress}
      accessibilityRole="button"
      radius={30}
      depth={variant === 'text' ? 0 : 4}
      lipColor={variant === 'black' ? '#3A3A3A' : variant === 'text' ? 'transparent' : LIP}
      containerStyle={styles.pillWrap}
      style={[styles.pill, variant === 'black' && styles.pillBlack, variant === 'text' && styles.pillText]}
    >
      <Text style={[styles.pillLabel, variant === 'text' && styles.pillLabelText]}>{label}</Text>
    </PressDepth>
  );
}

export const sheetText = StyleSheet.create({
  heading: {
    fontFamily: fonts.serifSemiBold,
    fontSize: 32,
    lineHeight: 40,
    color: colors.black,
    textAlign: 'center',
    marginVertical: 16,
  },
  body: {
    fontFamily: fonts.regular,
    fontSize: 17,
    lineHeight: 24,
    color: colors.black,
    textAlign: 'center',
    marginBottom: 24,
  },
});

const styles = StyleSheet.create({
  scrim: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'flex-end' },
  card: {
    flexShrink: 1,
    backgroundColor: colors.white,
    borderTopLeftRadius: 15,
    borderTopRightRadius: 15,
  },
  content: { padding: 24, paddingTop: 40, alignItems: 'stretch' },
  close: { position: 'absolute', top: 5, left: 5, width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  pillWrap: { marginTop: 8 },
  pill: {
    backgroundColor: colors.purple,
    borderRadius: 30,
    paddingVertical: 18,
    alignItems: 'center',
  },
  pillBlack: { backgroundColor: colors.black },
  pillText: { backgroundColor: 'transparent' },
  pillLabel: { fontFamily: fonts.bold, fontSize: 16, color: colors.white },
  pillLabelText: { color: colors.black, fontFamily: fonts.medium },
});
