import { Redirect, router } from 'expo-router';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { ListGroup, ListRow, SectionTitle } from '@/components/ListRow';
import { ScreenHeader } from '@/components/ScreenHeader';
import { useSession } from '@/features/match/session';
import { scenarios } from '@/features/match/sessionCore';
import { devToolsEnabled } from '@/lib/devtools';
import { colors, fonts } from '@/lib/theme';

// Review page for every screen state — stands in for the PRD §51 Figma frames.
export default function DevStates() {
  const session = useSession();
  if (!devToolsEnabled) return <Redirect href="/" />;

  return (
    <View style={styles.root}>
      <ScreenHeader title="Screen states" back />
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.note}>
          Each row loads fixture data and opens that state. Opening one replaces your current search.
        </Text>
        <SectionTitle>States</SectionTitle>
        <ListGroup>
          {scenarios.map((s) => (
            <ListRow
              key={s.id}
              label={s.label}
              value={s.frame}
              onPress={() => {
                const t = s.build();
                session.load(t.state);
                router.push(t.route);
              }}
            />
          ))}
          <ListRow label="Listening (voice)" value="02_Listening · arrives with voice in Phase 4" />
        </ListGroup>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  content: { paddingBottom: 48 },
  note: { fontFamily: fonts.regular, fontSize: 14, lineHeight: 20, color: colors.black, margin: 20, marginBottom: 0 },
});
