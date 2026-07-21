import { cookies, headers } from "next/headers";
import type { User } from "@prisma/client";
import { getDb } from "@/lib/db";
import { createOpaqueToken, sha256, verifyPassword } from "@/lib/crypto";

export const sessionCookieName = "ghost_client_portal_session";

export type AuthenticatedUser = Pick<
  User,
  "id" | "email" | "name" | "title" | "internalRole" | "lastLoginAt"
>;

export async function createSession(userId: string) {
  const token = createOpaqueToken();
  const tokenHash = sha256(token);
  const expiresAt = new Date(Date.now() + 1000 * 60 * 60 * 24 * 14);
  const headerStore = await headers();
  const db = getDb();

  await db.session.create({
    data: {
      userId,
      tokenHash,
      expiresAt,
      ipAddress: headerStore.get("x-forwarded-for")?.split(",")[0]?.trim(),
      userAgent: headerStore.get("user-agent"),
    },
  });

  const cookieStore = await cookies();
  cookieStore.set(sessionCookieName, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    expires: expiresAt,
  });
}

export async function destroySession() {
  const cookieStore = await cookies();
  const token = cookieStore.get(sessionCookieName)?.value;

  if (token) {
    await getDb().session.updateMany({
      where: { tokenHash: sha256(token), revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }

  cookieStore.delete(sessionCookieName);
}

export async function getCurrentUser(): Promise<AuthenticatedUser | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(sessionCookieName)?.value;

  if (!token) {
    return null;
  }

  const session = await getDb().session.findFirst({
    where: {
      tokenHash: sha256(token),
      revokedAt: null,
      expiresAt: { gt: new Date() },
    },
    include: {
      user: {
        select: {
          id: true,
          email: true,
          name: true,
          title: true,
          internalRole: true,
          lastLoginAt: true,
        },
      },
    },
  });

  return session?.user ?? null;
}

export async function authenticateWithPassword(email: string, password: string) {
  const db = getDb();
  const user = await db.user.findUnique({
    where: { email: email.toLowerCase() },
  });

  if (!user || user.deletedAt || user.accountStatus !== "ACTIVE") {
    return null;
  }

  const valid = await verifyPassword(password, user.passwordHash);

  if (!valid) {
    return null;
  }

  await db.user.update({
    where: { id: user.id },
    data: { lastLoginAt: new Date() },
  });

  await createSession(user.id);

  return user;
}
