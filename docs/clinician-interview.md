# Clinician onboarding interview

**Length:** 45–60 minutes. **Format:** video call, recorded and transcribed with the clinician's consent.
**Purpose:** gather evidence of how the clinician actually practises, so WATL can explain matches in concrete terms (PRD §22–26).

## Ground rules

- **Ask about behaviour, never self-ratings.** Don't ask "How collaborative are you, 1–10?" Ask "A patient strongly prefers a treatment you don't initially recommend. Walk me through the consultation."
- **Record answers word for word.** Every trait WATL shows patients must quote a sentence the clinician actually said. `scripts/interview.py ingest` rejects any excerpt that isn't in the recorded answer.
- **Propose, don't decide.** For each scenario, the interviewer proposes where the answer sits on the dimension's scale and drafts a one-line, patient-facing summary. A second person approves each trait in `scripts/interview.py review`.
- **No unsupported adjectives** in patient-facing lines (caring, compassionate, holistic, warm, patient-centred, thorough, understanding). Describe what the clinician does.
- **Skip what doesn't apply.** Unanswered scenarios are left blank; blank means unknown, and unknown never counts for or against a clinician.

## Workflow

```bash
python3 scripts/interview.py new <clinician-id>          # writes server/data/interviews/<id>/interview.json
# ...conduct the interview, fill in each answer, excerpt and proposal...
python3 scripts/interview.py ingest <clinician-id>       # validates → draft.json
python3 scripts/interview.py review <clinician-id>       # approve / edit / reject each trait → approved.json
python3 scripts/interview.py collect                      # gathers approved interviews -> server/data/interviews.json
```

The app applies `server/data/interviews.json` on top of the imported profiles (`server/data/overlay.ts`). Approved interview traits replace the profile-sourced ones for the same dimension or area, and are marked `approved`. Practical facts the clinician confirms (fees, availability, weekends, new patients) replace "not published".

## Example

`server/fixtures/interviews/` holds three mock interviews for fictional test clinicians. Each has the filled `interview.json`, the reviewer's `decisions.json` (including one rejection and one edited line), and the resulting `draft.json` and `approved.json`. `python3 -m unittest discover scripts/tests` re-runs them and checks the output hasn't changed.

## Scenarios

Each scenario lists the dimension it informs and that dimension's scale. The script's template carries the same list (`SCENARIOS` in `scripts/interview.py`).

| # | Domain (PRD §24) | Scenario | Dimension · scale |
| --- | --- | --- | --- |
| 1 | Clinical expertise | Which presentations do you most enjoy working with, and which do you refer on? Give a recent example of each. | expertise areas |
| 2 | Preferred complexity | A patient arrives with four overlapping problems and 15 minutes booked. What do you do? | uncertainty_tolerance · low / moderate / high |
| 3 | Diagnostic curiosity | Symptoms don't fit a clear diagnosis after the first visit. What happens next? | diagnostic_style · pragmatic / balanced / investigative |
| 4 | Investigation threshold | A patient asks for a test you don't think is needed. Walk me through the conversation. | diagnostic_style |
| 5 | Communication directness | You need to tell a patient a result isn't what they hoped. How do you say it? | communication_directness · gentle / balanced / direct |
| 6 | Explanation depth | A patient asks why you're recommending a plan. How much do you explain, and how? | explanation_depth · brief / moderate / detailed |
| 7 | Shared decision-making | A patient strongly prefers a treatment you don't initially recommend. Walk me through the consultation. | shared_decision_making · clinician_led / shared / patient_led |
| 8 | Patient autonomy | A patient wants to make a decision you have reservations about. What do you do? | patient_autonomy · low / moderate / high |
| 9 | Medication philosophy | A patient asks whether they should start medication. How do you approach it? (GPs) | medication_philosophy · conservative / moderate / proactive |
| 10 | Lifestyle integration | A patient's main issue seems linked to sleep, exercise and routine. What's in the plan? | lifestyle_integration · low / moderate / high |
| 11 | Mental health integration | A patient comes in about ADHD medication but mentions poor sleep and stress. (GPs) | mental_health_integration · low / moderate / high |
| 12 | Consultation pace | Walk me through a first appointment with a new patient, minute by minute. | consultation_pace · brisk / standard / unhurried |
| 13 | Continuity | How do you handle patients seeing other clinicians in your practice? | continuity · low / moderate / high |
| 14 | Follow-up intensity | What happens between appointments for your ongoing patients? | follow_up_intensity · as_needed / scheduled / proactive |
| 15 | Care coordination | A patient is also seeing a psychologist and a specialist. How do you work with them? | care_coordination · low / moderate / high |
| 16 | Comfort with uncertainty | Tell me about a case you still don't fully understand. How did you manage it? | uncertainty_tolerance |
| 17 | Boundaries and scope | What would you tell a patient you can't help them with, and where would you send them? | notes only |
| 18 | Consultation structure | How do you end an appointment? What does the patient leave with? | consultation_pace |
| 19 | Preferred patient behaviours | What helps a patient get the most out of working with you? | notes only |
| 20 | Practice logistics | Fees and rebates, typical wait for a new patient, weekend or after-hours times, telehealth, new patients. | practical facts |
| 21 | Therapy style (psychologists) | A client asks for "tools to fix this". How do you respond, and what does a typical session look like? | therapy_style · exploratory / balanced / practical |
| 22 | Neurodiversity-affirming care (psychologists) | A client says they want to stop being "so ADHD". Walk me through how you'd work with that. | neurodiversity_affirming · low / moderate / high |

## Consent and privacy

- The clinician sees their draft traits and patient-facing lines before approval, and can withdraw any of them.
- Transcripts are kept only as long as review needs them. Excerpts stay internal: patients see only the approved patient-facing lines (PRD §45).
