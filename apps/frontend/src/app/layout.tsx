import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import './premium-workspace.css'
import './appearance-themes.css'
import { AuthProvider } from '@/contexts/auth-context'
import { SidebarPreferenceProvider } from '@/contexts/sidebar-preference-context'
import { AppearanceProvider } from '@/contexts/appearance-context'
import { ToastProvider } from '@/components/ui/toast'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'KERVOX | Your operations, connected',
  description: 'A central workspace for connected teams, workflows, and customer operations.',
  openGraph: {
    title: 'KERVOX | Your operations, connected',
    description: 'A central workspace for connected teams, workflows, and customer operations.',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'KERVOX | Your operations, connected',
    description: 'A central workspace for connected teams, workflows, and customer operations.',
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: "try{var t=localStorage.getItem('kervox.appearance.theme');if(t==='green'){t='red';try{localStorage.setItem('kervox.appearance.theme',t)}catch(e){}}document.documentElement.dataset.kervoxTheme=['claude','black','blue','red'].includes(t)?t:'claude'}catch(e){document.documentElement.dataset.kervoxTheme='claude'}" }} />
      </head>
      <body className={inter.className}>
        <AppearanceProvider>
          <AuthProvider>
            <SidebarPreferenceProvider>
              <ToastProvider>
                {children}
              </ToastProvider>
            </SidebarPreferenceProvider>
          </AuthProvider>
        </AppearanceProvider>
      </body>
    </html>
  )
}
