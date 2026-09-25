# WATL

WATL helps you find a GP or psychologist who fits you. Pick which you're looking for, describe what you need in your own words, answer at most a few useful questions, and see everyone who fits, best first, with a clear reason why each one does. The assistant (the sparkle button) re-ranks the list when you tell it what to change.

This is a React Native (Expo Router) app, mobile-first on the web and deployed on Vercel. The build plan is in [`docs/PLAN.md`](docs/PLAN.md).

> **Status: Phase 3 of the plan.** The matching engine runs in the app against the real GPs and psychologists in the ADHDme network, imported from their published profiles. Scripted demo patients show every path through it. Voice input works where the browser supports it; the Claude agent that reads free text is the final stage (Phase 8). Until then, typed searches use a simple keyword reader.
>
> **Demo patients:** "Try a demo patient" on the first screen (or Settings → Try a demo patient). **Review tools:** Settings → Review screen states (`/dev/states`) opens any screen state directly; set `EXPO_PUBLIC_DEV_TOOLS=false` to hide it.

## Getting started

```bash
npm install
npm start          # then press w (web), i (iOS simulator) or a (Android emulator)
```

Checks (also run by GitHub Actions on every push and pull request):

```bash
npm run typecheck
npx expo lint
npm test
npm run test:py      # interview pipeline
```

After adding or removing packages, run `npm run lockfile` before committing. An incremental `npm install` on macOS can drop Linux-only packages from `package-lock.json`, which makes `npm ci` fail in CI.

The tests in `__tests__/` cover:

- **Assets:** every image and font the app `require`s exists and is a real file of its type, and every file in `assets/images` and `assets/clinicians` is used.
- **Profiles:** every imported trait is quoted word for word from the clinician's published profile, marked profile-sourced, and within the copy rules; unpublished fees and availability stay unknown; every professional has a portrait.
- **Demos and funnel:** each demo reaches a result within the question ceiling with explained matches; only the chosen profession is matched; editing a demo's words turns it into an ordinary search; answers in the patient's own words feed back into matching.
- **Engine (`server/`):** seed-data integrity; eligibility for each hard constraint; draft and low-confidence traits ignored; the PRD demo asks one question then returns Amy first with the three demo reasons; the question ceiling and its exceptions; preference confirmation only when it matters; diversity never costing quality; partial and no-match results with the right suggestions; no scores or interview excerpts in the output; copy rules on every reason; question-bank wording rules.
- **Screens:** the funnel and tabs, demo run-throughs (straight to matches, follow-up plus confirmation, one match, honest no-match, safety), real profile detail and booking handoff, saving, typed searches, start over, and the review page.

## What's in the app

Three tabs: **Find**, **Saved** and **Settings**.

| Screen | Route | What it does |
| --- | --- | --- |
| Who are you looking for? | `/` | The funnel: a GP, a psychologist, or not sure yet. Also "Try a demo patient" |
| Demo patients | `/demos` | Scripted patients for each profession; each fills in their words, ready to run |
| Open conversation | `/describe` | Describe what you need by voice (where the browser supports it) or text |
| Follow-up question | `/clarify?q=…` | Only questions whose answer could change the matches; tap an answer, or use your own words |
| Preference confirmation | `/confirm` | Only when an uncertain guess would change the matches; tap a priority to remove it |
| Matching | `/matching` | Moves on as soon as results are ready |
| Top matches | `/matches` | The three I'd start with, one at a time, in the Discover card layout: fit label, why they fit, practical details, how they practise. ✕ = next match, ♥ = save |
| Everyone who fits | `/all` | Everyone who meets your requirements, ranked. Unexplained ones are labelled "Possible fit"; unpublished costs are flagged |
| Refine with WATL | `/refine` | The assistant, from the floating sparkle button on every main screen. Say what to change ("online only", "someone gentler") and the list re-ranks; medical questions get an honest "I can't advise" |
| Clinician detail | `/clinician/[id]` | Why they fit, practice, experience, practical details (as published), bio, qualifications; Book / See next match |
| Booking handoff | `/book/[id]` | Opens the practice's own booking page |
| Safety pause | `/safety` | Shown on urgent wording; wording pending clinical review |
| Saved | `/saved` | Clinicians you hearted, kept on this device |
| Settings | `/settings` | Start over, demo patients, about, privacy, help and safety, review screen states |

**Onboarding interviews:** `docs/clinician-interview.md` and `scripts/interview.py` turn a recorded interview into approved traits that replace the profile-sourced ones (see the three mock examples in `server/fixtures/interviews/`).

**Profiles:** the GPs and psychologists come from the ADHDme network ([revamped-adhd.me](https://github.com/Stef-01/revamped-adhd.me)). Refresh them with `python3 scripts/import-adhdme.py --source ../revamped-adhd.me`. The importer only uses what each profile publishes and stops if a quoted excerpt isn't in the profile.

There's no account and no sign-in.

## Web deployment (Vercel)

The web build is deployed on Vercel from `main` (see [`vercel.json`](vercel.json)). Vercel runs `npx expo export --platform web` and serves `dist/` as a single-page app, so deep links work.

[Vercel Web Analytics](https://vercel.com/docs/analytics) records a page view for every screen change on the web build ([`src/components/VercelAnalytics.web.tsx`](src/components/VercelAnalytics.web.tsx)), plus the PRD's behavioural events through [`src/lib/analytics.ts`](src/lib/analytics.ts). Events carry only short identifiers and counts, never what anyone typed or said. Analytics needs to be enabled once in the Vercel dashboard (project → Analytics → Enable), and custom events may need a paid plan. How to use the numbers in testing: [`docs/user-testing.md`](docs/user-testing.md).

**Claude (optional).** With `ANTHROPIC_API_KEY` set in the Vercel project, [`api/extract.ts`](api/extract.ts) uses Claude to read what patients write. Without it, or whenever a request fails, the app uses its on-device keyword extractor, so nothing breaks. Set `WATL_CLAUDE=off` to switch Claude off without removing the key, and `WATL_CLAUDE_REPLIES=on` to let Claude word the assistant's replies (checked against the facts, else the template is used). Details: [`docs/PLAN.md`](docs/PLAN.md) → Phase 8 notes.

To try the production web build locally:

```bash
npx expo export --platform web
npx serve -s dist
```

## Project layout

```
src/app/          Expo Router screens (one file per route)
src/components/   Shared UI: conversation scaffold, Discover-style cards, clinician cards, tab bar, sheets, icons
src/features/match/  Session state, engine-backed agent, keyword extractor, demo patients, saved clinicians
src/data/         Clinician view models and portraits
src/lib/          Theme (colours, fonts), testing-tools switch
server/engine/    Matching engine: eligibility, scoring, question selection, top-3 selection, explanations
server/questions.ts  Behavioural follow-up question bank
server/data/      ADHDme GPs and psychologists (professionals.json) and the source snapshot
server/fixtures/  Fictional clinicians and hand-written patient signals, for engine tests only
scripts/          import-adhdme.py (profile importer), interview.py (onboarding interviews)
assets/           Images, clinician portraits (illustrations) and fonts
docs/PLAN.md      Build plan
```

Earlier versions are tagged: `dating-shell` (the dating-app shell) and `legacy-android` (the original Android/Java project).
