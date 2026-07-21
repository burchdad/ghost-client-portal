import { formatMoney } from "@/lib/format";

export function clientPaymentConfirmationEmail(input: {
  organization: string;
  proposal: string;
  amountCents: number;
  currency: string;
  remainingCents: number;
  paymentDate: Date;
  projectActivated: boolean;
}) {
  return {
    subject: `Payment received for ${input.proposal}`,
    html: `<p>Payment received for ${input.organization}.</p><p>Amount paid: ${formatMoney(input.amountCents, input.currency)}</p><p>Remaining balance: ${formatMoney(input.remainingCents, input.currency)}</p><p>Payment date: ${input.paymentDate.toISOString()}</p><p>Project activated: ${input.projectActivated ? "Yes" : "Pending review"}</p>`,
  };
}

export function internalPaymentNotificationEmail(input: {
  organization: string;
  proposal: string;
  amountCents: number;
  currency: string;
  paymentType: string;
  stripeReference?: string | null;
  activationStatus: string;
}) {
  return {
    subject: `Client payment received: ${input.organization}`,
    html: `<p>${input.organization} paid ${formatMoney(input.amountCents, input.currency)} for ${input.proposal}.</p><p>Type: ${input.paymentType}</p><p>Stripe reference: ${input.stripeReference ?? "none"}</p><p>Activation: ${input.activationStatus}</p>`,
  };
}

export function paymentFailureEmail(input: { organization: string; proposal: string }) {
  return {
    subject: `Payment not completed for ${input.proposal}`,
    html: `<p>The payment for ${input.organization} was not confirmed. The client can safely retry from the secure payment page.</p>`,
  };
}
