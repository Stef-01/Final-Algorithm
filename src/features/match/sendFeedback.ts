import { API_BASE } from './remoteExtract';
import { secondsToShortlist, type SessionState } from './sessionCore';

// Sends the 1–5 rating and thumbs to /api/feedback (PRD §49). Fire and forget: feedback must
// never slow the patient down or show an error. Numbers and clinician ids, plus the reasons and
// short note from the "What was good / off?" screen when there is one.

export function feedbackBody(state: SessionState) {
  const r = state.result;
  return {
    rating: state.feedback.rating,
    matches: r?.status === 'matches' ? r.matches.length + r.more.length : 0,
    followups: state.asked.length,
    seconds: secondsToShortlist(state),
    profession: state.profession ?? 'either',
    claude: !!state.input.extracted,
    thumbs: state.feedback.thumbs,
    ...(state.feedback.why ? { why: state.feedback.why } : {}),
  };
}

export function sendFeedback(state: SessionState) {
  if (API_BASE === null || typeof fetch !== 'function' || !state.feedback.rating) return;
  fetch(`${API_BASE}/api/feedback`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(feedbackBody(state)),
  }).catch(() => {});
}
