import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';

// Professionals you've recently opened (ids only, newest first, on this device), so Home can offer
// to pick up where you left off.

const KEY = 'watl_recent';
const MAX = 6;

export const withRecent = (list: string[], id: string) => [id, ...list.filter((x) => x !== id)].slice(0, MAX);

export async function markViewed(id: string) {
  try {
    const raw: unknown = JSON.parse((await AsyncStorage.getItem(KEY)) ?? '[]');
    const list = Array.isArray(raw) ? raw.filter((x): x is string => typeof x === 'string') : [];
    await AsyncStorage.setItem(KEY, JSON.stringify(withRecent(list, id)));
  } catch {
    // Nice to have; never worth an error.
  }
}

/** Re-read each time the screen comes back into view (Home stays mounted under a profile). */
export function useRecent() {
  const [recent, setRecent] = useState<string[]>([]);
  useFocusEffect(
    useCallback(() => {
      AsyncStorage.getItem(KEY)
        .then((raw) => {
          const v: unknown = raw ? JSON.parse(raw) : [];
          if (Array.isArray(v)) setRecent(v.filter((x): x is string => typeof x === 'string'));
        })
        .catch(() => {});
    }, []),
  );
  return recent;
}
