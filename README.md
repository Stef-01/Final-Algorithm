# WATL

WATL helps you find a GP who fits you. Describe what you need in your own words, answer at most a few useful questions, and see up to three clinicians with a clear reason why each one fits.

This is a React Native (Expo Router) app, mobile-first on the web and deployed on Vercel. The build plan is in [`docs/PLAN.md`](docs/PLAN.md).

> **Status: Phase 2 of the plan.** Every screen works end to end on fixture data (Phase 1), and the real matching engine is built and tested in `server/` (Phase 2). Phase 3 connects the two through a Vercel API with the Claude agent; voice is Phase 4.
>
> **Testing tools are on:** a "Use the demo example" link on the first screen, and Settings → Review screen states (`/dev/states`), which opens any screen state directly. Set `EXPO_PUBLIC_DEV_TOOLS=false` to hide them.

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
```

After adding or removing packages, run `npm run lockfile` before committing. An incremental `npm install` on macOS can drop Linux-only packages from `package-lock.json`, which makes `npm ci` fail in CI.

The tests in `__tests__/` cover:

- **Assets:** every image and font the app `require`s exists and is a real file of its type, and every file in `assets/images` and `assets/clinicians` is used.
- **Matching (fixture):** one follow-up for the PRD demo, preference confirmation only when uncertain, safety pause, hard-constraint filtering without padding, no-strong-match actions, "see more" only on request.
- **Explanation rules:** every reason is backed by a clinician evidence line, at most 3 reasons, no unsupported adjectives, winner language or percentages, one-sentence agent lines, 2–6-word options.
- **Engine (`server/`):** seed-data integrity; eligibility for each hard constraint; draft and low-confidence traits ignored; the PRD demo asks one question then returns Amy first with the three demo reasons; the question ceiling and its exceptions; preference confirmation only when it matters; diversity never costing quality; partial and no-match results with the right suggestions; no scores or interview excerpts in the output; copy rules on every reason; question-bank wording rules.
- **Screens:** the PRD demo script end to end, stepping through matches, detail and booking handoff, saving to the Saved tab, partial and no-match results, safety, start over, and the review page.

## What's in the app

Three tabs: **Find**, **Saved** and **Settings**.

| Screen | Route | What it does |
| --- | --- | --- |
| Open conversation | `/` | Describe what you need (text; voice arrives in Phase 4) |
| Follow-up question | `/clarify?q=…` | One question at a time; tapping an answer moves on, or answer in your own words |
| Preference confirmation | `/confirm` | Only when an answer leaves things uncertain; tap a priority to remove it |
| Matching | `/matching` | Moves on as soon as results are ready |
| Top matches | `/matches` | Up to 3 clinicians, one at a time, in the Discover card layout: fit label, why they fit, practical details, how they practise. ✕ = next match, ♥ = save |
| Clinician detail | `/clinician/[id]` | Why I matched you, practice, experience, practical details, bio, qualifications; Book / See next match |
| Booking handoff | `/book/[id]` | Explains where booking would go (the clinicians are fictional) |
| Safety pause | `/safety` | Shown on urgent wording; wording pending clinical review |
| Saved | `/saved` | Clinicians you hearted, kept on this device |
| Settings | `/settings` | Start over, about, privacy, help and safety, review screen states |

**Fixture triggers** (for testing): the demo text gives 3 matches after one question; answering "Not sure" shows preference confirmation; mentioning "bulk bill" leaves 2 matches; "weekend" + "in person" gives no strong match (then "Include telehealth" finds 1); urgent wording such as "chest pain" pauses for safety.

There's no account and no sign-in.

## Web deployment (Vercel)

The web build is deployed on Vercel from `main` (see [`vercel.json`](vercel.json)). Vercel runs `npx expo export --platform web` and serves `dist/` as a single-page app, so deep links work.

[Vercel Web Analytics](https://vercel.com/docs/analytics) records a page view for every screen change on the web build ([`src/components/VercelAnalytics.web.tsx`](src/components/VercelAnalytics.web.tsx)). It needs to be enabled once in the Vercel dashboard (project → Analytics → Enable) before data shows up.

To try the production web build locally:

```bash
npx expo export --platform web
npx serve -s dist
```

## Project layout

```
src/app/          Expo Router screens (one file per route)
src/components/   Shared UI: conversation scaffold, Discover-style cards, clinician cards, tab bar, sheets, icons
src/features/match/  Session state, fixture agent, saved clinicians
src/data/         Fictional clinicians
src/lib/          Theme (colours, fonts), testing-tools switch
server/engine/    Matching engine: eligibility, scoring, question selection, top-3 selection, explanations
server/questions.ts  Behavioural follow-up question bank
server/data/      Fictional seed clinicians (JSON, with evidence and review status)
server/fixtures/  Hand-written patient signals for tests and evals
assets/           Images, clinician portraits (illustrations) and fonts
docs/PLAN.md      Build plan
```

Earlier versions are tagged: `dating-shell` (the dating-app shell) and `legacy-android` (the original Android/Java project).
