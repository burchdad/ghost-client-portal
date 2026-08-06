import { CreditCard } from "lucide-react";
import { EmptyWorkspace, PageHero } from "@/components/workspace-ui";
import { requireOrganizationMembership } from "@/lib/auth/guards";

export default async function BillingSettingsPage() {
  const { organization } = await requireOrganizationMembership();

  return (
    <section className="space-y-6">
      <PageHero
        eyebrow="Billing settings"
        title={`Billing controls for ${organization.name}`}
        body="Billing contacts, payment methods, receipts, and subscription preferences will live here as Stripe account controls expand."
        metrics={[
          { label: "Cards", value: "0", detail: "Saved methods" },
          { label: "Contacts", value: "1", detail: "Primary billing owner" },
          { label: "Receipts", value: "Portal", detail: "Payment history" },
        ]}
      />
      <EmptyWorkspace
        icon={CreditCard}
        title="Billing settings are managed through payment records today"
        body="For now, checkout links and Stripe status live in the Payments screen. This area is reserved for saved billing contacts, cards, tax details, and receipt preferences."
        steps={[
          "Payment records sync from Stripe",
          "Saved methods land in a later billing phase",
          "Receipts remain visible in Payments",
        ]}
      />
    </section>
  );
}
