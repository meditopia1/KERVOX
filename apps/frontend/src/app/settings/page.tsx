'use client';

import { SidebarLayout } from '@/components/layout/sidebar-layout';
import { ThemeSelector } from '@/components/settings/theme-selector';

export default function SettingsPage() {
  return (
    <SidebarLayout>
      <div className="mx-auto max-w-6xl space-y-7">
        <div>
          <p className="kervox-eyebrow">Your workspace</p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight">Settings</h1>
          <p className="mt-2 text-sm text-[var(--kv-text-muted)]">Personalize the way KERVOX looks while you work.</p>
        </div>
        <section className="rounded-2xl border border-[var(--kv-line)] bg-[var(--kv-surface)] p-5 shadow-sm sm:p-8" aria-label="Appearance settings">
          <ThemeSelector />
        </section>
      </div>
    </SidebarLayout>
  );
}
