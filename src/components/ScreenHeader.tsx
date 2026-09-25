import { router } from 'expo-router';
import { ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { colors, fonts } from '@/lib/theme';
import { Icon } from './Icon';

type Props = {
  title: string;
  /** Shows a back arrow. Pass a function to run before going back (e.g. to save). */
  back?: boolean | (() => void);
  right?: ReactNode;
  children?: ReactNode;
};

export function ScreenHeader({ title, back, right, children }: Props) {
  const insets = useSafeAreaInsets();
  const onBack = () => {
    if (typeof back === 'function') back();
    router.back();
  };

  return (
    <View style={[styles.card, { paddingTop: insets.top }]}>
      <View style={styles.row}>
        {back ? (
          <Pressable onPress={onBack} hitSlop={12} accessibilityRole="button" accessibilityLabel="Back" style={styles.back}>
            <Icon name="icLeftArrow" size={20} />
          </Pressable>
        ) : null}
        <Text style={[styles.title, !back && styles.titleNoBack]} numberOfLines={1} accessibilityRole="header">
          {title}
        </Text>
        <View style={styles.right}>{right}</View>
      </View>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.white,
    shadowColor: '#000',
    shadowOpacity: 0.12,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 10,
    zIndex: 1,
  },
  row: { height: 55, flexDirection: 'row', alignItems: 'center' },
  back: { paddingHorizontal: 17, minHeight: 44, justifyContent: 'center' },
  title: { flex: 1, fontFamily: fonts.bold, fontSize: 23, color: colors.black },
  titleNoBack: { marginLeft: 25 },
  right: { paddingRight: 17 },
});
