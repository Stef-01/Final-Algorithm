import { router, type Href } from 'expo-router';

/**
 * Back, or somewhere sensible when there's nothing to go back to (the page was opened from a link
 * or reloaded): without this, Back and Close would do nothing.
 */
export function goBack(fallback: Href = '/') {
  if (router.canGoBack()) router.back();
  else router.replace(fallback);
}
