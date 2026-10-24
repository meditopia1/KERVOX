import { randomUUID } from 'crypto';
import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/lib/auth-server';
import { createServerSupabaseClient } from '@/lib/supabase-server';
import { enforcePublicRateLimit } from '@/lib/public-api-guard';

const MIME_EXTENSIONS: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'application/pdf': 'pdf',
  'audio/webm': 'webm',
  'audio/mp4': 'm4a',
  'audio/mpeg': 'mp3',
};
const STAFF_ROLES = ['call_centre_agent', 'operations_manager', 'admin', 'system_admin'];

function hasExpectedSignature(buffer: Buffer, mime: string): boolean {
  if (mime === 'image/jpeg') return buffer.subarray(0, 3).equals(Buffer.from([0xff, 0xd8, 0xff]));
  if (mime === 'image/png') return buffer.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]));
  if (mime === 'image/webp') return buffer.toString('ascii', 0, 4) === 'RIFF' && buffer.toString('ascii', 8, 12) === 'WEBP';
  if (mime === 'application/pdf') return buffer.toString('ascii', 0, 5) === '%PDF-';
  if (mime === 'audio/webm') return buffer.subarray(0, 4).equals(Buffer.from([0x1a, 0x45, 0xdf, 0xa3]));
  if (mime === 'audio/mp4') return buffer.toString('ascii', 4, 8) === 'ftyp';
  if (mime === 'audio/mpeg') return buffer.toString('ascii', 0, 3) === 'ID3' || (buffer[0] === 0xff && (buffer[1] & 0xe0) === 0xe0);
  return false;
}

export async function POST(request: NextRequest) {
  try {
    const limited = await enforcePublicRateLimit(request, 'upload', 30, 1000);
    if (limited) return limited;
    const maxRequestBytes = 27 * 1024 * 1024;
    const contentLength = Number(request.headers.get('content-length') || 0);
    if (contentLength > maxRequestBytes) {
      return NextResponse.json({ error: 'File is too large' }, { status: 413 });
    }

    // Do not hand an unbounded chunked request to the multipart parser.
    if (!request.body) return NextResponse.json({ error: 'Invalid upload' }, { status: 400 });
    const reader = request.body.getReader();
    const chunks: Buffer[] = [];
    let totalBytes = 0;
    let done = false;
    while (!done) {
      const chunk = await reader.read();
      if (chunk.done) { done = true; break; }
      const value = chunk.value;
      totalBytes += value.byteLength;
      if (totalBytes > maxRequestBytes) {
        await reader.cancel();
        return NextResponse.json({ error: 'File is too large' }, { status: 413 });
      }
      chunks.push(Buffer.from(value));
    }
    const boundedRequest = new Request(request.url, {
      method: 'POST',
      headers: request.headers,
      body: Buffer.concat(chunks),
    });
    const formData = await boundedRequest.formData();
    const file = formData.get('file');
    const bucket = formData.get('bucket');
    const folder = formData.get('folder');
    if (!file || typeof file === 'string' || typeof bucket !== 'string' || typeof folder !== 'string') {
      return NextResponse.json({ error: 'Invalid upload' }, { status: 400 });
    }

    const isStaffRecording = bucket === 'call-recordings';
    if (bucket !== 'applications' && !isStaffRecording) {
      return NextResponse.json({ error: 'Unsupported upload destination' }, { status: 400 });
    }
    if (isStaffRecording) {
      const { user } = await getAuthenticatedUser(request);
      if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
      if (!user.roles.some(role => STAFF_ROLES.includes(role))) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }
      if (!['verification-calls', 'upgrade-verification-calls', 'dependant-verification-calls'].includes(folder)) {
        return NextResponse.json({ error: 'Invalid recording folder' }, { status: 400 });
      }
    } else if (!/^(voice|signatures|documents\/(id|address|selfie)|claims\/[A-Za-z0-9_-]{1,80})$/.test(folder)) {
      return NextResponse.json({ error: 'Invalid application folder' }, { status: 400 });
    }

    const maxBytes = isStaffRecording ? 25 * 1024 * 1024 : 10 * 1024 * 1024;
    if (!file.size || file.size > maxBytes) {
      return NextResponse.json({ error: 'File is empty or too large' }, { status: 413 });
    }
    const mime = file.type.toLowerCase().split(';')[0].trim();
    if (!MIME_EXTENSIONS[mime] || (isStaffRecording && !mime.startsWith('audio/')) ||
        (folder === 'signatures' && !mime.startsWith('image/')) ||
        (folder === 'voice' && !mime.startsWith('audio/'))) {
      return NextResponse.json({ error: 'Unsupported file type' }, { status: 415 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    if (!hasExpectedSignature(buffer, mime)) {
      return NextResponse.json({ error: 'File content does not match its type' }, { status: 415 });
    }

    const path = `${folder}/${randomUUID()}.${MIME_EXTENSIONS[mime]}`;
    const supabase = createServerSupabaseClient();
    const { data, error } = await supabase.storage.from(bucket).upload(path, buffer, {
      contentType: mime,
      upsert: false,
      cacheControl: '60',
    });
    if (error) {
      console.error('Supabase upload error:', error);
      return NextResponse.json({ error: 'Upload failed' }, { status: 500 });
    }

    const { data: { publicUrl } } = supabase.storage.from(bucket).getPublicUrl(path);
    // The stable URL remains the database identifier; the temporary URL is for
    // immediate preview only and must never be written to application records.
    const { data: preview, error: previewError } = await supabase.storage.from(bucket).createSignedUrl(path, 3600);
    if (previewError || !preview?.signedUrl) {
      console.error('Supabase preview error:', previewError);
      return NextResponse.json({ error: 'Upload preview failed' }, { status: 500 });
    }
    return NextResponse.json({ success: true, url: publicUrl, previewUrl: preview.signedUrl, path: data.path }, {
      headers: { 'Cache-Control': 'no-store' },
    });
  } catch (error) {
    console.error('Upload error:', error);
    return NextResponse.json({ error: 'Upload failed' }, { status: 500 });
  }
}
