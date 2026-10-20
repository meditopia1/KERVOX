'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { SidebarLayout } from '@/components/layout/sidebar-layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { User, Eye } from 'lucide-react';
import { authFetch } from '@/lib/auth-fetch';
import { DashboardMetricCard } from '@/components/dashboard/dashboard-metric-card';

export default function CallCentreDashboardPage() {
  const router = useRouter();
  const [stats, setStats] = useState({
    newMembers: 0,
    totalPending: 0
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    try {
      // Load applications
      const appResponse = await authFetch('/api/call-centre/applications');
      if (!appResponse.ok) {
        throw new Error('Failed to fetch applications');
      }
      const appData = await appResponse.json();
      const newMembers = appData.applications?.filter((app: any) => 
        app.status === 'submitted' || app.status === 'under_review'
      ).length || 0;

      setStats({
        newMembers,
        totalPending: newMembers
      });
    } catch (error) {
      console.error('Error loading stats:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <SidebarLayout>
      <div className="space-y-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Call Centre Dashboard</h1>
            <p className="text-gray-600 mt-1">Overview of member support activities</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" onClick={() => router.push('/call-centre/support')}>
              Review Queue
            </Button>
            <Button onClick={() => router.push('/apply?source=call-centre')}>
              + New Application
            </Button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <DashboardMetricCard
            title="New Members"
            value={stats.newMembers}
            subtitle="Pending applications"
            icon={<User className="w-6 h-6 text-cyan-600" />}
            accentColor="rgba(34, 211, 238, 1)"
            glowFrom="rgba(34, 211, 238, 0.075)"
            glowTo="rgba(34, 211, 238, 0.2)"
            iconBackgroundClassName="bg-cyan-100"
          />

          <DashboardMetricCard
            title="Total Pending"
            value={stats.totalPending}
            subtitle="Applications"
            icon={<Eye className="w-6 h-6 text-orange-600" />}
            accentColor="rgba(249, 115, 22, 1)"
            glowFrom="rgba(249, 115, 22, 0.075)"
            glowTo="rgba(249, 115, 22, 0.2)"
            iconBackgroundClassName="bg-orange-100"
          />
        </div>

        {/* Quick Actions */}
        <Card>
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <button
                onClick={() => router.push('/call-centre/support')}
                className="p-4 border border-slate-200 rounded-lg bg-white/90 hover:bg-cyan-50 hover:border-cyan-300 transition-all text-left shadow-sm hover:shadow-md"
              >
                <h3 className="font-semibold text-gray-900 mb-1">Member Support</h3>
                <p className="text-sm text-gray-600">Handle member applications and requests</p>
                {stats.totalPending > 0 && (
                  <span className="inline-block mt-2 px-2 py-1 bg-orange-100 text-orange-700 text-xs font-medium rounded">
                    {stats.totalPending} pending
                  </span>
                )}
              </button>
              <button
                onClick={() => router.push('/call-centre/members')}
                className="p-4 border border-slate-200 rounded-lg bg-white/90 hover:bg-cyan-50 hover:border-cyan-300 transition-all text-left shadow-sm hover:shadow-md"
              >
                <h3 className="font-semibold text-gray-900 mb-1">Member Lookup</h3>
                <p className="text-sm text-gray-600">Search and view member information</p>
              </button>
              <button
                onClick={() => router.push('/call-centre/tickets')}
                className="p-4 border border-slate-200 rounded-lg bg-white/90 hover:bg-cyan-50 hover:border-cyan-300 transition-all text-left shadow-sm hover:shadow-md"
              >
                <h3 className="font-semibold text-gray-900 mb-1">Support Tickets</h3>
                <p className="text-sm text-gray-600">Manage support tickets and queries</p>
              </button>
            </div>
          </CardContent>
        </Card>

        {/* Performance Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Today's Activity</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Calls Handled</span>
                  <span className="font-semibold text-gray-900">0</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Avg Response Time</span>
                  <span className="font-semibold text-gray-900">0m</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Members Assisted</span>
                  <span className="font-semibold text-gray-900">0</span>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Recent Activity</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-500 text-center py-8">No recent activity</p>
            </CardContent>
          </Card>
        </div>
      </div>
    </SidebarLayout>
  );
}
