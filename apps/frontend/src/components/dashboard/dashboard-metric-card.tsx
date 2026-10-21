'use client';

import type { CSSProperties, ReactNode } from 'react';
import { Card, CardContent } from '@/components/ui/card';

interface DashboardMetricCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: ReactNode;
  accentColor: string;
  glowFrom: string;
  glowTo: string;
  valueClassName?: string;
  iconBackgroundClassName?: string;
  variant?: 'soft' | 'executive';
}

export function DashboardMetricCard({
  title,
  value,
  subtitle,
  icon,
  accentColor,
  glowFrom,
  glowTo,
  valueClassName,
  iconBackgroundClassName,
  variant = 'soft',
}: DashboardMetricCardProps) {
  const isExecutive = variant === 'executive';
  const style = {
    '--glow-color': isExecutive ? accentColor : '#2563eb',
    '--glow-color-via': isExecutive ? glowFrom : 'rgba(37, 99, 235, 0.05)',
    '--glow-color-to': isExecutive ? glowTo : 'rgba(37, 99, 235, 0.12)',
  } as CSSProperties;

  return (
    <Card
      data-kervox-metric
      data-kervox-metric-variant={variant}
      className={
        isExecutive
          ? 'group relative overflow-hidden rounded-lg border border-slate-200 bg-white shadow-[0_1px_2px_rgba(15,23,42,0.04)] transition-all duration-200 hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-[0_12px_28px_rgba(15,23,42,0.08)]'
          : 'relative overflow-hidden rounded-lg border border-[#dce8f7] bg-white transition-all duration-200 hover:border-[#aac7ef] group'
      }
      style={style}
    >
      {isExecutive ? (
        <>
          <div className="pointer-events-none absolute inset-x-0 top-0 z-10 h-[3px] bg-[var(--glow-color)] opacity-90" />
          <div className="pointer-events-none absolute inset-0 z-10 bg-[linear-gradient(135deg,var(--glow-color-via),transparent_42%)] opacity-60" />
        </>
      ) : (
        <>
          <div className="pointer-events-none absolute inset-0 z-10 bg-gradient-to-br from-transparent via-transparent to-[#eff6ff]/60" />
          <div className="absolute left-0 top-4 bottom-4 z-20 w-[3px] rounded-r bg-[#2563eb]" />
        </>
      )}
      <CardContent className={`${isExecutive ? 'p-5' : 'pt-6'} relative z-30`}>
        <div className="flex items-center justify-between">
          <div>
            <p className={`${isExecutive ? 'text-[13px] font-medium text-slate-500' : 'text-sm text-gray-600'}`}>
              {title}
            </p>
            <p className={`${isExecutive ? 'mt-2 text-3xl font-semibold text-slate-950' : 'text-3xl font-bold mt-1 text-[#06152d]'} ${valueClassName ?? ''}`.trim()}>{value}</p>
            {subtitle ? <p className={`${isExecutive ? 'mt-1 text-xs text-slate-500' : 'text-xs text-gray-500 mt-1'}`}>{subtitle}</p> : null}
          </div>
          <div
            className={`${isExecutive ? 'h-10 w-10 rounded-md ring-1 ring-slate-200' : 'w-12 h-12 rounded-lg'} flex items-center justify-center ${iconBackgroundClassName ?? 'bg-white/80'}`}
          >
            {icon}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
