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

export function paymentFailureEmail(input: {
  organization: string;
  proposal: string;
}) {
  return {
    subject: `Payment not completed for ${input.proposal}`,
    html: `<p>The payment for ${input.organization} was not confirmed. The client can safely retry from the secure payment page.</p>`,
  };
}

export function clientTeamInvitationEmail(input: {
  organization: string;
  inviterName: string;
  inviteeName: string;
  role: string;
  invitationUrl: string;
  expiresAt: Date;
}) {
  return {
    subject: `${input.inviterName} invited you to ${input.organization} in Ghost AI Client Portal`,
    html: `
      <div style="font-family:Arial,sans-serif;line-height:1.6;color:#0f172a">
        <p>Hi ${escapeHtml(input.inviteeName)},</p>
        <p>${escapeHtml(input.inviterName)} invited you to the ${escapeHtml(input.organization)} workspace in the Ghost AI Solutions Client Portal.</p>
        <p>Your access role: <strong>${escapeHtml(input.role.replaceAll("_", " ").toLowerCase())}</strong></p>
        <p><a href="${escapeHtml(input.invitationUrl)}" style="display:inline-block;background:#72dbc8;color:#020617;padding:12px 18px;border-radius:6px;text-decoration:none;font-weight:700">Activate workspace access</a></p>
        <p>This invitation expires ${input.expiresAt.toISOString()}.</p>
        <p>If the button does not work, paste this link into your browser:</p>
        <p style="word-break:break-all">${escapeHtml(input.invitationUrl)}</p>
      </div>
    `,
  };
}

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}
