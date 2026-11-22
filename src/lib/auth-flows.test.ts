import { createClient } from "@libsql/client";
import { beforeAll, describe, expect, it, vi } from "vitest";

vi.mock("next/headers", () => ({
  cookies: vi.fn(async () => ({
    get: vi.fn(() => undefined),
    set: vi.fn(),
  })),
}));

import {
  changePassword,
  confirmEmail,
  ensureUserCanAccessPage,
  loginUser,
  registerUser,
  requestPasswordReset,
  resetPassword,
  setAuthDbClientForTests,
  updateRegisteredUserAccess,
} from "@/lib/auth";
import {
  createSubscription,
  hasActivePaidMembership,
  setMembershipDbClientForTests,
  updateSubscription,
} from "@/lib/membership";

const BOOTSTRAP_ADMIN_EMAIL = "b.pdrn.rdz@gmail.com";

let db: ReturnType<typeof createClient>;

async function registerAndVerify(email: string, password = "password123") {
  const result = await registerUser({ email, password });
  expect(result.verificationUrl).toBeTruthy(); // email delivery soft-fails in tests
  const token = new URL(String(result.verificationUrl)).searchParams.get("token");
  expect(token).toBeTruthy();
  await confirmEmail(token!);
  return result.user;
}

beforeAll(() => {
  delete process.env.RESEND_API_KEY; // force the fallback-link path
  db = createClient({ url: ":memory:" });
  setAuthDbClientForTests(db);
  setMembershipDbClientForTests(db);
});

describe("register → verify → login", () => {
  it("registers unverified, blocks login, verifies via token, then logs in", async () => {
    const { verificationUrl } = await registerUser({ email: "player@example.com", password: "password123" });

    await expect(loginUser({ email: "player@example.com", password: "password123" })).rejects.toThrow(
      "Please confirm your email before logging in",
    );

    const token = new URL(String(verificationUrl)).searchParams.get("token")!;
    await confirmEmail(token);
    const user = await loginUser({ email: "player@example.com", password: "password123" });
    expect(user.email).toBe("player@example.com");
    expect(user.emailVerifiedAt).toBeTruthy();
  });

  it("rejects short passwords and duplicate emails", async () => {
    await expect(registerUser({ email: "short@example.com", password: "short" })).rejects.toThrow(
      "Password must be at least 8 characters",
    );

    await registerUser({ email: "dupe@example.com", password: "password123" });
    await expect(registerUser({ email: "DUPE@example.com", password: "password123" })).rejects.toThrow(
      "Email is already registered",
    );
  });

  it("rejects bad credentials generically", async () => {
    await registerAndVerify("creds@example.com");
    await expect(loginUser({ email: "creds@example.com", password: "wrong-password" })).rejects.toThrow(
      "Invalid email or password",
    );
    await expect(loginUser({ email: "ghost@example.com", password: "wrong-password" })).rejects.toThrow(
      "Invalid email or password",
    );
  });

  it("consumes confirmation tokens single-use", async () => {
    const { verificationUrl } = await registerUser({ email: "consume@example.com", password: "password123" });
    const token = new URL(String(verificationUrl)).searchParams.get("token")!;
    await confirmEmail(token);
    await expect(confirmEmail(token)).rejects.toThrow("Invalid or expired token");
  });
});

describe("password reset", () => {
  it("resets via the fallback link, rotates the password, and revokes sessions", async () => {
    const user = await registerAndVerify("reset@example.com");
    await loginUser({ email: "reset@example.com", password: "password123" });
    const sessionsBefore = await db.execute("select count(*) as c from app_session");
    expect(Number((sessionsBefore.rows[0] as Record<string, unknown>).c)).toBeGreaterThan(0);

    const resetUrl = await requestPasswordReset("reset@example.com");
    expect(resetUrl).toBeTruthy();
    const token = new URL(String(resetUrl)).searchParams.get("token")!;

    await resetPassword(token, "new-password-456");

    await expect(loginUser({ email: "reset@example.com", password: "password123" })).rejects.toThrow(
      "Invalid email or password",
    );
    const user2 = await loginUser({ email: "reset@example.com", password: "new-password-456" });
    expect(user2.id).toBe(user.id);

    const sessionsAfter = await db.execute("select count(*) as c from app_session where user_id = ?", [user.id]);
    // Old sessions revoked; the new login created exactly one fresh session.
    expect(Number((sessionsAfter.rows[0] as Record<string, unknown>).c)).toBe(1);

    await expect(resetPassword(token, "another-pass-789")).rejects.toThrow("Invalid or expired token");
  });
});

describe("logged-in password change", () => {
  it("requires the current password and accepts the new one", async () => {
    const user = await registerAndVerify("change@example.com");

    await expect(
      changePassword({ userId: user.id, currentPassword: "wrong-password", nextPassword: "next-pass-123" }),
    ).rejects.toThrow("Current password is incorrect");

    await changePassword({ userId: user.id, currentPassword: "password123", nextPassword: "next-pass-123" });
    const loggedIn = await loginUser({ email: "change@example.com", password: "next-pass-123" });
    expect(loggedIn.id).toBe(user.id);
  });
});

describe("page access + paid plan unlock", () => {
  it("defaults to no access for regular users and honors admin grants", async () => {
    const user = await registerAndVerify("grants@example.com");
    expect(user.isAdmin).toBe(false);
    expect(await ensureUserCanAccessPage(user, "daw")).toBe(false);

    await updateRegisteredUserAccess({
      targetUserId: user.id,
      pageKey: "daw",
      canAccess: true,
      actingUserId: user.id,
    });
    expect(await ensureUserCanAccessPage(user, "daw")).toBe(true);
  });

  it("bootstrap admin emails always have full access", async () => {
    const admin = await registerAndVerify(BOOTSTRAP_ADMIN_EMAIL);
    expect(admin.isAdmin).toBe(true);
    expect(await ensureUserCanAccessPage(admin, "prompt-library")).toBe(true);
  });

  it("an active paid subscription unlocks every page", async () => {
    const user = await registerAndVerify("pro@example.com");
    expect(await hasActivePaidMembership(user.id)).toBe(false);

    const subscription = await createSubscription({ userId: user.id, planId: "pro" });
    await updateSubscription(subscription.id, { status: "active" });

    expect(await hasActivePaidMembership(user.id)).toBe(true);
    expect(await ensureUserCanAccessPage(user, "daw")).toBe(true);
    expect(await ensureUserCanAccessPage(user, "prompt-library")).toBe(true);

    await updateSubscription(subscription.id, { status: "cancelled" });
    expect(await hasActivePaidMembership(user.id)).toBe(false);
    expect(await ensureUserCanAccessPage(user, "daw")).toBe(false);
  });

  it("an active free plan does not unlock pages", async () => {
    const user = await registerAndVerify("free@example.com");
    const subscription = await createSubscription({ userId: user.id, planId: "free" });
    await updateSubscription(subscription.id, { status: "active" });

    expect(await hasActivePaidMembership(user.id)).toBe(false);
    expect(await ensureUserCanAccessPage(user, "daw")).toBe(false);
  });

  it("a lapsed paid period stops unlocking", async () => {
    const user = await registerAndVerify("lapsed@example.com");
    const subscription = await createSubscription({ userId: user.id, planId: "pro" });
    await updateSubscription(subscription.id, {
      status: "active",
      currentPeriodStart: "2026-01-01T00:00:00.000Z",
      currentPeriodEnd: "2026-02-01T00:00:00.000Z",
    });

    expect(await hasActivePaidMembership(user.id)).toBe(false);
    expect(await ensureUserCanAccessPage(user, "daw")).toBe(false);
  });
});
