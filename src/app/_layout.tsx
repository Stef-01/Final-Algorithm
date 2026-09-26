import { useFonts } from 'expo-font';
import { Stack, type ErrorBoundaryProps } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { Platform } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { AppError } from '@/components/AppError';
import { AssistantButton } from '@/components/AssistantButton';
import { VercelAnalytics } from '@/components/VercelAnalytics';
import { GoalsProvider } from '@/features/care/goals';
import { SavedProvider } from '@/features/match/saved';
import { SessionProvider } from '@/features/match/session';
import { fontAssets } from '@/lib/theme';

/** If any screen crashes: a way out instead of a blank app (see AppError). */
export function ErrorBoundary(props: ErrorBoundaryProps) {
  return <AppError {...props} />;
}

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts(fontAssets);
  // Web paints straight away and swaps the fonts in when they arrive (first paint was waiting
  // ~0.5 s on five font files). Native waits, where a swap is more jarring.
  if (!fontsLoaded && !fontError && Platform.OS !== 'web') return null;

  return (
    <SafeAreaProvider>
      <SessionProvider>
        <SavedProvider>
          <GoalsProvider>
            <StatusBar style="dark" />
            <VercelAnalytics />
            <Stack screenOptions={{ headerShown: false, animation: 'slide_from_right', contentStyle: { backgroundColor: '#fff' } }}>
              <Stack.Screen name="(tabs)" options={{ animation: 'none' }} />
              <Stack.Screen name="clinician/[id]" />
              <Stack.Screen name="dev/states" />
              <Stack.Screen name="join" />
              <Stack.Screen name="filters" />
              <Stack.Screen name="rate" options={{ animation: 'slide_from_bottom' }} />
              <Stack.Screen name="connect" />
              <Stack.Screen name="compare" />
              {['safety', 'book/[id]', 'refine'].map((name) => (
                <Stack.Screen key={name} name={name} options={{ presentation: 'transparentModal', animation: 'fade' }} />
              ))}
            </Stack>
            <AssistantButton />
          </GoalsProvider>
        </SavedProvider>
      </SessionProvider>
    </SafeAreaProvider>
  );
}
