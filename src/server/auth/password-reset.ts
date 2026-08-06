import { createHmac, timingSafeEqual } from "crypto";
import { getDb } from "@/lib/db";
import { hashPassword, sha256 } from "@/lib/crypto";
import { getEmailProvider } from "@/server/email/provider";

const resetTtlMs = 1000 * 60 * 30;

type ResetPayload = {
  email: string;
  exp: number;
  passwordVersion: string;
};

export async function requestPasswordReset(email: string) {
  const normalizedEmail = email.trim().toLowerCase();
  const user = await getDb().user.findUnique({
    where: { email: normalizedEmail },
  });

  if (!user || user.deletedAt || user.accountStatus !== "ACTIVE") {
    return { sent: false as const };
  }

  const token = createPasswordResetToken({
    email: user.email,
    exp: Date.now() + resetTtlMs,
    passwordVersion: sha256(user.passwordHash),
  });
  const appUrl =
    process.env.NEXT_PUBLIC_APP_URL ?? "https://clientportal.ghostai.solutions";
  const resetUrl = `${appUrl.replace(/\/$/, "")}/reset-password?token=${encodeURIComponent(token)}`;

  await getEmailProvider().send({
    to: user.email,
    subject: "Reset your Ghost AI client portal password",
    idempotencyKey: `password-reset-${user.id}-${sha256(token).slice(0, 16)}`,
    html: [
      `<p>Hi ${escapeHtml(user.name)},</p>`,
      "<p>Use the secure link below to reset your Ghost AI client portal password. This link expires in 30 minutes.</p>",
      `<p><a href="${resetUrl}">Reset password</a></p>`,
      "<p>If you did not request this, you can ignore this email.</p>",
    ].join(""),
  });

  return { sent: true as const };
}

export async function resetPasswordWithToken(input: {
  token: string;
  password: string;
}) {
  const payload = parsePasswordResetToken(input.token);

  if (!payload || payload.exp < Date.now()) {
    return {
      ok: false as const,
      error: "This reset link is invalid or expired.",
    };
  }

  const db = getDb();
  const user = await db.user.findUnique({ where: { email: payload.email } });

  if (
    !user ||
    user.deletedAt ||
    user.accountStatus !== "ACTIVE" ||
    sha256(user.passwordHash) !== payload.passwordVersion
  ) {
    return {
      ok: false as const,
      error: "This reset link is invalid or expired.",
    };
  }

  await db.$transaction([
    db.user.update({
      where: { id: user.id },
      data: { passwordHash: await hashPassword(input.password) },
    }),
    db.session.updateMany({
      where: { userId: user.id, revokedAt: null },
      data: { revokedAt: new Date() },
    }),
    db.auditLog.create({
      data: {
        actorUserId: user.id,
        eventType: "auth.password_reset.completed",
        entityType: "User",
        entityId: user.id,
        metadata: { email: user.email },
      },
    }),
  ]);

  return { ok: true as const };
}

export function createPasswordResetToken(payload: ResetPayload) {
  const body = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const signature = sign(body);

  return `${body}.${signature}`;
}

export function parsePasswordResetToken(token: string): ResetPayload | null {
  const [body, signature] = token.split(".");

  if (!body || !signature || !constantTimeStringEqual(signature, sign(body))) {
    return null;
  }

  try {
    const parsed = JSON.parse(Buffer.from(body, "base64url").toString("utf8"));

    if (
      typeof parsed.email !== "string" ||
      typeof parsed.exp !== "number" ||
      typeof parsed.passwordVersion !== "string"
    ) {
      return null;
    }

    return parsed;
  } catch {
    return null;
  }
}

function sign(body: string) {
  const secret = process.env.AUTH_SECRET;
  if (!secret) {
    throw new Error("AUTH_SECRET is required for password reset links.");
  }

  return createHmac("sha256", secret).update(body).digest("base64url");
}

function constantTimeStringEqual(left: string, right: string) {
  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);

  if (leftBuffer.length !== rightBuffer.length) {
    return false;
  }

  return timingSafeEqual(leftBuffer, rightBuffer);
}

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}
