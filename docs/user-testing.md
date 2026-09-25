# Moderated user testing

**Goal:** find out whether WATL's recommendations feel chosen for the person, not like a nicer directory (PRD §2, §49).
**Who:** 5–8 adults aged 18–35 looking for ADHD-informed care: a mix of people looking for a GP and for a psychologist, and at least two who prefer to speak rather than type.
**Length:** 30 minutes, on the participant's own phone, over video with screen share. Use **https://final-algorithm.vercel.app**.

## Before the session

- Get consent to record the screen and audio, and explain that nothing they type is stored beyond their own device.
- Tell them the clinicians are real people in the ADHDme network, and that they don't need to book.
- Don't show the demo patients: participants describe their own situation.
- Give participants no guidance on what to say.

## Tasks (about 15 minutes)

1. "You're looking for a [GP / psychologist] who's a good fit for you. Use this to find one." Stay quiet; note where they hesitate.
2. When they reach the matches: "Take a look at who it suggested." Let them step through at their own pace.
3. "Open the one you'd look at first." Then: "What would you do next?"
4. "Say one of them isn't quite right for you. How would you change what it's showing?" See whether they find the sparkle button (the assistant), and whether its reply matches what they meant.

Note: time from tapping the arrow on the describe screen to seeing the first match, the number of follow-up questions, whether they used voice, and anything they said out loud.

## Questions (about 10 minutes)

Ask in this order, word for word:

1. **Credibility (primary):** "How well do these clinicians seem to fit what you told us?" 1 (not at all) – 5 (very well). The app asks the same question after the last match; compare the two.
2. **Comprehension:** "Why do you think we recommended [the clinician they opened]?" Success means they accurately give at least one matching reason.
3. **Choice confidence:** "Do you feel you know enough to choose who to look at first?" Yes / No / Not sure.
4. **Directory preference:** "Would you rather start with these recommendations, or search a list of 30 clinicians?"
5. **Open:** "Was there anything it should have asked you, or anything it asked that it didn't need to?"

## Targets (PRD §49)

| Measure | Target | Where it comes from |
| --- | --- | --- |
| Credibility | Average ≥ 4 out of 5 | Question 1, and the in-app `match_rating` event |
| Time to shortlist | Under 90 seconds | Stopwatch, and `matching_completed.seconds` |
| Follow-up burden | Median ≤ 2 questions | `matching_completed.followups` |
| Comprehension | Can give at least one accurate reason | Question 2 |
| Choice confidence | ≥ 80% yes | Question 3 |
| Directory preference | Most prefer the recommendations | Question 4 |

## Reading the analytics

Events are Vercel Web Analytics custom events. Enable Web Analytics on the project first; custom events may need a Pro plan. They carry only short identifiers and counts, never what anyone typed or said.

- `matching_started` → `matching_completed`: journeys started and finished. `seconds` is time to shortlist, `followups` the number of questions, `matches` how many were featured (0 = nobody fits).
- `followup_asked` / `followup_answered`: which questions come up, and how often people answer in their own words (`ownWords`).
- `voice_started` / `voice_completed`: voice take-up.
- `clinician_viewed`, `next_match_viewed`, `booking_clicked`: how people move through the matches.
- `match_feedback_positive` / `match_feedback_negative`: per-match thumbs.
- `match_rating`: the 1–5 credibility answer. With a feedback store connected, each rating (plus thumbs, match count, follow-ups and time to shortlist) is also in the Upstash list `watl:feedback`.
- `assistant_opened` / `assistant_message`: how often people use the assistant, whether they tap a suggestion (`chip`), and whether it changed their list (`changed`).
- `claude` on `matching_started` and `assistant_message`: whether Claude read the words (true) or the keyword matcher did.

## After each session

Write up in one page: the participant's situation (no identifying details), the answers above, the three moments they hesitated most, and whether the reasons they read matched what they'd said. Look for patterns after five sessions before changing anything.
