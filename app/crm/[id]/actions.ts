"use server";

import { revalidatePath } from "next/cache";
import { requireCurrentAdmin } from "@/lib/services/auth/admin";
import { addLeadNote, updateLeadStatus } from "@/lib/services/admin/lead-outreach";

export type LeadActionState =
  | { status: "idle" }
  | { status: "done"; message: string }
  | { status: "error"; message: string };

const NOT_ADMIN = "Your admin session has expired. Sign in again to continue.";

/* Each action re-derives the admin itself rather than trusting the layout's check: that check ran
   when the page was rendered, and a tab left open after someone's access was removed must not still
   be able to write. Same reasoning as app/admin/operators/[id]/actions.ts. */
async function currentAdminEmail() {
  const admin = await requireCurrentAdmin();
  return admin?.email ?? null;
}

export async function updateLeadStatusAction(
  leadId: string,
  _previous: LeadActionState,
  formData: FormData,
): Promise<LeadActionState> {
  const email = await currentAdminEmail();
  if (!email) return { status: "error", message: NOT_ADMIN };

  const result = await updateLeadStatus({
    leadId,
    actorEmail: email,
    status: String(formData.get("status") ?? "") as never,
    note: String(formData.get("note") ?? ""),
  });

  if (!result.ok) {
    return { status: "error", message: result.message };
  }

  revalidatePath(`/crm/${leadId}`);
  revalidatePath("/crm");

  return { status: "done", message: "Status updated." };
}

export async function addLeadNoteAction(
  leadId: string,
  _previous: LeadActionState,
  formData: FormData,
): Promise<LeadActionState> {
  const email = await currentAdminEmail();
  if (!email) return { status: "error", message: NOT_ADMIN };

  const result = await addLeadNote({
    leadId,
    actorEmail: email,
    note: String(formData.get("note") ?? ""),
  });

  if (!result.ok) {
    return { status: "error", message: result.message };
  }

  revalidatePath(`/crm/${leadId}`);

  return { status: "done", message: "Note saved." };
}
