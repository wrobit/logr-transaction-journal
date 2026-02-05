import { createCipheriv, createDecipheriv, randomBytes } from "crypto";
import { eq } from "drizzle-orm";

import { db } from "@/lib/db";
import { entries, users, type EncryptedBlob, type Entry } from "@/lib/db/schema";
import { dayjs } from "@/lib/dayjs";
import type { EntryPayload } from "@/lib/entries/types";

export const ENTRY_ENCRYPTION_VERSION = 1;

const NONCE_LENGTH = 12;
const KEK_ENV = "ENTRY_KEK";

const getKekFromEnv = (envName: string) => {
  const value = process.env[envName];
  if (!value) {
    throw new Error(`${envName} is not configured.`);
  }

  const key = Buffer.from(value, "base64");
  if (key.length !== 32) {
    throw new Error(`${envName} must be 32 bytes base64.`);
  }

  return key;
};

const getKek = () => getKekFromEnv(KEK_ENV);

const encryptBuffer = (plaintext: Buffer, key: Buffer): EncryptedBlob => {
  const nonce = randomBytes(NONCE_LENGTH);
  const cipher = createCipheriv("aes-256-gcm", key, nonce);
  const ciphertext = Buffer.concat([cipher.update(plaintext), cipher.final()]);
  const tag = cipher.getAuthTag();

  return {
    version: ENTRY_ENCRYPTION_VERSION,
    nonce: nonce.toString("base64"),
    ciphertext: ciphertext.toString("base64"),
    tag: tag.toString("base64"),
  };
};

const decryptBuffer = (payload: EncryptedBlob, key: Buffer): Buffer => {
  if (payload.version !== ENTRY_ENCRYPTION_VERSION) {
    throw new Error(`Unsupported encryption version ${payload.version}.`);
  }

  const nonce = Buffer.from(payload.nonce, "base64");
  const tag = Buffer.from(payload.tag, "base64");
  const ciphertext = Buffer.from(payload.ciphertext, "base64");

  const decipher = createDecipheriv("aes-256-gcm", key, nonce);
  decipher.setAuthTag(tag);

  return Buffer.concat([decipher.update(ciphertext), decipher.final()]);
};

export async function getUserDek(userId: string): Promise<Buffer> {
  const [user] = await db
    .select({
      encryptionKeyEncrypted: users.encryptionKeyEncrypted,
    })
    .from(users)
    .where(eq(users.id, userId));

  if (!user) {
    throw new Error("User not found.");
  }

  if (user.encryptionKeyEncrypted) {
    return decryptBuffer(user.encryptionKeyEncrypted, getKek());
  }

  const dek = randomBytes(32);
  const wrapped = encryptBuffer(dek, getKek());

  await db
    .update(users)
    .set({
      encryptionKeyEncrypted: wrapped,
      encryptionVersion: ENTRY_ENCRYPTION_VERSION,
      updatedAt: dayjs.utc().toDate(),
    })
    .where(eq(users.id, userId));

  return dek;
}

export async function rewrapUserDek(
  userId: string,
  options: { fromKek?: Buffer; toKek?: Buffer } = {},
): Promise<void> {
  const [user] = await db
    .select({
      encryptionKeyEncrypted: users.encryptionKeyEncrypted,
    })
    .from(users)
    .where(eq(users.id, userId));

  if (!user) {
    throw new Error("User not found.");
  }

  if (!user.encryptionKeyEncrypted) {
    return;
  }

  const fromKek = options.fromKek ?? getKek();
  const toKek = options.toKek ?? getKek();
  const dek = decryptBuffer(user.encryptionKeyEncrypted, fromKek);
  const wrapped = encryptBuffer(dek, toKek);

  await db
    .update(users)
    .set({
      encryptionKeyEncrypted: wrapped,
      encryptionVersion: ENTRY_ENCRYPTION_VERSION,
      updatedAt: dayjs.utc().toDate(),
    })
    .where(eq(users.id, userId));
}

export async function rotateUserDek(
  userId: string,
  options: { newDek?: Buffer; kek?: Buffer } = {},
): Promise<void> {
  const oldDek = await getUserDek(userId);
  const nextDek = options.newDek ?? randomBytes(32);
  const kek = options.kek ?? getKek();

  const rows = await db
    .select()
    .from(entries)
    .where(eq(entries.userId, userId));

  for (const row of rows) {
    const payload = await resolveEntryPayload(row, oldDek);
    const encryptedPayload = encryptEntryPayload(payload, nextDek);

    await db
      .update(entries)
      .set({
        encryptedPayload,
        encryptionVersion: ENTRY_ENCRYPTION_VERSION,
        updatedAt: dayjs.utc().toDate(),
      })
      .where(eq(entries.id, row.id));
  }

  const wrapped = encryptBuffer(nextDek, kek);

  await db
    .update(users)
    .set({
      encryptionKeyEncrypted: wrapped,
      encryptionVersion: ENTRY_ENCRYPTION_VERSION,
      updatedAt: dayjs.utc().toDate(),
    })
    .where(eq(users.id, userId));
}

export function encryptEntryPayload(payload: EntryPayload, dek: Buffer): EncryptedBlob {
  const encoded = Buffer.from(JSON.stringify(payload), "utf8");
  return encryptBuffer(encoded, dek);
}

export function decryptEntryPayload(payload: EncryptedBlob, dek: Buffer): EntryPayload {
  const decoded = decryptBuffer(payload, dek).toString("utf8");
  return JSON.parse(decoded) as EntryPayload;
}

export async function resolveEntryPayload(entry: Entry, dek: Buffer): Promise<EntryPayload> {
  if (!entry.encryptedPayload) {
    throw new Error("Entry payload is missing.");
  }

  return decryptEntryPayload(entry.encryptedPayload, dek);
}
