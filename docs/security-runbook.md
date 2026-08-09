# Security operations runbook

## Encryption keys

`ENTRY_KEK` is the sole production key-encryption-key name. Keep an offline recovery copy in two secure locations. A database backup without the matching KEK cannot decrypt journals.

To rotate it safely:

1. Disable journal writes and make a verified encrypted backup.
2. Restore the backup to an isolated branch and verify decryption with the old KEK.
3. Generate a new 32-byte random key and keep both keys available to a one-off rewrap job.
4. Rewrap every user DEK in a transaction or resumable batches; do not re-encrypt entry payloads.
5. Verify counts and decrypt representative entries before switching runtime configuration.
6. Retain the old key offline until all rollback and backup retention windows expire, then destroy it deliberately.

The repository does not automate KEK rotation because a partially completed rotation can permanently destroy data. Build and rehearse the one-off rewrap command against a restored branch before any production rotation.

## Backup restore drill

1. Download the encrypted dump and checksum from private R2 on an offline-capable trusted machine.
2. Decrypt both with the age private key, run `sha256sum --check`, and restore into a new isolated Neon branch.
3. Configure the application with the restored database and matching `ENTRY_KEK`.
4. Verify user/account counts, OAuth linkage, journal decryption, imports, exports, and hard deletion.
5. Record the recovery point, duration, operator, and anomalies. Repeat monthly.

## Credential exposure

- OAuth, Upstash, Turnstile, Sentry, database, or R2: revoke the affected credential, replace it, redeploy, and inspect audit/log data.
- `NEXTAUTH_SECRET`: rotate it and redeploy; all sessions are invalidated.
- `ENTRY_KEK`: disable writes, preserve the old key, and use the rehearsed rewrap procedure above. Do not simply replace the environment value.
- Backup age private key: replace the recipient for future backups, preserve the old key for retained backups, and investigate access to encrypted objects.

Security audit metadata must remain pseudonymous: nullable actor IDs, safe event codes, and no emails, tokens, request bodies, financial rows, addresses, IBANs, or provider response payloads.
