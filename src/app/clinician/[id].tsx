import { useLocalSearchParams } from 'expo-router';
import { ScrollView, StyleSheet, View } from 'react-native';

import { EmptyStateCard } from '@/components/EmptyStateCard';
import { ScreenHeader } from '@/components/ScreenHeader';
import { colors } from '@/lib/theme';

// Screen 06 — clinician detail.
export default function ClinicianDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return (
    <View style={styles.root}>
      <ScreenHeader title="Clinician" back />
      <ScrollView contentContainerStyle={styles.content}>
        <EmptyStateCard
          title="Clinician details"
          body={`Why they fit, how they practise and booking for "${id}" arrive in Phase 1.`}
        />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  content: { paddingBottom: 40 },
});
