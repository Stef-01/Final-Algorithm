import AsyncStorage from '@react-native-async-storage/async-storage';
import { useCallback, useEffect, useRef, useState } from 'react';

// Connect your AI: which assistant you linked WATL to, and what you let it use. On this device
// only. The connector itself lives in the assistant (you add WATL's URL there); this remembers
// your choices so Profile can show them.

export const MCP_URL = 'https://final-algorithm.vercel.app/api/mcp';
const KEY = 'watl_ai';

export type Client = 'claude' | 'chatgpt';
export type Share = 'goals' | 'practical' | 'chats';
export type Connection = { client: Client; since: string; shares: Share[] };

export const CLIENTS: Record<Client, { name: string; steps: string[] }> = {
  claude: { name: 'Claude', steps: ['Settings', 'Connectors', 'Add custom connector'] },
  chatgpt: { name: 'ChatGPT', steps: ['Settings', 'Apps & Connectors', 'Create'] },
};

export const SHARES: { id: Share; label: string; sub: string }[] = [
  { id: 'goals', label: 'Your WATL goals', sub: 'Get organised, sleep better…' },
  { id: 'practical', label: 'Practical limits', sub: 'Budget, place, telehealth' },
  { id: 'chats', label: 'What you’ve told your AI', sub: 'Needs and how you like to be treated' },
];

export function restoreConnection(raw: unknown): Connection | null {
  const c = raw as Partial<Connection> | null;
  if (!c || (c.client !== 'claude' && c.client !== 'chatgpt') || typeof c.since !== 'string') return null;
  const shares = Array.isArray(c.shares) ? c.shares.filter((s): s is Share => SHARES.some((x) => x.id === s)) : [];
  return { client: c.client, since: c.since, shares };
}

/** `onLoad` runs once if a saved connection is found. */
export function useConnection(onLoad?: (c: Connection) => void) {
  const [connection, set] = useState<Connection | null>(null);
  const loaded = useRef(onLoad);
  useEffect(() => {
    AsyncStorage.getItem(KEY)
      .then((raw) => {
        const c = raw ? restoreConnection(JSON.parse(raw)) : null;
        set(c);
        if (c) loaded.current?.(c);
      })
      .catch(() => {});
  }, []);
  const save = useCallback((c: Connection | null) => {
    set(c);
    (c ? AsyncStorage.setItem(KEY, JSON.stringify(c)) : AsyncStorage.removeItem(KEY)).catch(() => {});
  }, []);
  return { connection, save };
}
