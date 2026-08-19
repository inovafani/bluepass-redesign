import { prisma } from "@/lib/db/prisma";

export type CreatorProfileSettingsResult =
  | { ok: true }
  | { ok: false; message: string; field?: string };

const URL_FIELDS = ["audienceUrl", "instagramUrl", "youtubeUrl", "tiktokUrl"] as const;

function isPlausibleUrl(value: string) {
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

/**
 * A creator editing their own public-facing details — handle and social links. Deliberately not
 * payout-shaped: there's no encrypted field here, nothing this form touches is secret, so it's a
 * plain update rather than a two-step encrypt-then-store.
 */
export async function updateCreatorProfileDetails(input: {
  creatorProfileId: string;
  handle: string;
  audienceUrl: string;
  instagramUrl: string;
  youtubeUrl: string;
  tiktokUrl: string;
}): Promise<CreatorProfileSettingsResult> {
  const values = {
    handle: input.handle.trim(),
    audienceUrl: input.audienceUrl.trim(),
    instagramUrl: input.instagramUrl.trim(),
    youtubeUrl: input.youtubeUrl.trim(),
    tiktokUrl: input.tiktokUrl.trim(),
  };

  for (const field of URL_FIELDS) {
    const value = values[field];
    if (value && !isPlausibleUrl(value)) {
      return { ok: false, message: "That doesn't look like a valid link — include https://.", field };
    }
  }

  await prisma.creatorProfile.update({
    where: { id: input.creatorProfileId },
    data: {
      handle: values.handle || null,
      audienceUrl: values.audienceUrl || null,
      instagramUrl: values.instagramUrl || null,
      youtubeUrl: values.youtubeUrl || null,
      tiktokUrl: values.tiktokUrl || null,
    },
  });

  return { ok: true };
}
