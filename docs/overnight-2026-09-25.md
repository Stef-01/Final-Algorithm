# Overnight run, 25 September 2026

What changed while you were away, what it found, and what needs you. 44 commits from `e1f6595` to `964a7b7`, all deployed. Two failed CI and were fixed in the next commit: `3c4edc4` (lockfile, fixed by `fcee5a5`) and `9e37c13` (an apostrophe in a heading, fixed by `adea32c`). From `043aeac` on, each deploy was also checked by a smoke test against the live site.

## Needs you

1. **Switch on Claude.**
   - Add `ANTHROPIC_API_KEY` in Vercel and set a monthly spend limit on the key.
   - To let Claude word the assistant's replies, add `WATL_CLAUDE_REPLIES=on`.
   - Then run `WATL_LIVE_EVAL=1 npx jest claude.live` (a few dozen short, paid requests).
2. **Store match ratings.** Connect Upstash in Vercel (Storage → Upstash), and decide how long to keep ratings. Until then, only the newest 5,000 are kept.
3. **Clinical review:** the safety pause, the urgent-wording list and the no-advice replies (`docs/safety.md`).
4. **Privacy and consent** (`docs/privacy.md`):
   - Anthropic data retention;
   - whether the on-screen notice is consent enough;
   - the real clinicians' consent to appear.
5. **Booking claim.** Confirm the booking screen's "WATL receives no part of what you pay" is true.
6. **Unpublished gender.** Today, clinicians who don't publish a gender are left out of gender-specific searches. Should they instead be shown lower with "Worth checking", as unpublished fees are?
7. **Vercel Web Analytics** (enable it) and the **font licence** (Tiempos is now in the app icon too).
8. **See it on a phone.** Nothing native has run yet; there's no Xcode or Android SDK here. Install Expo Go, run `npx expo start` and scan the code.

## What it found (the fixes worth knowing about)

**Accuracy about real clinicians**
- Billing notes were paraphrased and embellished. Paula's gained "with a Mental Health Treatment Plan"; Jess's "Care Plan" became "Treatment Plan". They now quote each profile word for word.
- Unpublished facts had been filled in: a 50-minute session for Meera, "taking new patients" for all 14, and a Medicare claim on provisional psychologists. These are now unknown unless published.
- The importer now stops if a fee, rebate, suburb or age range isn't in the profile. Interviews need the clinician's words for every practice fact.

**Privacy**
- Saved clinicians stored the patient's health reasons ("help with trauma") with no expiry. Saved now keeps the id, fit label and date only.
- The Claude, reply and feedback endpoints only accept WATL's own pages, with a per-visitor cap.

**Honesty in the copy**
- "I found 2 GPs I'd recommend. Each fits for slightly different reasons" appeared when no reasons existed (every vague search). It now says so plainly.
- Wording that assumed a GP ("when a doctor recommends…") or ADHD ("treats ADHD as a difference") was shown to psychologist seekers and autistic patients. It now follows who and what they asked for.
- "Help with children", "help with NDIS support" and similar now read naturally.

**Safety**
- The urgent-wording list missed "I want to die", "ending it all", "no reason to live" and "hurting myself". It now catches them.
- The assistant answers medical questions with "I can't give medical advice" and offers to find a clinician. It never changes the list off a question (50-prompt red-team set).

**Robustness**
- A corrupt saved search could have crashed the app on every launch. It's now checked on load and discarded. If a screen crashes anyway, an error screen offers "Start over".
- Screens hold up at 200% text size.
- First paint on the live site went from 2.07 s to 1.28 s.

## What's new to try

- **The assistant** (sparkle button, bottom right) refines a search mid-conversation: "online only", "someone gentler", "closer to Southport", "cost doesn't matter", "show GPs instead". It takes voice where the browser can transcribe.
- **The no-match screen** names what's ruling everyone out and offers the one change that would help.
- **Everyone who fits** is listed, best first, with honest labels; see `/all` from the matches screen.
- **`/dev/states`** loads every screen state for review, including the assistant's.

## Checks now in place

| Check | Where |
|---|---|
| 396 unit, UI and property tests, plus 23 Python tests | `npm test`, `npm run test:py` |
| Extraction eval (38 cases) and red team (50 prompts) | `evals/` |
| Bundle budget (JS 397 of 450 KB gzipped) | CI |
| High or critical dependency advisories fail the build | CI |
| Live-site smoke test after every production deploy | `.github/workflows/smoke.yml` |
| Engine speed: 38 ms per search at 1,000 clinicians | `__tests__/engine.scale.test.ts` |
