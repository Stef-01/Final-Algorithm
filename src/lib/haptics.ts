import * as Haptics from 'expo-haptics';
import { Platform } from 'react-native';

// A light physical tap at the moments that matter (saving, passing, choosing a goal). Phones only;
// never throws.
export function tap(kind: 'light' | 'save' = 'light') {
  if (Platform.OS === 'web') return;
  const p = kind === 'save' ? Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success) : Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  p.catch(() => {});
}
