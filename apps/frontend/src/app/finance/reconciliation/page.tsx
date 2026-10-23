'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/auth-context';
import { SidebarLayout } from '@/components/layout/sidebar-layout';
import { InlinePageLoading } from '@/components/layout/page-loading';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { DollarSign } from 'lucide-react';

export default function FinanceReconciliationPage() {
  const router = useRouter();
  const { loading, isAuthenticated } = useAuth();

  useEffect(() => {
    if (!loading && !isAuthenticated) {
      router.push('/login');
    }
  }, [loading, isAuthenticated, router]);

  if (loading) {
    return (
      <SidebarLayout>
        <InlinePageLoading title="Reconciliation" message="Opening reconciliation..." />
      </SidebarLayout>
    );
  }

  if (!isAuthenticated) return null;

  return (
    <SidebarLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Bank Reconciliation</h1>
          <p className="text-gray-600 mt-1">Reconcile bank statements with ledger accounts</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Bank Reconciliation System</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-center py-12">
              <DollarSign className="w-16 h-16 mx-auto mb-4 text-cyan-600 opacity-50" />
              <h3 className="text-xl font-semibold text-gray-900 mb-2">Coming Soon</h3>
              <p className="text-gray-600 mb-6">
                The bank reconciliation system is currently under development.
              </p>
              <div className="max-w-md mx-auto text-left space-y-2">
                <p className="text-sm text-gray-600">✓ Import bank statements</p>
                <p className="text-sm text-gray-600">✓ Match transactions automatically</p>
                <p className="text-sm text-gray-600">✓ Identify discrepancies</p>
                <p className="text-sm text-gray-600">✓ Generate reconciliation reports</p>
              </div>
              <Button 
                variant="outline" 
                className="mt-6"
                onClick={() => router.push('/finance/dashboard')}
              >
                Back to Dashboard
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </SidebarLayout>
  );
}
