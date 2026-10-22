'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { BrandLogo } from '@/components/brand/brand-logo';
import { Settings2 } from 'lucide-react';

interface NavItem {
  name: string;
  href: string;
  icon: React.ReactNode;
  glowColor: string;
}

interface MemberData {
  id: string;
  member_number: string;
  first_name: string;
  last_name: string;
  email: string;
  mobile: string;
}

export default function MemberLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [memberData, setMemberData] = useState<MemberData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!sidebarOpen) return;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setSidebarOpen(false);
    };
    window.addEventListener('keydown', closeOnEscape);
    return () => window.removeEventListener('keydown', closeOnEscape);
  }, [sidebarOpen]);

  useEffect(() => {
    // Check if member is logged in
    const memberSession = localStorage.getItem('member_session');
    const memberDataStr = localStorage.getItem('member_data');
    
    if (!memberSession || !memberDataStr) {
      router.push('/login');
      return;
    }

    try {
      const storedMemberData = JSON.parse(memberDataStr);
      setMemberData(storedMemberData);
    } catch (error) {
      console.error('Error parsing member data:', error);
      router.push('/login');
    } finally {
      setLoading(false);
    }
  }, [router]);

  const handleLogout = () => {
    localStorage.removeItem('member_session');
    localStorage.removeItem('member_data');
    router.push('/login');
  };

  const navigation = [
    {
      name: 'Dashboard',
      href: '/member/dashboard',
      glowColor: '#3b82f6', // Blue
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
        </svg>
      ),
    },
    {
      name: 'My Claims',
      href: '/member/claims',
      glowColor: '#22c55e', // Green
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
      ),
    },
    {
      name: 'Dependants',
      href: '/member/dependants',
      glowColor: '#8b5cf6', // Purple
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
        </svg>
      ),
    },
    {
      name: 'Documents',
      href: '/member/documents',
      glowColor: '#ec4899', // Pink
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
        </svg>
      ),
    },
    {
      name: 'Payments',
      href: '/member/payments',
      glowColor: '#f59e0b', // Amber
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
        </svg>
      ),
    },
    {
      name: 'Profile',
      href: '/member/profile',
      glowColor: '#14b8a6', // Teal
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
        </svg>
      ),
    },
    {
      name: 'Settings',
      href: '/member/settings',
      glowColor: '#a64c34',
      icon: <Settings2 className="h-5 w-5" aria-hidden="true" />,
    },
  ];

  if (loading) {
    return (
      <div className="premium-workspace flex min-h-screen items-center justify-center" role="status" aria-label="Opening member workspace">
        <div className="flex items-center gap-3 rounded-xl border border-[#e6e0d7] bg-[#fffefa] px-5 py-4 shadow-sm">
          <div className="h-5 w-5 animate-spin rounded-full border-2 border-[#e6d8ca] border-t-[#a64c34] motion-reduce:animate-none" aria-hidden="true" />
          <span className="text-sm text-[#6d675f]">Opening your workspace...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="premium-workspace min-h-screen bg-[#f8fbff] text-[#06152d]">
      {/* Mobile sidebar backdrop */}
      {sidebarOpen && (
        <div
          data-workspace-backdrop
          className="fixed inset-0 z-40 bg-[#2b2926]/45 lg:hidden"
          onClick={() => setSidebarOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Sidebar */}
      <aside
        aria-label="Member navigation"
        data-workspace-sidebar
        className={`fixed inset-y-0 left-0 z-40 w-64 max-w-[85vw] border-r border-[#dce8f7] bg-white transform transition-transform duration-200 ease-in-out motion-reduce:transition-none lg:translate-x-0 ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex flex-col h-full">
          {/* Logo */}
          <div className="flex items-center justify-between h-16 px-6 border-b border-[#dce8f7]">
            <Link href="/member/dashboard" aria-label="KERVOX member dashboard" className="inline-flex items-center">
              <BrandLogo width={148} height={30} />
            </Link>
            <button
              type="button"
              onClick={() => setSidebarOpen(false)}
              className="rounded-md p-2 text-[#6d675f] hover:bg-[#eee9e1] lg:hidden"
              aria-label="Close navigation"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Navigation */}
          <nav aria-label="Primary navigation" data-workspace-nav className="min-h-0 flex-1 space-y-1 overflow-x-hidden overflow-y-auto px-3 py-4">
            <p className="px-3 pb-2 pt-1 text-[10px] font-bold uppercase tracking-[0.2em] text-[#718096]">Your workspace</p>
            {navigation.map((item) => {
              const isActive = pathname === item.href || pathname?.startsWith(`${item.href}/`);
              return (
                <Link key={item.name} href={item.href} aria-current={isActive ? 'page' : undefined} onClick={() => setSidebarOpen(false)}
                  className={`relative flex min-h-10 items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors ${isActive ? 'bg-[#eff6ff] font-semibold text-[#1d4ed8]' : 'text-[#52657d] hover:bg-[#f1f7ff] hover:text-[#06152d]'}`}>
                  {isActive && <span aria-hidden="true" className="absolute bottom-2 left-0 top-2 w-[3px] rounded-full bg-[#2563eb]" />}
                  {item.icon}<span>{item.name}</span>
                </Link>
              );
            })}
          </nav>

          {/* User section */}
          <div data-workspace-footer className="shrink-0 border-t border-[#dce8f7] p-3">
            <div data-workspace-account className="mb-3 flex min-w-0 items-center rounded-lg px-2 py-2">
              <div data-workspace-avatar className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[#eff6ff]">
                <span className="font-semibold text-[#873b29]">
                  {memberData?.first_name?.charAt(0).toUpperCase() || 'M'}
                </span>
              </div>
              <div className="ml-3 flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 truncate">
                  {memberData?.first_name} {memberData?.last_name}
                </p>
                <p className="text-xs text-gray-500">{memberData?.member_number}</p>
              </div>
            </div>
            <button
              type="button"
              onClick={handleLogout}
              className="w-full flex items-center justify-center rounded-lg border border-[#dce8f7] bg-white px-4 py-2 text-sm font-medium text-[#52657d] transition-colors hover:bg-[#f1f7ff] hover:text-[#06152d]"
            >
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
              Logout
            </button>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <div className="min-w-0 lg:pl-64">
        {/* Mobile header */}
        <div data-workspace-topbar className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-[#dce8f7] bg-white px-4 lg:hidden">
          <button
            type="button"
            onClick={() => setSidebarOpen(true)}
            className="rounded-md p-2 text-[#6d675f] hover:bg-[#eee9e1]"
            aria-label="Open navigation"
            aria-expanded={sidebarOpen}
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
          <BrandLogo width={128} height={26} />
          <div className="w-6" /> {/* Spacer */}
        </div>

        {/* Page content */}
        <main className="workspace-main member-workspace-main min-h-[calc(100vh-4rem)]">{children}</main>
      </div>
    </div>
  );
}
