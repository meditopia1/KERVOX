'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/auth-context';
import { SidebarLayout } from '@/components/layout/sidebar-layout';
import { InlinePageLoading } from '@/components/layout/page-loading';

export default function OperationsCallCentrePage() {
  const router = useRouter();
  const { loading, isAuthenticated } = useAuth();

  useEffect(() => {
    if (!loading && !isAuthenticated) {
      router.push('/login');
    }
  }, [loading, isAuthenticated, router]);

  useEffect(() => {
    if (!loading && isAuthenticated) {
      router.replace('/call-centre/dashboard');
    }
  }, [loading, isAuthenticated, router]);

  if (loading) {
    return (
      <SidebarLayout>
        <InlinePageLoading title="Call centre" message="Opening call centre..." />
      </SidebarLayout>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  return (
    <SidebarLayout>
      <InlinePageLoading title="Call centre" message="Taking you to the call centre..." />
    </SidebarLayout>
  );
}
