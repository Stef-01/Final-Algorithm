import { router } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';

import { signalsFor } from '@/features/match/agent';
import { activeCount } from '@/features/match/filters';
import { useSession } from '@/features/match/session';
import { colors, fonts } from '@/lib/theme';
import { Icon } from './Icon';
import { PressScale } from './motion';

// Opens Filters; the badge counts what's narrowing the search (including what your words set).
export function FiltersButton() {
  const { state } = useSession();
  const n = activeCount(signalsFor(state.input));
  return (
    <PressScale
      onPress={() => router.push('/filters')}
      accessibilityRole="button"
      accessibilityLabel={n ? `Filters, ${n} on` : 'Filters'}
      style={styles.pill}
      scaleTo={0.94}
    >
      <Icon name="icFilter" size={18} color={colors.black} />
      <Text style={styles.text}>Filters</Text>
      {n ? (
        <View style={styles.badge}>
          <Text style={styles.badgeText}>{n}</Text>
        </View>
      ) : null}
    </PressScale>
  );
}

const styles = StyleSheet.create({
  pill: { flexDirection: 'row', alignItems: 'center', gap: 8, alignSelf: 'flex-start', borderWidth: 1, borderColor: colors.black, borderRadius: 30, paddingHorizontal: 14, minHeight: 44, backgroundColor: colors.white },
  text: { fontFamily: fonts.bold, fontSize: 14, color: colors.black },
  badge: { minWidth: 20, height: 20, borderRadius: 10, backgroundColor: colors.purple, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 5 },
  badgeText: { fontFamily: fonts.bold, fontSize: 12, color: colors.white },
});
