"use server";

import { revalidatePath } from "next/cache";
import { requireCurrentAdmin } from "@/lib/services/auth/admin";
import {
  updateOperatorBasicInfo,
  updateOperatorPayoutForAdmin,
} from "@/lib/services/admin/operator-edit";

export type OperatorEditState =
  | { status: "idle" }
  | { status: "done"; message: string }
  | { status: "error"; message: string; field?: string };

const IDLE_MESSAGE = "Your admin session is no longer valid. Sign in again before saving changes.";

/**
 * Re-derives the admin rather than trusting the page-load gate, same as every other write in this
 * console (see operators/new/actions.ts) — this one changes payout routing and business identity,
 * so it is the last place to inherit an authorisation decision made minutes ago.
 */
async function requireAdmin(): Promise<{ email: string } | null> {
  const admin = await requireCurrentAdmin();
  return admin ? { email: admin.email } : null;
}

export async function updateOperatorBasicInfoAction(
  operatorProfileId: string,
  _previous: OperatorEditState,
  formData: FormData,
): Promise<OperatorEditState> {
  const admin = await requireAdmin();

  if (!admin) {
    return { status: "error", message: IDLE_MESSAGE };
  }

  const text = (field: string) => {
    const value = formData.get(field);
    return typeof value === "string" ? value.trim() : "";
  };

  const result = await updateOperatorBasicInfo({
    operatorProfileId,
    companyName: text("companyName"),
    whatsappE164: text("whatsappE164"),
    websiteUrl: text("websiteUrl"),
    country: text("country"),
    rezdySupplierId: text("rezdySupplierId"),
    updatedByEmail: admin.email,
  });

  if (!result.ok) {
    return { status: "error", message: result.message, field: result.field };
  }

  revalidatePath(`/admin/operators/${operatorProfileId}`);
  revalidatePath("/admin/operators");

  return { status: "done", message: "Business details saved." };
}

export async function updateOperatorPayoutAction(
  operatorProfileId: string,
  _previous: OperatorEditState,
  formData: FormData,
): Promise<OperatorEditState> {
  const admin = await requireAdmin();

  if (!admin) {
    return { status: "error", message: IDLE_MESSAGE };
  }

  const text = (field: string) => {
    const value = formData.get(field);
    return typeof value === "string" ? value.trim() : "";
  };

  if (formData.get("confirm") !== "on") {
    return {
      status: "error",
      message: "Confirm the change before saving — this decides where the operator's money is sent.",
    };
  }

  const result = await updateOperatorPayoutForAdmin({
    operatorProfileId,
    payoutMethod: text("payoutMethod") as never,
    bankDetails: text("bankDetails"),
    airwallexReference: text("airwallexReference"),
    stripeConnectAccountId: text("stripeConnectAccountId"),
    updatedByEmail: admin.email,
  });

  if (!result.ok) {
    return { status: "error", message: result.message, field: result.field };
  }

  revalidatePath(`/admin/operators/${operatorProfileId}`);
  revalidatePath("/admin/operators");

  return { status: "done", message: "Payout details saved." };
}
