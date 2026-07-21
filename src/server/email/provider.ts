export type EmailMessage = {
  to?: string | null;
  subject: string;
  html: string;
  idempotencyKey: string;
};

export interface EmailProvider {
  send(message: EmailMessage): Promise<void>;
}

class ConsoleEmailProvider implements EmailProvider {
  async send(message: EmailMessage) {
    console.info("Development email queued", {
      to: message.to,
      subject: message.subject,
      idempotencyKey: message.idempotencyKey,
    });
  }
}

export function getEmailProvider(): EmailProvider {
  return new ConsoleEmailProvider();
}
