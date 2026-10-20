# Voice Recording & Signature Storage Fix

## Purpose

This guide records the storage-backed approach for voice recordings and digital signatures in the application flow.

## Original Issue
Voice recordings and digital signatures were being stored as temporary blob URLs instead of permanent Supabase Storage URLs. This caused:
- Voice recordings showing "0:00 / 0:00" duration
- Files not accessible after browser refresh
- Data loss when application is closed

## Root Cause
The Step 6 component was creating blob URLs (`blob:http://localhost:3001/...`) which are temporary browser memory references, not permanent storage.

## Current Solution

### 1. Created Storage Utility (`apps/frontend/src/lib/storage.ts`)
- `uploadVoiceRecording()` - Uploads audio blob to Supabase Storage
- `uploadSignature()` - Uploads signature image to Supabase Storage
- `uploadDocument()` - Uploads documents (ID, address, selfie)
- `generateTempApplicationNumber()` - Creates temp app number for file naming

### 2. Updated Step 6 Component
**Voice Recording:**
- Records audio using MediaRecorder API
- Creates temporary blob URL for immediate playback
- Uploads to Supabase Storage in background
- Replaces blob URL with permanent public URL
- Shows upload progress indicator

**Digital Signature:**
- Captures signature on canvas
- Converts to base64 data URL for display
- Uploads to Supabase Storage
- Replaces data URL with permanent public URL
- Shows upload progress indicator

### 3. Created Supabase Storage Bucket
- Bucket name: `applications`
- Public access: Yes
- File size limit: 50MB
- Allowed types: images, PDFs, audio (webm, wav, mp3)

### 4. File Structure
```
applications/
├── voice/
│   └── APP-2026-155479-1737793856000.webm
├── signatures/
│   └── APP-2026-155479-1737793856000.png
└── documents/
    ├── id/
    ├── address/
    └── selfie/
```

## Key Files

1. `apps/frontend/src/components/apply-steps/Step6ReviewTermsSubmit.tsx`
2. `apps/frontend/src/lib/storage.ts`

## Verification

### Test Steps
1. **Restart Frontend Server:**
   ```bash
   # Stop current server (Ctrl+C)
   cd apps/frontend
   pnpm dev
   ```

2. **Test Voice Recording:**
   - Go to Step 6 of application
   - Click "Start Recording"
   - Record voice acceptance (10-15 seconds)
   - Click "Stop Recording"
   - Wait for "Uploading to storage..." message
   - Verify "✓ Voice recorded" appears
   - Check browser console for upload success
   - Verify voice URL starts with `https://<current-supabase-url>/storage/v1/object/public/applications/voice/`

3. **Test Digital Signature:**
   - Draw signature on canvas
   - Click "Save Signature"
   - Wait for "Uploading..." message
   - Verify "✓ Signature saved" appears
   - Check browser console for upload success
   - Verify signature URL starts with `https://<current-supabase-url>/storage/v1/object/public/applications/signatures/`

4. **Submit Application:**
   - Complete all required fields
   - Submit application
   - Check database for permanent URLs

5. **Verify in Admin Panel:**
   - Login as admin
   - View application details
   - Verify voice recording plays
   - Verify signature image displays

## Expected Results

### Voice Recording:
- ✅ Records audio successfully
- ✅ Uploads to Supabase Storage
- ✅ Permanent URL stored in database
- ✅ Playback works in admin panel
- ✅ Shows duration (not 0:00 / 0:00)

### Digital Signature:
- ✅ Captures signature on canvas
- ✅ Uploads to Supabase Storage
- ✅ Permanent URL stored in database
- ✅ Image displays in admin panel
- ✅ High quality PNG format

## Database Fields
Both fields store permanent Supabase Storage URLs:
- `voice_recording_url` - `https://<current-supabase-url>/storage/v1/object/public/applications/voice/...`
- `signature_url` - `https://<current-supabase-url>/storage/v1/object/public/applications/signatures/...`

## Notes

Keep this guide aligned with the live Step 6 implementation and the current storage bucket setup. Treat it as an operational reference, not as a temporary incident report.
