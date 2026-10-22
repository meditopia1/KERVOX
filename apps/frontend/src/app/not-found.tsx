import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function NotFound() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-[var(--kv-canvas,#f7f5f0)] px-4 py-12">
      <div className="w-full max-w-xl rounded-2xl border border-[var(--kv-line,#e6e0d7)] bg-[var(--kv-surface,#fffefa)] p-8 shadow-[0_18px_50px_var(--kv-shadow,rgba(49,37,28,.06))] sm:p-10">
        <p className="text-xs font-semibold uppercase tracking-[.16em] text-[var(--kv-accent,#a64c34)]">Page not found</p>
        <h1 className="mt-3 text-3xl font-semibold tracking-tight text-[var(--kv-ink,#2b2926)]">There is nothing at this address.</h1>
        <p className="mt-3 text-sm leading-6 text-[var(--kv-text-muted,#6d675f)]">The link may have changed, or this page may not be available to your account.</p>
        <Button asChild className="mt-7"><Link href="/"><ArrowLeft className="mr-2 h-4 w-4" aria-hidden="true" />Return to home</Link></Button>
      </div>
    </main>
  );
}
