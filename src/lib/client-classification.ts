import type { BillingModel, ClientType, PortalStatus } from "@prisma/client";

export const clientTypeOptions: Array<{
  value: ClientType;
  label: string;
  description: string;
}> = [
  {
    value: "PAID_CLIENT",
    label: "Paid client",
    description: "Standard paying client with invoices and Stripe payments.",
  },
  {
    value: "TRADE_BARTER_CLIENT",
    label: "Trade / barter client",
    description: "Client receives portal access under a barter agreement.",
  },
  {
    value: "INTERNAL_GHOST",
    label: "Internal Ghost",
    description: "Ghost AI Solutions treated as its own client workspace.",
  },
  {
    value: "TEST_CLIENT",
    label: "Test client",
    description: "Controlled QA or validation record.",
  },
  {
    value: "PROSPECT",
    label: "Prospect",
    description: "Not yet active as a delivery or paying client.",
  },
];

export const billingModelOptions: Array<{
  value: BillingModel;
  label: string;
  description: string;
}> = [
  {
    value: "RETAINER",
    label: "Retainer",
    description: "Recurring monthly or ongoing payment relationship.",
  },
  {
    value: "PROJECT_BASED",
    label: "Project based",
    description: "Payments are tied to a proposal, project, or milestone.",
  },
  {
    value: "SUBSCRIPTION",
    label: "Subscription",
    description: "Recurring Stripe subscription or service plan.",
  },
  {
    value: "TRADE_BARTER",
    label: "Trade / barter",
    description: "Tracked as a non-cash service exchange.",
  },
  {
    value: "NO_CHARGE",
    label: "No charge",
    description: "Portal access with no payment obligation.",
  },
  {
    value: "CUSTOM",
    label: "Custom",
    description: "Handled manually by Ghost operations.",
  },
];

export const portalStatusOptions: Array<{
  value: PortalStatus;
  label: string;
}> = [
  { value: "NOT_INVITED", label: "Not invited" },
  { value: "INVITED", label: "Invited" },
  { value: "ACTIVE", label: "Active" },
  { value: "PAUSED", label: "Paused" },
  { value: "ARCHIVED", label: "Archived" },
];

export function clientTypeLabel(value: ClientType) {
  return optionLabel(clientTypeOptions, value);
}

export function billingModelLabel(value: BillingModel) {
  return optionLabel(billingModelOptions, value);
}

export function portalStatusLabel(value: PortalStatus) {
  return optionLabel(portalStatusOptions, value);
}

export function suppressStripeForBillingModel(value: BillingModel) {
  return value === "TRADE_BARTER" || value === "NO_CHARGE";
}

function optionLabel<T extends string>(
  options: Array<{ value: T; label: string }>,
  value: T,
) {
  return options.find((option) => option.value === value)?.label ?? value;
}
