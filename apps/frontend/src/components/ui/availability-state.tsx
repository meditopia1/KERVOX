import { Info } from 'lucide-react';
import type { ReactNode } from 'react';

type AvailabilityStateProps = {
  eyebrow?: string;
  title: string;
  description: string;
  children?: ReactNode;
};

/** An honest, reusable state for workflows that have no live frontend data source yet. */
export function AvailabilityState({
  eyebrow = 'Workspace status',
  title,
  description,
  children,
}: AvailabilityStateProps) {
  return (
    <section
      aria-labelledby="availability-title"
      className="mx-auto flex min-h-[320px] w-full max-w-3xl flex-col items-start justify-center rounded-2xl border border-[var(--kv-line,#e6e0d7)] bg-[var(--kv-surface,#fffefa)] px-6 py-10 shadow-[0_18px_50px_var(--kv-shadow,rgba(49,37,28,.06))] sm:px-10"
    >
      <span className="inline-flex h-11 w-11 items-center justify-center rounded-xl border border-[var(--kv-line,#e6e0d7)] bg-[var(--kv-accent-surface,#f7e9de)] text-[var(--kv-accent,#a64c34)]">
        <Info className="h-5 w-5" aria-hidden="true" />
      </span>
      <p className="mt-6 text-xs font-semibold uppercase tracking-[.16em] text-[var(--kv-accent,#a64c34)]">{eyebrow}</p>
      <h2 id="availability-title" className="mt-2 text-2xl font-semibold tracking-tight text-[var(--kv-ink,#2b2926)] sm:text-3xl">{title}</h2>
      <p className="mt-3 max-w-xl text-sm leading-7 text-[var(--kv-text-muted,#6d675f)] sm:text-base">{description}</p>
      {children && <div className="mt-6 flex flex-wrap gap-3">{children}</div>}
    </section>
  );
}
