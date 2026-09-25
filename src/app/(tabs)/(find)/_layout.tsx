import { Stack } from 'expo-router';

// The Find tab is one continuous task: open → clarify → (confirm) → matching → matches.
export default function FindLayout() {
  return <Stack screenOptions={{ headerShown: false, animation: 'slide_from_right', contentStyle: { backgroundColor: '#fff' } }} />;
}
