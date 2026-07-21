import { isProductionLike } from "@/server/env";
import { detectPlaceholderValue } from "@/server/placeholders";

export type EmailMessage = {
  to?: string | null;
  subject: string;
  html: string;
  idempotencyKey: string;
};

export interface EmailProvider {
  send(message: EmailMessage): Promise<EmailSendResult>;
}

export type EmailSendResult = {
  provider: string;
  status: "sent" | "queued" | "blocked" | "failed";
  messageId?: string | null;
};

class ConsoleEmailProvider implements EmailProvider {
  async send(message: EmailMessage) {
    if (message.to && isProductionLike()) {
      const placeholder = detectPlaceholderValue("email", message.to);
      if (placeholder) {
        console.warn(
          "External email blocked because placeholder recipient data is present",
          {
            subject: message.subject,
            idempotencyKey: message.idempotencyKey,
            reason: placeholder.reason,
          },
        );
        return { provider: "console", status: "blocked" as const };
      }
    }

    console.info("Development email queued", {
      to: message.to,
      subject: message.subject,
      idempotencyKey: message.idempotencyKey,
    });
    return { provider: "console", status: "queued" as const };
  }
}

class ResendEmailProvider implements EmailProvider {
  async send(message: EmailMessage) {
    const apiKey =
      process.env.RESEND_API_KEY ?? process.env.EMAIL_PROVIDER_API_KEY;
    const from = process.env.EMAIL_FROM;

    if (!apiKey || !from) {
      throw new Error("Email provider API key and from address are required.");
    }

    if (!message.to) {
      return { provider: "resend", status: "blocked" as const };
    }

    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        "Idempotency-Key": message.idempotencyKey,
      },
      body: JSON.stringify({
        from,
        to: [message.to],
        subject: message.subject,
        html: message.html,
      }),
    });

    const payload = (await response.json().catch(() => ({}))) as {
      id?: string;
      message?: string;
    };

    if (!response.ok) {
      throw new Error(payload.message ?? "Email provider send failed.");
    }

    return {
      provider: "resend",
      status: "sent" as const,
      messageId: payload.id ?? null,
    };
  }
}

export function getEmailProvider(): EmailProvider {
  const apiKey =
    process.env.RESEND_API_KEY ?? process.env.EMAIL_PROVIDER_API_KEY;
  if (apiKey && process.env.EMAIL_PROVIDER !== "console") {
    return new ResendEmailProvider();
  }

  return new ConsoleEmailProvider();
}
