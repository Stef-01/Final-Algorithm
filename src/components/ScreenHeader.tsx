import { usePathname } from 'expo-router';
import { ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { colors, fonts } from '@/lib/theme';
import { assistantShownOn } from './AssistantButton';
import { Icon } from './Icon';
import { goBack } from '@/lib/nav';

type Props = {
  title: string;
  /** Shows a back arrow. Pass a function to run before going back (e.g. to save). */
  back?: boolean | (() => void);
  /** Replaces going back with something else (e.g. back to the search), with its own label. */
  onBack?: () => void;
  backLabel?: string;
  right?: ReactNode;
  children?: ReactNode;
};

export function ScreenHeader({ title, back, onBack: custom, backLabel = 'Back', right, children }: Props) {
  const insets = useSafeAreaInsets();
  const path = usePathname();
  const onBack = () => {
    if (custom) return custom();
    if (typeof back === 'function') back();
    goBack();
  };
  const showBack = !!back || !!custom;

  return (
    <View style={[styles.card, { paddingTop: insets.top }]}>
      <View style={styles.row}>
        {showBack ? (
          <Pressable onPress={onBack} hitSlop={12} accessibilityRole="button" accessibilityLabel={backLabel} style={styles.back}>
            <Icon name="icLeftArrow" size={20} />
          </Pressable>
        ) : null}
        <Text style={[styles.title, !showBack && styles.titleNoBack]} numberOfLines={1} accessibilityRole="header">
          {title}
        </Text>
        {/* Room for the floating assistant in the top-right corner, where it shows. */}
        <View style={[styles.right, assistantShownOn(path) && styles.roomForAssistant]}>{right}</View>
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
  title: { flex: 1, fontFamily: fonts.bold, fontSize: 22, color: colors.black },
  titleNoBack: { marginLeft: 25 },
  right: { paddingRight: 17 },
  roomForAssistant: { paddingRight: 60 },
});
