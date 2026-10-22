'use client';

import { Check } from 'lucide-react';
import { useAppearance, type AppTheme } from '@/contexts/appearance-context';

const options: { id: AppTheme; label: string; description: string; canvas: string; surface: string; accent: string; ink: string }[] = [
  { id: 'claude', label: 'KERVOX Signature', description: 'Warm ivory and terracotta', canvas: '#f7f5f0', surface: '#fffefa', accent: '#a64c34', ink: '#2b2926' },
  { id: 'black', label: 'Black', description: 'Dark, quiet monochrome', canvas: '#111416', surface: '#222629', accent: '#e4e8e6', ink: '#f4f5f3' },
  { id: 'blue', label: 'Blue', description: 'Clear, focused blue', canvas: '#f1f6fd', surface: '#ffffff', accent: '#2563eb', ink: '#0d2444' },
  { id: 'red', label: 'Red', description: 'Crisp crimson and porcelain', canvas: '#fff4f5', surface: '#ffffff', accent: '#b42338', ink: '#352125' },
];

export function ThemeSelector() {
  const { theme, setTheme } = useAppearance();

  return (
    <fieldset className="space-y-5">
      <legend className="text-xl font-semibold tracking-tight text-[var(--kv-ink)]">Color theme</legend>
      <p className="text-sm leading-6 text-[var(--kv-text-muted)]">Choose the appearance that feels best for your work. Your choice is saved on this browser.</p>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {options.map((option) => {
          const selected = theme === option.id;
          return (
            <label key={option.id} data-theme-option={option.id} data-selected={selected} className="relative block cursor-pointer rounded-2xl border border-[var(--kv-line)] bg-[var(--kv-surface)] p-3 shadow-sm transition-[transform,border-color,box-shadow] duration-200 hover:-translate-y-0.5 hover:shadow-lg focus-within:outline focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-[var(--kv-accent)] motion-reduce:transform-none">
              <input type="radio" name="application-theme" value={option.id} checked={selected} onChange={() => setTheme(option.id)} className="sr-only" />
              <div className="relative h-28 overflow-hidden rounded-xl border" style={{ background: option.canvas, borderColor: option.id === 'black' ? '#394246' : '#dedbd5' }} aria-hidden="true">
                <div className="absolute inset-x-0 top-0 h-5 border-b" style={{ background: option.surface, borderColor: option.id === 'black' ? '#394246' : '#dedbd5' }} />
                <div className="absolute bottom-0 left-0 top-5 w-11 border-r" style={{ background: option.surface, borderColor: option.id === 'black' ? '#394246' : '#dedbd5' }} />
                <span className="absolute left-2 top-[3px] h-3.5 w-[70px] bg-contain bg-left bg-no-repeat" style={{ backgroundImage: `url('/brand/kervox-${option.id === 'claude' ? 'signature' : option.id}-wordmark.svg')` }} />
                <span className="absolute left-3 top-8 h-5 w-5 bg-contain bg-center bg-no-repeat" style={{ backgroundImage: `url('/brand/kervox-${option.id === 'claude' ? 'signature' : option.id}-k.svg')` }} />
                <span className="absolute left-2 top-14 h-1.5 w-6 rounded-full opacity-40" style={{ background: option.ink }} />
                <span className="absolute left-2 top-20 h-1.5 w-6 rounded-full opacity-40" style={{ background: option.ink }} />
                <div className="absolute left-14 right-3 top-9 h-14 rounded-md border p-2" style={{ background: option.surface, borderColor: option.id === 'black' ? '#394246' : '#dedbd5' }}>
                  <span className="block h-2 w-16 rounded-full" style={{ background: option.ink }} />
                  <span className="mt-2 block h-1.5 w-24 max-w-full rounded-full opacity-35" style={{ background: option.ink }} />
                  <span className="mt-2 block h-2.5 w-12 rounded" style={{ background: option.accent }} />
                </div>
              </div>
              <div className="mt-4 flex items-start justify-between gap-2 px-1 pb-1">
                <div>
                  <span className="block text-sm font-semibold text-[var(--kv-ink)]">{option.label}</span>
                  <span className="mt-1 block text-xs text-[var(--kv-text-muted)]">{option.description}</span>
                </div>
                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full border border-[var(--kv-line-strong)] text-[var(--kv-accent)]" aria-hidden="true">{selected && <Check className="h-3.5 w-3.5" strokeWidth={3} />}</span>
              </div>
            </label>
          );
        })}
      </div>
      <p role="status" className="text-sm text-[var(--kv-text-muted)]">Current theme: <span className="font-semibold text-[var(--kv-ink)]">{options.find((option) => option.id === theme)?.label}</span></p>
    </fieldset>
  );
}
