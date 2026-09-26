import type { Caveat, Clinician, Match } from '@/features/match/types';
import { Appear } from './motion';
import { ChipItem, ChipsCard, NoteCard, PhotoCard, PromptCard, TagsCard } from './cards';

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

/** "Ashgrove, Brisbane", or just "Perth" when the suburb is the city. */
export const placeName = (c: Clinician) => (c.suburb === c.city ? c.city : `${c.suburb}, ${c.city}`);

export const placeLine = (c: Clinician) => `${c.role} · ${placeName(c)}`;

const CAVEAT_TEXT: Record<Caveat, string> = {
  fee_unpublished: "The out-of-pocket cost isn't published, so it can't be checked against your budget. Ask the practice.",
  weekend_hours_unpublished: "Weekend hours aren't published. Ask the practice.",
};

/** "WHY THEY FIT · 1 OF 3" over each reason, so the reasons read as one numbered section. */
export const reasonKicker = (i: number, n: number) => (n > 1 ? `Why they fit · ${i + 1} of ${n}` : 'Why they fit');

export const caveatLines = (m: Match) => (m.caveats ?? []).map((c) => CAVEAT_TEXT[c]);

// A match in the Discover card layout, content in PRD §34 priority order:
// who → why they fit (max 3) → practical details + experience → how they practise.
export function ClinicianCards({ clinician: c, match, onOpen, onSave, saved }: Props) {
  const like = {
    onLike: onSave,
    liked: saved,
    likeLabel: saved ? `Saved ${c.firstName}` : `Save ${c.firstName}`,
  };
  let i = 0;
  const step = () => i++;
  return (
    <>
      <Appear index={step()}>
        <PhotoCard
          caption={placeLine(c)}
          source={c.photo}
          onPress={onOpen}
          accessibilityLabel={`View ${c.firstName}`}
          {...like}
        />
      </Appear>
      {match.reasons.slice(0, 3).map((r, n, all) => (
        <Appear key={r.evidenceId} index={step()}>
          <PromptCard kicker={reasonKicker(n, all.length)} title={r.signal} answer={r.evidence} {...like} />
        </Appear>
      ))}
      {caveatLines(match).map((line) => (
        <Appear key={line} index={step()}>
          <NoteCard title="Worth checking" body={line} />
        </Appear>
      ))}
      <Appear index={step()}>
        <ChipsCard
          kicker="The practicals"
          chips={practicalChips(c)}
          rowsTitle="Particularly experienced with"
          rows={c.experiencedWith.slice(0, 4).map((area) => ({ icon: 'icCheck', label: area }))}
        />
      </Appear>
      <Appear index={step()}>
        <TagsCard kicker="How they practise" title={`How ${c.firstName} works`} tags={c.practiceStyle.slice(0, 5)} {...like} />
      </Appear>
    </>
  );
}
