import { Image } from 'expo-image';
import { ReactNode } from 'react';
import { ImageSourcePropType, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { colors, fonts } from '@/lib/theme';
import { Icon } from './Icon';
import { IconName } from './icons';

// The profile card language from the Discover screen: white cards on the grey
// background, each with an optional like button in the bottom-right corner.

type LikeProps = { onLike?: () => void; likeLabel?: string; liked?: boolean };

export function PhotoCard({
  caption,
  source,
  onPress,
  accessibilityLabel,
  ...like
}: { caption: string; source: ImageSourcePropType; onPress?: () => void; accessibilityLabel?: string } & LikeProps) {
  // Inside a labelled button the photo is decorative; on its own it needs its own description.
  const alt = onPress ? '' : (accessibilityLabel ?? caption);
  const image = <Image source={source} style={styles.photo} contentFit="cover" accessibilityLabel={alt} accessibilityIgnoresInvertColors />;
  return (
    <Card title={caption} {...like}>
      {onPress ? (
        <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel={accessibilityLabel}>
          {image}
        </Pressable>
      ) : (
        image
      )}
    </Card>
  );
}

/** Small title over a large serif answer. */
export function PromptCard({ title, answer, kicker, ...like }: { title: string; answer: string; kicker?: string } & LikeProps) {
  return (
    <Card title={title} kicker={kicker} {...like} padded>
      <Text style={styles.answer}>{answer}</Text>
    </Card>
  );
}

/** Small title over regular body text (bios and other longer copy). */
export function TextCard({ title, body, kicker }: { title: string; body: string; kicker?: string }) {
  return (
    <View style={[styles.card, styles.textCard]}>
      {kicker ? <Kicker label={kicker} /> : null}
      <Text style={[styles.cardTitle, styles.cardTitlePadded]}>{title}</Text>
      <Text style={styles.body}>{body}</Text>
    </View>
  );
}

/** Something to check before booking: outlined on the grey background, so it reads as an aside, not a selling point. */
export function NoteCard({ title, body }: { title: string; body: string }) {
  return (
    <View style={[styles.card, styles.note]} accessibilityRole="summary">
      <Text style={styles.noteTitle}>{title}</Text>
      <Text style={styles.noteBody}>{body}</Text>
    </View>
  );
}

/** A title over outlined tags (how someone practises): scannable rather than one long serif line. */
export function TagsCard({ title, tags, kicker, ...like }: { title: string; tags: string[]; kicker?: string } & LikeProps) {
  return (
    <Card title={title} kicker={kicker} {...like} padded>
      <View style={styles.tags}>
        {tags.map((t) => (
          <View key={t} style={styles.tag}>
            <Text style={styles.tagText}>{t}</Text>
          </View>
        ))}
      </View>
    </Card>
  );
}

/** Small spaced capitals naming a section of a profile (e.g. WHY THEY FIT · 1 OF 3). */
export function Kicker({ label, style }: { label: string; style?: object }) {
  return <Text style={[styles.kicker, style]}>{label}</Text>;
}

export type ChipItem = { icon: IconName; label: string };

/** Horizontal chip row, then optional full-width rows (the Discover "vitals" card). */
export function ChipsCard({
  chips,
  rows = [],
  rowsTitle,
  kicker,
}: {
  chips: ChipItem[];
  rows?: ChipItem[];
  rowsTitle?: string;
  kicker?: string;
}) {
  return (
    <View style={styles.card}>
      {kicker ? <Kicker label={kicker} style={styles.kickerChips} /> : null}
      {chips.length > 0 ? (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={[styles.chips, kicker ? styles.chipsAfterKicker : null]}>
          {chips.map((c, i) => (
            <View key={`${c.icon}-${c.label}`} style={[styles.chip, i > 0 && styles.chipDivider]}>
              <Icon name={c.icon} size={18} color={colors.black} />
              <Text style={styles.chipText}>{c.label}</Text>
            </View>
          ))}
        </ScrollView>
      ) : null}
      {rowsTitle && rows.length > 0 ? (
        <Text style={[styles.rowsTitle, chips.length === 0 && !kicker && styles.rowsTitleFirst]}>{rowsTitle}</Text>
      ) : null}
      {rows.map((r) => (
        <View key={`${r.icon}-${r.label}`} style={styles.row}>
          <Icon name={r.icon} size={18} color={colors.black} />
          <Text style={styles.chipText}>{r.label}</Text>
        </View>
      ))}
    </View>
  );
}

function Card({
  title,
  children,
  onLike,
  likeLabel = 'Like',
  liked,
  padded,
  kicker,
}: { title: string; children: ReactNode; padded?: boolean; kicker?: string } & LikeProps) {
  return (
    <View style={[styles.card, padded && styles.cardPadded]}>
      {kicker ? <Kicker label={kicker} /> : null}
      <Text style={[styles.cardTitle, padded && styles.cardTitlePadded]}>{title}</Text>
      {children}
      {onLike ? (
        <Pressable
          onPress={onLike}
          accessibilityRole="button"
          accessibilityLabel={likeLabel}
          accessibilityState={{ selected: !!liked }}
          style={styles.like}
        >
          <Icon name={liked ? 'heartPink' : 'icLike'} size={23} />
        </Pressable>
      ) : null}
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
  rowsTitle: {
    fontFamily: fonts.bold,
    fontSize: 11,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    color: colors.muted,
    paddingHorizontal: 29,
    paddingTop: 16,
    paddingBottom: 6,
    borderTopWidth: 1,
    borderTopColor: colors.background,
  },
  rowsTitleFirst: { borderTopWidth: 0, paddingTop: 18 },
  textCard: { paddingTop: 30, paddingBottom: 24 },
  kicker: {
    fontFamily: fonts.bold,
    fontSize: 11,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    color: colors.muted,
    marginHorizontal: 15,
    marginBottom: 10,
  },
  kickerChips: { marginTop: 20, marginBottom: 0, marginHorizontal: 29 },
  chipsAfterKicker: { paddingTop: 12 },
  note: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: colors.black,
    paddingHorizontal: 18,
    paddingVertical: 16,
  },
  noteTitle: { fontFamily: fonts.bold, fontSize: 13, letterSpacing: 0.3, color: colors.black, marginBottom: 6 },
  noteBody: { fontFamily: fonts.regular, fontSize: 15, lineHeight: 22, color: colors.black },
  tags: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginHorizontal: 15 },
  tag: { maxWidth: '100%', borderWidth: 1, borderColor: colors.black, borderRadius: 30, paddingHorizontal: 14, paddingVertical: 8 },
  tagText: { fontFamily: fonts.medium, fontSize: 15, color: colors.black },
  body: { fontFamily: fonts.regular, fontSize: 16, lineHeight: 24, color: colors.black, marginHorizontal: 15 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 29,
    paddingVertical: 16,
    borderTopWidth: 1,
    borderTopColor: colors.background,
  },
});
