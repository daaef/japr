# Solution — Upload-token 500 on Vercel

## Proposed approach

1. **Deployment (required):** In Vercel → Storage → connect a Blob store to `japr`. Confirm `BLOB_READ_WRITE_TOKEN` appears in env vars. Set `STORAGE_DRIVER=blob` and `NUXT_PUBLIC_DIRECT_UPLOAD=true`. Redeploy.
2. **Code — auth middleware:** Exempt `POST /api/files/upload-token` from session middleware. The route already enforces session inside `onBeforeGenerateToken`; upload-completed callbacks are authenticated via `x-vercel-signature` inside `handleUpload`.
3. **Code — upload-token handler:** Remove the no-op `onUploadCompleted` (avoids unnecessary Blob callbacks). Wrap `handleUpload` in try/catch and map `BlobError` to `503` with the SDK message so misconfiguration is visible in the UI.
4. **Code — early guard:** If `process.env.BLOB_READ_WRITE_TOKEN` is absent, return `503` with an explicit message before calling `handleUpload`.

## Alternatives rejected

- **Disable direct upload on Vercel** — reintroduces the ~4.5 MB body limit; rejected.
- **Server-proxied upload only** — same body-limit problem; rejected.

## Performance impact

Neutral — no extra round-trips; removes an unused upload-completed callback.

## Performance delta

Not measurable; config/error-path change only.

## Trade-offs

Removing `onUploadCompleted` means no server-side hook when Blob finishes; acceptable because the app persists `fileKey` at submit time from the client-returned pathname.

## Dead code audit

No-op `onUploadCompleted` body in `upload-token.post.ts` — remove.
