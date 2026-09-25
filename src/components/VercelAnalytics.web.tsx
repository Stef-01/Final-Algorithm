import { Analytics } from '@vercel/analytics/react';
import { usePathname } from 'expo-router';

// Web build only (served from Vercel). Passing the Expo Router path records one
// page view per screen change, since the app is a single-page app.
export function VercelAnalytics() {
  const pathname = usePathname();
  return <Analytics path={pathname} route={pathname} />;
}
