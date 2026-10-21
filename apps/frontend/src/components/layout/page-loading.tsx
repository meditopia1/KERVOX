'use client';

interface PageLoadingProps {
  message: string;
}

export function PageLoading({ message }: PageLoadingProps) {
  return (
    <div data-kervox-loading-root className="min-h-screen flex items-center justify-center px-6 bg-[#f8fbff]" role="status">
      <div data-kervox-loading className="flex items-center gap-3 rounded-xl border border-[#dce8f7] bg-white px-5 py-4 shadow-[0_2px_12px_rgba(6,21,45,0.04)]">
        <div data-loading-spinner className="h-5 w-5 animate-spin rounded-full border-2 border-[#dce8f7] border-t-[#2563eb]" aria-hidden="true" />
        <p data-loading-message className="text-sm text-[#52657d]">{message}</p>
      </div>
    </div>
  );
}

interface InlinePageLoadingProps {
  message: string;
  title?: string;
  description?: string;
}

export function InlinePageLoading({
  message,
  title,
  description,
}: InlinePageLoadingProps) {
  return (
    <div className="space-y-6">
      {(title || description) && (
        <div>
          {title && <h1 data-loading-title className="text-3xl font-bold text-gray-900">{title}</h1>}
          {description && <p className="mt-1 text-gray-600">{description}</p>}
        </div>
      )}

      <div data-kervox-loading className="rounded-xl border border-[#dce8f7] bg-white px-5 py-4 shadow-[0_2px_12px_rgba(6,21,45,0.04)]" role="status">
        <div className="flex items-center gap-3">
          <div data-loading-spinner className="h-5 w-5 animate-spin rounded-full border-2 border-[#dce8f7] border-t-[#2563eb]" aria-hidden="true" />
          <p data-loading-message className="text-sm text-[#52657d]">{message}</p>
        </div>
      </div>
    </div>
  );
}
