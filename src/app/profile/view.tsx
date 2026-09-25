import { ScrollView, StyleSheet, View } from 'react-native';

import { ProfileCards } from '@/components/ProfileCards';
import { ProfileTabs } from '@/components/ProfileTabs';
import { ScreenHeader } from '@/components/ScreenHeader';
import { userProfile } from '@/data/people';
import { useProfile } from '@/lib/profile';
import { colors } from '@/lib/theme';

// Preview of your own profile as others see it.
export default function ViewProfile() {
  const { profile } = useProfile();
  const details = {
    age: profile.age ?? '20',
    gender: profile.gender ?? 'Man',
    height: profile.height ?? `5' 6"`,
    location: profile.location ?? 'Bangalore',
    ethnicity: profile.ethnicity ?? 'South Asian',
    education: profile.education ?? 'Masai',
    religion: profile.religion ?? 'Prefer not to say',
    country: profile.country ?? 'India',
  };

  return (
    <View style={styles.root}>
      <ScreenHeader title={profile.firstName ?? 'Profile'} back>
        <ProfileTabs active="view" />
      </ScreenHeader>
      <ScrollView contentContainerStyle={styles.content}>
        <ProfileCards person={{ ...userProfile, details }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  content: { paddingBottom: 40 },
});
