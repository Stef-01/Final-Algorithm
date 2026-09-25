# WATL Clinician Fit — build plan

**Source:** `clinician_fit_prototype_PRD_v0.2.md` ("ADHDme Clinician Fit"). The product is called **WATL** throughout.
**Starting point:** this repo — the Expo Router (React Native + web) app deployed on Vercel.
**Goal:** turn the dating-app shell into the clinician-matching prototype the PRD describes. Talk for about 60 seconds, answer 0–3 useful questions, see up to 3 clinicians with reasons, then book.

---

## 1. Ground rules for this conversion

**We take the PRD's functionality. We keep the current app's look and the way it presents a match.**

| Taken from the PRD (functional) | Ignored from the PRD (aesthetic / presentation) |
| --- | --- |
| Conversational intake (voice + text), agent decision policy, information-gain questioning, 3-question ceiling, stopping rule | §36 colour, §37 typography, §38 layout grid and spacing, §39 component sizes, §40 motion list |
| Hard-constraint eligibility, 4-layer matching, fit labels (Strong / Good / Worth considering), max 3 matches, diversity rule | §29–30 card layout (one card with next card peeking, photo at 40% of the card, stacked practical strip) |
| Evidence-grounded explanations, banned unsupported adjectives, "no winner language", no fake precision | §33 detail-page visual layout, §51 Figma frame styling |
| Clinician onboarding interview → phenotype with evidence, reviewer status, confidence threshold | "Find a GP who fits you" hero styling, mic button styling |
| No account wall, empty states, insufficient-supply handling, safety boundary, privacy, accessibility, performance, analytics events, validation metrics | |

**What "keep the existing matching UI" means in practice:** a matched clinician is shown the way Discover shows a person today. That's the `ScreenHeader` with the name, a scrolling column of white cards on the grey background (photo cards with a caption, prompt cards with a small title and a large serif answer, and the horizontal vitals chip row), a like button on each card, and the floating pass (✕) button. Questions use the current sign-up scaffold: circled icon, serif question, grey `ChoicePill` answers, and the round next button. Popups use the existing `Sheet`. The theme (`src/lib/theme.ts`), fonts, `WatlLogo`, and icon set stay as they are.

Where a PRD rule is about *behaviour* but touches presentation (for example "max 3 reasons", "why it fits comes first"), we keep the behaviour and express it with existing components. See §3.

---

## 2. Screen map: PRD screens → existing shell patterns

| PRD screen | Route | Built from | Notes |
| --- | --- | --- | --- |
| 01 Open conversation | `/` | `OnboardingStep` scaffold | Serif question "What are you hoping a new GP will be better at for you?". Big mic control (new `MicButton`, drawn in the existing circled-icon style) plus "or type" (`TextInput` like the name/email steps). "Takes about a minute" as the small note text. The welcome video screen and sign-up links go. |
| 02 Listening | `/` (state) | same | Live transcript as normal paragraph text above the mic. **Done** (round next button) and **Cancel** (text button). Tap transcript to edit. |
| 03/04 Adaptive clarification | `/clarify` | `OnboardingStep` + `ChoicePill` | One-sentence acknowledgement in the note style, the question as the serif title, 2–4 `ChoicePill`s, plus "Explain in your own words" (mic/text). Tapping a pill advances immediately; no next button. The progress dots show "Finding your fit", not a step count. |
| 05 Preference confirmation (conditional) | `/confirm` | `OnboardingStep` + pills | "Here's what seems to matter most." Up to 5 pills (tap to remove or correct), "Anything wrong?" note, **Find my matches** as the one filled button, **Edit** as text. Skipped when confidence is high. |
| 06 Matching | `/matching` | `OnboardingStep`-style centred state | "Finding your best fits…" with checkmarks tied to real pipeline steps. Skipped if results come back in under ~300 ms. |
| 07–09 Top matches | `/matches` | **Discover screen as it is today** | Header: clinician name + fit label. Body: `ProfileCards`-style column (§3). ✕ = **Next match**, ♥ = interested/save. Sub-header line: "I found 3 clinicians I'd start with. Each fits for slightly different reasons." After the last match: "See more options" (explicit request only). |
| 10 Clinician detail | `/clinician/[id]` | Profile "View" screen style + `Sheet`-style sticky CTA | Same card language, with deeper layers (bio, credentials, full practical details). Sticky **Book with Amy** (purple pill), **See next match** as text. |
| 11 No strong match | `/matches` (state) | Standouts empty-state card ("Fresh out of Standouts!") | "I don't have a strong enough match yet." One action: **Answer one more question** / **Expand distance** / **Include telehealth**. |
| Safety pause (§44) | `/safety` | `Sheet` | Pauses matching and shows the safety message plus urgent-help options before the user can continue. |

**Navigation (decided):** we keep the shell's dark bottom tab bar with three tabs:
- **Find** (the WATL "W" logo icon): the whole matching flow above, as a stack inside the tab, at `/`, `/clarify`, `/confirm`, `/matching` and `/matches`.
- **Saved** (heart): clinicians you've hearted, stored on the device.
- **Settings** (person): start over, how matching works, privacy, help and safety.

Clinician detail (`/clinician/[id]`) and the safety sheet (`/safety`) open above the tabs. This deliberately departs from the PRD's no-tab-bar rule (§4.11, §41); inside Find it's still one continuous task.

---

## 3. How a clinician match renders (existing Discover layout, new content)

Discover currently renders: photo → prompt → photo → vitals → photo → prompt → photo → prompt → photo → photo. For a clinician, the same components show the PRD content in PRD priority order (§34: why it fits → clinical relevance → practice style → availability → cost → location → bio → credentials):

| Position | Component (existing) | Clinician content |
| --- | --- | --- |
| Header | `ScreenHeader` title | "Dr Amy Chen", with the fit label as a small pill after the name (reusing the "Just Joined" badge style). The overflow ⋮ opens "Why am I seeing this?" (a `Sheet` explaining how matching works). |
| 1 | Photo card | Clinician headshot. Caption = role and location ("GP · Brisbane"). |
| 2–4 | Prompt cards ×3 (max) | **Why this fits.** Card title = the patient signal ("You said rushed appointments haven't worked for you."). Big serif answer = the clinician's evidence-backed behaviour ("Amy books longer first consultations and leaves time at the end to agree on next steps."). One card per reason, never more than 3. |
| 5 | Vitals card | Chip row = practical strip: next available · gap after Medicare · telehealth / in person · distance. Rows = "Particularly experienced with" (max 4, e.g. ADHD, sleep, mental health). |
| 6 | Prompt card | **How they practise.** Title "How Amy practises". Answer = up to 5 behaviours joined as a short line ("Collaborative · Direct · Longer first visits"). |
| 7 | Photo card (optional) | Clinic photo, if we have one. Caption = practice name. |
| Card actions | ♥ on each card | Save interest (`clinician_saved`); on the detail screen, the sticky button books. |
| Floating ✕ | Pass button | **Next match** (`next_match_viewed`). After match 3, show the end card. |
| Tap anywhere on the name/photo | — | Opens `/clinician/[id]` (`clinician_viewed`). |

The like/pass behaviour already works this way in `src/app/(tabs)/discover.tsx`. We keep the mechanics and change the data source from `discoverQueue` to the ranked match list.

---

## 4. Architecture

```
Expo app (web first, native still builds)
  src/app/…                 screens (routes above)
  src/features/match/
    session.tsx             MatchSession provider: state machine + persistence
    api.ts                  typed client for /api/*
  src/features/voice/       useSpeechToText() — Web Speech API on web; native later
  src/lib/analytics.ts      track(event, props) → Vercel Analytics custom events

Vercel Functions (Node, TypeScript)  /api/*
  POST /api/turn            one agent turn: extract → rank → pick question or stop
  POST /api/matches         final ranking + explanations for the current session
  POST /api/feedback        1–5 credibility rating, thumbs up/down
  (no clinician-facing API in the prototype)

server/ (shared by the functions; pure TypeScript, unit-tested)
  engine/eligibility.ts     Layer 1 hard constraints
  engine/score.ts           Layers 2–4 scoring
  engine/infoGain.ts        question selection + stopping rule
  engine/diversity.ts       top-3 selection
  engine/explain.ts         templated, evidence-grounded reasons
  llm/extract.ts            patient text → PatientSignals (Claude, structured output)
  llm/safety.ts             urgent-concern classifier (runs with extraction)
  data/clinicians/*.json    reviewed clinician records (seed)
  questions.ts              curated behavioural question bank

scripts/
  ingest-interview.ts       clinician interview transcript → draft phenotype + evidence
  review-clinician.ts       approve or reject each trait (sets reviewerStatus)
```

**Why this split:**
- **The LLM only reads the patient's words.** It turns free text into structured signals. Ranking, question choice, stopping, and fit labels are deterministic code, so they're fast, testable, and can't hallucinate a clinician trait.
- **Explanations are templated from reviewed evidence** (§6). The LLM may lightly smooth the patient-signal wording, but it never invents clinician behaviour.
- **Vercel Functions** keep the API key server-side. `vercel.json`'s SPA rewrite changes to `"/((?!api/).*)"` so `/api/*` isn't sent to `index.html`.
- **Models:** runtime extraction must fit the <3 s budget, so use a fast model (Claude Sonnet 5, or Haiku 4.5 if latency requires it). Offline interview → phenotype extraction can use Claude Opus 5.5. Check latency and cost with the `claude-api` reference before locking these in. `ANTHROPIC_API_KEY` goes in Vercel environment variables (you add it; I won't handle the key).

### Session state machine (`src/features/match/session.tsx`)

```
open → listening → reviewing_transcript
     → thinking ──┬─→ clarify (≤3, more only under §4.4 exceptions) → thinking
                  ├─→ confirm_constraint → thinking
                  ├─→ confirm_preferences → matching
                  ├─→ safety_pause → (resume) thinking
                  └─→ matching → results | no_strong_match | partial_results (1–2)
results → detail → booking_handoff
```

- State is kept in `sessionStorage` (web) / AsyncStorage (native), so a refresh doesn't lose the conversation. It's cleared on "Start over". Only the minimum is retained (§9).
- Browser back steps back through the state history (previous question), not out of the app.
- There's no account. The current `ProfileProvider`, sign-in switch, and all sign-up screens are removed (§4.12).

---

## 5. Data model

```ts
// Patient side — produced by llm/extract.ts, merged across turns
type Confidence = 'low' | 'medium' | 'high';

type PatientSignals = {
  clinicalNeeds: { area: string; confidence: Confidence; quote?: string }[];   // e.g. adult ADHD, sleep
  preferences: Partial<Record<Dimension, { value: string; confidence: Confidence; quote?: string }>>;
  negativeExperiences: { text: string; relatesTo: Dimension[] }[];               // "appointments feel rushed"
  constraints: Partial<HardConstraints>;                                          // only what's known
  complexity?: 'single' | 'multiple' | 'complex';
  safetyFlag?: { level: 'urgent' | 'concern'; reason: string };
};

type Dimension =                          // PRD §21 layer 3 + §24 interview domains
  | 'shared_decision_making' | 'communication_directness' | 'explanation_depth'
  | 'consultation_pace' | 'diagnostic_style' | 'investigation_threshold'
  | 'medication_philosophy' | 'lifestyle_integration' | 'mental_health_integration'
  | 'care_coordination' | 'uncertainty_tolerance' | 'patient_autonomy'
  | 'continuity' | 'follow_up_intensity';

type HardConstraints = {
  location: { suburb?: string; maxKm?: number };
  telehealthOk: boolean; inPersonRequired: boolean;
  maxGap?: number; billing?: 'bulk_only' | 'any';
  clinicianGender?: 'female' | 'male';     // only when the patient explicitly asks
  accessibility?: string[]; age: number | null;
};

// Clinician side — reviewed JSON records
type Clinician = {
  id: string; name: string; role: 'GP'; location: { suburb: string; lat: number; lng: number };
  photo: string; clinicPhoto?: string; bio: string; credentials: string[];
  bookingUrl: string;                                                    // external handoff
  practical: { nextAvailable: string; modes: ('in_person' | 'telehealth')[];
               fee: number; gapAfterMedicare: number; newPatients: boolean;
               ageRange: [number, number]; languages: string[]; accessibility: string[];
               gender: 'female' | 'male' | 'nonbinary'; initialConsultMins: number };
  expertise: { area: string; level: 'particular' | 'general'; evidenceIds: string[] }[];
  phenotype: Partial<Record<Dimension, { value: string; confidence: Confidence; evidenceIds: string[] }>>;
  evidence: Evidence[];
};

type Evidence = {
  id: string; trait: Dimension | 'expertise';
  excerpt: string;          // interview excerpt — internal only, never sent to the client (§45)
  patientFacing: string;    // reviewed one-liner used in explanations
  scenario: string; timestamp: string;
  confidence: Confidence; reviewerStatus: 'draft' | 'approved' | 'rejected';
};
```

**API responses never include `excerpt`, raw confidence values, or scores.** They include only fit labels and approved `patientFacing` lines.

---

## 6. Matching engine and agent policy

### 6.1 Each turn (`POST /api/turn`) — PRD §11

1. **Extract.** Claude, with a strict JSON schema, turns the new text into a `PatientSignals` delta, merged with previous turns. The safety check runs in the same call.
2. **Safety gate.** If `safetyFlag.level === 'urgent'`, return `safety_pause` immediately.
3. **Rank.** Eligibility filter, then scoring (§6.2) → provisional ranking.
4. **Find uncertainty.** Compute an information-gain score for each candidate question (§6.3).
5. **Decide exactly one:** ask a follow-up · confirm a hard constraint · show the preference confirmation · stop and match.

The response carries: the acknowledgement (≤1 sentence), the next step, and the question with options if there is one. Copy comes from the curated question bank, not free LLM text.

### 6.2 Scoring — PRD §21

- **Layer 1, eligibility:** drop clinicians who fail any *known* hard constraint (new patients, age range, mode, distance, gap ceiling, explicit gender request, accessibility). Unknown constraints aren't assumed.
- **Layer 2, clinical relevance:** overlap of `clinicalNeeds` with `expertise` (particular > general), weighted by complexity.
- **Layer 3, practice compatibility:** per dimension, `match(patientPref, clinicianValue) × weight(dimension) × confidence(patient) × confidence(clinician)`. Only `approved` clinician traits at medium confidence or higher count.
- **Layer 4, practical:** small adjustments for availability, travel, telehealth, price, and appointment length.
- **Fit label** from the combined score, using thresholds set and tuned on the seed data: **Strong fit / Good fit / Worth considering**. Anything below "Worth considering" is never shown (§42). No numbers reach the client (§4.6).

### 6.3 Question selection — PRD §12–15, §20

- **Question bank** (`server/questions.ts`): each question targets one dimension or constraint. Each has a behavioural wording (§15), 2–4 short options (2–6 words each), and a "Not sure" option. Examples are the PRD's "When there are several reasonable options, what do you prefer?" and the out-of-pocket cost question.
- **Information gain** for question *q*: `Σ_answers p(answer) × Δtop3(answer) × importance(dimension) × uncertainty(dimension)`. `Δtop3` is how much the top 3 changes (membership and order) when the answer is simulated through the scorer. `p(answer)` is uniform to start.
- Skip questions whose answer is already inferable (the patient-signal confidence is high).
- **Constraint questions** follow the same test. Location is asked only if candidates differ by distance enough to change the top 3, and cost only if a realistic ceiling would remove a meaningful share of the pool (§20).
- **Stop** when the best score falls below τ, or after 3 follow-ups. A 4th question is allowed only for an unresolved hard constraint, safety ambiguity, or when no credible match is possible yet (§4.4).
- **Preference confirmation** (screen 05) shows only when there are ≥3 inferred preferences, at least one is medium or low confidence, and flipping it would change the top 3 (§18).

### 6.4 Top-3 selection — PRD §31, §43

- Slot 1: highest overall.
- Slots 2–3: from candidates within δ of the top score *and* at Good fit or better, prefer ones whose strongest layer differs (clinical expertise vs communication fit). Never lower quality just to add variety.
- Fewer than 3 valid → show only those ("I found 2 clinicians I'd recommend."). None → no-strong-match state.
- "See more options" pages through the next eligible clinicians, still labelled honestly.

### 6.5 Explanations — PRD §4.8–4.9, §26–27, §32

- Each reason = **patient signal** (quote or paraphrase from `PatientSignals`) + **clinician evidence** (`patientFacing` of an approved evidence item) + the link between them. It renders as prompt-card title + answer (§3).
- Pick the 3 reasons with the highest contribution to that clinician's score, at most one per dimension.
- **Lint rules**, enforced in code and tests:
  - No banned adjectives (caring, compassionate, holistic, warm, patient-centred, thorough, understanding) unless the evidence line itself carries that wording.
  - No winner language (perfect match, best doctor, ideal, number one).
  - No percentages.
  - Every reason must reference a real `evidenceId`.

---

## 7. Voice — PRD §4.10, §9

- **Web (primary):** a `useSpeechToText` hook on the Web Speech API (`SpeechRecognition` / `webkitSpeechRecognition`) with interim results for the live transcript.
  - If the API isn't available (e.g. Firefox), the mic control hides and text is the default. Text is always fully functional.
  - The transcript is editable before submitting. **Done** / **Cancel** only.
  - A clear note says voice is being transcribed. Auto-stop after silence and at a hard cap of ~90 s.
  - WATL doesn't store audio; only the submitted text is sent to WATL's API. **Note:** in Chrome (and some other browsers), the Web Speech API sends audio to the browser vendor's speech service. Safari can recognise on-device for some languages. The transcription notice must say this plainly. If that's not acceptable, swap in a server-side transcription service WATL controls (decision D7).
- **Native (later):** a speech recognition module needs a dev build. Out of scope for the web prototype, but the hook interface stays the same.
- **Latency:** interim results are local, so this meets the <500 ms perceived-transcript target on supported browsers.

---

## 8. Clinician data and onboarding pipeline — PRD §22–26

No clinician dashboard (non-goal). The prototype uses scripts and JSON files:

1. **Interview guide** (`docs/clinician-interview.md`): behavioural scenarios across the 20 domains in §24. No self-ratings.
2. **`scripts/ingest-interview.ts`:** takes a transcript plus optional bio, website text, and service list. Claude drafts `phenotype` + `expertise` + `evidence[]`, and each trait carries its excerpt, scenario and confidence. Everything starts as `reviewerStatus: 'draft'`.
3. **`scripts/review-clinician.ts`:** an interactive CLI to approve, edit or reject each trait and write the `patientFacing` line. Only approved traits reach patients.
4. **Seed set for testing:** 10–15 **fictional** clinician records in one region (the PRD implies Brisbane), with varied phenotypes. At least one should match the demo script in §52 ("Dr Amy Chen"), and there should be clear contrasts so the diversity and empty-state rules can be exercised. Photos must be licensed or generated headshots that clearly aren't real clinicians. **Real clinicians can come in only after interviews and their consent.**

---

## 9. Safety, privacy, accessibility, performance

**Safety (§44):**
- The system prompt and question bank are limited to preferences, appointment style, care goals, and practical needs. No diagnosis, medication advice, triage, or treatment recommendations.
- An urgent concern flag triggers the `/safety` sheet, which pauses matching and shows emergency and crisis options before offering "Continue finding a GP". For Australia that means 000 and a crisis line; confirm the exact wording and numbers with a clinical advisor.
- An output check on every agent string blocks medical advice.

**Privacy (§45):**
- Transcription notice on the open screen.
- Nothing recorded beyond the session; WATL never stores audio (see the browser speech-service caveat in §7).
- "Delete what I said" before submitting.
- Server logs strip free text.
- Clinician excerpts never leave the server.
- Analytics events carry no free text or health data.
- The matching session in storage is cleared on start over and expires after 24 h.

**Accessibility (§46):** 44 px tap targets (the existing pills and round buttons already meet this), screen-reader labels on every control, full keyboard flow on web, text alternative to voice, the transcript visible as captions, fit labels always in text (never colour alone), and `prefers-reduced-motion` respected for the mic pulse.

**Performance (§47):**
- Initial load under 2 s: after removing the dating assets and the 2.4 MB background video, the bundle should drop, and this gets measured on Vercel.
- UI transitions under 300 ms.
- `/api/turn` + `/api/matches` under 3 s at p75, measured in logs.
- The matching screen shows only real pipeline steps.

---

## 10. Analytics and validation — PRD §48–50

- **`src/lib/analytics.ts`:** `track()` wrapper over `@vercel/analytics`, with exactly the PRD events: `matching_started`, `voice_started`, `voice_completed`, `text_submitted`, `followup_asked`, `followup_answered`, `matching_completed`, `clinician_viewed`, `next_match_viewed`, `booking_clicked`, `match_feedback_positive`, `match_feedback_negative`.
  - Properties are limited to non-sensitive values: follow-up count, dimension asked, time to shortlist, number of matches shown, fit label. No free text.
  - **Check:** Vercel custom events may need a paid plan. If they're unavailable, keep the same wrapper and send to PostHog instead.
  - Page views keep working as they do now.
- **In-app validation:**
  - After the first match is viewed, a one-question sheet: "How well do these clinicians seem to fit what you told us?" (1–5), stored via `/api/feedback`.
  - Thumbs up/down on each match.
- **Moderated-test script** (`docs/user-testing.md`): the comprehension question, the choice-confidence question, and the "rather start with these or search 30?" question, plus targets (≥4/5 credibility, <90 s to shortlist, median ≤2 follow-ups, ≥80% choice confidence).
- **Derived metrics:** time to shortlist (`matching_started` → `matching_completed`) and follow-up burden (count of `followup_asked`) are computed from events.
- The long-term continuity metric (§50) is out of scope for the prototype. The booking handoff records `booking_clicked` with clinician id only, so outcome data can be joined later.

---

## 11. Codebase changes

**Keep as is:** Expo Router setup, `TabBar` (three tabs: Find / Saved / Settings), `src/lib/theme.ts`, fonts, `WatlLogo`, `Icon` + `icons.ts`, `ScreenHeader`, `Sheet` + `PillButton`, `ChoicePill` + `OnboardingStep` (renamed `ConversationStep`), the `ProfileCards` card primitives (now `src/components/cards.tsx`), `VercelAnalytics`, Jest / CI / Vercel config.

**Repurpose:**
- `src/app/(tabs)/discover.tsx` → `src/app/matches.tsx`: same layout and like/pass mechanics, fed by the match list.
- `ProfileCards.tsx` → `ClinicianCards.tsx`: same `Card` / `Vitals` components, new content mapping (§3). Card primitives go into `src/components/cards.tsx` so both can share them.
- `OnboardingStep.tsx` → `ConversationStep.tsx`: plus a mic slot and an "Explain in your own words" slot.
- The Standouts empty-state card → a reusable `EmptyStateCard` for no-strong-match.
- `profile/view.tsx` layout → `clinician/[id].tsx`.

**Remove:**
- **Screens:** all sign-up (`onboarding/*`), the dating tabs (`standouts`, `likes`, `(tabs)/matches`, `discover`; `settings` is rebuilt), `profile/*`, `account`, `delete-account`, `preferences`, `roses`, `learn-more`.
- **Components and data:** `ProfileTabs`, `PriceOptions`, `src/data/people.ts`, `src/lib/profile.tsx`, `src/lib/config.ts` (the sign-in switch; sign-in no longer exists), `src/lib/age.ts`.
- **Assets:** all dating images (including the celebrity photos and Android images), the paywall illustrations, and the background video.
- **Tests:** the related tests, replaced by the new ones.

**Repo hygiene:** move `legacy-android/` out of `main` (tag `legacy-android` first so it's recoverable). Update `README.md`.

---

## 12. Phased delivery

Each phase ends deployed on Vercel with CI green.

| Phase | Scope | Done when |
| --- | --- | --- |
| **0. Clean slate** ✅ done | Remove the dating features and assets (§11); rebuild the tab bar as Find / Saved / Settings. Tag the legacy code. New route skeleton with placeholder screens in the existing style. | App opens on `/` (Find tab) with no sign-in; tabs are Find / Saved / Settings; bundle size and load time recorded; CI green. |
| **1. UI with fixtures** ✅ done | All screens (§2) wired to a local fixture session: demo patient input (§52), one follow-up, 3 fixture clinicians rendered through `ClinicianCards` in the Discover layout, detail page, no-match, partial results, safety sheet. Text input only. | The PRD demo script runs end to end on Vercel with fixtures; every state reachable; a `/dev/states` page lists every state for review, standing in for the Figma frames in §51. During testing it's on in every build, including Vercel; `EXPO_PUBLIC_DEV_TOOLS=false` hides it. |
| **2. Matching engine** ✅ done | `server/engine/*` + question bank + seed clinician JSON (10–15 fictional). Pure functions with unit tests. | Given hand-written `PatientSignals`, the engine returns the expected top 3, the question to ask, and when to stop; the explanation lints pass; the diversity, partial and empty rules pass. |
| **3. Agent + API** | Vercel Functions `/api/turn`, `/api/matches`, `/api/feedback`; Claude extraction with a JSON schema; safety classifier; SPA rewrite excluding `/api`. Client switches from fixtures to the API. | Real free text produces sensible follow-ups and matches; p75 latency under 3 s; the extraction eval set (§13) meets its threshold; no medical advice in 50 red-team prompts. |
| **4. Voice** | `useSpeechToText` (web), listening state, editable transcript, fallback to text, transcription notice. | Works on iOS Safari and Android Chrome; hidden gracefully elsewhere; text flow unaffected. |
| **5. Clinician pipeline** | Interview guide, `ingest-interview` and `review-clinician` scripts; at least 3 records produced through the pipeline (mock interviews are fine). | A transcript becomes an approved clinician record whose explanations cite real evidence. |
| **6. Instrumentation + validation** | `track()` events, feedback sheet, `/api/feedback` storage (Vercel KV/Postgres or similar), user-testing script. | All 12 events visible in the dashboard (or PostHog); feedback stored; the testing script is ready. |
| **7. Hardening** | Accessibility pass, performance budget, privacy review, safety copy reviewed by a clinical advisor. | WCAG AA checks pass; load under 2 s; the checklist in §9 is signed off. Ready for moderated user testing. |

---

### Phase 2 notes (engine as built)

- **Where:** `server/engine/` (types, eligibility, score, infoGain, diversity, explain, index), `server/questions.ts` (12 behavioural questions), `server/data/clinicians/*.json` (12 fictional seed clinicians), `server/fixtures/signals.ts` (hand-written patient signals, reused as expected outputs for the Phase 3 extraction evals).
- **Tuned values** (all on the seed data; revisit with real clinicians):
  - Layer weights: clinical 0.35, practice 0.5, practical 0.15.
  - Fit thresholds: Strong ≥ 0.74, Good ≥ 0.62, Worth considering ≥ 0.52.
  - Stop threshold τ = 0.10, set so the PRD §52 demo asks one question and stops.
  - Near-tie window for diversity: 0.04, with the same fit label.
- **Constraint answer priors:** bulk-billed-only 20%, in-person-only 20%, weekend-only 10%. This keeps rare hard limits from crowding out preference questions (PRD §20), while still asking when a constraint would change the top 3.
- **"Credible match"** means eligible, above the fit threshold *and* explainable with at least one evidence-backed reason. With too little information, neutral scores can clear the threshold, but nothing gets shown without a reason.
- **Not wired to the app yet.** The app still uses the Phase 1 fixture agent. Phase 3 serves this engine through `/api/turn` and `/api/matches` and switches the client over, including portraits for the eight new seed clinicians.

## 13. Testing strategy

- **Engine unit tests (Jest):**
  - eligibility per constraint;
  - scoring monotonicity;
  - information gain picks the ranking-changing question and skips ones that don't change it;
  - stops at the ceiling;
  - a 4th question only under the exceptions;
  - diversity never demotes quality;
  - partial and empty results;
  - fit label thresholds.
- **Explanation tests:** every reason cites an approved evidence id; banned-word, winner-language and percentage lints; max 3 reasons; the patient signal is present.
- **Copy tests:** acknowledgements and questions are one sentence; options are 2–6 words (the question bank is validated at build time).
- **Extraction evals:** ~30 labelled patient utterances (including the §52 demo and adversarial or safety cases) → expected signals. Run in CI against a recorded fixture, and live on demand with the real model.
- **Screen tests (RNTL + `renderRouter`, as now):** open → clarify → matches with a mocked API, like/pass → next match, detail → booking link, safety pause, no-match actions, text-only path.
- **Asset tests:** keep the existing asset-integrity test, pointed at clinician photos.
- **Live check after each deploy:** the demo script on the Vercel URL at phone size.

---

## 14. Decisions needed and risks

**Decisions (defaults in brackets):**
- **D1 (decided):** keep the shell's tab bar with three tabs: **Find**, **Saved**, **Settings**.
- **D2:** Region and clinician pool for testing. [fictional Brisbane GPs]
- **D3:** Analytics provider for custom events if Vercel's plan doesn't include them. [Vercel if available, else PostHog]
- **D4:** Feedback storage. [Vercel KV]
- **D5:** Keep the native iOS/Android builds working, or go web-only for the prototype? [keep them building, test on web]
- **D7:** Voice transcription: browser speech service (fast, free, but audio goes to the browser vendor in Chrome) or a server-side service WATL controls? [browser for the prototype, with a clear notice]
- **D6:** What does WATL stand for, and is there a tagline for the open screen? [use the PRD's "Find a GP who fits you." with the WATL logo]

**Risks:**
- **Licensing:** the Modern Era / Tiempos fonts are commercial. Keeping the existing style means keeping them, so confirm you have a licence before a public launch.
- **Clinician data quality:** the whole thesis depends on rich, reviewed evidence. Fictional seed data can validate the UX but not the matching claim.
- **Safety:** needs a clinical advisor to review the safety pathway and copy before any real users.
- **Voice:** Web Speech API support varies (strong on Chrome and Safari, absent on Firefox). Text stays first-class.
- **LLM latency and cost** against the <3 s target. Mitigate with a fast model, a small schema, and deterministic ranking.
- **Real-person images:** the current repo has celebrity photos. They're removed in Phase 0 and must never be used as clinicians.
