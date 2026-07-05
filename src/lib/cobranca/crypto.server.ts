// Server-only. AES-256-GCM encryption for storing provider credentials in DB.
import { createCipheriv, createDecipheriv, randomBytes, createHash } from "crypto";

function getKey(): Buffer {
  const raw = process.env.COBRANCA_ENCRYPTION_KEY;
  if (!raw) throw new Error("COBRANCA_ENCRYPTION_KEY não configurada");
  // Derive a stable 32-byte key from whatever length the secret has.
  return createHash("sha256").update(raw).digest();
}

// Format: base64(iv(12) || tag(16) || ciphertext)
export function encryptJson(obj: Record<string, unknown>): string {
  const key = getKey();
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  const plaintext = Buffer.from(JSON.stringify(obj), "utf8");
  const ct = Buffer.concat([cipher.update(plaintext), cipher.final()]);
  const tag = cipher.getAuthTag();
  return Buffer.concat([iv, tag, ct]).toString("base64");
}

export function decryptJson(payload: string | null | undefined): Record<string, string> {
  if (!payload) return {};
  const key = getKey();
  const buf = Buffer.from(payload, "base64");
  const iv = buf.subarray(0, 12);
  const tag = buf.subarray(12, 28);
  const ct = buf.subarray(28);
  const decipher = createDecipheriv("aes-256-gcm", key, iv);
  decipher.setAuthTag(tag);
  const pt = Buffer.concat([decipher.update(ct), decipher.final()]);
  return JSON.parse(pt.toString("utf8"));
}
