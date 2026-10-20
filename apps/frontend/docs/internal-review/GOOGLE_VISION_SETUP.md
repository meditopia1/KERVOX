# Google Cloud Vision OCR Setup

**Last updated:** July 12, 2026

KERVOX uses Google Cloud Vision for OCR where configured, with local fallback OCR where needed.

## Current Authentication Pattern

Use a Google service-account JSON file, not a browser/public API key.

The service-account JSON file should stay outside Git. The local project has previously used:

```text
google-vision-key.json
```

Do not commit that file or paste its contents into documentation.

## Environment Variables

Configure the runtime with a server-only path to the service-account JSON file:

```env
GOOGLE_APPLICATION_CREDENTIALS=/absolute/path/to/google-vision-key.json
```

If the app uses a project-specific variable for OCR, keep it server-only and document it in `.env.example` with a placeholder only.

## Setup Steps

1. Create or select the Google Cloud project used for OCR.
2. Enable the Cloud Vision API.
3. Create a service account with the minimum role needed for Vision OCR.
4. Generate a JSON key for local/server use.
5. Store the JSON key outside the repository.
6. Set `GOOGLE_APPLICATION_CREDENTIALS` to the absolute path.
7. Restart the Next.js dev server or deployment runtime.

## Security Rules

- Never commit the service-account JSON file.
- Never expose the service-account JSON to client-side code.
- Rotate the key if it was shared or committed.
- Use separate service accounts per environment when practical.
- Keep OCR credentials out of screenshots and support notes.

## Current OCR Use

OCR supports document intake flows such as:

- GOP scanning
- hospital claim form scanning
- application/member document scanning where applicable

The claims workflow should rely on OCR to suggest extracted fields, then allow an admin/user to review before critical data is inserted or changed.
