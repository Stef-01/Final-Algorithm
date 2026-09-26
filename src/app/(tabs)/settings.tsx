import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';

import { CarePlans } from '@/components/CarePlans';
import { GoalChips } from '@/components/GoalChips';
import { ListGroup, ListRow, SectionTitle } from '@/components/ListRow';
import { ScreenHeader } from '@/components/ScreenHeader';
import { useGoals } from '@/features/care/goals';
import { CLIENTS, useConnection } from '@/features/connect/connection';
import { claudeEnabled } from '@/features/match/remoteExtract';
import { useSession } from '@/features/match/session';
import { devToolsEnabled } from '@/lib/devtools';
import { colors } from '@/lib/theme';

// Profile: your goals first (they shape your care team), your care plans, then settings.
export default function Settings() {
  const session = useSession();
  const { goals, toggle } = useGoals();
  const { connection: ai } = useConnection();
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
      <ScreenHeader title="Profile" />
      <ScrollView contentContainerStyle={styles.content}>
        <SectionTitle>Your goals</SectionTitle>
        <GoalChips selected={goals} onToggle={toggle} />

        <SectionTitle>Care plans</SectionTitle>
        <CarePlans />

        <SectionTitle>Your AI</SectionTitle>
        <ListGroup>
          <ListRow
            label={ai ? `Connected to ${CLIENTS[ai.client].name}` : 'Connect Claude or ChatGPT'}
            value={ai ? 'Manage what it can use' : 'Find people with what your AI knows'}
            onPress={() => router.push('/connect')}
          />
        </ListGroup>

        <SectionTitle>Your search</SectionTitle>
        <ListGroup>
          <ListRow
            label="Start over"
            value="Clears your search"
            onPress={() => {
              session.reset();
              router.navigate('/');
            }}
          />
        </ListGroup>

        <SectionTitle>For professionals</SectionTitle>
        <ListGroup>
          <ListRow label="Join WATL" value="Publish your fees and availability" onPress={() => router.push('/join')} />
        </ListGroup>

        <SectionTitle>Demo</SectionTitle>
        <ListGroup>
          <ListRow label="Try a demo patient" value="Scripted searches to try" onPress={() => router.push('/demos')} />
        </ListGroup>

        <SectionTitle>About</SectionTitle>
        <ListGroup>
          <ListRow
            label="How matching works"
            value="Best fits first, each with its reason."
          />
          <ListRow
            label="Reading what you write"
            value={
              claude === null
                ? 'Checking…'
                : claude
                  ? 'Claude reads your words. Fixed rules do the ranking.'
                  : 'On this device. Nothing you write leaves it.'
            }
          />
          <ListRow
            label="Where profiles come from"
            value="The ADHDme network. Reasons quote their own profiles."
          />
          <ListRow
            label="Privacy"
            value={`No account. Your search stays on this device for 24 hours.${claude ? ' Claude (Anthropic) reads your words; WATL doesn’t store them.' : ''}`}
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
