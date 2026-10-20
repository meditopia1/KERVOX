import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { AuthProvider } from '@/contexts/auth-context'
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
    <html lang="en">
      <body className={inter.className}>
        <AuthProvider>
          <ToastProvider>
            {children}
          </ToastProvider>
        </AuthProvider>
      </body>
    </html>
  )
}
