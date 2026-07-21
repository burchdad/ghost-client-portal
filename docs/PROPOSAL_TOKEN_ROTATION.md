# Proposal Token Rotation

Rotate the Gray Matters proposal token only after contact cleanup and seeded acceptance invalidation.

The admin action requires explicit confirmation. It generates a cryptographically random token, stores only a hash, invalidates the old link, and displays the full URL once via the redirect query string.

Audit metadata records a token fingerprint only. It must not include the raw token.
