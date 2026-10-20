/**
 * Supabase Storage Utilities
 * Handles file uploads for voice recordings, signatures, and documents.
 *
 * Application steps may keep local preview URLs while the user is still busy
 * with the form. Before final submission we normalize those values into real
 * Supabase Storage URLs so the database only stores durable references.
 */

import { ApplicationData } from '@/types/application'

const BUCKET_NAME = 'applications'

/**
 * Upload a blob to Supabase Storage
 * @param blob - The file blob to upload
 * @param path - The storage path (e.g., 'voice/APP-2026-123456.webm')
 * @returns The public URL of the uploaded file
 */
export async function uploadToStorage(
  blob: Blob,
  path: string
): Promise<string> {
  const normalizedPath = path.replace(/^\/+/, '')
  const lastSlash = normalizedPath.lastIndexOf('/')
  const folder = lastSlash >= 0 ? normalizedPath.slice(0, lastSlash) : ''
  const filename =
    lastSlash >= 0 ? normalizedPath.slice(lastSlash + 1) : normalizedPath

  const file = new File([blob], filename || `upload-${Date.now()}`, {
    type: blob.type || 'application/octet-stream',
  })

  const formData = new FormData()
  formData.append('file', file)
  formData.append('bucket', BUCKET_NAME)

  if (folder) {
    formData.append('folder', folder)
  }

  const response = await fetch('/api/upload', {
    method: 'POST',
    body: formData,
  })

  const result = await response.json().catch(() => ({}))

  if (!response.ok) {
    const message = result?.details || result?.error || `HTTP ${response.status}`
    throw new Error(`Failed to upload file: ${message}`)
  }

  return result.url
}

/**
 * Upload voice recording
 * @param audioBlob - The audio blob from MediaRecorder
 * @param applicationNumber - The application number for file naming
 * @returns The public URL of the uploaded audio
 */
export async function uploadVoiceRecording(
  audioBlob: Blob,
  applicationNumber: string
): Promise<string> {
  const timestamp = Date.now()
  const path = `voice/${applicationNumber}-${timestamp}.webm`
  return uploadToStorage(audioBlob, path)
}

/**
 * Upload signature image
 * @param signatureDataUrl - The base64 data URL from canvas
 * @param applicationNumber - The application number for file naming
 * @returns The public URL of the uploaded signature
 */
export async function uploadSignature(
  signatureDataUrl: string,
  applicationNumber: string
): Promise<string> {
  // Convert data URL to blob
  const response = await fetch(signatureDataUrl)
  const blob = await response.blob()

  const timestamp = Date.now()
  const path = `signatures/${applicationNumber}-${timestamp}.png`
  return uploadToStorage(blob, path)
}

/**
 * Upload document (ID, proof of address, etc.)
 * @param dataUrl - The base64 data URL
 * @param type - Document type (id, address, selfie)
 * @param applicationNumber - The application number for file naming
 * @returns The public URL of the uploaded document
 */
export async function uploadDocument(
  dataUrl: string,
  type: 'id' | 'address' | 'selfie',
  applicationNumber: string
): Promise<string> {
  // Convert data URL to blob
  const response = await fetch(dataUrl)
  const blob = await response.blob()

  const timestamp = Date.now()
  const extension = blob.type.includes('pdf') ? 'pdf' : 'jpg'
  const path = `documents/${type}/${applicationNumber}-${timestamp}.${extension}`
  return uploadToStorage(blob, path)
}

/**
 * Upload claim document (invoice, prescription, etc.)
 * @param file - The file to upload
 * @param claimNumber - The claim number for file naming (or temp ID)
 * @param documentType - Type of document (invoice, prescription, etc.)
 * @returns The public URL of the uploaded document
 */
export async function uploadClaimDocument(
  file: File,
  claimNumber: string,
  documentType: string
): Promise<string> {
  const timestamp = Date.now()
  const extension = file.name.split('.').pop() || 'pdf'
  const sanitizedType = documentType.replace(/[^a-z0-9]/gi, '_').toLowerCase()
  const path = `claims/${claimNumber}/${sanitizedType}-${timestamp}.${extension}`
  
  return uploadToStorage(file, path)
}

/**
 * Upload multiple claim documents
 * @param claimNumber - The claim number for file naming (or temp ID)
 * @param files - Array of files to upload
 * @returns Array of public URLs of uploaded documents
 */
export async function uploadClaimDocuments(
  claimNumber: string,
  files: File[]
): Promise<string[]> {
  const uploadPromises = files.map((file, index) => {
    const documentType = `document_${index + 1}`
    return uploadClaimDocument(file, claimNumber, documentType)
  })
  
  return Promise.all(uploadPromises)
}

/**
 * Generate a temporary application number for uploads before submission
 * @returns A temporary application number
 */
export function generateTempApplicationNumber(): string {
  return `TEMP-${Date.now()}`
}

/**
 * Generate a temporary claim number for uploads before submission
 * @returns A temporary claim number
 */
export function generateTempClaimNumber(): string {
  return `CLM-TEMP-${Date.now()}`
}

function isDurableStorageUrl(value?: string): boolean {
  if (!value) return false
  return /^https?:\/\//i.test(value)
}

async function convertUrlToBlob(value: string): Promise<Blob> {
  const response = await fetch(value)
  if (!response.ok) {
    throw new Error(`Failed to read local asset: ${response.status}`)
  }
  return response.blob()
}

function buildApplicationUploadKey(data: ApplicationData): string {
  const base =
    data.idNumber ||
    data.email ||
    `${data.firstName || 'applicant'}-${data.lastName || 'application'}`

  return base.replace(/[^a-z0-9]/gi, '-').replace(/-+/g, '-').toLowerCase()
}

/**
 * Convert any local preview assets into durable bucket URLs before submit.
 */
export async function prepareApplicationAssetsForSubmit(
  data: ApplicationData
): Promise<Partial<ApplicationData>> {
  const uploadKey = buildApplicationUploadKey(data)
  const updates: Partial<ApplicationData> = {}

  if (data.idDocumentUrl && !isDurableStorageUrl(data.idDocumentUrl)) {
    updates.idDocumentUrl = await uploadDocument(data.idDocumentUrl, 'id', uploadKey)
  }

  if (data.selfieUrl && !isDurableStorageUrl(data.selfieUrl)) {
    updates.selfieUrl = await uploadDocument(data.selfieUrl, 'selfie', uploadKey)
  }

  if (data.proofOfAddressUrl && !isDurableStorageUrl(data.proofOfAddressUrl)) {
    updates.proofOfAddressUrl = await uploadDocument(data.proofOfAddressUrl, 'address', uploadKey)
  }

  if (data.proofOfAddressUrls?.length) {
    const proofUrls = await Promise.all(
      data.proofOfAddressUrls.map(async (url, index) => {
        if (isDurableStorageUrl(url)) return url

        const blob = await convertUrlToBlob(url)
        const extension = blob.type.includes('pdf') ? 'pdf' : 'jpg'
        const path = `documents/address/${uploadKey}-${Date.now()}-${index + 1}.${extension}`
        return uploadToStorage(blob, path)
      })
    )

    updates.proofOfAddressUrls = proofUrls
    if (!updates.proofOfAddressUrl) {
      updates.proofOfAddressUrl = proofUrls[0]
    }
  }

  if (data.voiceRecordingUrl && !isDurableStorageUrl(data.voiceRecordingUrl)) {
    const audioBlob = await convertUrlToBlob(data.voiceRecordingUrl)
    updates.voiceRecordingUrl = await uploadVoiceRecording(audioBlob, uploadKey)
  }

  if (data.signatureUrl && !isDurableStorageUrl(data.signatureUrl)) {
    updates.signatureUrl = await uploadSignature(data.signatureUrl, uploadKey)
  }

  return updates
}
