import * as Linking from 'expo-linking';
import { router } from 'expo-router';
import { Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { Icon } from '@/components/Icon';
import { ScreenHeader } from '@/components/ScreenHeader';
import { useProfile } from '@/lib/profile';
import { colors, fonts, urls } from '@/lib/theme';

export default function Settings() {
  const { profile } = useProfile();

  const rows: [string, () => void][] = [
    ['Preferences', () => router.push('/preferences')],
    ['Account', () => router.push('/account')],
    ['Help Centre', () => Linking.openURL(urls.helpCentre)],
  ];

  return (
    <View style={styles.root}>
      <ScreenHeader title="Settings" right={<Icon name="icDiscoverOverflow" size={22} />} />
      <ScrollView contentContainerStyle={styles.content}>
        <Pressable onPress={() => router.push('/profile')} style={styles.profileCard} accessibilityRole="button">
          <View>
            <Image source={require('../../../assets/images/profile_pic.png')} style={styles.avatar} />
            <View style={styles.pencil}>
              <Icon name="icPen" size={12} />
            </View>
          </View>
          <View style={styles.profileText}>
            <Text style={styles.name}>{profile.firstName ?? 'Nipun'}</Text>
            <Text style={styles.member}>WATL Member</Text>
            <View style={styles.justJoined}>
              <Text style={styles.justJoinedText}>Just Joined</Text>
            </View>
          </View>
        </Pressable>

        <View style={styles.list}>
          {rows.map(([label, onPress]) => (
            <Pressable key={label} onPress={onPress} style={({ pressed }) => [styles.row, pressed && styles.pressed]}>
              <Text style={styles.rowText}>{label}</Text>
              <Icon name="icRightArrow" size={14} color={colors.line} />
            </Pressable>
          ))}
        </View>

        <View style={styles.upsell}>
          <Text style={styles.upsellText}>Preferred Members go on twice as many dates.</Text>
          <Pressable style={styles.learnMore} onPress={() => router.push('/learn-more')} accessibilityRole="button">
            <Text style={styles.learnMoreText}>Learn more</Text>
          </Pressable>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  content: { padding: 16, paddingBottom: 40 },
  profileCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 18,
    backgroundColor: colors.white,
    borderRadius: 10,
    padding: 18,
  },
  avatar: { width: 84, height: 84, borderRadius: 42 },
  pencil: {
    position: 'absolute',
    right: 0,
    bottom: 0,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.background,
  },
  profileText: { flex: 1, gap: 4 },
  name: { fontFamily: fonts.bold, fontSize: 20, color: colors.black },
  member: { fontFamily: fonts.medium, fontSize: 15, color: colors.purple },
  justJoined: {
    alignSelf: 'flex-start',
    backgroundColor: colors.purple,
    borderRadius: 30,
    paddingHorizontal: 10,
    paddingVertical: 3,
    marginTop: 4,
  },
  justJoinedText: { fontFamily: fonts.bold, fontSize: 10, color: colors.white },
  list: { backgroundColor: colors.white, borderRadius: 10, marginTop: 16, overflow: 'hidden' },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 18,
    borderBottomWidth: 1,
    borderBottomColor: colors.background,
  },
  pressed: { backgroundColor: colors.background },
  rowText: { fontFamily: fonts.medium, fontSize: 20, color: colors.black },
  upsell: { marginTop: 16, backgroundColor: colors.line, borderRadius: 15, padding: 20, gap: 16 },
  upsellText: { fontFamily: fonts.medium, fontSize: 15, color: colors.black, textAlign: 'center' },
  learnMore: { backgroundColor: colors.black, borderRadius: 30, paddingVertical: 14, alignItems: 'center' },
  learnMoreText: { fontFamily: fonts.bold, fontSize: 15, color: colors.white },
});
