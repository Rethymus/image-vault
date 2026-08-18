# Security policy

## Security model

This project is a public-by-link image manager, not a private document vault.

- The admin Worker is intended to be protected by Cloudflare Access.
- The public upload Worker accepts only a short-lived random session token.
- The public Worker has no asset list, delete, rotate, or admin endpoint.
- Image URLs are bearer capabilities. Anyone with an exact image URL can read it.
- QR revocation stops future uploads but does not delete existing images.

## Do not upload

Do not use the public-by-link mode for passports, IDs, contracts, health records, financial documents, or any content that needs reliable access revocation.

## Reporting a problem

For a private deployment, report issues to the owner through the private project channel. Do not publish live QR tokens, Access JWTs, Cloudflare API tokens, R2 credentials, or private image URLs in an issue.

If you fork this repository, replace the contact and deployment details with your own process before enabling public issue reporting.
