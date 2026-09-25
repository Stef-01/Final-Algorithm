import { Image } from 'expo-image';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import type { Person } from '@/data/people';
import { colors, fonts } from '@/lib/theme';
import { Icon } from './Icon';
import { IconName } from './icons';

type Details = Pick<
  Person,
  'age' | 'gender' | 'height' | 'location' | 'ethnicity' | 'education' | 'religion' | 'country'
>;

type Props = {
  person: Pick<Person, 'photos' | 'prompts'> & { details: Record<keyof Details, string | number> };
  /** When set, every card gets a like button that calls this. */
  onLike?: () => void;
};

// Photo / prompt / vitals cards in the same order the Android layouts used.
export function ProfileCards({ person, onLike }: Props) {
  const { photos, prompts, details } = person;
  const photoCard = (i: number) => (
    <Card key={`p${i}`} title={photos[i].caption} onLike={onLike}>
      <Image source={photos[i].source} style={styles.photo} contentFit="cover" />
    </Card>
  );
  const promptCard = (i: number) => (
    <Card key={`q${i}`} title={prompts[i].title} onLike={onLike} padded>
      <Text style={styles.answer}>{prompts[i].answer}</Text>
    </Card>
  );

  return (
    <>
      {photoCard(0)}
      {promptCard(0)}
      {photoCard(1)}
      <Vitals details={details} />
      {photoCard(2)}
      {promptCard(1)}
      {photoCard(3)}
      {promptCard(2)}
      {photoCard(4)}
      {photoCard(5)}
    </>
  );
}

function Card({
  title,
  children,
  onLike,
  padded,
}: {
  title: string;
  children: React.ReactNode;
  onLike?: () => void;
  padded?: boolean;
}) {
  return (
    <View style={[styles.card, padded && styles.cardPadded]}>
      <Text style={[styles.cardTitle, padded && styles.cardTitlePadded]}>{title}</Text>
      {children}
      {onLike ? (
        <Pressable onPress={onLike} accessibilityRole="button" accessibilityLabel="Like" style={styles.like}>
          <Icon name="icLike" size={23} />
        </Pressable>
      ) : null}
    </View>
  );
}

const chips: { key: keyof Details | 'children' | 'drinking' | 'smoking' | 'marijuana' | 'drugs'; icon: IconName; fixed?: string }[] = [
  { key: 'age', icon: 'icAge' },
  { key: 'gender', icon: 'icGender' },
  { key: 'height', icon: 'icHeight1' },
  { key: 'location', icon: 'icLocation' },
  { key: 'ethnicity', icon: 'icEthnicity' },
  { key: 'children', icon: 'icKids', fixed: "Don't want children" },
  { key: 'drinking', icon: 'icDrinking', fixed: 'No' },
  { key: 'smoking', icon: 'icSmoking', fixed: 'No' },
  { key: 'marijuana', icon: 'icMarijuana', fixed: 'No' },
  { key: 'drugs', icon: 'icDrugs', fixed: 'No' },
];

function Vitals({ details }: { details: Record<keyof Details, string | number> }) {
  const rows: { icon: IconName; value: string | number }[] = [
    { icon: 'icEducation', value: details.education },
    { icon: 'icReligion', value: details.religion },
    { icon: 'icHometown', value: details.country },
  ];
  return (
    <View style={styles.card}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
        {chips.map((c, i) => (
          <View key={c.key} style={[styles.chip, i > 0 && styles.chipDivider]}>
            <Icon name={c.icon} size={18} />
            <Text style={styles.chipText}>
              {c.fixed ?? String(details[c.key as keyof Details])}
            </Text>
          </View>
        ))}
      </ScrollView>
      {rows.map((r) => (
        <View key={r.icon} style={styles.vitalRow}>
          <Icon name={r.icon} size={18} />
          <Text style={styles.chipText}>{r.value}</Text>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    marginHorizontal: 12,
    marginTop: 20,
    borderRadius: 10,
    backgroundColor: colors.white,
    overflow: 'hidden',
  },
  cardPadded: { paddingBottom: 60, paddingTop: 30 },
  cardTitle: { fontFamily: fonts.medium, fontSize: 15, color: colors.black, margin: 15 },
  cardTitlePadded: { marginTop: 0 },
  photo: { width: '100%', height: 370 },
  answer: {
    fontFamily: fonts.serifSemiBold,
    fontSize: 30,
    lineHeight: 38,
    color: colors.black,
    marginHorizontal: 15,
  },
  like: {
    position: 'absolute',
    right: 15,
    bottom: 15,
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 4,
  },
  chips: { paddingHorizontal: 15, paddingVertical: 18 },
  chip: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 14 },
  chipDivider: { borderLeftWidth: 1, borderLeftColor: colors.chip },
  chipText: { fontFamily: fonts.medium, fontSize: 15, color: colors.black },
  vitalRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 29,
    paddingVertical: 16,
    borderTopWidth: 1,
    borderTopColor: colors.background,
  },
});
