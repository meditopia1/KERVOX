import { createServerSupabaseClient } from '@/lib/supabase-server'

const PRIVATE_BUCKETS = new Set(['applications', 'call-recordings'])
const SIGNED_URL_SECONDS = 60 * 60

/** Sign only a previously stored KERVOX Storage URL, never an arbitrary client URL. */
export async function signStoredFileUrl(value: string | null | undefined, expectedFolder?: string): Promise<string | null> {
  if (!value || typeof value !== 'string') return null
  const projectUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  if (!projectUrl) throw new Error('Missing Supabase URL')

  let url: URL
  try {
    url = new URL(value)
  } catch {
    return value
  }
  const prefix = '/storage/v1/object/public/'
  if (url.origin !== new URL(projectUrl).origin || !url.pathname.startsWith(prefix)) return value
  if (url.search || url.hash) throw new Error('Unexpected query on stored file URL')

  const [bucket, ...encodedPath] = url.pathname.slice(prefix.length).split('/')
  if (!PRIVATE_BUCKETS.has(bucket) || encodedPath.length < 2) return value
  let path: string
  try {
    path = encodedPath.map(segment => decodeURIComponent(segment)).join('/')
  } catch {
    return null
  }
  if (path.split('/').some(segment => !segment || segment === '.' || segment === '..' || segment.includes('\\'))) {
    return null
  }
  if (expectedFolder && !path.startsWith(`${expectedFolder}/`)) return null

  try {
    const { data, error } = await createServerSupabaseClient()
      .storage.from(bucket).createSignedUrl(path, SIGNED_URL_SECONDS)
    if (error || !data?.signedUrl) return null
    return data.signedUrl
  } catch {
    // A bad or deleted attachment must not make the entire staff queue fail.
    return null
  }
}

type ApplicationFileFields = {
  id_document_url?: string | null
  proof_of_address_url?: string | null
  proof_of_address_urls?: string[] | null
  selfie_url?: string | null
  voice_recording_url?: string | null
  signature_url?: string | null
  review_notes?: string | null
  dependents?: Array<{ id_document_url?: string | null; [key: string]: unknown }>
  [key: string]: unknown
}

/** Call only after the application record has passed a staff authorization check. */
export async function signApplicationFiles<T extends ApplicationFileFields>(application: T): Promise<T & { review_recording_view_url: string | null }> {
  const [id, address, selfie, voice, signature, addresses, dependents] = await Promise.all([
    signStoredFileUrl(application.id_document_url, 'documents/id'),
    signStoredFileUrl(application.proof_of_address_url, 'documents/address'),
    signStoredFileUrl(application.selfie_url, 'documents/selfie'),
    signStoredFileUrl(application.voice_recording_url, 'voice'),
    signStoredFileUrl(application.signature_url, 'signatures'),
    Promise.all((Array.isArray(application.proof_of_address_urls) ? application.proof_of_address_urls : []).map(url => signStoredFileUrl(url, 'documents/address'))),
    Promise.all((Array.isArray(application.dependents) ? application.dependents : []).map(async dependent => ({
      ...dependent,
      id_document_url: await signStoredFileUrl(dependent.id_document_url, 'documents/id'),
    }))),
  ])
  const recorded = application.review_notes?.match(/(?:^|\n)Call Recording:\s*(\S+)/)?.[1]
  const recordingViewUrl = await signStoredFileUrl(recorded, 'verification-calls')
  return {
    ...application,
    id_document_url: id,
    proof_of_address_url: address,
    proof_of_address_urls: addresses,
    selfie_url: selfie,
    voice_recording_url: voice,
    signature_url: signature,
    dependents,
    review_recording_view_url: recordingViewUrl,
  } as T & { review_recording_view_url: string | null }
}
