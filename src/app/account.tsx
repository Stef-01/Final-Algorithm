import * as Linking from 'expo-linking';
import { router } from 'expo-router';
import { ScrollView, StyleSheet, View } from 'react-native';

import { ListGroup, ListRow, SectionTitle } from '@/components/ListRow';
import { ScreenHeader } from '@/components/ScreenHeader';
import { useProfile } from '@/lib/profile';
import { colors, urls } from '@/lib/theme';

export default function Account() {
  const { profile, clear } = useProfile();

  const logOut = async () => {
    await clear();
    router.dismissAll();
    router.replace('/');
  };

  return (
    <View style={styles.root}>
      <ScreenHeader title="Account" back />
      <ScrollView contentContainerStyle={styles.content}>
        <SectionTitle>Pause My Profile</SectionTitle>
        <ListGroup>
          <ListRow label="Pause" />
        </ListGroup>

        <SectionTitle>Phone & email</SectionTitle>
        <ListGroup>
          <ListRow label={`+91 ${profile.phoneNumber ?? ''}`} />
          <ListRow label={profile.email ?? ''} />
        </ListGroup>

        <SectionTitle>Notifications</SectionTitle>
        <ListGroup>
          <ListRow label="Push Notification" />
          <ListRow label="Emails" />
        </ListGroup>

        <SectionTitle>Membership</SectionTitle>
        <ListGroup>
          <ListRow label="Upgrade to Preferred Membership" onPress={() => router.push('/learn-more')} />
        </ListGroup>

        <SectionTitle>Connected accounts</SectionTitle>
        <ListGroup>
          <ListRow label="Facebook" />
          <ListRow label="Instagram" />
        </ListGroup>

        <SectionTitle>Legal</SectionTitle>
        <ListGroup>
          <ListRow label="Privacy Policy" onPress={() => Linking.openURL(urls.privacy)} />
          <ListRow label="Terms of service" onPress={() => Linking.openURL(urls.terms)} />
          <ListRow label="Privacy Preferences" />
          <ListRow label="Safe Dating Tips" onPress={() => Linking.openURL(urls.safeDating)} />
          <ListRow label="Licenses" onPress={() => Linking.openURL(urls.licenses)} />
        </ListGroup>

        <SectionTitle>Download my data</SectionTitle>
        <ListGroup>
          <ListRow label="Log Out" onPress={logOut} />
        </ListGroup>
        <View style={styles.gap} />
        <ListGroup>
          <ListRow label="Delete Account" tone={colors.purple} onPress={() => router.push('/delete-account')} />
        </ListGroup>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  content: { paddingBottom: 48 },
  gap: { height: 24 },
});
