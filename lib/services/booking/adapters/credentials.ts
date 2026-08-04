import crypto from "node:crypto";

const algorithm = "aes-256-gcm";

function getEncryptionKey() {
  const secret =
    process.env.BOOKING_CREDENTIALS_SECRET ??
    process.env.NEXTAUTH_SECRET ??
    process.env.WHATSAPP_APP_SECRET ??
    "bluepass-local-development-secret";

  return crypto.createHash("sha256").update(secret).digest();
}

export function encryptCredentials<T extends Record<string, unknown>>(credentials: T): string {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv(algorithm, getEncryptionKey(), iv);
  const encrypted = Buffer.concat([
    cipher.update(JSON.stringify(credentials), "utf8"),
    cipher.final(),
  ]);

  return [
    "v1",
    iv.toString("base64url"),
    cipher.getAuthTag().toString("base64url"),
    encrypted.toString("base64url"),
  ].join(".");
}

export function decryptCredentials<T extends Record<string, unknown>>(value: string): T {
  const [version, iv, authTag, encrypted] = value.split(".");

  if (version !== "v1" || !iv || !authTag || !encrypted) {
    throw new Error("Unsupported encrypted credential payload");
  }

  const decipher = crypto.createDecipheriv(
    algorithm,
    getEncryptionKey(),
    Buffer.from(iv, "base64url"),
  );
  decipher.setAuthTag(Buffer.from(authTag, "base64url"));

  const decrypted = Buffer.concat([
    decipher.update(Buffer.from(encrypted, "base64url")),
    decipher.final(),
  ]);

  return JSON.parse(decrypted.toString("utf8")) as T;
}
