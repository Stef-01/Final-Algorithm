# WATL

WATL helps you find a GP who fits you. Describe what you need in your own words, answer at most a few useful questions, and see up to three clinicians with a clear reason why each one fits.

This is a React Native (Expo Router) app, mobile-first on the web and deployed on Vercel. The build plan is in [`docs/PLAN.md`](docs/PLAN.md).

> **Status: Phase 0 of the plan.** The navigation and screens are in place as placeholders. Matching, clinician data and voice arrive in later phases.

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

- **Assets:** every image and font the app `require`s exists and is a real file of its type, and every file in `assets/images` is used.
- **Navigation:** the app opens straight into Find with no sign-in, the three tabs work, the find flow moves forward correctly, clinician detail opens above the tabs, and the safety sheet opens.

## What's in the app

Three tabs: **Find**, **Saved** and **Settings**.

| Screen | Route | Status |
| --- | --- | --- |
| Open conversation | `/` | Placeholder: text input works, voice arrives in Phase 4 |
| Follow-up question | `/clarify` | Placeholder with the demo question |
| Preference confirmation | `/confirm` | Placeholder (shown only when needed) |
| Matching | `/matching` | Placeholder |
| Top matches | `/matches` | Placeholder; the Discover-style cards arrive in Phase 1 |
| Clinician detail | `/clinician/[id]` | Placeholder |
| Safety pause | `/safety` | Placeholder wording, pending clinical review |
| Saved | `/saved` | Empty state |
| Settings | `/settings` | Start over, about, help and safety |

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
src/components/   Shared UI: conversation scaffold, Discover-style cards, tab bar, sheets, icons
src/lib/          Theme (colours, fonts)
assets/           Images and fonts
docs/PLAN.md      Build plan
```

Earlier versions are tagged: `dating-shell` (the dating-app shell) and `legacy-android` (the original Android/Java project).
