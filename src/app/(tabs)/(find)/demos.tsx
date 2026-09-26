import { router } from 'expo-router';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { ListGroup, ListRow, SectionTitle } from '@/components/ListRow';
import { ScreenHeader } from '@/components/ScreenHeader';
import { demos, type Demo } from '@/features/match/demos';
import { useSession } from '@/features/match/session';
import { colors, fonts } from '@/lib/theme';

const GROUPS: { title: string; filter: (d: Demo) => boolean }[] = [
  { title: 'Looking for a GP', filter: (d) => d.profession === 'gp' },
  { title: 'Looking for a psychologist', filter: (d) => d.profession === 'psychologist' },
  { title: 'Other professionals', filter: (d) => !['gp', 'psychologist', 'either'].includes(d.profession) },
  { title: 'Not sure yet', filter: (d) => d.profession === 'either' },
];

// Demo run-throughs: scripted patients that run through the real matching engine and profiles.
export default function Demos() {
  const session = useSession();

  return (
    <View style={styles.root}>
      <ScreenHeader title="Demo patients" back />
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.note}>
          Replaces your current search.
        </Text>
        {GROUPS.map((g) => (
          <View key={g.title}>
            <SectionTitle>{g.title}</SectionTitle>
            <ListGroup>
              {demos.filter(g.filter).map((d) => (
                <ListRow key={d.id} label={d.title} onPress={() => router.push(session.startDemo(d.id))} />
              ))}
            </ListGroup>
          </View>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  content: { paddingBottom: 100 }, // clear of the floating assistant button
  note: { fontFamily: fonts.regular, fontSize: 14, lineHeight: 20, color: colors.black, margin: 20, marginBottom: 0 },
});
