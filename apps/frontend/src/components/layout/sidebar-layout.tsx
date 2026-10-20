'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/auth-context';
import { Button } from '@/components/ui/button';
import { InlinePageLoading } from '@/components/layout/page-loading';
import { authFetch } from '@/lib/auth-fetch';
import { Bell, ChevronRight, Menu, X } from 'lucide-react';

interface NavItem {
  name: string;
  href: string;
  icon: React.ReactNode;
  badge?: number;
  glowColor?: string;
}

interface SidebarLayoutProps {
  children: React.ReactNode;
}

export function SidebarLayout({ children }: SidebarLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [newApplicationsCount, setNewApplicationsCount] = useState(0);
  const [newGopCount, setNewGopCount] = useState(0);
  const pathname = usePathname();
  const router = useRouter();
  const { user, loading, logout } = useAuth();
  const userRoles = user?.roles || [];
  const isAdmin = userRoles.includes('system_admin');
  const isAuthorizationUser = userRoles.includes('ambulance_operator') || userRoles.includes('africa_assist_authorization');
  const isDashboardRoute = pathname === '/dashboard' || pathname?.endsWith('/dashboard');

  useEffect(() => {
    if (!sidebarOpen) return;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setSidebarOpen(false);
    };
    window.addEventListener('keydown', closeOnEscape);
    return () => window.removeEventListener('keydown', closeOnEscape);
  }, [sidebarOpen]);

  const handleLogout = async () => {
    try {
      await logout();
      router.push('/login');
    } catch (error) {
      console.error('Logout failed:', error);
      // Force redirect even if logout fails
      router.push('/login');
    }
  };

  // Fetch new applications count for admins and call centre
  useEffect(() => {
    const fetchNewApplicationsCount = async () => {
      if (loading || !user) {
        return;
      }

      const isCallCentre = userRoles.includes('call_centre_agent');
      
      if (isAdmin || isCallCentre) {
        try {
          // Fetch applications count
          const appResponse = await authFetch(isCallCentre ? '/api/call-centre/applications' : '/api/admin/applications');
          const appData = await appResponse.json();
          
          // Call centre only sees 'submitted', admin sees both 'submitted' and 'under_review'
          const submittedCount = isCallCentre 
            ? appData.applications?.filter((app: any) => app.status === 'submitted').length || 0
            : appData.applications?.filter((app: any) => app.status === 'submitted' || app.status === 'under_review').length || 0;
          
          setNewApplicationsCount(submittedCount);
        } catch (error) {
          console.error('Failed to fetch applications count:', error);
        }
      }
    };

    fetchNewApplicationsCount();
    // Refresh every 30 seconds
    const interval = setInterval(fetchNewApplicationsCount, 30000);
    return () => clearInterval(interval);
  }, [loading, user]);

  useEffect(() => {
    const fetchNewGopCount = async () => {
      if (loading || !user) {
        return;
      }

      const isClaimsUser = userRoles.includes('claims') || userRoles.includes('claims_assessor');
      const isAuthorizationUserLocal = userRoles.includes('ambulance_operator') || userRoles.includes('africa_assist_authorization');
      const isAdminUser = userRoles.includes('system_admin') || userRoles.includes('admin');

      if (!isClaimsUser && !isAuthorizationUserLocal && !isAdminUser) {
        setNewGopCount(0);
        return;
      }

      try {
        const response = await authFetch('/api/gop-notifications');
        if (!response.ok) {
          setNewGopCount(0);
          return;
        }

        const data = await response.json();
        setNewGopCount(data.newGopCount || 0);
      } catch (error) {
        console.error('Failed to fetch GOP notifications:', error);
      }
    };

    fetchNewGopCount();

    const interval = setInterval(fetchNewGopCount, 30000);
    const refreshFromUpload = () => fetchNewGopCount();

    window.addEventListener('day1:gop-intake-updated', refreshFromUpload);
    return () => {
      clearInterval(interval);
      window.removeEventListener('day1:gop-intake-updated', refreshFromUpload);
    };
  }, [loading, user]);

  // Get navigation items based on user role
  const getNavigationForRole = (): NavItem[] => {
    // If no user, return empty navigation
    if (!user) {
      console.log('No user found, returning empty navigation');
      return [];
    }

    console.log('User object:', user);
    console.log('User roles:', user?.roles);

    const userRoles = user?.roles || [];
    const isAdmin = userRoles.includes('system_admin');
    const isOperationsManager = userRoles.includes('operations_manager');
    const isBroker = userRoles.includes('broker');
    const isClaims = userRoles.includes('claims');
    const isClaimsAssessor = userRoles.includes('claims_assessor') || isClaims;
    const isComplianceOfficer = userRoles.includes('compliance_officer');
    const isFinanceManager = userRoles.includes('finance_manager');
    const isMarketingManager = userRoles.includes('marketing_manager');
    const isProvider = userRoles.includes('provider');
    const isCallCentreAgent = userRoles.includes('call_centre_agent');
    const isAmbulanceOperator = userRoles.includes('ambulance_operator');
    const isAfricaAssistAuthorization = userRoles.includes('africa_assist_authorization');
    const isAuthorizationUser = isAmbulanceOperator || isAfricaAssistAuthorization;
    const isMember = userRoles.includes('member');

    console.log('Role checks:', {
      isAdmin,
      isOperationsManager,
      isBroker,
      isClaimsAssessor,
      isComplianceOfficer,
      isFinanceManager,
      isMarketingManager,
      isProvider,
      isCallCentreAgent,
      isAmbulanceOperator,
      isAfricaAssistAuthorization,
      isMember
    });

    // Admin navigation
    if (isAdmin) {
      return [
        {
          name: 'Admin Dashboard',
          href: '/admin/dashboard',
          glowColor: '#3b82f6', // Blue
          icon: (
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
          ),
        },
        {
          name: 'Member Applications',
          href: '/admin/applications',
          badge: newApplicationsCount,
          glowColor: '#22c55e', // Green
          icon: (
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          ),
        },
        {
          name: 'Members',
          href: '/admin/members',
          glowColor: '#8b5cf6', // Purple
          icon: (
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
            </svg>
          ),
        },
        {
          name: 'Policy Creator',
          href: '/admin/products',
          glowColor: '#f59e0b', // Amber
          icon: (
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
            </svg>
          ),
        },
        {
          name: 'Claims',
          href: '/admin/claims',
          glowColor: '#10b981', // Emerald
          icon: (
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
          ),
        },
        {
          name: 'Provider Management',
          href: '/admin/providers',
          glowColor: '#14b8a6', // Teal
          icon: (
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
            </svg>
          ),
        },
        {
          name: 'Brokers',
          href: '/admin/brokers',
          glowColor: '#6366f1', // Indigo
          icon: (
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
          ),
        },
        {
          name: 'Group Setup',
          href: '/admin/group-setup',
          glowColor: '#a855f7', // Purple
          icon: (
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
          ),
        },
        {
          name: 'Audit Log',
          href: '/admin/audit',
          glowColor: '#ef4444', // Red
          icon: (
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          ),
        },
        {
          name: 'Roles',
          href: '/admin/roles',
          glowColor: '#f97316', // Orange
          icon: (
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
            </svg>
          ),
        },
        {
          name: 'Rules',
          href: '/admin/rules',
          glowColor: '#06b6d4', // Sky
          icon: (
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 7h6m-6 4h6" />
            </svg>
          ),
        },
        {
          name: 'Data Import',
          href: '/admin/data-import',
          glowColor: '#0ea5e9', // Sky blue
          icon: (
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
            </svg>
          ),
        },
      ];
    }

    // Operations Manager navigation
    if (isOperationsManager) {
      return [
        {
          name: 'Dashboard',
          href: '/operations/dashboard',
          glowColor: '#3b82f6', // Blue
          icon: (
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
            </svg>
          ),
        },
        {
          name: 'Debit Orders',
          href: '/operations/debit-orders',
          glowColor: '#8b5cf6', // Purple
          icon: (
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
            </svg>
          ),
        },
        {
          name: 'Manage Groups',
          href: '/operations/manage-groups',
          glowColor: '#ec4899', // Pink
          icon: (
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
          ),
        },
        {
          name: 'Manage Members',
          href: '/operations/members',
          glowColor: '#22c55e', // Green
          icon: (
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
            </svg>
          ),
        },
        {
          name: 'Call Centre',
          href: '/call-centre/dashboard',
          glowColor: '#14b8a6', // Teal
          icon: (
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
            </svg>
          ),
        },
        {
          name: 'Providers Directory',
          href: '/operations/providers',
          glowColor: '#f59e0b', // Amber
          icon: (
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
            </svg>
          ),
        },
        {
          name: 'Arrears Management',
          href: '/operations/arrears',
          glowColor: '#ef4444', // Red
          icon: (
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          ),
        },
        {
          name: 'Claims Oversight',
          href: '/operations/claims',
          glowColor: '#10b981', // Emerald
          icon: (
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
          ),
        },
        {
          name: 'Broker Communications',
          href: '/operations/broker-comms',
          glowColor: '#6366f1', // Indigo
          icon: (
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
            </svg>
          ),
        },
        {
          name: 'Reports',
          href: '/operations/reports',
          glowColor: '#22d3ee', // Cyan
          icon: (
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          ),
        },
      ];
    }

    // Broker navigation
    if (isBroker) {
      return [
        {
          name: 'Dashboard',
          href: '/broker/dashboard',
          glowColor: '#3b82f6', // Blue
          icon: (
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
            </svg>
          ),
        },
        {
          name: 'Leads',
          href: '/broker/leads',
          glowColor: '#22c55e', // Green
          icon: (
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
            </svg>
          ),
        },
        {
          name: 'Quotes',
          href: '/broker/quotes',
          glowColor: '#8b5cf6', // Purple
          icon: (
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          ),
        },
        {
          name: 'Applications',
          href: '/broker/applications',
          glowColor: '#ec4899', // Pink
          icon: (
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
          ),
        },
        {
          name: 'Policies',
          href: '/broker/policies',
          glowColor: '#f59e0b', // Amber
          icon: (
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          ),
        },
        {
          name: 'Commissions',
          href: '/broker/commissions',
          glowColor: '#22d3ee', // Cyan
          icon: (
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          ),
        },
        {
          name: 'Profile',
          href: '/profile',
          glowColor: '#a855f7', // Purple
          icon: (
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
          ),
        },
      ];
    }

    // Claims navigation
    if (isClaims) {
      return [
        {
          name: 'Dashboard',
          href: '/claims/dashboard',
          glowColor: '#3b82f6', // Blue
          icon: (
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
            </svg>
          ),
        },
        {
          name: 'Hospital Claims',
          href: '/claims/hospital',
          glowColor: '#14b8a6', // Teal
          icon: (
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5m4 0v-5a2 2 0 00-2-2h0a2 2 0 00-2 2v5m2-13v4m-2-2h4" />
            </svg>
          ),
        },
        {
          name: 'Claims Queue',
          href: '/claims/queue',
          glowColor: '#22c55e', // Green
          icon: (
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
          ),
        },
        {
          name: 'Pre-Auth Queue',
          href: '/claims/preauth',
          glowColor: '#8b5cf6', // Purple
          icon: (
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
            </svg>
          ),
        },
        {
          name: 'Fraud Cases',
          href: '/claims/fraud',
          glowColor: '#ef4444', // Red
          icon: (
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          ),
        },
      ];
    }

    // Finance Manager navigation
    if (isFinanceManager) {
      return [
        {
          name: 'Dashboard',
          href: '/finance/dashboard',
          glowColor: '#3b82f6', // Blue
          icon: (
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
            </svg>
          ),
        },
        {
          name: 'Member List',
          href: '/operations/members',
          glowColor: '#22c55e', // Green
          icon: (
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
            </svg>
          ),
        },
        {
          name: 'Group List',
          href: '/operations/manage-groups',
          glowColor: '#a855f7', // Purple
          icon: (
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
          ),
        },
        {
          name: 'Ledger',
          href: '/finance/ledger',
          glowColor: '#22c55e', // Green
          icon: (
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
            </svg>
          ),
        },
        {
          name: 'Journal Entries',
          href: '/finance/journal-entries',
          glowColor: '#8b5cf6', // Purple
          icon: (
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          ),
        },
        {
          name: 'Reconciliation',
          href: '/finance/reconciliation',
          glowColor: '#ec4899', // Pink
          icon: (
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
            </svg>
          ),
        },
        {
          name: 'Trial Balance',
          href: '/finance/trial-balance',
          glowColor: '#f59e0b', // Amber
          icon: (
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          ),
        },
        {
          name: 'Payment Batches',
          href: '/finance/payment-batches',
          glowColor: '#14b8a6', // Teal
          icon: (
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
            </svg>
          ),
        },
      ];
    }

    // Marketing Manager navigation
    if (isMarketingManager) {
      return [
        {
          name: 'Dashboard',
          href: '/marketing/dashboard',
          glowColor: '#3b82f6', // Blue
          icon: (
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
            </svg>
          ),
        },
        {
          name: 'Leads',
          href: '/marketing/leads',
          glowColor: '#22c55e', // Green
          icon: (
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
          ),
        },
        {
          name: 'Lead Scoring',
          href: '/marketing/lead-scoring',
          glowColor: '#8b5cf6', // Purple
          icon: (
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
          ),
        },
        {
          name: 'Campaigns',
          href: '/marketing/campaigns',
          glowColor: '#ec4899', // Pink
          icon: (
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-1.234 9.168-3v14c-1.543-1.766-5.067-3-9.168-3H7a3.988 3.988 0 01-1.564-.317z" />
            </svg>
          ),
        },
        {
          name: 'Workflows',
          href: '/marketing/workflows',
          glowColor: '#f59e0b', // Amber
          icon: (
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
          ),
        },
        {
          name: 'Landing Pages',
          href: '/marketing/landing-pages',
          glowColor: '#14b8a6', // Teal
          icon: (
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          ),
        },
        {
          name: 'Content Library',
          href: '/marketing/content-library',
          glowColor: '#6366f1', // Indigo
          icon: (
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
            </svg>
          ),
        },
        {
          name: 'Referrals',
          href: '/marketing/referrals',
          glowColor: '#10b981', // Emerald
          icon: (
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
            </svg>
          ),
        },
        {
          name: 'Onboarding',
          href: '/marketing/onboarding',
          glowColor: '#ef4444', // Red
          icon: (
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
            </svg>
          ),
        },
        {
          name: 'AI & Automation',
          href: '/marketing/ai-automation',
          glowColor: '#22d3ee', // Cyan
          icon: (
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
            </svg>
          ),
        },
        {
          name: 'Consent',
          href: '/marketing/consent',
          glowColor: '#84cc16', // Lime
          icon: (
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
            </svg>
          ),
        },
        {
          name: 'Analytics',
          href: '/marketing/analytics',
          glowColor: '#a855f7', // Purple
          icon: (
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
          ),
        },
        {
          name: 'Budget & ROI',
          href: '/marketing/budget',
          glowColor: '#eab308', // Yellow
          icon: (
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          ),
        },
        {
          name: 'Reports',
          href: '/marketing/reports',
          glowColor: '#06b6d4', // Sky
          icon: (
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          ),
        },
      ];
    }

    // Compliance Officer navigation
    if (isComplianceOfficer) {
      return [
        {
          name: 'Dashboard',
          href: '/compliance/dashboard',
          glowColor: '#3b82f6', // Blue
          icon: (
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
            </svg>
          ),
        },
        {
          name: 'POPIA',
          href: '/compliance/popia',
          glowColor: '#22c55e', // Green
          icon: (
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
            </svg>
          ),
        },
        {
          name: 'Data Requests',
          href: '/compliance/data-requests',
          glowColor: '#8b5cf6', // Purple
          icon: (
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          ),
        },
        {
          name: 'Breaches',
          href: '/compliance/breaches',
          glowColor: '#ef4444', // Red
          icon: (
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          ),
        },
        {
          name: 'Complaints',
          href: '/compliance/complaints',
          glowColor: '#f59e0b', // Amber
          icon: (
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" />
            </svg>
          ),
        },
        {
          name: 'Reports',
          href: '/compliance/reports',
          glowColor: '#14b8a6', // Teal
          icon: (
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          ),
        },
      ];
    }

    // Provider navigation
    if (isProvider) {
      return [
        {
          name: 'Dashboard',
          href: '/provider/dashboard',
          glowColor: '#3b82f6', // Blue
          icon: (
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
            </svg>
          ),
        },
        {
          name: 'Check Eligibility',
          href: '/provider/eligibility',
          glowColor: '#22c55e', // Green
          icon: (
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          ),
        },
        {
          name: 'Submit Claim',
          href: '/provider/claims',
          glowColor: '#8b5cf6', // Purple
          icon: (
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
            </svg>
          ),
        },
        {
          name: 'Pre-Authorization',
          href: '/provider/preauth',
          glowColor: '#ec4899', // Pink
          icon: (
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          ),
        },
        {
          name: 'Payments',
          href: '/provider/payments',
          glowColor: '#f59e0b', // Amber
          icon: (
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
            </svg>
          ),
        },
      ];
    }

    // Call Centre Agent navigation
    if (isCallCentreAgent) {
      return [
        {
          name: 'Dashboard',
          href: '/call-centre/dashboard',
          glowColor: '#3b82f6', // Blue
          icon: (
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
            </svg>
          ),
        },
        {
          name: 'Member Support',
          href: '/call-centre/support',
          badge: newApplicationsCount,
          glowColor: '#22c55e', // Green
          icon: (
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
            </svg>
          ),
        },
        {
          name: 'Member Lookup',
          href: '/call-centre/members',
          glowColor: '#8b5cf6', // Purple
          icon: (
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          ),
        },
        {
          name: 'Tickets',
          href: '/call-centre/tickets',
          glowColor: '#ec4899', // Pink
          icon: (
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 5v2m0 4v2m0 4v2M5 5a2 2 0 00-2 2v3a2 2 0 110 4v3a2 2 0 002 2h14a2 2 0 002-2v-3a2 2 0 110-4V7a2 2 0 00-2-2H5z" />
            </svg>
          ),
        },
        {
          name: 'Knowledge Base',
          href: '/call-centre/knowledge',
          glowColor: '#f59e0b', // Amber
          icon: (
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
            </svg>
          ),
        },
      ];
    }

    // Authorizations navigation
    if (isAuthorizationUser) {
      return [
        {
          name: 'Dashboard',
          href: '/authorizations/dashboard',
          glowColor: '#3b82f6', // Blue
          icon: (
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
            </svg>
          ),
        },
        {
          name: isAfricaAssistAuthorization ? 'Hospital Benefit Check' : 'Ambulance Benefit Check',
          href: '/authorizations/member-verification',
          glowColor: isAfricaAssistAuthorization ? '#14b8a6' : '#dc2626',
          icon: (
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={isAfricaAssistAuthorization ? 'M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5m4 0v-5a2 2 0 00-2-2h0a2 2 0 00-2 2v5m2-13v4m-2-2h4' : 'M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z'} />
            </svg>
          ),
        },
        ...(isAfricaAssistAuthorization
          ? [
            {
              name: 'GOP Intake',
              href: '/authorizations/gop-intake',
              badge: newGopCount,
              glowColor: '#8b5cf6', // Purple
              icon: (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              ),
            },
          ] : []),
        {
          name: 'Verification History',
          href: '/authorizations/history',
          glowColor: '#f59e0b', // Amber
          icon: (
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          ),
        },
      ];
    }

    // Member navigation (default)
    return [
      {
        name: 'Dashboard',
        href: '/dashboard',
        glowColor: '#3b82f6', // Blue
        icon: (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
          </svg>
        ),
      },
      {
        name: 'My Policies',
        href: '/policies',
        glowColor: '#22c55e', // Green
        icon: (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
        ),
      },
      {
        name: 'My Claims',
        href: '/claims',
        glowColor: '#8b5cf6', // Purple
        icon: (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
          </svg>
        ),
      },
      {
        name: 'Dependants',
        href: '/dependants',
        glowColor: '#ec4899', // Pink
        icon: (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
          </svg>
        ),
      },
      {
        name: 'Payments',
        href: '/payments',
        glowColor: '#f59e0b', // Amber
        icon: (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
          </svg>
        ),
      },
      {
        name: 'Documents',
        href: '/documents',
        glowColor: '#14b8a6', // Teal
        icon: (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
          </svg>
        ),
      },
      {
        name: 'Consent',
        href: '/consent',
        glowColor: '#6366f1', // Indigo
        icon: (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
          </svg>
        ),
      },
      {
        name: 'Profile',
        href: '/profile',
        glowColor: '#ef4444', // Red
        icon: (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
          </svg>
        ),
      },
    ];
  };

  const navigation = getNavigationForRole();
  const currentPage = navigation.find((item) => item.href === pathname)?.name
    || navigation.find((item) => pathname?.startsWith(`${item.href}/`))?.name
    || 'Workspace';

  // Show loading state while user data is being fetched
  if (loading) {
    return (
      <div className="min-h-screen bg-[#f8fbff]">
        <div className="flex min-h-screen">
          <aside className="hidden w-64 border-r border-[#dce8f7] bg-white lg:block">
            <div className="flex h-16 items-center border-b border-gray-200 px-4">
              <Image src="/kervox-logo.svg" alt="KERVOX" width={157} height={32} className="h-8 w-auto" />
            </div>
            <div className="space-y-3 px-3 py-4">
              {[...Array(6)].map((_, index) => (
                <div key={index} className="h-12 animate-pulse rounded-lg bg-slate-100" />
              ))}
            </div>
          </aside>

          <main className="flex-1 p-6">
            <InlinePageLoading message="Opening your workspace..." />
          </main>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f8fbff] text-[#06152d]">
      {/* Mobile sidebar backdrop */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-[#06152d]/50 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Sidebar */}
      <aside
        aria-label="Workspace navigation"
        className={`
          fixed top-0 left-0 z-40 h-screen w-72 max-w-[85vw] transition-all duration-300 ease-in-out
          bg-white border-r border-[#dce8f7]
          ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
          lg:translate-x-0
          ${sidebarCollapsed ? 'lg:w-16' : 'lg:w-64'}
        `}
      >
        <div className="flex flex-col h-full">
          {/* Logo */}
          <div className={`flex h-16 shrink-0 items-center justify-between border-b border-[#dce8f7] px-4 ${sidebarCollapsed ? 'lg:translate-x-[3px] lg:justify-center lg:gap-px lg:px-[3px]' : ''}`}>
            <Link href="/dashboard" className={`flex items-center ${sidebarCollapsed ? 'lg:hidden' : ''}`} aria-label="KERVOX dashboard">
              <Image src="/kervox-logo.svg" alt="" width={157} height={32} className="h-8 w-auto" />
            </Link>
            {sidebarCollapsed && (
              <Link href="/dashboard" className="hidden h-7 w-7 shrink-0 items-center justify-center lg:flex lg:translate-x-[3px]" aria-label="KERVOX dashboard">
                <Image src="/kervox-k.svg" alt="" width={28} height={28} className="h-7 w-7 object-contain" />
              </Link>
            )}
            <button
              onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
              className={`hidden shrink-0 items-center justify-center rounded-md text-[#52657d] hover:bg-[#f1f7ff] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#2563eb] lg:flex ${sidebarCollapsed ? 'h-6 w-6 lg:translate-x-[3px]' : 'h-8 w-8'}`}
              aria-label={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
              aria-expanded={!sidebarCollapsed}
            >
              <svg className={`${sidebarCollapsed ? 'h-4 w-4' : 'h-5 w-5'} text-gray-500`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d={sidebarCollapsed ? 'M13 5l7 7-7 7M5 5l7 7-7 7' : 'M11 19l-7-7 7-7m8 14l-7-7 7-7'}
                />
              </svg>
            </button>
            <button type="button" onClick={() => setSidebarOpen(false)} className="rounded-md p-2 text-[#52657d] hover:bg-[#f1f7ff] lg:hidden" aria-label="Close navigation">
              <X className="h-5 w-5" aria-hidden="true" />
            </button>
          </div>

          {/* Navigation */}
          <nav aria-label="Primary navigation" className={`flex-1 space-y-1 overflow-y-auto px-3 py-4 ${sidebarCollapsed ? 'lg:px-2' : ''}`}>
            <p className={`px-3 pb-2 pt-1 text-[10px] font-bold uppercase tracking-[0.2em] text-[#718096] ${sidebarCollapsed ? 'lg:hidden' : ''}`}>Your workspace</p>
            {navigation.map((item) => {
              const isActive = pathname === item.href || pathname?.startsWith(`${item.href}/`);
              
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className="block"
                  title={sidebarCollapsed ? item.name : undefined}
                  aria-current={isActive ? 'page' : undefined}
                  onClick={() => setSidebarOpen(false)}
                >
                  <div className="relative">
                    <div
                      className={`
                        w-full min-h-10 px-3 py-2 text-sm rounded-lg flex items-center gap-3 relative transition-colors duration-200
                        ${isActive 
                          ? 'bg-[#eff6ff] text-[#1d4ed8] font-semibold' 
                          : 'text-[#52657d] hover:bg-[#f1f7ff] hover:text-[#06152d]'
                        }
                        ${sidebarCollapsed ? 'lg:justify-center lg:px-2' : ''}
                      `}
                    >
                      {isActive && <span aria-hidden="true" className="absolute left-0 top-2 bottom-2 w-[3px] rounded-full bg-[#2563eb]" />}
                      <span className="relative z-30">{item.icon}</span>
                      <span className={`relative z-30 flex-1 ${sidebarCollapsed ? 'lg:hidden' : ''}`}>{item.name}</span>
                      {item.badge && item.badge > 0 && (
                        <span className={`relative z-30 inline-flex items-center justify-center rounded-full bg-red-600 px-2 py-0.5 text-xs font-bold leading-none text-white ${sidebarCollapsed ? 'lg:hidden' : ''}`}>
                          {item.badge}
                        </span>
                      )}
                    </div>
                    {sidebarCollapsed && item.badge && item.badge > 0 && (
                      <span className="absolute -right-1 -top-1 z-40 hidden h-5 w-5 items-center justify-center rounded-full bg-red-600 text-xs font-bold leading-none text-white lg:inline-flex">
                        {item.badge}
                      </span>
                    )}
                  </div>
                </Link>
              );
            })}
          </nav>

          {/* Logout button */}
          <div className={`border-t border-[#dce8f7] px-3 pb-3 pt-3 ${sidebarCollapsed ? 'lg:px-2' : ''}`}>
            {user && <div className={`mb-3 truncate px-3 text-xs text-[#52657d] ${sidebarCollapsed ? 'lg:hidden' : ''}`} title={user.email}>{user.email}</div>}
            <button 
              onClick={handleLogout}
              className={`
                w-full h-10 px-3 text-sm rounded-md border flex items-center gap-3 transition-colors duration-200
                text-[#52657d] hover:text-[#06152d] bg-white hover:bg-[#f1f7ff] border-[#dce8f7]
                ${sidebarCollapsed ? 'lg:justify-center lg:px-2' : ''}
              `}
              title={sidebarCollapsed ? "Log out" : undefined}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
              <span className={`flex-1 font-medium ${sidebarCollapsed ? 'lg:hidden' : ''}`}>Log out</span>
            </button>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <div
        className={`
          transition-all duration-300 ease-in-out
          ${sidebarCollapsed ? 'lg:ml-16' : 'lg:ml-64'}
        `}
      >
        {/* Top bar */}
        <header className="sticky top-0 z-30 bg-white border-b border-[#dce8f7]">
          <div className="flex items-center justify-between h-16 px-4">
            {/* Mobile menu button */}
            <button
              onClick={() => { setSidebarCollapsed(false); setSidebarOpen(!sidebarOpen); }}
              className="lg:hidden p-2 rounded-md hover:bg-[#f1f7ff]"
              aria-label={sidebarOpen ? 'Close navigation' : 'Open navigation'}
              aria-expanded={sidebarOpen}
            >
              {sidebarOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>

            <div className="flex min-w-0 flex-1 items-center gap-2 px-2 sm:px-4">
              <span className="hidden text-xs font-medium uppercase tracking-[0.14em] text-[#718096] sm:block">Workspace</span>
              <ChevronRight aria-hidden="true" className="hidden h-4 w-4 text-[#a0b2ca] sm:block" />
              <span className="truncate text-sm font-semibold text-[#06152d] sm:text-base">{currentPage}</span>
            </div>

            {/* Right side actions */}
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="icon"
                className="relative"
                onClick={() => router.push(isAuthorizationUser ? '/authorizations/gop-intake' : '/claims/hospital')}
                title="New GOP submissions"
              >
                <Bell className="h-5 w-5" />
                {newGopCount > 0 && (
                  <span className="absolute -top-1 -right-1 inline-flex min-w-5 h-5 items-center justify-center rounded-full bg-red-600 px-1 text-[10px] font-bold leading-none text-white">
                    {newGopCount}
                  </span>
                )}
              </Button>
              {user && <Link href={userRoles.includes('member') ? '/member/profile' : '/profile'} aria-label="Open profile" title={user.email} className="flex h-9 w-9 items-center justify-center rounded-full border border-[#c9dcf5] bg-[#eff6ff] text-xs font-bold text-[#1d4ed8]">{user.email?.slice(0, 1).toUpperCase()}</Link>}
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className={`workspace-main p-4 sm:p-6 lg:p-8 ${isDashboardRoute ? 'dashboard-main' : ''} ${pathname?.startsWith('/marketing') ? 'kervox-marketing' : ''}`}>
          {children}
        </main>
      </div>
    </div>
  );
}
