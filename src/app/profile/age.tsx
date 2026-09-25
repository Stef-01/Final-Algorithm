import { StyleSheet, Text, View } from 'react-native';

import { ScreenHeader } from '@/components/ScreenHeader';
import { useProfile } from '@/lib/profile';
import { colors, fonts } from '@/lib/theme';

export default function Age() {
  const { profile } = useProfile();
  return (
    <View style={styles.root}>
      <ScreenHeader title="Age" back />
      <View style={styles.content}>
        <Text style={styles.age}>{profile.age ?? '—'}</Text>
        <Text style={styles.note}>Age can only be changed once</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.white },
  content: { padding: 24 },
  age: {
    fontFamily: fonts.serifSemiBold,
    fontSize: 40,
    color: colors.black,
    borderBottomWidth: 1,
    borderBottomColor: colors.chip,
    paddingBottom: 12,
  },
  note: { fontFamily: fonts.regular, fontSize: 15, color: colors.line, marginTop: 12 },
});
