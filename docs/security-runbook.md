# Minimal security and recovery notes

## Encryption key

`ENTRY_KEK` wraps each user's journal encryption key. Keep a secure offline copy: a database backup without the matching key cannot decrypt journals.

Do not replace `ENTRY_KEK` during a normal redeploy. Rotation requires a tested process that rewraps every user key with both the old and new keys available; the app does not automate this yet.

## Manual database recovery

1. Export or snapshot the Neon production database on a recurring schedule.
2. Restore it to a separate Neon branch before using it.
3. Configure the restored branch with the matching `ENTRY_KEK`.
4. Verify login, journal decryption, imports, exports, and account deletion.
5. Switch `DATABASE_URL` only after the restored branch is verified.

## Exposed credentials

- Database or OAuth: revoke the credential, replace it in Vercel, and redeploy.
- `NEXTAUTH_SECRET`: replace it and redeploy; existing sessions will be invalidated.
- `ENTRY_KEK`: preserve the old key and disable writes until a tested rewrap/recovery path is ready. Replacing it directly makes existing journals unreadable.
