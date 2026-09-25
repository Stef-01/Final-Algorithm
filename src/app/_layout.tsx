import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { Platform } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { AssistantButton } from '@/components/AssistantButton';
import { VercelAnalytics } from '@/components/VercelAnalytics';
import { SavedProvider } from '@/features/match/saved';
import { SessionProvider } from '@/features/match/session';
import { fontAssets } from '@/lib/theme';

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts(fontAssets);
  // Web paints straight away and swaps the fonts in when they arrive (first paint was waiting
  // ~0.5 s on five font files). Native waits, where a swap is more jarring.
  if (!fontsLoaded && !fontError && Platform.OS !== 'web') return null;

  return (
    <SafeAreaProvider>
      <SessionProvider>
        <SavedProvider>
          <StatusBar style="dark" />
          <VercelAnalytics />
          <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: '#fff' } }}>
            <Stack.Screen name="(tabs)" options={{ animation: 'none' }} />
            <Stack.Screen name="clinician/[id]" />
            <Stack.Screen name="dev/states" />
            {['safety', 'book/[id]', 'refine'].map((name) => (
              <Stack.Screen key={name} name={name} options={{ presentation: 'transparentModal', animation: 'fade' }} />
            ))}
          </Stack>
          <AssistantButton />
        </SavedProvider>
      </SessionProvider>
    </SafeAreaProvider>
  );
}
