import { createHash, timingSafeEqual } from "node:crypto";

type Env = Record<string, string | undefined>;

function configuredKey(env: Env): string | null {
  const key = env.DISCOVER_PREVIEW_KEY?.trim();
  return key && key.length >= 16 ? key : null;
}

/**
 * Whether a link's key opens the trips page while it is locked to the public.
 *
 * Both sides are hashed first so the comparison is between two equal-length digests and takes the
 * same time wherever the strings differ. With no key configured nothing opens: the safe default for
 * a door that is only meant to exist when someone has deliberately cut a key for it.
 */
export function isPreviewKey(candidate: string, env: Record<string, string | undefined> = process.env): boolean {
  const key = configuredKey(env);
  if (!key) return false;

  const digest = (value: string) => createHash("sha256").update(value).digest();
  return timingSafeEqual(digest(candidate), digest(key));
}

export const PREVIEW_COOKIE = "bp_preview";

/**
 * What the browser keeps once the code has been typed at /preview: a digest of the key, never the key
 * itself, so changing the key signs every browser out at once. Null when no key is configured.
 */
export function previewCookieValue(env: Env = process.env): string | null {
  const key = configuredKey(env);
  return key ? createHash("sha256").update(`bluepass-preview:${key}`).digest("hex") : null;
}

export function hasPreviewCookie(value: string | undefined, env: Env = process.env): boolean {
  const expected = previewCookieValue(env);
  if (!expected || !value || value.length !== expected.length) return false;
  return timingSafeEqual(Buffer.from(value), Buffer.from(expected));
}
