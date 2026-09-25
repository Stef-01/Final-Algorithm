# Concierge care, for everyone

Concierge medicine gives a few people a coordinator who knows their goals, assembles the right team, and books it. WATL aims to do that for everyone, the way Airbnb opened up a market that used to run on who you knew: **trust** you can check, **fit** you can see, and **booking** without friction.

This is the plan. What's built is marked ✅; the rest is what comes next, in order.

## 1. Discovery: who could help? ✅ started

People rarely know which kinds of professional could help them. An ADHD coach for getting organised, an OT for a child's sensory needs, an exercise physiologist for energy and mood.

- ✅ **The discovery grid.** Every kind of professional the network has, as tiles (icon, name, two words on what they're for). Kinds nobody offers yet (dietitians) show as "Soon", honestly.
- ✅ **Goals to professions.** Goals in Profile suggest who's missing from your team (`src/features/care/plan.ts`).
- **Next: "Also could help".** After results, a row of other kinds of professional who suit what you said. A psychologist search about focus would also suggest an ADHD coach. Driven by the same areas the engine already matches.
- **Next: a discovery queue.** A swipeable run of one-card introductions to each kind of professional (what they do, when people see one, cost range), before any search. Minimal text, one idea per card.

## 2. Trust you can check ✅ foundations

- ✅ Every reason is quoted word for word from the professional's own profile or interview, and every fact (fees, rebates, suburbs) is checked against its source before it's shown.
- ✅ Honest labels: "Possible fit" when nothing specific matches; "Worth checking" when a fact isn't published.
- **Next: patient-reported fit.** Aggregate the 1–5 fit ratings (already collected, `/api/feedback`) into a per-professional signal. Show it only with enough ratings, and never as stars.
- **Next: verification badges.** Check each registration against the national register (AHPRA for registered professions) and show a small "Registration checked" mark with the date.

## 3. Price and availability, upfront

The biggest barrier after "who" is "how much, and when". Most profiles publish neither.

- ✅ Unpublished fees are flagged, never guessed. The no-match screen says when cost is what rules everyone out.
- ✅ **Join WATL** (Profile → For professionals). A short form for fees, out-of-pocket cost, wait, weekends, telehealth and new patients. It uses the interview pipeline's rules: consent, and every number in the professional's own words. It's queued as a draft interview for a person to review; nothing shows until approved.
- ✅ **Reviewer tools.** `scripts/interview.py pull` turns the queue into draft interviews, then `propose` → `ingest` → `review`.
- **Next:** email the professional when they're live.
- **Later: live availability.** Read practices' booking systems (Halaxy, HotDoc and Cliniko all have partner APIs) to show real next-available times, and recommend actual slots.

## 4. Your care team ✅ started

- ✅ **My care.** People you add from their profile become your team, ordered the way care usually starts; everyone else you liked waits below. Goals add slots for who's missing.
- ✅ **Next steps.** A suggested booking order, each addable to your calendar as a reminder.
- **Next: calendar connect.** With your permission (Google or Microsoft sign-in), read only free/busy times to suggest when to book. Later, match those against practices' live availability for a one-tap booking.
- **Later: a shared plan.** With consent, share your goals and team with the people in it, so a GP, psychologist and coach see the same plan. Nothing is shared by default.

## 4b. Your AI, as your concierge ✅ started

- ✅ **WATL as an MCP server** (`/api/mcp`). Add it to Claude or ChatGPT as a custom connector and the assistant searches WATL with what it already knows about you: needs, limits, how you like to be treated. WATL's rules still do the ranking, with the same reasons and caveats.
- ✅ **Connect your AI** in Profile: pick an assistant, copy the URL, choose what it may use, and watch an example chat run against the real tool.
- **Next: sign-in for the connector** (OAuth), so the assistant can also read your WATL goals and team with your permission, and add people to your team for you.
- **Later: booking through the assistant**, once practices share live availability.

## 5. The network (supply)

- ✅ Import from published profiles, with every excerpt checked.
- ✅ Onboarding interviews, with Claude drafting and a person approving.
- **Next: invite-only growth.** Professionals are invited by region and profession. Discovery shows gaps as "Soon" until someone fills them.

## Principles

- **As little text as possible.** Icons, chips and one-line labels, with detail one tap away.
- **Never overclaim.** Every claim traces to a source; unknowns stay unknown.
- **Your data stays yours.** Searches expire after 24 hours; goals and saved professionals stay on your device; nothing is shared without consent.
- **No hidden incentives.** WATL shouldn't be paid to rank anyone higher. If that ever changes, it's disclosed on the card.

## Needs a decision

- **Business model.** Who pays? Options are free for patients (clinician subscription or booking fee) or a patient membership. It must stay compatible with "no hidden incentives".
- **Partners.** Booking-system APIs and AHPRA checks need partnerships or agreements.
- **Regulation.** Anything that advertises regulated health services must follow AHPRA's advertising guidelines, which means no testimonials about clinical care. Patient-reported fit (§2) needs a check against this before launch.
