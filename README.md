# WATL

WATL is a dating app that emphasizes long-term connections. Users can filter matches by traits that matter to them, such as religion or height.

This is a React Native (Expo) app. It was ported from an Android/Java dating-app clone ([diya31656/Hinge](https://github.com/diya31656/Hinge)); that original Java code is kept under [`legacy-android/`](legacy-android) for reference.

## Getting started

```bash
npm install
npm start          # then press i (iOS simulator), a (Android emulator) or w (web)
```

Every native module used here ships with Expo Go, so you can also scan the QR code with Expo Go on a phone.

Checks (also run by GitHub Actions on every push and pull request):

```bash
npm run typecheck
npx expo lint
npm test
```

The tests in `__tests__/` cover:

- **Assets:** every image, font and video the app `require`s exists and is a real file of its type, every file in `assets/images` is used, and each seeded profile has 6 captioned photos and 3 prompts.
- **Profile store:** loading, saving and clearing data on the device.
- **Screens:** welcome branding and redirect, each sign-up step's validation and saved values, Discover cycling between profiles, and tab navigation.

## Web deployment (Vercel)

The web build is deployed on Vercel from `main` (see [`vercel.json`](vercel.json)): Vercel runs `npx expo export --platform web` and serves `dist/` as a single-page app, so deep links like `/discover` work.

[Vercel Web Analytics](https://vercel.com/docs/analytics) records a page view for every screen change on the web build ([`src/components/VercelAnalytics.web.tsx`](src/components/VercelAnalytics.web.tsx)). It does nothing in the iOS and Android apps. Analytics must be enabled once in the Vercel dashboard (project → Analytics → Enable) before data shows up.

To try the production web build locally:

```bash
npx expo export --platform web
npx serve -s dist
```

## What's in the app

| Area | Route | Notes |
| --- | --- | --- |
| Welcome | `/` | Looping background video, sign-up entry. Skips to Discover when a profile is saved. |
| Sign-up | `/onboarding/*` | Phone → verification code → verified → name → email → date of birth (18+) → ethnicity |
| Discover | `/discover` | Profile cards (photos, prompts, vitals). Like or pass moves to the next profile. |
| Standouts | `/standouts` | Empty state, Roses paywall |
| Likes You | `/likes` | Empty state, upgrade prompt |
| Matches | `/matches` | Empty state |
| Settings | `/settings` | Profile card, Preferences, Account, Help Centre |
| Profile | `/profile`, `/profile/view` | Edit your details and preview your profile |
| Account | `/account` | Contact details, legal links, log out, delete account |

Profile data is kept on the device with AsyncStorage (the same keys the Android app used in SharedPreferences). There is no backend: any 6-digit verification code is accepted, and Discover cycles through two sample profiles.

## Project layout

```
src/app/          Expo Router screens (one file per route)
src/components/   Shared UI: onboarding scaffold, profile cards, tab bar, sheets, icons
src/data/         Sample profiles
src/lib/          Theme (colours, fonts, links) and the profile store
assets/           Images, fonts, background video
legacy-android/   Original Android/Java project (reference only)
```

`src/components/icons.ts` was generated from the Android vector drawables.

## Credits

Original Android clone by [lucifernipun22](https://lucifernipun22.medium.com/cloning-of-dating-app-hinge-in-just-3-days-67a3ae89bf55).
