import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';

import { ListGroup, ListRow, SectionTitle } from '@/components/ListRow';
import { ScreenHeader } from '@/components/ScreenHeader';
import { claudeEnabled } from '@/features/match/remoteExtract';
import { useSession } from '@/features/match/session';
import { devToolsEnabled } from '@/lib/devtools';
import { colors } from '@/lib/theme';

export default function Settings() {
  const session = useSession();
  const [claude, setClaude] = useState<boolean | null>(null);
  useEffect(() => {
    let alive = true;
    void claudeEnabled().then((on) => alive && setClaude(on));
    return () => {
      alive = false;
    };
  }, []);

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
            value="WATL asks only what could change your matches, lists everyone who meets your requirements with the best fits first, and explains each one."
          />
          <ListRow
            label="Reading what you write"
            value={
              claude === null
                ? 'Checking…'
                : claude
                  ? 'Claude reads your words to work out what matters to you. The ranking itself follows fixed rules and each clinician’s reviewed profile.'
                  : 'Keyword matching on this device. Nothing you write leaves it.'
            }
          />
          <ListRow
            label="Where profiles come from"
            value="GPs and psychologists in the ADHDme network. Reasons are drawn from each clinician's published profile."
          />
          <ListRow
            label="Privacy"
            value={`No account. What you tell WATL stays on this device for up to 24 hours so you can come back to it.${
              claude ? ' To read it, your words are sent to Anthropic’s Claude API and not stored by WATL.' : ''
            }`}
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
  content: { paddingBottom: 100 }, // clear of the floating assistant button
});
