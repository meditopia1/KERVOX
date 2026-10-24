import { signApplicationFiles, signStoredFileUrl } from '../private-storage'

const createSignedUrl = jest.fn()
jest.mock('../supabase-server', () => ({
  createServerSupabaseClient: () => ({
    storage: { from: (bucket: string) => ({ createSignedUrl: (path: string, expiry: number) => createSignedUrl(bucket, path, expiry) }) },
  }),
}))

const project = 'https://storage-example.supabase.co'

beforeEach(() => {
  process.env.NEXT_PUBLIC_SUPABASE_URL = project
  createSignedUrl.mockReset()
  createSignedUrl.mockImplementation(async (bucket, path) => ({
    data: { signedUrl: `${project}/storage/v1/object/sign/${bucket}/${path}?token=temporary` },
    error: null,
  }))
})

it('signs an authorized stored file without altering its durable URL', async () => {
  const original = `${project}/storage/v1/object/public/applications/documents/id/file.pdf`
  const signed = await signStoredFileUrl(original)
  expect(signed).toContain('/object/sign/applications/documents/id/file.pdf?token=temporary')
  expect(createSignedUrl).toHaveBeenCalledWith('applications', 'documents/id/file.pdf', 3600)
  expect(original).toContain('/object/public/')
})

it('does not grant access to lookalike hosts or unapproved buckets', async () => {
  expect(await signStoredFileUrl(`https://storage-example.supabase.co.evil.test/storage/v1/object/public/applications/a/b.pdf`))
    .toContain('evil.test')
  expect(await signStoredFileUrl(`${project}/storage/v1/object/public/eft-files/a/b.pdf`))
    .toContain('/object/public/eft-files/')
  expect(createSignedUrl).not.toHaveBeenCalled()
})

it('keeps staff queues available when an applicant submits a malformed file path', async () => {
  const malformed = `${project}/storage/v1/object/public/applications/documents/id/%ZZ`
  const app = await signApplicationFiles({ id_document_url: malformed, proof_of_address_urls: 'invalid' as unknown as string[] })
  expect(app.id_document_url).toBeNull()
  expect(app.proof_of_address_urls).toEqual([])
  expect(createSignedUrl).not.toHaveBeenCalled()
})

it('refuses a stored object from a different document category', async () => {
  const voice = `${project}/storage/v1/object/public/applications/voice/other.webm`
  expect(await signStoredFileUrl(voice, 'documents/id')).toBeNull()
  expect(createSignedUrl).not.toHaveBeenCalled()
})

it('provides a separate recording view URL without storing it in review notes', async () => {
  const original = `${project}/storage/v1/object/public/call-recordings/verification-calls/one.webm`
  const app = { review_notes: `Verified\nCall Recording: ${original}`, id_document_url: null }
  const view = await signApplicationFiles(app)
  expect(view.review_notes).toBe(app.review_notes)
  expect(view.review_recording_view_url).toContain('/object/sign/call-recordings/')
  expect(createSignedUrl).toHaveBeenCalledWith('call-recordings', 'verification-calls/one.webm', 3600)
})
