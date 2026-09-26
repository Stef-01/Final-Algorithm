# Privacy review (Phase 7)

What WATL does with what a patient tells it, as the code stands. Written for a reviewer, not for patients. Items marked **Open** need a decision before real users.

## What is collected

| Data | Where it goes | How long | Code |
|---|---|---|---|
| What the patient types or says, answers, refinements | The device only (`AsyncStorage`, key `watl_session`) | Discarded and deleted 24 hours after it was last used (tested); **Start over** in Settings clears it at once | `src/features/match/session.tsx` |
| Saved clinicians: id, fit label, date saved, whether they're in your care team, and the days you opened their booking page (no reasons, since those repeat what the patient said) | The device only (`watl_saved`) | Until removed | `src/features/match/saved.tsx` |
| Which care plans you have (mental health, chronic care) | The device only (`watl_plans`) | Until changed | `src/features/care/plans.ts` |
| Typed text, when Claude is on | Sent to `/api/extract`, then to Anthropic's API, to be read into signals | Not stored or logged by WATL. Anthropic's retention applies (see Open 1) | `api/extract.ts`, `server/claude/extract.ts` |
| Voice | The browser's speech service transcribes it (in Chrome, audio goes to Google). WATL receives only the text | Not stored by WATL | `src/features/voice/` (decision D7) |
| Analytics events | Vercel Web Analytics | Vercel's retention | `src/lib/analytics.ts` |
| Join WATL submissions (a professional's name, email, practice, fees and answers) | `/api/portal` → Upstash list `watl:portal`, once connected, as a draft interview for review | The newest 1,000 are kept; delete each once reviewed | `api/portal.ts`, `server/portal.ts` |
| What an assistant connected over MCP sends (needs, limits, style) | `/api/mcp`, only while ranking | Not stored or logged; the response is ranked profiles only | `api/mcp.ts`, `server/mcp.ts` |
| Care-team ratings (clinician id, 1–5 stars, optional note of up to 300 characters, the day) | `/api/feedback` → Upstash list `watl:practitioner`, once connected | Newest 5,000; no patient id; never shown on profiles or sent to the practitioner (see Open 5) | `server/feedback.ts`, `src/features/care/ratePrompt.ts` |
| Your calendar's busy times, if you tap “Find times we’re both free” (phones only) | On the phone, for that screen | Not stored or sent; titles and details aren't read | `src/lib/deviceCalendar.ts` |
| Match rating and thumbs (numbers, clinician ids, the day); after a 5 or a 1–2, the reasons tapped and an optional note of up to 300 characters | `/api/feedback` → Upstash Redis, once connected | The newest 5,000 are kept; no time limit yet (see Open 5) | `api/feedback.ts`, `server/feedback.ts` |

## What never leaves the device

- **Analytics carry no patient words.** `track()` keeps only numbers, booleans and short identifiers matching `^[\w\- ]+$` (≤ 48 characters): question ids, clinician ids, fit labels. A test sends a demo patient's whole journey and checks that no word of their description appears in any event (`__tests__/analytics.test.tsx`).
- **Demo patients and assistant chips** are scripted, so they never call Claude.
- **Clinician interview excerpts** stay on the server side of the engine; the app only receives reviewed patient-facing lines (`runMatching` strips everything else, and a property test checks no `excerpt` field reaches a result).

## Claude (Phase 8)

- **Off unless configured.** `GET /api/extract` reports whether it's on. Settings shows which reader is in use, and the Privacy line says words are sent to Anthropic's API when it is.
- **Minimal payload.** Reading a message (`/api/extract`) sends only its text (capped at 2,000 characters) and the chosen profession. If Claude-worded replies are on (`/api/reply`), it also sends the refinement's text, what changed, the match count and the first clinician's first name. Neither sends identifiers, session history or location.
- **No logging.** The function logs only a failure reason (e.g. `api 429`), never the text.
- **Fails closed to the device.** Any error returns 503, and the app falls back to on-device keyword matching.

## Open

1. **Anthropic data retention.** Confirm the organisation's API data-retention settings (and whether zero data retention is needed) before real patients use it. Health information is sensitive under the Australian Privacy Act (APP 3, APP 11).
2. **Consent wording.** When Claude is on, the describe screen and Settings both say that what patients write is read by Claude (Anthropic) and not stored by WATL. Whether that notice is enough, or explicit consent is needed, depends on legal advice.
3. **Voice.** Browser transcription sends audio to the browser vendor. Decision D7 accepted this for the prototype, with a notice on screen. A WATL-controlled service is needed before launch.
4. **Real clinicians.** Profiles come from the ADHDme network's published pages. Their consent to being matched and quoted in WATL still needs confirming.
5. **Feedback retention.** `/api/feedback` stores ratings with only the day, not the time. The one piece of free text is the optional "Other" note after a 5 or a 1–2; the box asks for no health details, but someone may still type them, so it needs the same retention decision and a person should read notes before sharing them. The same goes for care-team rating notes, and before any rating feeds the ranking, check AHPRA's rules on patient feedback about practitioners. Still, decide how long to keep them (for example, until the testing round ends) before connecting the store.
