import { router } from 'expo-router';
import { ScrollView, StyleSheet, View } from 'react-native';

import { ListGroup, ListRow, SectionTitle } from '@/components/ListRow';
import { ScreenHeader } from '@/components/ScreenHeader';
import { useSession } from '@/features/match/session';
import { devToolsEnabled } from '@/lib/devtools';
import { colors } from '@/lib/theme';

export default function Settings() {
  const session = useSession();

  return (
    <View style={styles.root}>
      <ScreenHeader title="Settings" />
      <ScrollView contentContainerStyle={styles.content}>
        <SectionTitle>Your search</SectionTitle>
        <ListGroup>
          <ListRow
            label="Start over"
            value="Clears what you've told WATL on this device"
            onPress={() => {
              session.reset();
              router.navigate('/');
            }}
          />
        </ListGroup>

        <SectionTitle>Demo</SectionTitle>
        <ListGroup>
          <ListRow label="Try a demo patient" value="Step through a scripted search" onPress={() => router.push('/demos')} />
        </ListGroup>

        <SectionTitle>About</SectionTitle>
        <ListGroup>
          <ListRow
            label="How matching works"
            value="WATL asks only what could change your matches, shows at most three, and explains each one."
          />
          <ListRow
            label="Where profiles come from"
            value="GPs and psychologists in the ADHDme network. Reasons are drawn from each clinician's published profile."
          />
          <ListRow
            label="Privacy"
            value="No account. What you tell WATL stays on this device for up to 24 hours so you can come back to it."
          />
          <ListRow label="Help and safety" onPress={() => router.push('/safety')} />
        </ListGroup>

        {devToolsEnabled ? (
          <>
            <SectionTitle>Testing</SectionTitle>
            <ListGroup>
              <ListRow label="Review screen states" onPress={() => router.push('/dev/states')} />
            </ListGroup>
          </>
        ) : null}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  content: { paddingBottom: 48 },
});
