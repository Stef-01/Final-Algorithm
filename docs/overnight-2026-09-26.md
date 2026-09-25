# Second run, 26 September 2026

What changed for your list: discovery, care team, calendar, motion, and less text. 19 commits from `1f7874d` to `c340ce3`. Each was checked by CI and deployed; the production smoke test ran on the latest.

## What you asked for, and where it is

| You asked for | What's there now |
|---|---|
| Filled heart when saved | A purple circle with a solid white heart, which pops and sends out a ring. |
| Back button always, back to the search | Every match has one: back to the previous match, or from the first, back to your search with your words ready to edit. |
| Qualifications, easier to see | One row each: icon, title, university in grey, badge ("In progress", "Completed", "Member"). |
| Swipe motion | Swipe left to pass, right to save. The card tilts and flies off, and the next one slides in. |
| All sorts of professionals | 12 more real people: 6 ADHD coaches, 3 physios, an OT, an exercise physiologist, a neurotherapy practitioner. Dietitians show as "Soon". |
| A discovery queue | **Who could help?** is a grid of tiles. **Explore who does what** opens a swipeable card per profession. **Also could help** after results suggests other professions for the same needs. |
| Goals in your profile | Profile starts with goal chips. Goals shape searches ("Your goal: get organised") and your team. |
| Build a care team | **My care:** your team as cards, with "Add a …" slots from your goals, in the order care usually starts (GP first). |
| Calendar and recommended appointments | **Next steps:** when to book each person, two weeks apart on weekdays. Add to calendar: the phone's own calendar on iOS and Android, Google Calendar or an .ics file on web. |
| Concierge, like Airbnb for care | The plan is in [`VISION.md`](VISION.md): discovery, checkable trust, price and availability upfront, and your team. It marks what's built and what's next. |
| As little text as possible | Every long line cut to its shortest true version; bios collapse to four lines. |

## Honest limits

- **Calendar:** these are reminders to book, not real appointment slots. WATL can't see practices' availability or your calendar yet. That needs booking-system partnerships and a Google or Microsoft sign-in (VISION §3–4).
- **Discovery facts:** the short "helps with / sessions / rebates" lines are general Australian information. They're flagged for the clinical advisor (`docs/safety.md` item 5).
- **New professionals:** none publishes fees, so all show "Fee on request". Most have no practice-style traits until they're interviewed.

## Needs you (unchanged, plus one)

1. `ANTHROPIC_API_KEY` in Vercel, with a spend limit. Then run `WATL_LIVE_EVAL=1 npx jest claude.live`.
2. Connect Upstash for ratings, and decide how long to keep them.
3. Clinical review of `docs/safety.md`, now including the discovery facts.
4. Privacy and consent (`docs/privacy.md`), including consent from the 12 newly imported professionals.
5. Confirm the booking claim ("WATL receives no part of what you pay").
6. Unpublished gender: exclude or flag?
7. Vercel Web Analytics, and the font licence.
8. **New:** a business model decision (VISION, "Needs a decision"). It shapes the clinician portal and patient-reported fit.

# Third run, 26 September 2026

| You asked for | What's there now |
|---|---|
| Swipe left for no, right for yes and booking | Right likes them, records a thumbs-up and opens booking; left records a no. ✕ and ✓ buttons do the same. |
| Swipe the whole list, not just the top 3 | The deck runs through everyone who fits; after the top matches they're marked "Also a fit". |
| Why a 5, why a 1–2 | "What was good?" / "What was off?" with tappable reasons and Other in your own words. Skip sends just the rating. |
| Liked vs care team | My care: care team on top (with booking reminders), Liked below. Add someone to the team from their profile. |
| Location preference after picking a profession | "Does location matter?" Anywhere (telehealth), or Near a place: a map of Australia with tappable cities. The telehealth line is counted from the network ("9 of 12 psychologists here offer telehealth"). |
| MCP demo in Profile | Connect your AI: pick Claude or ChatGPT, copy the connector URL, choose what it can use, and see an example chat. The connector is real: `https://final-algorithm.vercel.app/api/mcp` answers `find_professionals` and `get_professional`. |
| Duolingo-style motion, no mascot | Buttons push into a lip and spring back; chips pop when chosen; a progress bar grows across the search steps; bursts when you say yes, add to your team, connect, or send a rating; swipe stamps grow as you drag; a sliding tab indicator; a My care badge that hops; sheets spring up; screens slide in. All of it is skipped with Reduce Motion. |
| Back button always | Every search step now has one. |

## Honest limits

- **MCP:** no sign-in yet, so the assistant can't read your WATL goals or team directly; it uses what you've told it. The in-app chat is an example that calls the real tool on your device.
- **Map:** ten places (where the network's rooms are, plus the capitals); it's for choosing a city, not an address.
