import { redirect } from 'next/navigation';

// Preserve existing shared links without showing the retired campaign URL.
export default function LegacyMarketplaceRedirect() {
  redirect('/lp/server-marketplace');
}
