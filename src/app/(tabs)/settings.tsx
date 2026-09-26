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
  const [about, setAbout] = useState(false);
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

        <SectionTitle>More</SectionTitle>
        <ListGroup>
          <ListRow label="Try a demo patient" onPress={() => router.push('/demos')} />
          <ListRow label="Join WATL" value="For professionals" onPress={() => router.push('/join')} />
          <ListRow label="Help and safety" onPress={() => router.push('/safety')} />
          <ListRow label="About and privacy" value={about ? undefined : 'How matching and privacy work'} onPress={() => setAbout((a) => !a)} />
          {about ? (
            <>
              <ListRow label="Matching" value="Best fits first, with reasons" />
              <ListRow label="What you write" value={claude === null ? 'Checking…' : claude ? 'Claude reads it; fixed rules rank' : 'Stays on this device'} />
              <ListRow label="Profiles" value="The ADHDme network" />
              <ListRow label="Privacy" value={`No account · searches kept 24 hours${claude ? ' · Claude doesn’t store them' : ''}`} />
            </>
          ) : null}
          <ListRow
            label="Start over"
            onPress={() => {
              session.reset();
              router.navigate('/');
            }}
          />
          {devToolsEnabled ? <ListRow label="Review screen states" onPress={() => router.push('/dev/states')} /> : null}
        </ListGroup>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  content: { paddingBottom: 100 }, // clear of the floating assistant button
});
