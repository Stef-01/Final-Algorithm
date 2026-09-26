import { Image } from 'expo-image';
import { ReactNode, useState } from 'react';
import { ImageSourcePropType, Pressable, StyleSheet, Text, View } from 'react-native';

import type { Qualification } from '@server/engine/types';

import { colors, fonts } from '@/lib/theme';
import { Icon } from './Icon';
import { LikeButton } from './LikeButton';
import { IconName } from './icons';

// The profile card language from the Discover screen: white cards on the grey
// background, each with an optional like button in the bottom-right corner (top-right on photos).

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
  // The photo's heart sits top-right, clear of the ✓ and ✕ buttons along the bottom of the matches.
  return (
    <Card title={caption}>
      <View>
        {onPress ? (
          <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel={accessibilityLabel}>
            {image}
          </Pressable>
        ) : (
          image
        )}
        {like.onLike ? (
          <View style={styles.likeTop}>
            <LikeButton liked={!!like.liked} onPress={like.onLike} label={like.likeLabel ?? 'Like'} />
          </View>
        ) : null}
      </View>
    </Card>
  );
}

/** Small title over a large serif answer. */
export function PromptCard({ title, answer, kicker, ...like }: { title: string; answer: string; kicker?: string } & LikeProps) {
  return (
    <Card title={title} kicker={kicker} {...like} padded tight={!like.onLike}>
      <Text style={styles.answer}>{answer}</Text>
    </Card>
  );
}

/** Small title over regular body text (bios and other longer copy). */
export function TextCard({ title, body, kicker, lines }: { title: string; body: string; kicker?: string; /** Collapse long text to this many lines, with "More". */ lines?: number }) {
  const long = !!lines && body.length > lines * 55;
  const [open, setOpen] = useState(false);
  return (
    <View style={[styles.card, styles.textCard]}>
      {kicker ? <Kicker label={kicker} /> : null}
      <Text style={[styles.cardTitle, styles.cardTitlePadded]}>{title}</Text>
      <Text style={styles.body} numberOfLines={long && !open ? lines : undefined}>
        {body}
      </Text>
      {long ? (
        <Pressable onPress={() => setOpen((o) => !o)} accessibilityRole="button" style={styles.more}>
          <Text style={styles.moreText}>{open ? 'Less' : 'More'}</Text>
        </Pressable>
      ) : null}
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
  if (tags.length === 0) return null;
  return (
    <Card title={title} kicker={kicker} {...like} padded tight={!like.onLike}>
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

const QUAL_ICON: Record<Qualification['kind'], IconName> = { degree: 'icMortarboard', membership: 'icSecurity', certification: 'icCheck' };

/** Qualifications as a clean list: what it is, where from, and a small badge (In progress, Member). */
export function QualificationsCard({ items }: { items: Qualification[] }) {
  if (items.length === 0) return null;
  return (
    <View style={styles.card}>
      <Text style={styles.cardTitle}>Qualifications</Text>
      {items.map((q, i) => (
        <View key={`${q.title}-${i}`} style={[styles.qual, i === 0 && styles.qualFirst]}>
          <Icon name={QUAL_ICON[q.kind]} size={18} color={colors.black} />
          <View style={styles.qualText}>
            <Text style={styles.qualTitle}>{q.title}</Text>
            {q.detail ? <Text style={styles.qualDetail}>{q.detail}</Text> : null}
          </View>
          {q.badge ? (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{q.badge}</Text>
            </View>
          ) : null}
        </View>
      ))}
    </View>
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
  tags = [],
  details = [],
}: {
  chips: ChipItem[];
  rows?: ChipItem[];
  rowsTitle?: string;
  kicker?: string;
  /** Short items shown as light pills under the title (e.g. what they're experienced with). */
  tags?: string[];
  /** Logistics rows at the end of the same card (practice, sessions, billing), after a divider. */
  details?: ChipItem[];
}) {
  return (
    <View style={styles.card}>
      {kicker ? <Kicker label={kicker} style={styles.kickerChips} /> : null}
      {chips.length > 0 ? (
        // Wraps rather than scrolling sideways, so no chip is ever cut off at the edge.
        <View style={[styles.chips, kicker ? styles.chipsAfterKicker : null]}>
          {chips.map((c) => (
            <View key={`${c.icon}-${c.label}`} style={styles.chip}>
              <Icon name={c.icon} size={18} color={colors.black} />
              <Text style={styles.chipText}>{c.label}</Text>
            </View>
          ))}
        </View>
      ) : null}
      {rowsTitle && (rows.length > 0 || tags.length > 0) ? (
        // First thing in the card: a card title like the others. After chips: a small section label.
        <Text style={chips.length === 0 && !kicker ? styles.cardTitle : styles.rowsTitle}>{rowsTitle}</Text>
      ) : null}
      {tags.length > 0 ? (
        <View style={[styles.tags, styles.tagsInChips]}>
          {tags.map((t) => (
            <View key={t} style={styles.tag}>
              <Text style={styles.tagText}>{t}</Text>
            </View>
          ))}
        </View>
      ) : null}
      {rows.map((r) => (
        <View key={`${r.icon}-${r.label}`} style={styles.row}>
          {/* Fixed size: long text wraps beside it instead of squashing the icon. */}
          <View style={styles.rowIcon}>
            <Icon name={r.icon} size={18} color={colors.black} />
          </View>
          <Text style={[styles.chipText, styles.rowText]}>{r.label}</Text>
        </View>
      ))}
      {details.map((r) => (
        <View key={`${r.icon}-${r.label}`} style={styles.row}>
          <View style={styles.rowIcon}>
            <Icon name={r.icon} size={18} color={colors.black} />
          </View>
          <Text style={[styles.chipText, styles.rowText]}>{r.label}</Text>
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
  tight,
  kicker,
}: { title: string; children: ReactNode; padded?: boolean; /** No like button, so no room kept for it. */ tight?: boolean; kicker?: string } & LikeProps) {
  return (
    <View style={[styles.card, padded && styles.cardPadded, tight && styles.cardTight]}>
      {kicker ? <Kicker label={kicker} /> : null}
      <Text style={[styles.cardTitle, padded && styles.cardTitlePadded]}>{title}</Text>
      {children}
      {onLike ? (
        <View style={styles.like}>
          <LikeButton liked={!!liked} onPress={onLike} label={likeLabel} />
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    marginHorizontal: 12,
    marginTop: 20,
    borderRadius: 16,
    backgroundColor: colors.white,
    overflow: 'hidden',
  },
  cardPadded: { paddingBottom: 60, paddingTop: 30 },
  cardTight: { paddingBottom: 18, paddingTop: 18 },
  cardTitle: { fontFamily: fonts.medium, fontSize: 16, color: colors.black, margin: 15 },
  cardTitlePadded: { marginTop: 0 },
  photo: { width: '100%', height: 370 },
  answer: {
    fontFamily: fonts.serifSemiBold,
    fontSize: 30,
    lineHeight: 38,
    color: colors.black,
    marginHorizontal: 15,
  },
  like: { position: 'absolute', right: 15, bottom: 15 },
  likeTop: { position: 'absolute', right: 15, top: 15 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', rowGap: 12, columnGap: 22, paddingHorizontal: 24, paddingVertical: 18 },
  chip: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  chipDivider: { borderLeftWidth: 1, borderLeftColor: colors.chip },
  chipText: { fontFamily: fonts.medium, fontSize: 16, color: colors.black },
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
  textCard: { paddingTop: 18, paddingBottom: 10 },
  more: { alignSelf: 'flex-start', minWidth: 44, minHeight: 44, justifyContent: 'center', marginHorizontal: 15, marginTop: 4 },
  moreText: { fontFamily: fonts.bold, fontSize: 16, color: colors.purpleText },
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
  noteTitle: { fontFamily: fonts.bold, fontSize: 14, letterSpacing: 0.3, color: colors.black, marginBottom: 6 },
  noteBody: { fontFamily: fonts.regular, fontSize: 16, lineHeight: 22, color: colors.black },
  qual: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    paddingHorizontal: 29,
    paddingVertical: 14,
    borderTopWidth: 1,
    borderTopColor: colors.background,
  },
  qualFirst: { borderTopWidth: 0, paddingTop: 12 },
  qualText: { flex: 1, gap: 2 },
  qualTitle: { fontFamily: fonts.medium, fontSize: 16, lineHeight: 20, color: colors.black },
  qualDetail: { fontFamily: fonts.regular, fontSize: 14, color: colors.muted },
  badge: { borderWidth: 1, borderColor: colors.black, borderRadius: 30, paddingHorizontal: 8, paddingVertical: 2, marginTop: 1 },
  badgeText: { fontFamily: fonts.bold, fontSize: 11, color: colors.black },
  tags: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginHorizontal: 15 },
  tagsInChips: { marginHorizontal: 24, marginBottom: 16, marginTop: 4 },
  tag: { maxWidth: '100%', backgroundColor: colors.background, borderRadius: 30, paddingHorizontal: 12, paddingVertical: 7 },
  tagText: { fontFamily: fonts.medium, fontSize: 14, color: colors.black },
  body: { fontFamily: fonts.regular, fontSize: 16, lineHeight: 24, color: colors.black, marginHorizontal: 15 },
  rowIcon: { width: 18, height: 18, flexShrink: 0, marginTop: 1 },
  rowText: { flex: 1, lineHeight: 20 },
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    paddingHorizontal: 29,
    paddingVertical: 16,
    borderTopWidth: 1,
    borderTopColor: colors.background,
  },
});
