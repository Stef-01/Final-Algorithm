import { router } from 'expo-router';
import { ScrollView, StyleSheet, View } from 'react-native';

import { ListGroup, ListRow, SectionTitle } from '@/components/ListRow';
import { ScreenHeader } from '@/components/ScreenHeader';
import { colors } from '@/lib/theme';

export default function Settings() {
  return (
    <View style={styles.root}>
      <ScreenHeader title="Settings" />
      <ScrollView contentContainerStyle={styles.content}>
        <SectionTitle>Your search</SectionTitle>
        <ListGroup>
          <ListRow label="Start over" value="Go back to the first question" onPress={() => router.navigate('/')} />
        </ListGroup>

        <SectionTitle>About</SectionTitle>
        <ListGroup>
          <ListRow label="How matching works" value="Coming soon" />
          <ListRow label="Privacy" value="No account needed. Details coming soon." />
          <ListRow label="Help and safety" onPress={() => router.push('/safety')} />
        </ListGroup>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  content: { paddingBottom: 48 },
});
