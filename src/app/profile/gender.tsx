import { router } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { ScreenHeader } from '@/components/ScreenHeader';
import { PillButton } from '@/components/Sheet';
import { useProfile } from '@/lib/profile';
import { colors, fonts } from '@/lib/theme';

export default function EditGender() {
  const { profile, update } = useProfile();
  const current = profile.gender ?? 'Man';

  const choose = async (gender: string) => {
    await update({ gender });
    router.back();
  };

  return (
    <View style={styles.root}>
      <ScreenHeader title="Gender" back />
      <View style={styles.content}>
        {['Man', 'Woman'].map((g) => (
          <View key={g} style={current === g ? null : styles.inactive}>
            <PillButton label={g} onPress={() => choose(g)} />
          </View>
        ))}
        <Pressable onPress={() => router.push('/profile/gender-feedback')} style={styles.feedback}>
          <Text style={styles.feedbackText}>Feedback on genders?</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.white },
  content: { padding: 24, gap: 8 },
  inactive: { opacity: 0.55 },
  feedback: { alignItems: 'center', marginTop: 24 },
  feedbackText: { fontFamily: fonts.bold, fontSize: 15, color: colors.purple },
});
