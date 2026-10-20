'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { SidebarLayout } from '@/components/layout/sidebar-layout';
import { InlinePageLoading } from '@/components/layout/page-loading';

export default function ProviderClaimsPage() {
  const router = useRouter();

  useEffect(() => {
    // Redirect to claims history
    router.replace('/provider/claims/history');
  }, [router]);

  return (
    <SidebarLayout>
      <InlinePageLoading
        title="Claims History"
        description="Review submitted claims and their statuses"
        message="Opening claims history..."
      />
    </SidebarLayout>
  );
}
