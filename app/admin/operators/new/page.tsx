import AdminPageHeader from "@/components/admin/AdminPageHeader";
import OperatorOnboardingForm from "@/components/admin/OperatorOnboardingForm";
import { requireAdminOrRedirect } from "@/lib/services/admin/guard";

export const metadata = { title: "New operator · Bluepass Admin" };

export default async function NewOperatorPage() {
  await requireAdminOrRedirect("/admin/operators/new");

  return (
    <>
      <AdminPageHeader
        eyebrow="Manual onboarding"
        title="New operator"
        support="For an operator you have already closed by phone or email. This creates a real, live profile with real payout details — not a placeholder waiting to be claimed."
      />
      <OperatorOnboardingForm />
    </>
  );
}
