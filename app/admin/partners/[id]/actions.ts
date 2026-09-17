"use server";

import { revalidatePath } from "next/cache";
import { requireCurrentAdmin } from "@/lib/services/auth/admin";
import { isPartnerCategory, updatePartnerAdminInfo } from "@/lib/services/admin/partner-directory";

export type PartnerAdminEditState =
  | { status: "idle" }
  | { status: "done"; message: string }
  | { status: "error"; message: string };

const IDLE_MESSAGE = "Your admin session is no longer valid. Sign in again before saving changes.";

/** Re-derives the admin rather than trusting the page-load gate, same convention as the operator
 * edit action this mirrors. */
async function requireAdmin(): Promise<{ email: string } | null> {
  const admin = await requireCurrentAdmin();
  return admin ? { email: admin.email } : null;
}

export async function updatePartnerAdminInfoAction(
  partnerProfileId: string,
  _previous: PartnerAdminEditState,
  formData: FormData,
): Promise<PartnerAdminEditState> {
  const admin = await requireAdmin();

  if (!admin) {
    return { status: "error", message: IDLE_MESSAGE };
  }

  const categoryRaw = String(formData.get("partnerCategory") ?? "");
  const notes = String(formData.get("notes") ?? "").trim();

  if (categoryRaw && !isPartnerCategory(categoryRaw)) {
    return { status: "error", message: "Unrecognised category." };
  }

  const partnerCategory = categoryRaw && isPartnerCategory(categoryRaw) ? categoryRaw : null;

  await updatePartnerAdminInfo(partnerProfileId, { partnerCategory, notes });

  revalidatePath(`/admin/partners/${partnerProfileId}`);
  revalidatePath("/admin/partners");

  return { status: "done", message: "Saved." };
}
