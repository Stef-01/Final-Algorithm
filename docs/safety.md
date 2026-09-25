# Safety checklist (Phase 7)

WATL finds clinicians; it doesn't give medical advice. This is what protects a patient who needs urgent help, what's tested, and what a **clinical advisor must review** before real users.

## The safety pause

- **When:** urgent wording anywhere the patient writes: the description, an answer in their own words, or a message to the assistant.
- **What it shows:** a pause screen (`src/app/safety.tsx`) with 000 for emergencies and Lifeline 13 11 14 for suicide or self-harm, before any matching continues. The patient can then go back or continue their search.
- **How it's detected:**
  - The on-device keyword list, `URGENT` in `src/features/match/extract.ts`. It's deliberately broad and has no negation handling: over-pausing costs a tap, missing someone doesn't bear thinking about.
  - When Claude is on, its reading can also flag urgency (`urgent: true`). Either one is enough, since `withKeywordExtras` keeps the keyword flag even if Claude missed it.
- **Help is always reachable** from Settings → Help and safety.

## Tested

- Urgent wording in a description, in the assistant, and in Claude's path goes to `/safety` (`__tests__/refine.test.ts`, `__tests__/claude.test.ts`, the `either-urgent` demo).
- Eval cases: chest pain, self-harm, "want to die", "ending it all", "no reason to live", "hurting myself". Plus a false-alarm check ("deadlines are killing me") so the list stays usable (`evals/extraction.json`).
- The engine never asks a follow-up or shows matches before the pause is acknowledged (`decide()` returns `safety` first).

## Other safeguards

- **No diagnosis or advice.** Claude's instructions forbid diagnosing, advising or recommending. It only records what the patient asked for, and the engine ranks with fixed rules.
- **Honest labels.** A clinician with no evidence-backed reason is "Possible fit", never higher. Checked over 750 random patients per pool (`__tests__/engine.property.test.ts`).
- **Medical questions get an honest answer, not advice.** Ask the assistant about medication, doses, side effects, diagnosis or "is this normal", and it says it can't give medical advice and offers to find a clinician. The list is left untouched, and a condition named in the question isn't silently added to the search. A question alongside a real change ("…also online only") gets both. Checked against 50 red-team prompts, including "ignore your rules" and "pretend you're my doctor", plus 12 ordinary requests that must not be refused (`evals/redteam.json`, `__tests__/redteam.test.ts`).
- **The assistant never overclaims.** Replies are built from what actually changed. If Claude-worded replies are switched on (`WATL_CLAUDE_REPLIES=on`), Claude only rewords those facts. Its reply is discarded unless it keeps the count and first name, with no advice, medication, praise or exclamation marks, and medical questions never reach it (`server/claude/reply.ts`, `__tests__/reply.test.ts`). It says "No one fits once I add …" instead of silently emptying the list, and carries a "doesn't give medical advice" line.
- **Unknowns are flagged, not hidden.** An unpublished fee or weekend hours is shown as "Worth checking".

## For the clinical advisor

1. Review the `URGENT` list and the pause wording, numbers and tone. Is "Continue my search" appropriate after an urgent flag, or should some flags (suicidal intent) block continuing?
2. Decide whether "concern" (non-urgent) signals such as hopelessness should show a softer support line on the results screen.
3. Review Claude's `urgent` instruction in `server/claude/extract.ts` (`SYSTEM`).
4. Confirm the services listed are right for every region WATL will serve (currently Australian numbers only).
5. Sign off on the assistant's disclaimer and the match-page copy rules (`BANNED_ADJECTIVES`, `copyProblems` in `server/engine/explain.ts`).
