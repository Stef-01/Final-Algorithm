import { professionals } from './data/professionals';
import { recommend } from './engine';
import { DIMENSIONS, PROFESSIONS, type Caveat, type ClinicianRecord, type Dimension, type EngineMatch, type PatientSignals, type Profession } from './engine/types';
import { AREAS_NEAR } from './places';

// WATL as an MCP server (Model Context Protocol, streamable HTTP, JSON responses). Connect it to
// Claude or ChatGPT and the assistant can search the network with what it already knows about you:
// it turns that context into structured needs and preferences, and WATL's fixed rules do the
// ranking, with the same reasons, caveats and published facts as the app. Nothing sent is stored
// or logged. api/mcp.ts is the endpoint; this file is the pure, testable part. Relative imports
// only: it's bundled into a Vercel Function.

export const PROTOCOL_VERSION = '2025-06-18';
const SITE = 'https://final-algorithm.vercel.app';

type Json = null | boolean | number | string | Json[] | { [k: string]: Json };
type Rpc = { jsonrpc?: string; id?: string | number | null; method?: string; params?: Record<string, unknown> };

/** Health areas the network covers (the same list Claude extracts into). */
const AREAS = [...new Set(professionals.flatMap((c) => c.expertise.map((e) => e.area)))].sort();

const STYLE = Object.fromEntries(Object.entries(DIMENSIONS).map(([d, v]) => [d, { type: 'string', enum: [...v] }]));

export const TOOLS = [
  {
    name: 'find_professionals',
    title: 'Find health professionals who fit',
    description:
      'Search WATL’s network of Australian health professionals (GPs, psychologists, ADHD coaches, OTs, physios and more) and rank them for this person. ' +
      'Use what you already know about them from the conversation: their needs, practical limits and how they like to be treated. Only include what they have actually told you. ' +
      'Returns the best fits first, each with its reason quoted from the professional’s own profile, anything worth checking, and published fees and availability. Not medical advice.',
    inputSchema: {
      type: 'object',
      properties: {
        profession: { type: 'string', enum: [...PROFESSIONS], description: 'The kind of professional. Omit to search all.' },
        needs: { type: 'array', items: { type: 'string', enum: AREAS }, description: 'Health areas they want help with.' },
        mode: { type: 'string', enum: ['any', 'in_person_only', 'telehealth_only'] },
        near: { type: 'string', enum: AREAS_NEAR.map((a) => a.id), description: 'Where they want to be seen in person.' },
        max_km: { type: 'number', description: 'How far they will travel, with `near`.' },
        max_out_of_pocket: { type: 'number', description: 'Most they can pay per session after Medicare (AUD). 0 = bulk billed only.' },
        clinician_gender: { type: 'string', enum: ['female', 'male'], description: 'Only if they asked for it.' },
        language: { type: 'string' },
        weekends: { type: 'boolean', description: 'They need weekend appointments.' },
        style: { type: 'object', properties: STYLE, description: 'How they like to be treated, only where they said so.' },
        limit: { type: 'number', description: 'How many to return (1–10, default 5).' },
      },
    },
    annotations: { readOnlyHint: true, openWorldHint: false },
  },
  {
    name: 'get_professional',
    title: 'A professional’s profile',
    description: 'The published profile of one professional from find_professionals: practice, fees, availability, modes, qualifications and how they work.',
    inputSchema: { type: 'object', properties: { id: { type: 'string' } }, required: ['id'] },
    annotations: { readOnlyHint: true, openWorldHint: false },
  },
] as const;

const byId = new Map(professionals.map((c) => [c.id, c]));
const place = (c: ClinicianRecord) => (c.location.lat === null ? 'Telehealth only' : [c.location.suburb, c.location.city].filter((x, i, a) => x && a.indexOf(x) === i).join(', '));
const cost = (c: ClinicianRecord) =>
  c.practical.fee === null ? 'Fee on request' : c.practical.gapAfterMedicare === null ? `$${c.practical.fee} per session` : `$${c.practical.fee} per session, $${c.practical.gapAfterMedicare} after Medicare`;

/** The tool's arguments as the engine's patient signals. Unknown or malformed values are dropped. */
export function toSignals(a: Record<string, unknown>): PatientSignals {
  const s: PatientSignals = { clinicalNeeds: [], preferences: {}, constraints: {} };
  if ((PROFESSIONS as readonly unknown[]).includes(a.profession)) s.profession = a.profession as Profession;
  if (Array.isArray(a.needs)) for (const n of a.needs) if (AREAS.includes(n as string)) s.clinicalNeeds.push({ area: n as string, confidence: 'high' });
  const k = s.constraints;
  if (a.mode === 'any' || a.mode === 'in_person_only' || a.mode === 'telehealth_only') k.mode = a.mode;
  const area = AREAS_NEAR.find((x) => x.id === a.near);
  if (area) {
    k.origin = area.origin;
    k.originLabel = area.label;
    k.maxKm = typeof a.max_km === 'number' && a.max_km > 0 ? Math.min(a.max_km, 500) : 50;
  }
  if (typeof a.max_out_of_pocket === 'number' && a.max_out_of_pocket >= 0) k.maxGap = Math.round(a.max_out_of_pocket);
  if (a.clinician_gender === 'female' || a.clinician_gender === 'male') k.clinicianGender = a.clinician_gender;
  if (typeof a.language === 'string' && a.language.trim()) k.languages = [a.language.trim().slice(0, 40)];
  if (a.weekends === true) k.needsWeekend = true;
  const style = (a.style ?? {}) as Record<string, unknown>;
  for (const [d, values] of Object.entries(DIMENSIONS) as [Dimension, readonly string[]][]) {
    if (values.includes(style[d] as string)) s.preferences[d] = { value: style[d] as string, confidence: 'high' };
  }
  return s;
}

const CAVEAT: Record<Caveat, string> = {
  fee_unpublished: 'Fees aren’t published: ask when booking.',
  weekend_hours_unpublished: 'Weekend hours aren’t published: ask when booking.',
};

const summary = (m: EngineMatch) => {
  const c = byId.get(m.clinicianId)!;
  return {
    id: c.id,
    name: c.name,
    role: c.role,
    fit: m.fit,
    why: m.reasons.slice(0, 3).map((r) => ({ signal: r.signal, evidence: r.evidence })),
    worth_checking: m.caveats.map((x) => CAVEAT[x]),
    where: place(c),
    modes: c.practical.modes,
    cost: cost(c),
    next_available: c.practical.nextAvailable,
    profile: `${SITE}/clinician/${c.id}`,
    booking: c.bookingUrl,
  };
};

export function findProfessionals(a: Record<string, unknown>) {
  const s = toSignals(a);
  const r = recommend(s, professionals);
  const limit = typeof a.limit === 'number' ? Math.max(1, Math.min(10, Math.round(a.limit))) : 5;
  if (r.status === 'none') return { results: [], total: 0, could_loosen: r.actions };
  const all = [...r.matches, ...r.more];
  return { results: all.slice(0, limit).map(summary), total: all.length, note: 'Ranked by WATL’s fixed rules. Not medical advice; check anything under worth_checking before booking.' };
}

export function getProfessional(id: unknown) {
  const c = typeof id === 'string' ? byId.get(id) : undefined;
  if (!c) return null;
  return {
    id: c.id,
    name: c.name,
    role: c.role,
    practice: c.practice ?? null,
    where: place(c),
    modes: c.practical.modes,
    cost: c.practical.billingNote ?? cost(c),
    next_available: c.practical.nextAvailable,
    weekends: c.practical.weekends,
    languages: c.practical.languages,
    experienced_with: c.expertise.map((e) => e.area),
    how_they_work: c.evidence.filter((e) => e.trait !== 'expertise').map((e) => e.patientFacing).slice(0, 6),
    qualifications: (c.qualifications ?? []).map((q) => [q.title, q.detail].filter(Boolean).join(', ')),
    profile: `${SITE}/clinician/${c.id}`,
    booking: c.bookingUrl,
  };
}

const ok = (id: Rpc['id'], result: Json | object) => ({ jsonrpc: '2.0', id: id ?? null, result });
const fail = (id: Rpc['id'], code: number, message: string) => ({ jsonrpc: '2.0', id: id ?? null, error: { code, message } });
const content = (data: object) => ({ content: [{ type: 'text', text: JSON.stringify(data, null, 2) }], structuredContent: data });

/** One JSON-RPC message → its response, or null for a notification. */
export function handle(msg: Rpc): object | null {
  if (!msg || typeof msg !== 'object' || msg.jsonrpc !== '2.0' || typeof msg.method !== 'string') return fail(msg?.id, -32600, 'Invalid request');
  const isNotification = msg.id === undefined;
  switch (msg.method) {
    case 'initialize':
      return ok(msg.id, {
        protocolVersion: PROTOCOL_VERSION,
        capabilities: { tools: { listChanged: false } },
        serverInfo: { name: 'watl', title: 'WATL', version: '1.0.0' },
        instructions:
          'WATL finds Australian health professionals who fit a person. Call find_professionals with what they have told you (needs, practical limits, style), then get_professional for detail. Present each result’s reason and anything worth checking. Never invent facts about a professional.',
      });
    case 'ping':
      return ok(msg.id, {});
    case 'tools/list':
      return ok(msg.id, { tools: TOOLS });
    case 'tools/call': {
      const name = msg.params?.name;
      const args = (msg.params?.arguments ?? {}) as Record<string, unknown>;
      if (name === 'find_professionals') return ok(msg.id, content(findProfessionals(args)));
      if (name === 'get_professional') {
        const p = getProfessional(args.id);
        return ok(msg.id, p ? content(p) : { content: [{ type: 'text', text: 'No professional with that id.' }], isError: true });
      }
      return fail(msg.id, -32602, 'Unknown tool');
    }
    default:
      if (isNotification || msg.method.startsWith('notifications/')) return null;
      return fail(msg.id, -32601, 'Method not found');
  }
}
