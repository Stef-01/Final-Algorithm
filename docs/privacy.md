# Privacy review (Phase 7)

What WATL does with what a patient tells it, as the code stands. Written for a reviewer, not for patients. Items marked **Open** need a decision before real users.

## What is collected

| Data | Where it goes | How long | Code |
|---|---|---|---|
| What the patient types or says, answers, refinements | The device only (`AsyncStorage`, key `watl_session`) | Discarded on load after 24 hours; **Start over** in Settings clears it at once | `src/features/match/session.tsx` |
| Saved clinicians (ids only) | The device only (`watl_saved`) | Until removed | `src/features/match/saved.tsx` |
| Typed text, when Claude is on | Sent to `/api/extract`, then to Anthropic's API, to be read into signals | Not stored or logged by WATL. Anthropic's retention applies (see Open 1) | `api/extract.ts`, `server/claude/extract.ts` |
| Voice | The browser's speech service transcribes it (in Chrome, audio goes to Google). WATL receives only the text | Not stored by WATL | `src/features/voice/` (decision D7) |
| Analytics events | Vercel Web Analytics | Vercel's retention | `src/lib/analytics.ts` |

## What never leaves the device

- **Analytics carry no patient words.** `track()` keeps only numbers, booleans and short identifiers matching `^[\w\- ]+$` (≤ 48 characters): question ids, clinician ids, fit labels. A test sends a demo patient's whole journey and checks that no word of their description appears in any event (`__tests__/analytics.test.tsx`).
- **Demo patients and assistant chips** are scripted, so they never call Claude.
- **Clinician interview excerpts** stay on the server side of the engine; the app only receives reviewed patient-facing lines (`runMatching` strips everything else, and a property test checks no `excerpt` field reaches a result).

## Claude (Phase 8)

- **Off unless configured.** `GET /api/extract` reports whether it's on. Settings shows which reader is in use, and the Privacy line says words are sent to Anthropic's API when it is.
- **Minimal payload.** Only the message text (capped at 2,000 characters) and the chosen profession are sent. No identifiers, no session history, no location.
- **No logging.** The function logs only a failure reason (e.g. `api 429`), never the text.
- **Fails closed to the device.** Any error returns 503, and the app falls back to on-device keyword matching.

## Open

1. **Anthropic data retention.** Confirm the organisation's API data-retention settings (and whether zero data retention is needed) before real patients use it. Health information is sensitive under the Australian Privacy Act (APP 3, APP 11).
2. **Consent wording.** When Claude is on, the describe screen and Settings both say that what patients write is read by Claude (Anthropic) and not stored by WATL. Whether that notice is enough, or explicit consent is needed, depends on legal advice.
3. **Voice.** Browser transcription sends audio to the browser vendor. Decision D7 accepted this for the prototype, with a notice on screen. A WATL-controlled service is needed before launch.
4. **Real clinicians.** Profiles come from the ADHDme network's published pages. Their consent to being matched and quoted in WATL still needs confirming.
5. **Feedback storage.** Ratings and thumbs currently go only to analytics (as numbers). If `/api/feedback` stores them server-side later, it needs its own retention rule.
