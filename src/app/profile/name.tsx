import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { ScreenHeader } from '@/components/ScreenHeader';
import { useProfile } from '@/lib/profile';
import { colors, fonts } from '@/lib/theme';

export default function EditName() {
  const { profile, update } = useProfile();
  const [first, setFirst] = useState(profile.firstName ?? '');
  const [last, setLast] = useState(profile.lastName ?? '');

  // Saves on back, like the Android screen did in onBackPressed.
  const save = () => {
    if (first.trim()) update({ firstName: first.trim(), lastName: last.trim() });
  };

  return (
    <View style={styles.root}>
      <ScreenHeader title="Name" back={save} />
      <View style={styles.content}>
        <TextInput
          value={first}
          onChangeText={setFirst}
          placeholder="First name"
          placeholderTextColor={colors.line}
          style={styles.input}
        />
        <TextInput
          value={last}
          onChangeText={setLast}
          placeholder="Last name"
          placeholderTextColor={colors.line}
          style={styles.input}
        />
        <Text style={styles.note}>
          Last name is optional, and only shared with matches.{' '}
          <Text style={styles.why} onPress={() => router.push('/profile/why-last-name')}>
            Why?
          </Text>
        </Text>
        <Pressable style={styles.visible}>
          <View style={styles.dot} />
          <Text style={styles.visibleText}>Visible on profile</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.white },
  content: { padding: 24 },
  input: {
    fontFamily: fonts.medium,
    fontSize: 25,
    color: colors.black,
    borderBottomWidth: 1,
    borderBottomColor: colors.chip,
    paddingVertical: 10,
    marginBottom: 16,
  },
  note: { fontFamily: fonts.regular, fontSize: 14, color: colors.line },
  why: { fontFamily: fonts.bold, color: colors.purple },
  visible: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 28 },
  dot: { width: 10, height: 10, borderRadius: 5, backgroundColor: colors.purple },
  visibleText: { fontFamily: fonts.regular, fontSize: 18, color: colors.black },
});
