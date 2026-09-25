import { Image } from 'expo-image';
import { router } from 'expo-router';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { ListGroup, ListRow, SectionTitle } from '@/components/ListRow';
import { ProfileTabs } from '@/components/ProfileTabs';
import { ScreenHeader } from '@/components/ScreenHeader';
import { userProfile } from '@/data/people';
import { useProfile } from '@/lib/profile';
import { colors, fonts } from '@/lib/theme';

export default function EditProfile() {
  const { profile } = useProfile();

  return (
    <View style={styles.root}>
      <ScreenHeader title={profile.firstName ?? 'Profile'} back>
        <ProfileTabs active="edit" />
      </ScreenHeader>
      <ScrollView contentContainerStyle={styles.content}>
        <SectionTitle>My photos</SectionTitle>
        <View style={styles.grid}>
          {userProfile.photos.map((p, i) => (
            <Image key={i} source={p.source} style={styles.photo} contentFit="cover" />
          ))}
        </View>

        <SectionTitle>My answers</SectionTitle>
        {userProfile.prompts.map((p) => (
          <View key={p.title} style={styles.answer}>
            <Text style={styles.answerTitle}>{p.title}</Text>
            <Text style={styles.answerBody}>{p.answer}</Text>
          </View>
        ))}

        <SectionTitle>My virtues</SectionTitle>
        <ListGroup>
          <ListRow label="Work" value="Android app development" />
          <ListRow label="Job title" value="Full stack Android developer" />
          <ListRow label="School" value="Masai" />
          <ListRow label="Education level" value="Bootcamp" />
          <ListRow label="Religious Beliefs" value="Prefer Not to say" />
          <ListRow label="Home town" value="some place" />
          <ListRow label="Politics" value="Prefer Not to Say" />
        </ListGroup>

        <SectionTitle>My vitals</SectionTitle>
        <ListGroup>
          <ListRow label="Name" value={profile.firstName} onPress={() => router.push('/profile/name')} />
          <ListRow label="Gender" value={profile.gender ?? 'Man'} onPress={() => router.push('/profile/gender')} />
          <ListRow label="Age" value={profile.age} onPress={() => router.push('/profile/age')} />
          <ListRow label="Height" value={`5' 6"`} />
          <ListRow label="Location" value="Bangalore" />
          <ListRow label="Ethnicity" value={profile.ethnicity ?? 'South Asian'} />
          <ListRow label="Children" value="Don't have children" />
          <ListRow label="Family Plans" value="Don't want children" />
        </ListGroup>

        <SectionTitle>My Vices</SectionTitle>
        <ListGroup>
          {['Drinking', 'Smoking', 'Marijuana', 'Drugs'].map((v) => (
            <ListRow key={v} label={v} value="No" />
          ))}
        </ListGroup>

        <SectionTitle>My account</SectionTitle>
        <ListGroup>
          <ListRow label="Recent Instagram Feed" />
        </ListGroup>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  content: { paddingBottom: 48 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, paddingHorizontal: 20 },
  photo: { width: '31%', aspectRatio: 1, borderRadius: 8 },
  answer: { backgroundColor: colors.white, marginHorizontal: 20, marginBottom: 10, borderRadius: 8, padding: 16 },
  answerTitle: { fontFamily: fonts.bold, fontSize: 15, color: colors.black },
  answerBody: { fontFamily: fonts.regular, fontSize: 15, color: colors.line, marginTop: 4 },
});
