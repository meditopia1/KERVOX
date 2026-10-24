/** Only open web-hosted documents in a tab isolated from the application. */
export function openSafeDocumentUrl(value: unknown): boolean {
  if (typeof value !== 'string' || value.length > 4096) return false;
  try {
    const url = new URL(value);
    if (url.protocol !== 'https:' && url.protocol !== 'http:') return false;
    window.open(url.href, '_blank', 'noopener,noreferrer');
    return true;
  } catch {
    return false;
  }
}
