"use server";

import { revalidatePath } from "next/cache";
import { requireCurrentAdmin } from "@/lib/services/auth/admin";
import { parseNewCreator } from "@/lib/services/admin/creator-input";
import { addCreator, createCreatorLogin, linkCreatorAccount, markInvited, resolveDispute } from "@/lib/services/onboarding/creator-admin";

export type CreatorAdminState = { status: "idle" } | { status: "done" | "error"; message: string };

const SIGNED_OUT: CreatorAdminState = { status: "error", message: "Your admin session is no longer valid. Sign in again." };

export async function addCreatorAction(_prev: CreatorAdminState, form: FormData): Promise<CreatorAdminState> {
  const admin = await requireCurrentAdmin();
  if (!admin) return SIGNED_OUT;
  const parsed = parseNewCreator(form);
  if (!parsed.ok) return { status: "error", message: parsed.message };
  const withLogin = form.get("createLogin") === "on";
  if (withLogin && !parsed.value.contactEmail) return { status: "error", message: "A login needs their email, since the link to set a password is sent there." };
  const result = await addCreator(parsed.value);
  if (!result.ok) return { status: "error", message: result.message };
  revalidatePath("/admin/creators");
  const added = `${parsed.value.name} is in the directory. Operators can pick them now.`;
  if (!withLogin) return { status: "done", message: added };

  const login = await createCreatorLogin({ creatorId: result.creatorId });
  if (!login.ok) return { status: "error", message: `${added} Their login was not created: ${login.message}` };
  if (login.emailed) return { status: "done", message: `${added} A link to set their password was emailed to ${login.email}. It works for 60 minutes.` };
  // No mail provider (local) or a send failure: the account exists, so hand over what an admin can act on.
  return {
    status: "done",
    message: `${added} Their login exists (${login.email}) but the email did not go out${login.emailError ? `: ${login.emailError}` : ""}. ${login.developmentResetUrl ? `Send them this link: ${login.developmentResetUrl}` : "They can use \"Forgot password\" on the sign-in page."}`,
  };
}

export async function markInvitedAction(creatorId: string): Promise<CreatorAdminState> {
  const admin = await requireCurrentAdmin();
  if (!admin) return SIGNED_OUT;
  await markInvited({ creatorId, by: admin.email });
  revalidatePath("/admin/creators");
  return { status: "done", message: "Marked as invited." };
}

export async function linkAccountAction(creatorId: string, _prev: CreatorAdminState, form: FormData): Promise<CreatorAdminState> {
  const admin = await requireCurrentAdmin();
  if (!admin) return SIGNED_OUT;
  const partnerProfileId = String(form.get("partnerProfileId") ?? "");
  if (!partnerProfileId) return { status: "error", message: "Choose their account." };
  const result = await linkCreatorAccount({ creatorId, partnerProfileId });
  if (!result.ok) return { status: "error", message: result.message };
  revalidatePath("/admin/creators");
  return { status: "done", message: "Linked. Their picks are in their portal now." };
}

export async function resolveDisputeAction(campaignId: string, pay: boolean): Promise<CreatorAdminState> {
  const admin = await requireCurrentAdmin();
  if (!admin) return SIGNED_OUT;
  const result = await resolveDispute({ campaignId, pay });
  if (!result.ok) return { status: "error", message: result.message };
  revalidatePath("/admin/creators");
  return { status: "done", message: pay ? "The creator will be paid." : "The credit is back with the operator." };
}
