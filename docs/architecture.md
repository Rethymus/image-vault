# Architecture and security boundaries

## Runtime topology

```text
                    owner browser
                         │
                         ▼
              admin Worker + static assets
                         │
                    Cloudflare Access
                         │ owner only
                         ▼
                       R2 binding
               ┌─────────┴─────────┐
               │                   │
        image objects        session objects
          i/<token>          sessions/<token>
               │                   │
               │            public upload Worker
               │                   │
               │        /s/<session-token>
               │                   │ phone, no login
               └───────────────┬───┘
                               ▼
                    public-by-link image URL
```

## Trust zones

### Zone A: owner management

The admin Worker is the only place that can list, delete, or rotate image assets. It requires a Cloudflare Access JWT and then checks the JWT issuer, audience, and owner email claim in the Worker.

The static admin UI is also placed behind Access in the deployed setup. This avoids relying on a front-end password or a hidden route as the primary boundary.

### Zone B: temporary phone upload

The upload Worker has no owner session and no list/delete API. It accepts a request only when the URL includes a valid session token. The session object contains an expiration timestamp and maximum file count. The Worker checks file type, file size, and magic bytes before writing to R2.

### Zone C: public image read

An image URL is intentionally public-by-link. The object key is a 256-bit random token encoded as 43 URL-safe characters. This prevents practical enumeration but does not prevent a recipient from forwarding the link.

## Why the public Worker is separate

Putting the phone upload route behind the same Access application as the admin Worker would require the phone user to authenticate. Keeping the public Worker separate allows a no-login upload while preventing the public surface from receiving management capabilities.

## R2 key layout

```text
i/<asset-token>
  image object with content type, original name, and display metadata

sessions/<session-token>
  session root object with expiresAt and maxFiles metadata

sessions/<session-token>/uploads/<asset-token>
  marker used to count uploads for the session
```

Revoking a session removes its root and marker objects. It does not delete `i/<asset-token>` objects already created by that session.

## Threat model

| Threat | Mitigation | Remaining limitation |
| --- | --- | --- |
| Guessing image URLs | 256-bit random asset tokens | A shared exact URL can be forwarded |
| Anonymous admin API access | Access gateway + Worker JWT and owner-email validation | Misconfigured Access still needs deployment testing |
| Phone upload abuse after QR closes | Session root deletion and expiry check | Concurrent uploads should be kept within the small personal-use scope |
| Uploading a renamed non-image file | MIME allowlist + magic-byte validation | Image parsing is not a full malware scanner |
| Leaking credentials in frontend | Secrets stay in Worker/GitHub Actions | Users can still expose credentials through their own deployment mistakes |
| Directory enumeration | Public Worker has no listing route; R2 URL has no catalog | Direct object URLs remain public by design |

## When to change the design

Move to private R2 objects plus signed URLs or an authenticated read Worker when:

- files are confidential;
- per-user authorization is required;
- links must be revoked reliably;
- access logs and audit trails are required;
- multiple people manage the same vault;
- upload abuse needs rate limiting, bot protection, or a persistent quota system.
