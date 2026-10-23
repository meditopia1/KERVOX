'use client';

import { BrandLogo } from '@/components/brand/brand-logo';

interface PageLoadingProps {
  message: string;
}

/** Indeterminate by design: no percentage is shown without real progress data. */
export function LoadingGlyph({ small = false }: { small?: boolean }) {
  return (
    <span className={`kv-loading-glyph${small ? ' kv-loading-glyph--small' : ''}`} aria-hidden="true">
      <span className="kv-loading-glyph__orbit" />
      <span className="kv-loading-glyph__core"><BrandLogo mark="monogram" width={small ? 17 : 25} height={small ? 17 : 25} decorative /></span>
    </span>
  );
}

function LoadingTrack() {
  return <span className="kv-loading-track" aria-hidden="true"><span /></span>;
}

export function PageLoading({ message }: PageLoadingProps) {
  return (
    <section className="kv-loading-scene" data-kervox-loading-root role="status" aria-live="polite" aria-busy="true">
      <div className="kv-loading-scene__halo" aria-hidden="true" />
      <div className="kv-loading-scene__frame" data-kv-loading-frame>
        <div className="kv-loading-scene__top">
          <BrandLogo width={142} height={30} decorative />
          <span className="kv-loading-overline">CONNECTED OPERATIONS / KERVOX</span>
        </div>
        <div className="kv-loading-scene__body">
          <LoadingGlyph />
          <p className="kv-loading-overline">WORKSPACE / INITIALIZING</p>
          <h1>Bringing everything together.</h1>
          <p data-loading-message>{message}</p>
          <LoadingTrack />
        </div>
        <div className="kv-loading-scene__preview" aria-hidden="true">
          <span className="kv-loading-skeleton kv-loading-skeleton--short" />
          <span className="kv-loading-skeleton kv-loading-skeleton--medium" />
          <span className="kv-loading-skeleton kv-loading-skeleton--long" />
        </div>
      </div>
    </section>
  );
}

interface InlinePageLoadingProps {
  message: string;
  title?: string;
  description?: string;
}

export function InlinePageLoading({ message, title, description }: InlinePageLoadingProps) {
  return (
    <section className="kv-inline-loading" role="status" aria-live="polite" aria-busy="true">
      <div className="kv-inline-loading__heading">
        <p className="kv-loading-overline">WORKSPACE / LOADING</p>
        <h1 data-loading-title>{title || 'Preparing your workspace'}</h1>
        {description && <p>{description}</p>}
      </div>
      <LoadingPanel message={message} embedded />
      <div className="kv-inline-loading__preview" aria-hidden="true">
        <div className="kv-inline-loading__metric"><span className="kv-loading-skeleton kv-loading-skeleton--short" /><span className="kv-loading-skeleton kv-loading-skeleton--medium" /></div>
        <div className="kv-inline-loading__metric"><span className="kv-loading-skeleton kv-loading-skeleton--short" /><span className="kv-loading-skeleton kv-loading-skeleton--medium" /></div>
        <div className="kv-inline-loading__metric"><span className="kv-loading-skeleton kv-loading-skeleton--short" /><span className="kv-loading-skeleton kv-loading-skeleton--medium" /></div>
      </div>
      <div className="kv-inline-loading__list" aria-hidden="true">
        <span className="kv-loading-skeleton kv-loading-skeleton--long" />
        <span className="kv-loading-skeleton kv-loading-skeleton--medium" />
        <span className="kv-loading-skeleton kv-loading-skeleton--long" />
      </div>
    </section>
  );
}

interface LoadingPanelProps {
  message: string;
  embedded?: boolean;
  className?: string;
}

/** A compact loading state for data panels, dialogs and role-specific pages. */
export function LoadingPanel({ message, embedded = false, className = '' }: LoadingPanelProps) {
  return (
    <div className={`kv-loading-panel ${embedded ? 'kv-loading-panel--embedded' : ''} ${className}`.trim()}
      data-kv-loading-panel role={embedded ? undefined : 'status'} aria-live={embedded ? undefined : 'polite'} aria-busy={embedded ? undefined : 'true'}>
      <span className="kv-loading-panel__accent" aria-hidden="true" />
      <LoadingGlyph small />
      <div className="kv-loading-panel__copy">
        <strong data-loading-message>{message}</strong>
        <span>This section will update automatically.</span>
      </div>
      <LoadingTrack />
    </div>
  );
}
