import { router } from 'expo-router';
import { ScrollView, StyleSheet, View } from 'react-native';

import { placeLine } from '@/components/ClinicianCards';
import { EmptyStateCard } from '@/components/EmptyStateCard';
import { ListGroup, ListRow, SectionTitle } from '@/components/ListRow';
import { ScreenHeader } from '@/components/ScreenHeader';
import { getClinician } from '@/data/clinicians';
import { useSaved } from '@/features/match/saved';
import { colors } from '@/lib/theme';

// Clinicians hearted on a match. Stored on this device only; no account needed.
export default function Saved() {
  const { saved } = useSaved();

  return (
    <View style={styles.root}>
      <ScreenHeader title="Saved" />
      <ScrollView contentContainerStyle={styles.content}>
        {saved.length === 0 ? (
          <EmptyStateCard
            title="Nothing saved yet."
            body="Tap ♥ on a clinician you'd like to come back to and they'll appear here."
            action={{ label: 'Find a GP', onPress: () => router.navigate('/') }}
          />
        ) : (
          <>
            <SectionTitle>Saved clinicians</SectionTitle>
            <ListGroup>
              {saved.map((m) => {
                const c = getClinician(m.clinicianId);
                if (!c) return null;
                return (
                  <ListRow
                    key={c.id}
                    label={c.name}
                    value={`${m.fit} · ${placeLine(c)}`}
                    onPress={() => router.push(`/clinician/${c.id}`)}
                  />
                );
              })}
            </ListGroup>
          </>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  content: { paddingBottom: 40 },
});
