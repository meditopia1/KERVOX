'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { BrandLogo } from '@/components/brand/brand-logo'
import { usePathname, useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/auth-context'
import { supabase } from '@/lib/supabase'
import { Menu, Settings2 } from 'lucide-react'
import { useSidebarPreference } from '@/contexts/sidebar-preference-context'

export default function OnboardingLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const sidebarPreference = useSidebarPreference()
  const [fallbackCollapsed, setFallbackCollapsed] = useState(false)
  const sidebarCollapsed = sidebarPreference?.collapsed ?? fallbackCollapsed
  const setSidebarCollapsed = sidebarPreference?.setCollapsed ?? setFallbackCollapsed
  const [mobileOpen, setMobileOpen] = useState(false)
  const [newApplicationsCount, setNewApplicationsCount] = useState(0)
  const pathname = usePathname()
  const router = useRouter()
  const { user, logout } = useAuth()

  useEffect(() => {
    if (!mobileOpen) return
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setMobileOpen(false)
    }
    window.addEventListener('keydown', closeOnEscape)
    return () => window.removeEventListener('keydown', closeOnEscape)
  }, [mobileOpen])

  const handleLogout = async () => {
    try {
      await logout()
      router.push('/login')
    } catch (error) {
      console.error('Logout failed:', error)
      router.push('/login')
    }
  }

  useEffect(() => {
    if (!user) {
      router.push('/login')
      return
    }

    const fetchNewApplicationsCount = async () => {
      const { count } = await supabase
        .from('applications')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'submitted')

      setNewApplicationsCount(count || 0)
    }

    fetchNewApplicationsCount()
    const interval = setInterval(fetchNewApplicationsCount, 30000)

    const channel = supabase
      .channel('applications-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'applications' }, () => {
        fetchNewApplicationsCount()
      })
      .subscribe()

    return () => {
      clearInterval(interval)
      supabase.removeChannel(channel)
    }
  }, [user, router])

  const navigation = [
    {
      name: 'New Applications',
      href: '/onboarding/applications',
      badge: newApplicationsCount,
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
      ),
    },
  ]

  return (
    <div className="premium-workspace min-h-screen bg-gray-50">
      {mobileOpen && <button type="button" aria-label="Close navigation" className="fixed inset-0 z-30 bg-black/40 lg:hidden" onClick={() => setMobileOpen(false)} />}
      {/* Sidebar */}
      <aside
        id="onboarding-navigation"
        data-workspace-sidebar
        aria-label="Onboarding navigation"
        className={`
          fixed top-0 left-0 z-40 h-screen w-64 transition-transform duration-300 ease-in-out motion-reduce:transition-none lg:translate-x-0 lg:transition-all
          bg-white border-r border-gray-200
          ${mobileOpen ? 'translate-x-0' : '-translate-x-full'}
          ${sidebarCollapsed ? 'lg:w-16' : 'lg:w-64'}
        `}
      >
        <div className="flex flex-col h-full">
          {/* Logo */}
          <div className="flex items-center justify-between h-16 px-4 border-b border-gray-200">
            {(!sidebarCollapsed || mobileOpen) && (
              <Link href="/onboarding" className="flex items-center gap-2" aria-label="KERVOX onboarding home">
                <BrandLogo width={144} height={30} />
              </Link>
            )}
            {sidebarCollapsed && !mobileOpen && (
              <Link href="/onboarding" className="flex items-center justify-center w-full" aria-label="KERVOX onboarding home">
                <BrandLogo mark="monogram" width={28} height={28} decorative />
              </Link>
            )}
            <button
              type="button"
              onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
              aria-label={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
              className="hidden rounded-md p-1.5 hover:bg-gray-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--kv-accent)] lg:block"
            >
              <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 19l-7-7 7-7m8 14l-7-7 7-7" />
              </svg>
            </button>
          </div>

          {/* Navigation */}
          <nav data-workspace-nav className="flex-1 px-3 py-4 space-y-2 overflow-y-auto">
            {navigation.map((item) => {
              const isActive = pathname === item.href
              
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  onClick={() => setMobileOpen(false)}
                  aria-current={isActive ? 'page' : undefined}
                  className={`flex min-h-11 items-center gap-3 rounded-lg px-3 text-sm font-medium transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--kv-accent)] ${isActive ? 'bg-[var(--kv-accent-surface)] text-[var(--kv-accent)]' : 'text-[var(--kv-text-muted)] hover:bg-[var(--kv-hover)] hover:text-[var(--kv-ink)]'} ${sidebarCollapsed ? 'lg:justify-center' : ''}`}
                  title={sidebarCollapsed ? item.name : undefined}
                >
                  <span className="shrink-0" aria-hidden="true">{item.icon}</span>
                  <span className={sidebarCollapsed ? 'lg:sr-only' : ''}>{item.name}</span>
                  {item.badge > 0 && <span className={`ml-auto rounded-full bg-[var(--kv-accent)] px-2 py-0.5 text-xs font-semibold text-[var(--kv-on-accent,#fff)] ${sidebarCollapsed ? 'lg:sr-only' : ''}`}>{item.badge}</span>}
                </Link>
              )
            })}
          </nav>

          {/* Logout button */}
          <div data-workspace-footer className="px-3 pb-3 border-t border-gray-200 pt-3">
            <Link href="/onboarding/settings" onClick={() => setMobileOpen(false)} aria-label="Settings" aria-current={pathname === '/onboarding/settings' ? 'page' : undefined} className={`mb-2 flex min-h-10 items-center gap-3 rounded-lg px-3 text-sm font-medium transition-colors hover:bg-[var(--kv-hover,#eee9e1)] hover:text-[var(--kv-ink)] ${pathname === '/onboarding/settings' ? 'bg-[var(--kv-accent-surface)] text-[var(--kv-accent-hover)]' : 'text-[var(--kv-text-muted)]'} ${sidebarCollapsed ? 'lg:justify-center' : ''}`} title={sidebarCollapsed ? 'Settings' : undefined}>
              <Settings2 className="h-5 w-5 shrink-0" aria-hidden="true" />
              <span className={sidebarCollapsed ? 'lg:sr-only' : ''}>Settings</span>
            </Link>
            <button 
              onClick={handleLogout}
              className="block w-full"
              title={sidebarCollapsed ? "Log out" : undefined}
            >
              <div className="relative">
                <div
                  style={{
                    "--glow-color": "rgba(220, 38, 38, 0.6)",
                    "--glow-color-via": "rgba(220, 38, 38, 0.075)",
                    "--glow-color-to": "rgba(220, 38, 38, 0.2)",
                  } as React.CSSProperties}
                  className={`
                    w-full h-10 px-3 text-sm rounded-md border flex items-center gap-3 relative transition-colors overflow-hidden bg-gradient-to-t border-r-0 duration-200
                    from-background to-muted text-red-600 hover:text-red-700 border-border
                    after:inset-0 after:absolute after:rounded-[inherit] after:bg-gradient-to-r after:from-transparent after:from-40% after:via-[var(--glow-color-via)] after:to-[var(--glow-color-to)] after:via-70% after:shadow-[hsl(var(--foreground)/0.15)_0px_1px_0px_inset] z-20
                    before:absolute before:w-[5px] hover:before:translate-x-full before:transition-all before:duration-200 before:h-[60%] before:bg-[var(--glow-color)] before:right-0 before:rounded-l before:shadow-[-2px_0_10px_var(--glow-color)] z-10
                    ${sidebarCollapsed ? 'justify-center' : ''}
                  `}
                >
                  <span className="relative z-30">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                    </svg>
                  </span>
                  <span className={`relative z-30 flex-1 ${sidebarCollapsed ? 'lg:sr-only' : ''}`}>Log out</span>
                </div>
              </div>
            </button>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <div className={`transition-all duration-300 ${sidebarCollapsed ? 'lg:ml-16' : 'lg:ml-64'}`}>
        <div className="flex h-16 items-center border-b border-[var(--kv-line)] bg-[var(--kv-surface)] px-4 lg:hidden">
          <button type="button" onClick={() => setMobileOpen(true)} aria-label="Open navigation" aria-controls="onboarding-navigation" aria-expanded={mobileOpen} className="rounded-lg p-2 text-[var(--kv-ink)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--kv-accent)]"><Menu className="h-5 w-5" aria-hidden="true" /></button>
          <span className="ml-3 text-sm font-semibold text-[var(--kv-ink)]">Onboarding workspace</span>
        </div>
        <main data-workspace-content className="workspace-main min-h-screen p-4 sm:p-6">
          {children}
        </main>
      </div>
    </div>
  )
}
