'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { AlertTriangle, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function ErrorPage({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error('KERVOX page failed to render:', error);
  }, [error]);

  return (
    <main role="alert" className="flex min-h-screen items-center justify-center bg-[var(--kv-canvas,#f7f5f0)] px-4 py-12">
      <div className="w-full max-w-xl rounded-2xl border border-[var(--kv-line,#e6e0d7)] bg-[var(--kv-surface,#fffefa)] p-8 shadow-[0_18px_50px_var(--kv-shadow,rgba(49,37,28,.06))] sm:p-10">
        <AlertTriangle className="h-9 w-9 text-[var(--kv-accent,#a64c34)]" aria-hidden="true" />
        <h1 className="mt-5 text-2xl font-semibold text-[var(--kv-ink,#2b2926)]">This page could not load</h1>
        <p className="mt-3 text-sm leading-6 text-[var(--kv-text-muted,#6d675f)]">Try loading the page again, or return to your workspace. If you were submitting a form, check its status before trying again.</p>
        <div className="mt-7 flex flex-wrap gap-3">
          <Button type="button" onClick={reset}><RotateCcw className="mr-2 h-4 w-4" aria-hidden="true" />Try again</Button>
          <Button asChild variant="outline"><Link href="/">Go to home</Link></Button>
        </div>
      </div>
    </main>
  );
}
