"use server";

import { revalidatePath } from "next/cache";
import { currentCreatorAccess } from "@/lib/services/creator/guard";
import { updateCreatorProfileDetails } from "@/lib/services/creator/profile-settings";

export type CreatorSettingsState =
  | { status: "idle" }
  | { status: "done"; message: string }
  | { status: "error"; message: string; field?: string };

/**
 * Re-derives the creator from the session rather than trusting the page-load gate, for the same
 * reason every write in the operator console does (see app/operator/actions.ts) — and there is no
 * profile id in the submitted form, so a tampered payload cannot aim this at another creator's
 * profile.
 */
async function requireCreator() {
  const access = await currentCreatorAccess();

  if (!access.ok) {
    return {
      failure: {
        status: "error" as const,
        message:
          access.reason === "SIGNED_OUT"
            ? "Your session has expired. Sign in again and retry — nothing was changed."
            : "This account can no longer edit that creator profile. Nothing was changed.",
      },
    };
  }

  return { access };
}

export async function updateCreatorProfileAction(
  _previous: CreatorSettingsState,
  formData: FormData,
): Promise<CreatorSettingsState> {
  const { access, failure } = await requireCreator();

  if (failure) {
    return failure;
  }

  const text = (field: string) => {
    const value = formData.get(field);
    return typeof value === "string" ? value : "";
  };

  const result = await updateCreatorProfileDetails({
    creatorProfileId: access.profile.id,
    handle: text("handle"),
    audienceUrl: text("audienceUrl"),
    instagramUrl: text("instagramUrl"),
    youtubeUrl: text("youtubeUrl"),
    tiktokUrl: text("tiktokUrl"),
  });

  if (!result.ok) {
    return { status: "error", message: result.message, field: result.field };
  }

  revalidatePath("/creator");

  return { status: "done", message: "Profile saved." };
}
