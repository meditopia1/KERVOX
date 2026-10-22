import { redirect } from 'next/navigation';

// Preserve legacy campaign links by forwarding them to the restored campaign.
export default function LegacyMarketplaceRedirect() {
  redirect('/lp/summer-2026');
}
