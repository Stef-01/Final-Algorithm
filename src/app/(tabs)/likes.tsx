import { router } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { Icon } from '@/components/Icon';
import { ScreenHeader } from '@/components/ScreenHeader';
import { colors, fonts } from '@/lib/theme';

export default function LikesYou() {
  return (
    <View style={styles.root}>
      <ScreenHeader
        title="Likes You"
        right={
          <View style={styles.boost}>
            <Text style={styles.boostText}>Boost</Text>
          </View>
        }
      />
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.empty}>New Likes Will appear here.</Text>
        <Text style={styles.hint}>
          <Text style={styles.hintLink}>Boost your profile</Text> for more likes now
        </Text>

        <View style={styles.dashed}>
          <Icon name="heartPink" size={40} />
        </View>
        <Text style={styles.upNext}>Up next</Text>
        <Text style={styles.upNextBody}>Preferred members can view all their likes at once</Text>
        <View style={styles.placeholderRow}>
          <View style={[styles.dashed, styles.placeholder]} />
          <View style={[styles.dashed, styles.placeholder]} />
        </View>

        <View style={styles.upgradeCard}>
          <Text style={styles.upgradeText}>Upgrade to Preferred to access all your likes at once.</Text>
          <Pressable style={styles.upgrade} onPress={() => router.push('/learn-more')} accessibilityRole="button">
            <Text style={styles.upgradeLabel}>Upgrade</Text>
          </Pressable>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.white },
  content: { padding: 24, paddingBottom: 40 },
  boost: { backgroundColor: colors.boost, borderRadius: 30, paddingHorizontal: 16, paddingVertical: 6 },
  boostText: { fontFamily: fonts.bold, fontSize: 14, color: colors.black },
  empty: { fontFamily: fonts.serifSemiBold, fontSize: 24, color: colors.black, textAlign: 'center', marginTop: 16 },
  hint: { fontFamily: fonts.regular, fontSize: 15, color: colors.black, textAlign: 'center', marginTop: 8 },
  hintLink: { color: colors.purple, fontFamily: fonts.bold },
  dashed: {
    height: 160,
    marginTop: 28,
    borderWidth: 2,
    borderStyle: 'dashed',
    borderColor: colors.line,
    borderRadius: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  upNext: { fontFamily: fonts.bold, fontSize: 20, color: colors.black, marginTop: 24 },
  upNextBody: { fontFamily: fonts.regular, fontSize: 13, color: colors.line, marginTop: 4 },
  placeholderRow: { flexDirection: 'row', gap: 12 },
  placeholder: { flex: 1, marginTop: 16 },
  upgradeCard: { marginTop: 28, backgroundColor: colors.line, borderRadius: 15, padding: 20, gap: 16 },
  upgradeText: { fontFamily: fonts.medium, fontSize: 15, color: colors.black, textAlign: 'center' },
  upgrade: { backgroundColor: colors.black, borderRadius: 30, paddingVertical: 14, alignItems: 'center' },
  upgradeLabel: { fontFamily: fonts.bold, fontSize: 15, color: colors.white },
});
