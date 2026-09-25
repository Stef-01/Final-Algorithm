/**
 * @jest-environment node
 */
import { POST } from '../api/mcp';
import { findProfessionals, getProfessional, handle, TOOLS, toSignals } from '../server/mcp';

const rpc = (body: unknown) => POST(new Request('http://x/api/mcp', { method: 'POST', body: JSON.stringify(body) }));

describe('WATL as an MCP server', () => {
  it('initialises, lists its tools and answers pings', async () => {
    const init = await (await rpc({ jsonrpc: '2.0', id: 1, method: 'initialize', params: { protocolVersion: '2025-06-18', capabilities: {}, clientInfo: { name: 'test', version: '1' } } })).json();
    expect(init.result.serverInfo.name).toBe('watl');
    expect(init.result.capabilities.tools).toBeDefined();
    expect((await rpc({ jsonrpc: '2.0', method: 'notifications/initialized' })).status).toBe(202);
    const list = await (await rpc({ jsonrpc: '2.0', id: 2, method: 'tools/list' })).json();
    expect(list.result.tools.map((t: { name: string }) => t.name)).toEqual(['find_professionals', 'get_professional']);
    expect(handle({ jsonrpc: '2.0', id: 3, method: 'ping' })).toEqual({ jsonrpc: '2.0', id: 3, result: {} });
    expect(handle({ jsonrpc: '2.0', id: 4, method: 'nope' })).toMatchObject({ error: { code: -32601 } });
  });

  it('turns what the assistant knows into the engine’s signals, dropping anything malformed', () => {
    const s = toSignals({ profession: 'psychologist', needs: ['Burnout', 'Not a real area'], near: 'gold-coast', max_out_of_pocket: 100, style: { communication_directness: 'direct', consultation_pace: 'warp' } });
    expect(s.profession).toBe('psychologist');
    expect(s.clinicalNeeds.map((n) => n.area)).toEqual(['Burnout']);
    expect(s.constraints).toMatchObject({ originLabel: 'Gold Coast', maxKm: 50, maxGap: 100 });
    expect(s.preferences).toEqual({ communication_directness: { value: 'direct', confidence: 'high' } });
  });

  it('ranks real professionals with reasons from their own profiles', async () => {
    const res = await (
      await rpc({ jsonrpc: '2.0', id: 5, method: 'tools/call', params: { name: 'find_professionals', arguments: { profession: 'psychologist', needs: ['Burnout'], near: 'gold-coast', style: { communication_directness: 'direct' }, limit: 3 } } })
    ).json();
    const out = res.result.structuredContent;
    expect(out.results.length).toBeGreaterThan(0);
    expect(out.results.length).toBeLessThanOrEqual(3);
    const top = out.results[0];
    expect(top.profile).toBe(`https://final-algorithm.vercel.app/clinician/${top.id}`);
    expect(top.role).toMatch(/Psycholog/);
    expect(out.results[0].why.length).toBeGreaterThan(0);
    // Internal interview excerpts never leave the server.
    expect(JSON.stringify(out)).not.toContain('excerpt');
  });

  it('says what could be loosened when nobody fits, and looks up one profile', () => {
    const none = findProfessionals({ profession: 'gp', mode: 'in_person_only', near: 'darwin', max_km: 5 });
    expect(none.results).toEqual([]);
    expect(getProfessional('alice-bui')).toMatchObject({ name: 'Alice Bui' });
    expect(getProfessional('nobody')).toBeNull();
    expect(TOOLS.every((t) => t.annotations.readOnlyHint)).toBe(true);
  });
});
