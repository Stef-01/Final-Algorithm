import { router } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { colors, fonts } from '@/lib/theme';

// "Edit | View" switch under the profile header.
export function ProfileTabs({ active }: { active: 'edit' | 'view' }) {
  const tab = (key: 'edit' | 'view', label: string, href: '/profile' | '/profile/view') => (
    <Pressable
      onPress={() => active !== key && router.replace(href)}
      accessibilityRole="tab"
      accessibilityState={{ selected: active === key }}
      style={[styles.tab, active === key && styles.active]}
    >
      <Text style={[styles.label, active === key && styles.labelActive]}>{label}</Text>
    </Pressable>
  );
  return (
    <View style={styles.row}>
      {tab('edit', 'Edit', '/profile')}
      {tab('view', 'View', '/profile/view')}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row' },
  tab: { flex: 1, alignItems: 'center', paddingVertical: 12, borderBottomWidth: 3, borderBottomColor: 'transparent' },
  active: { borderBottomColor: colors.purple },
  label: { fontFamily: fonts.bold, fontSize: 16, color: colors.line },
  labelActive: { color: colors.purple },
});
