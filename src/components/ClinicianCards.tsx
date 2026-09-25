import type { Caveat, Clinician, Match } from '@/features/match/types';
import { ChipItem, ChipsCard, PhotoCard, PromptCard, TextCard } from './cards';

type Props = {
  clinician: Clinician;
  match: Match;
  onOpen?: () => void;
  onSave?: () => void;
  saved?: boolean;
};

/** Cost as published: never a guessed number (unpublished fees read "Fee on request"). */
export function costLabel(c: Clinician) {
  const { fee, gapAfterMedicare: gap } = c.practical;
  if (gap === 0) return 'Bulk billed';
  if (fee !== null && gap !== null) return fee === gap ? `$${fee}, no rebate` : `$${gap} after rebate`;
  if (fee !== null) return `$${fee} a session`;
  return 'Fee on request';
}

export function practicalChips(c: Clinician): ChipItem[] {
  const p = c.practical;
  const chips: ChipItem[] = [];
  if (p.nextAvailableShort !== 'Book online') chips.push({ icon: 'icCalendar', label: p.nextAvailableShort });
  chips.push({ icon: 'icCost', label: costLabel(c) });
  if (p.modes.includes('Telehealth')) chips.push({ icon: 'icVideo', label: 'Telehealth' });
  if (p.modes.includes('In person')) chips.push({ icon: 'icLocation', label: c.suburb });
  return chips;
}

export const placeLine = (c: Clinician) => `${c.role} · ${c.suburb}, ${c.city}`;

const CAVEAT_TEXT: Record<Caveat, string> = {
  fee_unpublished: "The out-of-pocket cost isn't published, so it can't be checked against your budget. Ask the practice.",
  weekend_hours_unpublished: "Weekend hours aren't published. Ask the practice.",
};

export const caveatLines = (m: Match) => (m.caveats ?? []).map((c) => CAVEAT_TEXT[c]);

/** Shown instead of reasons when nothing the patient said matches a specific part of the profile. */
export const noReasonLine = (c: Clinician) =>
  `Nothing you've mentioned matches a specific part of ${c.firstName}'s profile yet, but ${c.firstName} meets your requirements.`;

// A match in the Discover card layout, content in PRD §34 priority order:
// who → why they fit (max 3) → practical details + experience → how they practise.
export function ClinicianCards({ clinician: c, match, onOpen, onSave, saved }: Props) {
  const like = {
    onLike: onSave,
    liked: saved,
    likeLabel: saved ? `Saved ${c.firstName}` : `Save ${c.firstName}`,
  };
  return (
    <>
      <PhotoCard
        caption={placeLine(c)}
        source={c.photo}
        onPress={onOpen}
        accessibilityLabel={`View ${c.firstName}`}
        {...like}
      />
      {match.reasons.length > 0 ? (
        match.reasons.slice(0, 3).map((r) => <PromptCard key={r.evidenceId} title={r.signal} answer={r.evidence} {...like} />)
      ) : (
        <TextCard title="Why they're here" body={noReasonLine(c)} />
      )}
      {caveatLines(match).map((line) => (
        <TextCard key={line} title="Worth checking" body={line} />
      ))}
      <ChipsCard
        chips={practicalChips(c)}
        rowsTitle="Particularly experienced with"
        rows={c.experiencedWith.slice(0, 4).map((area) => ({ icon: 'icCheck', label: area }))}
      />
      <PromptCard title={`How ${c.firstName} practises`} answer={c.practiceStyle.slice(0, 5).join(' · ')} {...like} />
    </>
  );
}
