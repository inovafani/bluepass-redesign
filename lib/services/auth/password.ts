import { randomBytes, scryptSync, timingSafeEqual } from "crypto";

const KEY_LENGTH = 64;

export function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  const key = scryptSync(password, salt, KEY_LENGTH).toString("hex");

  return `scrypt$${salt}$${key}`;
}

export function verifyPassword(password: string, storedHash: string) {
  const [scheme, salt, key] = storedHash.split("$");

  if (scheme !== "scrypt" || !salt || !key) {
    return false;
  }

  const expected = Buffer.from(key, "hex");
  const actual = scryptSync(password, salt, expected.length);

  return expected.length === actual.length && timingSafeEqual(expected, actual);
}
