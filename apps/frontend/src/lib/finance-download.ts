import { authFetch } from '@/lib/auth-fetch';

export async function downloadEftFile(batchId: string, batchNumber: string) {
  const response = await authFetch(`/api/finance/payment-batches/${encodeURIComponent(batchId)}/eft`, {
    cache: 'no-store',
  });
  if (!response.ok) throw new Error('The EFT file could not be downloaded.');
  const blobUrl = URL.createObjectURL(await response.blob());
  const anchor = document.createElement('a');
  anchor.href = blobUrl;
  anchor.download = `${batchNumber.replace(/[^A-Za-z0-9_-]/g, '') || 'payment-batch'}.txt`;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  window.setTimeout(() => URL.revokeObjectURL(blobUrl), 60_000);
}
