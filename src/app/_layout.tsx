import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { VercelAnalytics } from '@/components/VercelAnalytics';
import { fontAssets } from '@/lib/theme';

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts(fontAssets);
  if (!fontsLoaded && !fontError) return null;

  return (
    <SafeAreaProvider>
      <StatusBar style="dark" />
      <VercelAnalytics />
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: '#fff' } }}>
        <Stack.Screen name="(tabs)" options={{ animation: 'none' }} />
        <Stack.Screen name="clinician/[id]" />
        <Stack.Screen name="safety" options={{ presentation: 'transparentModal', animation: 'fade' }} />
      </Stack>
    </SafeAreaProvider>
  );
}
