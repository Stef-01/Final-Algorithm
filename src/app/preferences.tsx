import { router } from 'expo-router';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { ListGroup, ListRow, SectionTitle } from '@/components/ListRow';
import { ScreenHeader } from '@/components/ScreenHeader';
import { colors, fonts } from '@/lib/theme';

const preferred = [
  'Age range',
  'Religion',
  'Ethnicity',
  'Height',
  'Politics',
  'Smoking',
  'Drinking',
  'Drugs',
  'Marijuana',
  'Education',
  'Children',
  'Family plans',
];

export default function Preferences() {
  return (
    <View style={styles.root}>
      <ScreenHeader title="Preferences" back />
      <ScrollView contentContainerStyle={styles.content}>
        <SectionTitle>Basic Preferences</SectionTitle>
        <ListGroup>
          <ListRow label="I'm interested in" value="Woman" />
          <ListRow label="My location" value="Agra" />
        </ListGroup>

        <SectionTitle>Preferred Preferences</SectionTitle>
        <Text style={styles.upgrade} onPress={() => router.push('/learn-more')}>
          ● Upgrade for access
        </Text>
        <ListGroup>
          {preferred.map((label) => (
            <ListRow key={label} label={label} value="Open to all" />
          ))}
        </ListGroup>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  content: { paddingBottom: 48 },
  upgrade: { fontFamily: fonts.bold, fontSize: 11, color: colors.purple, marginHorizontal: 20, marginBottom: 8 },
});
