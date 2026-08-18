"use server";

import { revalidatePath } from "next/cache";
import { requireCurrentAdmin } from "@/lib/services/auth/admin";
import {
  createManualOperator,
  PAYOUT_METHODS,
  type DuplicateMatch,
  type ManualOperatorInput,
} from "@/lib/services/admin/operator-onboarding";

export type OnboardOperatorState =
  | { status: "idle" }
  | {
      status: "error";
      message: string;
      /** Names the input to highlight, when the failure belongs to one. */
      field?: string;
      /** Present only for a same-name match, which the admin may override. */
      duplicate?: DuplicateMatch;
    }
  | { status: "success"; companyName: string; payoutContactEmail: string; operatorProfileId: string };

/**
 * Creates a real operator from the onboarding form.
 *
 * Like every other write in this console, it re-derives the admin itself rather
 * than trusting the page-load gate — this one mints an account and stores bank
 * details, so it is the last place to inherit an authorisation decision made
 * minutes ago.
 *
 * Nothing the admin typed is echoed back in the returned state, and it must not
 * be: React 19 resets a form once its action resolves, so a rejected submission
 * would need the values re-seeded from somewhere. The form holds them in React
 * state instead of round-tripping bank details through the server for the sake
 * of repopulating an input.
 */
export async function onboardOperatorAction(
  _previous: OnboardOperatorState,
  formData: FormData,
): Promise<OnboardOperatorState> {
  const admin = await requireCurrentAdmin();

  if (!admin) {
    return {
      status: "error",
      message: "Your admin session is no longer valid. Sign in again before creating an operator.",
    };
  }

  const text = (field: string) => {
    const value = formData.get(field);
    return typeof value === "string" ? value.trim() : "";
  };

  const payoutMethod = PAYOUT_METHODS.find((method) => method === text("payoutMethod"));

  if (!payoutMethod) {
    return { status: "error", message: "Choose a payout method.", field: "payoutMethod" };
  }

  const input: ManualOperatorInput = {
    companyName: text("companyName"),
    payoutContactEmail: text("payoutContactEmail"),
    whatsappE164: text("whatsappE164"),
    websiteUrl: text("websiteUrl"),
    country: text("country"),
    payoutMethod,
    bankDetails: text("bankDetails"),
    stripeConnectAccountId: text("stripeConnectAccountId"),
    airwallexReference: text("airwallexReference"),
    rezdySupplierId: text("rezdySupplierId"),
    confirmDuplicate: formData.get("confirmDuplicate") === "on",
    createdByEmail: admin.email,
  };

  const result = await createManualOperator(input);

  if (!result.ok) {
    return {
      status: "error",
      message: result.message,
      field: "field" in result ? result.field : undefined,
      /* Only a company-name collision is overridable — a rezdySupplierId is
         unique in the database, so offering a "create anyway" for it would
         promise something the write cannot deliver. */
      duplicate:
        result.code === "DUPLICATE_PROFILE" && result.duplicate.matchedOn === "companyName"
          ? result.duplicate
          : undefined,
    };
  }

  /* The rail's counter is unaffected (a manually onboarded operator is LIVE,
     never pending), but /admin's cards read from the same fetch. */
  revalidatePath("/admin");

  return {
    status: "success",
    companyName: result.companyName,
    payoutContactEmail: result.payoutContactEmail,
    operatorProfileId: result.operatorProfileId,
  };
}
