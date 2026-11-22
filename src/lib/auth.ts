import { createClient } from "@libsql/client";
import { LibsqlDialect, type LibsqlDialectConfig } from "@libsql/kysely-libsql";
import { dash } from "@better-auth/infra";
import { APIError, betterAuth } from "better-auth";
import { nextCookies } from "better-auth/next-js";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { createHash, randomBytes, randomUUID, scryptSync, timingSafeEqual } from "node:crypto";

import { ALL_ACCESS_PAGE_MAP, MANAGEABLE_PAGES, type ManagedPageKey } from "@/lib/access";
import { sendEmail } from "@/lib/email";
import { hasActivePaidMembership } from "@/lib/membership";

const SESSION_DURATION_SECONDS = 60 * 60 * 24 * 30;
const EMAIL_CONFIRMATION_DURATION_SECONDS = 60 * 60 * 24;
const PASSWORD_RESET_DURATION_SECONDS = 60 * 30;
const BOOTSTRAP_ADMIN_EMAILS = new Set(["b.pdrn.rdz@gmail.com"]);

type NullableString = string | null | undefined;

export type AuthUser = {
  id: string;
  email: string;
  name: string | null;
  emailVerifiedAt: string | null;
  isAdmin: boolean;
};

export type AuthSession = {
  id: string;
  userId: string;
  expiresAt: string;
};

export type RegisteredUserAccess = {
  id: string;
  email: string;
  name: string | null;
  emailVerifiedAt: string | null;
  isAdmin: boolean;
  pageAccess: Record<ManagedPageKey, boolean>;
};

type LibsqlClientConfig = Extract<LibsqlDialectConfig, { client: unknown }>;

let client: ReturnType<typeof createClient> | null = null;
let authInstance: ReturnType<typeof createAuthInstance> | null = null;
let authTablesReady = false;

/** Short-lived in-process store so paused email delivery can still surface a working link. */
const fallbackLinks = new Map<string, { url: string; createdAt: number }>();

function normalizeEmail(value: string) {
  return value.trim().toLowerCase();
}

function normalizeText(value: NullableString) {
  if (typeof value !== "string") {
    return value ?? null;
  }
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function isoNow() {
  return new Date().toISOString();
}

function toIsoString(value: unknown): string | null {
  if (!value) return null;
  if (value instanceof Date) return value.toISOString();
  if (typeof value === "number") return new Date(value).toISOString();
  const parsed = new Date(String(value));
  return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString();
}

function isBootstrapAdminEmail(email: string) {
  return BOOTSTRAP_ADMIN_EMAILS.has(normalizeEmail(email));
}

function resolveIsAdmin(email: string, isAdminFromDb: boolean) {
  return isAdminFromDb || isBootstrapAdminEmail(email);
}

function hashToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

/** Reads the (already signature-verified by Better Auth) JWT payload. */
function decodeJwtPayload(token: string): Record<string, unknown> {
  const segment = token.split(".")[1];
  if (!segment) return {};
  try {
    return JSON.parse(Buffer.from(segment, "base64url").toString("utf8")) as Record<string, unknown>;
  } catch {
    return {};
  }
}

function getBaseUrl() {
  const explicit = process.env.APP_BASE_URL?.trim() || process.env.NEXT_PUBLIC_APP_URL?.trim();
  if (explicit) {
    return explicit.replace(/\/$/, "");
  }

  const betterAuthUrl = process.env.BETTER_AUTH_URL?.trim();
  if (betterAuthUrl) {
    return betterAuthUrl.replace(/\/$/, "");
  }

  const vercelUrl = process.env.VERCEL_URL?.trim();
  if (vercelUrl) {
    return `https://${vercelUrl.replace(/\/$/, "")}`;
  }

  return "http://localhost:3000";
}

function getAuthSecret() {
  return (
    process.env.BETTER_AUTH_SECRET?.trim() ||
    process.env.AUTH_SECRET?.trim() ||
    "bandschamber-development-secret-change-me-please"
  );
}

function getAuthClient() {
  if (client) {
    return client;
  }

  const url = process.env.MUSIC_TURSO_DATABASE_URL;
  const authToken = process.env.MUSIC_TURSO_AUTH_TOKEN;

  if (!url || !authToken) {
    throw new Error("Music production database is not configured");
  }

  client = createClient({ url, authToken });
  return client;
}

/** Legacy password hashing kept so existing app_user hashes keep working after migration. */
function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(password, salt, 64).toString("hex");
  return `${salt}:${hash}`;
}

function verifyPassword(password: string, storedHash: string) {
  const [salt, originalHash] = storedHash.split(":");
  if (!salt || !originalHash) {
    return false;
  }

  const computed = scryptSync(password, salt, 64);
  const original = Buffer.from(originalHash, "hex");
  if (computed.byteLength !== original.byteLength) {
    return false;
  }

  return timingSafeEqual(computed, original);
}

function rememberFallbackLink(key: string, url: string) {
  fallbackLinks.set(key, { url, createdAt: Date.now() });
}

function takeFallbackLink(key: string) {
  const entry = fallbackLinks.get(key);
  if (!entry) return null;
  fallbackLinks.delete(key);
  // Links are only useful briefly; drop stale entries defensively.
  return Date.now() - entry.createdAt < PASSWORD_RESET_DURATION_SECONDS * 1000 ? entry.url : null;
}

function buildTransactionalEmail(options: { title: string; intro: string; url: string; cta: string }) {
  return {
    html: `
      <div style="font-family:Arial,sans-serif;line-height:1.6;color:#111">
        <h1 style="font-size:24px">${options.title}</h1>
        <p>${options.intro}</p>
        <p><a href="${options.url}" style="display:inline-block;padding:12px 18px;background:#c2793f;color:#fff;text-decoration:none;border-radius:9999px">${options.cta}</a></p>
        <p>If the button does not work, open this link:</p>
        <p>${options.url}</p>
      </div>
    `,
    text: `${options.title}: ${options.url}`,
  };
}

function createAuthInstance(client: ReturnType<typeof createClient>) {
  return betterAuth({
    appName: "BandsChamber Studio",
    baseURL: getBaseUrl(),
    basePath: "/api/auth",
    secret: getAuthSecret(),
    database: {
      // The dialect bundles its own @libsql/client typings; the runtime client
      // shape is identical to the app's, so bridge the duplicate type here.
      dialect: new LibsqlDialect({ client: client as unknown as LibsqlClientConfig["client"] }),
      type: "sqlite" as const,
    },
    session: {
      expiresIn: SESSION_DURATION_SECONDS,
      updateAge: 60 * 60 * 24,
    },
    user: {
      additionalFields: {
        isAdmin: {
          type: "boolean",
          required: false,
          defaultValue: false,
          input: false,
        },
        emailVerifiedAt: {
          type: "date",
          required: false,
          input: false,
        },
      },
    },
    emailAndPassword: {
      enabled: true,
      requireEmailVerification: true,
      autoSignIn: false,
      minPasswordLength: 8,
      maxPasswordLength: 128,
      resetPasswordTokenExpiresIn: PASSWORD_RESET_DURATION_SECONDS,
      revokeSessionsOnPasswordReset: true,
      password: {
        hash: async (password) => hashPassword(password),
        verify: async ({ hash, password }) => verifyPassword(password, hash),
      },
      sendResetPassword: async ({ user, token }) => {
        const url = `${getBaseUrl()}/reset-password?token=${encodeURIComponent(token)}`;
        const email = normalizeEmail(user.email);
        try {
          const result = await sendEmail({
            to: user.email,
            subject: "Reset your BandsChamber Studio password",
            ...buildTransactionalEmail({
              title: "Reset your password",
              intro: `Hi ${user.name || user.email}, use the button below to set a new BandsChamber Studio password.`,
              url,
              cta: "Reset password",
            }),
          });
          if (!result.ok) {
            console.error("Password reset email could not be delivered; surfacing fallback link", url);
            rememberFallbackLink(email, url);
          }
        } catch (error) {
          console.error("Password reset email failed; surfacing fallback link", error);
          rememberFallbackLink(email, url);
        }
      },
    },
    emailVerification: {
      expiresIn: EMAIL_CONFIRMATION_DURATION_SECONDS,
      autoSignInAfterVerification: false,
      sendVerificationEmail: async ({ user, token }) => {
        const url = `${getBaseUrl()}/verify-email?token=${encodeURIComponent(token)}`;
        const email = normalizeEmail(user.email);
        try {
          const result = await sendEmail({
            to: user.email,
            subject: "Confirm your BandsChamber Studio email",
            ...buildTransactionalEmail({
              title: "Confirm your email",
              intro: `Hi ${user.name || user.email}, confirm your BandsChamber Studio account to finish setup.`,
              url,
              cta: "Confirm email",
            }),
          });
          if (!result.ok) {
            console.error("Confirmation email could not be delivered; surfacing fallback link", url);
            rememberFallbackLink(email, url);
          }
        } catch (error) {
          console.error("Confirmation email failed; surfacing fallback link", error);
          rememberFallbackLink(email, url);
        }
      },
      afterEmailVerification: async (user) => {
        const db = getAuthClient();
        const now = isoNow();
        await db.execute({
          sql: "update user set emailVerifiedAt = ?, updatedAt = ? where id = ?",
          args: [now, now, user.id],
        });
      },
    },
    rateLimit: {
      enabled: false,
    },
    trustedOrigins: [getBaseUrl()],
    plugins: [
      // Optional hosted dashboard (https://dash.better-auth.com). It stays off
      // until an Infrastructure project API key is configured.
      ...(process.env.BETTER_AUTH_API_KEY?.trim()
        ? [dash({ apiKey: process.env.BETTER_AUTH_API_KEY.trim() })]
        : []),
      nextCookies(),
    ],
  });
}

export function getAuth(): ReturnType<typeof createAuthInstance> {
  if (!authInstance) {
    authInstance = createAuthInstance(getAuthClient());
  }
  return authInstance;
}

/** Tests/ops only: swap the backing DB (e.g. in-memory libSQL) and reset bootstrap state. */
export function setAuthDbClientForTests(nextClient: ReturnType<typeof createClient> | null) {
  client = nextClient;
  authInstance = null;
  authTablesReady = false;
}

function getDefaultPageAccessMap() {
  return Object.fromEntries(MANAGEABLE_PAGES.map((page) => [page.key, false])) as Record<ManagedPageKey, boolean>;
}

async function ensureColumn(table: string, column: string, definition: string) {
  const db = getAuthClient();
  const info = await db.execute(`PRAGMA table_info(${table})`);
  const exists = info.rows.some((row) => String((row as Record<string, unknown>).name) === column);
  if (!exists) {
    await db.execute(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`);
  }
}

async function tableExists(table: string) {
  const db = getAuthClient();
  const result = await db.execute({
    sql: "select name from sqlite_master where type = 'table' and name = ? limit 1",
    args: [table],
  });
  return result.rows.length > 0;
}

async function ensureAuthSchema() {
  const db = getAuthClient();

  await db.execute(`
    CREATE TABLE IF NOT EXISTS user (
      id text PRIMARY KEY NOT NULL,
      name text NOT NULL,
      email text NOT NULL,
      emailVerified integer NOT NULL DEFAULT 0,
      emailVerifiedAt text,
      image text,
      isAdmin integer NOT NULL DEFAULT 0,
      createdAt text NOT NULL,
      updatedAt text NOT NULL
    )
  `);
  await db.execute(`CREATE UNIQUE INDEX IF NOT EXISTS user_email_idx ON user (email)`);
  await ensureColumn("user", "emailVerifiedAt", "text");
  await ensureColumn("user", "isAdmin", "integer NOT NULL DEFAULT 0");

  await db.execute(`
    CREATE TABLE IF NOT EXISTS session (
      id text PRIMARY KEY NOT NULL,
      expiresAt text NOT NULL,
      token text NOT NULL,
      createdAt text NOT NULL,
      updatedAt text NOT NULL,
      ipAddress text,
      userAgent text,
      userId text NOT NULL
    )
  `);
  await db.execute(`CREATE UNIQUE INDEX IF NOT EXISTS session_token_idx ON session (token)`);
  await db.execute(`CREATE INDEX IF NOT EXISTS session_user_idx ON session (userId, expiresAt)`);

  await db.execute(`
    CREATE TABLE IF NOT EXISTS account (
      id text PRIMARY KEY NOT NULL,
      accountId text NOT NULL,
      providerId text NOT NULL,
      userId text NOT NULL,
      accessToken text,
      refreshToken text,
      idToken text,
      accessTokenExpiresAt text,
      refreshTokenExpiresAt text,
      scope text,
      password text,
      createdAt text NOT NULL,
      updatedAt text NOT NULL
    )
  `);
  await db.execute(`CREATE UNIQUE INDEX IF NOT EXISTS account_provider_account_idx ON account (providerId, accountId)`);
  await db.execute(`CREATE INDEX IF NOT EXISTS account_user_idx ON account (userId)`);

  await db.execute(`
    CREATE TABLE IF NOT EXISTS verification (
      id text PRIMARY KEY NOT NULL,
      identifier text NOT NULL,
      value text NOT NULL,
      expiresAt text NOT NULL,
      createdAt text,
      updatedAt text
    )
  `);
  await db.execute(`CREATE INDEX IF NOT EXISTS verification_identifier_idx ON verification (identifier)`);

  await db.execute(`
    CREATE TABLE IF NOT EXISTS app_page_access (
      user_id text NOT NULL,
      page_key text NOT NULL,
      can_access integer NOT NULL,
      updated_at text NOT NULL,
      updated_by text,
      PRIMARY KEY (user_id, page_key)
    )
  `);
  await db.execute(`CREATE INDEX IF NOT EXISTS app_page_access_user_idx ON app_page_access (user_id, page_key)`);

  await db.execute(`
    CREATE TABLE IF NOT EXISTS app_email_change (
      id text PRIMARY KEY NOT NULL,
      user_id text NOT NULL,
      new_email text NOT NULL,
      token_hash text NOT NULL,
      expires_at text NOT NULL,
      created_at text NOT NULL,
      consumed_at text
    )
  `);
  await db.execute(`CREATE UNIQUE INDEX IF NOT EXISTS app_email_change_hash_idx ON app_email_change (token_hash)`);
  await db.execute(`CREATE INDEX IF NOT EXISTS app_email_change_user_idx ON app_email_change (user_id, expires_at)`);

  // Consumed-token ledger: Better Auth tokens are signed JWTs that remain valid
  // until expiry, so this table enforces single-use for verify/reset links.
  await db.execute(`
    CREATE TABLE IF NOT EXISTS app_email_token (
      id text PRIMARY KEY NOT NULL,
      user_id text NOT NULL,
      type text NOT NULL,
      token_hash text NOT NULL,
      expires_at text NOT NULL,
      created_at text NOT NULL,
      consumed_at text
    )
  `);
  await db.execute(`CREATE UNIQUE INDEX IF NOT EXISTS app_email_token_hash_idx ON app_email_token (token_hash)`);
  await db.execute(`CREATE INDEX IF NOT EXISTS app_email_token_user_idx ON app_email_token (user_id, type, expires_at)`);
}

async function claimOneTimeToken(token: string, type: "email-verification" | "password-reset", userId: string | null) {
  const db = getAuthClient();
  const now = isoNow();
  const expiresAt = new Date(Date.now() + (type === "password-reset" ? PASSWORD_RESET_DURATION_SECONDS : EMAIL_CONFIRMATION_DURATION_SECONDS) * 1000).toISOString();
  const inserted = await db.execute({
    sql: `
      insert or ignore into app_email_token (id, user_id, type, token_hash, expires_at, created_at, consumed_at)
      values (?, ?, ?, ?, ?, ?, ?)
    `,
    args: [randomUUID(), userId ?? "", type, hashToken(token), expiresAt, now, now],
  });
  if (inserted.rowsAffected === 0) {
    throw new Error("Invalid or expired token");
  }
}

/**
 * Copies legacy `app_user` identities into Better Auth's `user` + `account`
 * tables. Idempotent: existing ids are left untouched, so it is safe to run on
 * every cold start and from the ops migration script.
 */
async function migrateLegacyAuthData() {
  if (!(await tableExists("app_user"))) {
    return;
  }

  const db = getAuthClient();
  const legacyUsers = await db.execute(
    "select id, email, name, email_verified_at, is_admin, password_hash, created_at, updated_at from app_user",
  );

  for (const raw of legacyUsers.rows) {
    const row = raw as Record<string, unknown>;
    const id = String(row.id);
    const email = normalizeEmail(String(row.email));
    const name = normalizeText(row.name as string | null) || email.split("@")[0] || email;
    const createdAt = String(row.created_at || isoNow());
    const updatedAt = String(row.updated_at || createdAt);
    const verifiedAt = (row.email_verified_at as string | null) ?? null;

    const existingByEmail = await db.execute({
      sql: "select id from user where email = ? limit 1",
      args: [email],
    });
    if (existingByEmail.rows.length === 0) {
      await db.execute({
        sql: `
          insert into user (id, name, email, emailVerified, emailVerifiedAt, image, isAdmin, createdAt, updatedAt)
          values (?, ?, ?, ?, ?, null, ?, ?, ?)
        `,
        args: [id, name, email, verifiedAt ? 1 : 0, verifiedAt, Number(row.is_admin ?? 0) === 1 ? 1 : 0, createdAt, updatedAt],
      });
    }

    const existingAccount = await db.execute({
      sql: "select id from account where providerId = 'credential' and userId = ? limit 1",
      args: [id],
    });
    if (existingAccount.rows.length === 0) {
      await db.execute({
        sql: `
          insert into account (id, accountId, providerId, userId, password, createdAt, updatedAt)
          values (?, ?, 'credential', ?, ?, ?, ?)
        `,
        args: [randomUUID(), id, id, String(row.password_hash), createdAt, updatedAt],
      });
    }
  }
}

async function ensureBootstrapAdmins() {
  const db = getAuthClient();
  for (const email of BOOTSTRAP_ADMIN_EMAILS) {
    await db.execute({
      sql: "update user set isAdmin = 1 where lower(email) = ?",
      args: [email],
    });
  }
}

export async function ensureAuthTables() {
  if (authTablesReady) {
    return;
  }

  await ensureAuthSchema();
  await migrateLegacyAuthData();
  await ensureBootstrapAdmins();
  authTablesReady = true;
}

function mapAuthUser(row: Record<string, unknown>): AuthUser {
  const email = String(row.email);
  return {
    id: String(row.id),
    email,
    name: (row.name as string | null) ?? null,
    emailVerifiedAt: toIsoString(row.emailVerifiedAt) ?? toIsoString(row.email_verified_at),
    isAdmin: resolveIsAdmin(email, Boolean(row.isAdmin ?? row.is_admin)),
  };
}

function mapBetterAuthUser(user: Record<string, unknown>): AuthUser {
  return {
    id: String(user.id),
    email: String(user.email),
    name: (user.name as string | null) ?? null,
    emailVerifiedAt: toIsoString(user.emailVerifiedAt) ?? (user.emailVerified ? isoNow() : null),
    isAdmin: resolveIsAdmin(String(user.email), Boolean(user.isAdmin)),
  };
}

function toAuthError(error: unknown, fallback: string) {
  if (error instanceof APIError) {
    const message = String((error.body as { message?: string } | undefined)?.message || error.message || fallback);
    if (/verif/i.test(message)) {
      return new Error("Please confirm your email before logging in");
    }
    if (/invalid|password|credential/i.test(message)) {
      return new Error("Invalid email or password");
    }
    return new Error(message || fallback);
  }

  return error instanceof Error ? error : new Error(fallback);
}

async function getUserPageAccessMap(userId: string, isAdmin: boolean) {
  if (isAdmin) {
    return ALL_ACCESS_PAGE_MAP;
  }

  try {
    if (await hasActivePaidMembership(userId)) {
      return ALL_ACCESS_PAGE_MAP;
    }
  } catch (error) {
    // A membership lookup failure must never lock a user out of granted pages.
    console.error("Paid-membership lookup failed; continuing with grants-only access", error);
  }

  await ensureAuthTables();
  const db = getAuthClient();
  const result = await db.execute({
    sql: "select page_key, can_access from app_page_access where user_id = ?",
    args: [userId],
  });

  const accessMap = getDefaultPageAccessMap();
  for (const row of result.rows) {
    const pageKey = String((row as Record<string, unknown>).page_key);
    if (!MANAGEABLE_PAGES.some((page) => page.key === pageKey)) {
      continue;
    }
    accessMap[pageKey as ManagedPageKey] = Number((row as Record<string, unknown>).can_access ?? 1) === 1;
  }

  return accessMap;
}

export async function getCurrentUser() {
  // Read request headers first so pages are request-rendered and the build
  // never tries to touch the database during prerendering.
  const requestHeaders = await headers();
  await ensureAuthTables();
  const session = await getAuth().api.getSession({ headers: requestHeaders });
  return session ? mapBetterAuthUser(session.user as unknown as Record<string, unknown>) : null;
}

export async function requireCurrentUser() {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/login");
  }
  return user;
}

export async function getApiSession(request: Request) {
  await ensureAuthTables();
  return getAuth().api.getSession({ headers: request.headers });
}

export async function requireApiUser(request: Request) {
  const session = await getApiSession(request);
  if (!session) {
    throw new Error("Unauthorized");
  }
  return mapBetterAuthUser(session.user as unknown as Record<string, unknown>);
}

export async function requireAdminCurrentUser() {
  const user = await requireCurrentUser();
  if (!user.isAdmin) {
    redirect("/account");
  }
  return user;
}

export async function requireAdminApiUser(request: Request) {
  const user = await requireApiUser(request);
  if (!user.isAdmin) {
    throw new Error("Forbidden");
  }
  return user;
}

export async function ensureUserCanAccessPage(user: AuthUser, pageKey: ManagedPageKey) {
  const accessMap = await getUserPageAccessMap(user.id, user.isAdmin);
  return accessMap[pageKey];
}

export async function listRegisteredUsersWithAccess() {
  await ensureAuthTables();
  const db = getAuthClient();
  const [usersResult, accessResult] = await Promise.all([
    db.execute({
      sql: "select id, email, name, emailVerified, emailVerifiedAt, isAdmin from user order by isAdmin desc, email asc",
    }),
    db.execute({
      sql: "select user_id, page_key, can_access from app_page_access",
    }),
  ]);

  const accessByUser = new Map<string, Record<ManagedPageKey, boolean>>();
  for (const row of accessResult.rows) {
    const userId = String((row as Record<string, unknown>).user_id);
    const pageKey = String((row as Record<string, unknown>).page_key);
    if (!MANAGEABLE_PAGES.some((page) => page.key === pageKey)) {
      continue;
    }

    const existing = accessByUser.get(userId) || getDefaultPageAccessMap();
    existing[pageKey as ManagedPageKey] = Number((row as Record<string, unknown>).can_access ?? 1) === 1;
    accessByUser.set(userId, existing);
  }

  return usersResult.rows.map((row) => {
    const user = mapAuthUser(row as Record<string, unknown>);
    const pageAccess = user.isAdmin ? ALL_ACCESS_PAGE_MAP : (accessByUser.get(user.id) || getDefaultPageAccessMap());

    return {
      id: user.id,
      email: user.email,
      name: user.name,
      emailVerifiedAt: user.emailVerifiedAt,
      isAdmin: user.isAdmin,
      pageAccess,
    } satisfies RegisteredUserAccess;
  });
}

export async function updateRegisteredUserProfile(options: {
  targetUserId: string;
  name: string | null;
  actingUserId: string;
}) {
  await ensureAuthTables();
  const db = getAuthClient();
  const targetResult = await db.execute({
    sql: "select id from user where id = ? limit 1",
    args: [options.targetUserId],
  });
  if (!targetResult.rows[0]) {
    throw new Error("User not found");
  }

  const name = normalizeText(options.name) || "Musician";
  await db.execute({
    sql: "update user set name = ?, updatedAt = ? where id = ?",
    args: [name, isoNow(), options.targetUserId],
  });
}

export async function updateRegisteredUserAccess(options: {
  targetUserId: string;
  pageKey: ManagedPageKey;
  canAccess: boolean;
  actingUserId: string;
}) {
  await ensureAuthTables();
  const db = getAuthClient();
  const targetResult = await db.execute({
    sql: "select id, isAdmin from user where id = ? limit 1",
    args: [options.targetUserId],
  });
  const target = targetResult.rows[0] as Record<string, unknown> | undefined;
  if (!target) {
    throw new Error("User not found");
  }

  if (Number(target.isAdmin ?? 0) === 1) {
    throw new Error("Admin access is fixed and cannot be edited here");
  }

  await db.execute({
    sql: `
      insert into app_page_access (user_id, page_key, can_access, updated_at, updated_by)
      values (?, ?, ?, ?, ?)
      on conflict(user_id, page_key)
      do update set can_access = excluded.can_access, updated_at = excluded.updated_at, updated_by = excluded.updated_by
    `,
    args: [options.targetUserId, options.pageKey, options.canAccess ? 1 : 0, isoNow(), options.actingUserId],
  });
}

export async function setRegisteredUserPageAccessMap(options: {
  targetUserId: string;
  pageAccess: Record<ManagedPageKey, boolean>;
  actingUserId: string;
}) {
  await ensureAuthTables();
  const db = getAuthClient();
  const targetResult = await db.execute({
    sql: "select id, isAdmin from user where id = ? limit 1",
    args: [options.targetUserId],
  });
  const target = targetResult.rows[0] as Record<string, unknown> | undefined;
  if (!target) {
    throw new Error("User not found");
  }

  if (Number(target.isAdmin ?? 0) === 1) {
    throw new Error("Admin access is fixed and cannot be edited here");
  }

  const now = isoNow();
  await Promise.all(
    MANAGEABLE_PAGES.map((page) =>
      db.execute({
        sql: `
          insert into app_page_access (user_id, page_key, can_access, updated_at, updated_by)
          values (?, ?, ?, ?, ?)
          on conflict(user_id, page_key)
          do update set can_access = excluded.can_access, updated_at = excluded.updated_at, updated_by = excluded.updated_by
        `,
        args: [options.targetUserId, page.key, options.pageAccess[page.key] ? 1 : 0, now, options.actingUserId],
      }),
    ),
  );
}

export async function registerUser(input: { name?: string | null; email: string; password: string }) {
  await ensureAuthTables();
  const db = getAuthClient();
  const email = normalizeEmail(input.email);
  const name = normalizeText(input.name) || email.split("@")[0] || email;
  const password = input.password.trim();

  if (!email || !email.includes("@")) {
    throw new Error("A valid email is required");
  }

  if (password.length < 8) {
    throw new Error("Password must be at least 8 characters");
  }

  const existing = await db.execute({
    sql: "select id from user where email = ? limit 1",
    args: [email],
  });
  if (existing.rows[0]) {
    throw new Error("Email is already registered");
  }

  try {
    await getAuth().api.signUpEmail({
      body: {
        name,
        email,
        password,
      },
    });
  } catch (error) {
    throw toAuthError(error, "Failed to register");
  }

  if (isBootstrapAdminEmail(email)) {
    await db.execute({
      sql: "update user set isAdmin = 1 where email = ?",
      args: [email],
    });
  }

  const created = await db.execute({
    sql: "select id, email, name, emailVerified, emailVerifiedAt, isAdmin from user where email = ? limit 1",
    args: [email],
  });
  const row = created.rows[0] as Record<string, unknown> | undefined;
  if (!row) {
    throw new Error("Failed to register");
  }

  return {
    user: mapAuthUser(row),
    verificationUrl: takeFallbackLink(email),
  };
}

export async function loginUser(input: { email: string; password: string }) {
  await ensureAuthTables();
  const email = normalizeEmail(input.email);
  try {
    const result = await getAuth().api.signInEmail({
      body: {
        email,
        password: input.password,
      },
    });
    return mapBetterAuthUser(result.user as unknown as Record<string, unknown>);
  } catch (error) {
    throw toAuthError(error, "Invalid email or password");
  }
}

export async function resendEmailConfirmation(emailInput: string) {
  await ensureAuthTables();
  const email = normalizeEmail(emailInput);
  if (!email || !email.includes("@")) {
    throw new Error("A valid email is required");
  }

  const db = getAuthClient();
  const result = await db.execute({
    sql: "select id, emailVerified from user where email = ? limit 1",
    args: [email],
  });
  const row = result.rows[0] as Record<string, unknown> | undefined;
  if (!row || Number(row.emailVerified ?? 0) === 1) {
    return null;
  }

  try {
    await getAuth().api.sendVerificationEmail({
      body: { email, callbackURL: "/login" },
    });
  } catch (error) {
    throw toAuthError(error, "Failed to resend confirmation");
  }

  return takeFallbackLink(email);
}

export async function confirmEmail(token: string) {
  await ensureAuthTables();
  const payload = decodeJwtPayload(token);
  await claimOneTimeToken(token, "email-verification", payload.userId ? String(payload.userId) : null);
  try {
    await getAuth().api.verifyEmail({ query: { token } });
  } catch (error) {
    throw new Error("Invalid or expired token");
  }

  const db = getAuthClient();
  const result = await db.execute({
    sql: "select id, email, name, emailVerified, emailVerifiedAt, isAdmin from user where id = ? or email = ? limit 1",
    args: [String(payload.userId ?? ""), normalizeEmail(String(payload.email ?? ""))],
  });
  const row = result.rows[0] as Record<string, unknown> | undefined;
  if (!row) {
    throw new Error("Invalid or expired token");
  }
  return mapAuthUser(row);
}

export async function requestPasswordReset(emailInput: string) {
  await ensureAuthTables();
  const email = normalizeEmail(emailInput);
  if (!email || !email.includes("@")) {
    throw new Error("A valid email is required");
  }

  const db = getAuthClient();
  const result = await db.execute({
    sql: "select id from user where email = ? limit 1",
    args: [email],
  });
  if (!result.rows[0]) {
    return null;
  }

  try {
    await getAuth().api.requestPasswordReset({
      body: { email, redirectTo: `${getBaseUrl()}/reset-password` },
    });
  } catch (error) {
    throw toAuthError(error, "Failed to request password reset");
  }

  return takeFallbackLink(email);
}

export async function resetPassword(token: string, nextPassword: string) {
  const password = nextPassword.trim();
  if (password.length < 8) {
    throw new Error("Password must be at least 8 characters");
  }

  await ensureAuthTables();
  const db = getAuthClient();
  const tokenRow = await db.execute({
    sql: "select value from verification where identifier = ? limit 1",
    args: [`reset-password:${token}`],
  });
  const userId = String((tokenRow.rows[0] as Record<string, unknown> | undefined)?.value ?? "");

  await claimOneTimeToken(token, "password-reset", userId || null);
  try {
    await getAuth().api.resetPassword({
      body: { newPassword: password, token },
    });
  } catch (error) {
    throw new Error("Invalid or expired token");
  }

  const row = await db.execute({
    sql: "select id, email, name, emailVerified, emailVerifiedAt, isAdmin from user where id = ? limit 1",
    args: [userId],
  });
  const userRow = row.rows[0] as Record<string, unknown> | undefined;
  if (!userRow) {
    throw new Error("Invalid or expired token");
  }
  return mapAuthUser(userRow);
}

export async function changePassword(input: {
  userId: string;
  currentPassword: string;
  nextPassword: string;
  keepSessionId?: string | null;
}) {
  const nextPassword = input.nextPassword.trim();
  if (nextPassword.length < 8) {
    throw new Error("Password must be at least 8 characters");
  }

  await ensureAuthTables();
  const db = getAuthClient();
  const result = await db.execute({
    sql: "select password from account where userId = ? and providerId = 'credential' limit 1",
    args: [input.userId],
  });
  const row = result.rows[0] as Record<string, unknown> | undefined;
  if (!row || !row.password) {
    throw new Error("User not found");
  }

  if (!verifyPassword(input.currentPassword, String(row.password))) {
    throw new Error("Current password is incorrect");
  }

  const now = isoNow();
  await db.execute({
    sql: "update account set password = ?, updatedAt = ? where userId = ? and providerId = 'credential'",
    args: [hashPassword(nextPassword), now, input.userId],
  });

  if (input.keepSessionId) {
    await db.execute({
      sql: "delete from session where userId = ? and id != ?",
      args: [input.userId, input.keepSessionId],
    });
  } else {
    await db.execute({ sql: "delete from session where userId = ?", args: [input.userId] });
  }
}

export async function changePasswordByEmail(input: {
  email: string;
  currentPassword: string;
  nextPassword: string;
}) {
  const email = normalizeEmail(input.email);
  if (!email || !email.includes("@")) {
    throw new Error("A valid email is required");
  }

  await ensureAuthTables();
  const db = getAuthClient();
  const result = await db.execute({
    sql: "select id from user where email = ? limit 1",
    args: [email],
  });
  const row = result.rows[0] as Record<string, unknown> | undefined;
  if (!row) {
    throw new Error("Invalid email or password");
  }

  await changePassword({
    userId: String(row.id),
    currentPassword: input.currentPassword,
    nextPassword: input.nextPassword,
  });
}

async function sendEmailChangeConfirmation(user: AuthUser, newEmail: string, token: string) {
  const url = `${getBaseUrl()}/account?email-change=${encodeURIComponent(token)}`;
  const result = await sendEmail({
    to: newEmail,
    subject: "Confirm your new BandsChamber Studio email",
    html: `
      <div style="font-family:Arial,sans-serif;line-height:1.6;color:#111">
        <h1 style="font-size:24px">Confirm your new email</h1>
        <p>Hi ${user.name || user.email},</p>
        <p>Confirm <strong>${newEmail}</strong> as your new BandsChamber Studio login email.</p>
        <p><a href="${url}" style="display:inline-block;padding:12px 18px;background:#c2793f;color:#fff;text-decoration:none;border-radius:9999px">Confirm new email</a></p>
        <p>If the button does not work, open this link:</p>
        <p>${url}</p>
        <p>If you did not request this change, just ignore this email.</p>
      </div>
    `,
    text: `Confirm your new BandsChamber Studio email: ${url}`,
  });
  return { sent: result.ok, url };
}

export async function requestEmailChange(input: { userId: string; password: string; newEmail: string }) {
  const newEmail = normalizeEmail(input.newEmail);
  if (!newEmail || !newEmail.includes("@")) {
    throw new Error("A valid email is required");
  }

  await ensureAuthTables();
  const db = getAuthClient();
  const result = await db.execute({
    sql: "select id, email, name, emailVerifiedAt, isAdmin, (select password from account where account.userId = user.id and providerId = 'credential' limit 1) as password from user where id = ? limit 1",
    args: [input.userId],
  });
  const row = result.rows[0] as Record<string, unknown> | undefined;
  if (!row) {
    throw new Error("User not found");
  }

  if (!row.password || !verifyPassword(input.password, String(row.password))) {
    throw new Error("Password is incorrect");
  }

  if (newEmail === normalizeEmail(String(row.email))) {
    throw new Error("This is already your email");
  }

  const taken = await db.execute({
    sql: "select id from user where email = ? limit 1",
    args: [newEmail],
  });
  if (taken.rows[0]) {
    throw new Error("This email is already registered");
  }

  const token = randomBytes(32).toString("hex");
  const now = isoNow();
  await db.execute({
    sql: `
      insert into app_email_change (id, user_id, new_email, token_hash, expires_at, created_at, consumed_at)
      values (?, ?, ?, ?, ?, ?, ?)
    `,
    args: [
      randomUUID(),
      input.userId,
      newEmail,
      hashToken(token),
      new Date(Date.now() + EMAIL_CONFIRMATION_DURATION_SECONDS * 1000).toISOString(),
      now,
      null,
    ],
  });

  const user = mapAuthUser(row);
  const { sent, url } = await sendEmailChangeConfirmation(user, newEmail, token);
  if (!sent) {
    console.error("Email-change confirmation could not be delivered; surfacing fallback link", url);
    return { sent: false as const, url, newEmail };
  }
  return { sent: true as const, url: null as string | null, newEmail };
}

export async function confirmEmailChange(input: { userId: string; token: string }) {
  await ensureAuthTables();
  const db = getAuthClient();
  const result = await db.execute({
    sql: "select * from app_email_change where token_hash = ? and user_id = ? limit 1",
    args: [hashToken(input.token), input.userId],
  });
  const row = result.rows[0] as Record<string, unknown> | undefined;
  if (!row || row.consumed_at) {
    throw new Error("Invalid or expired token");
  }
  if (new Date(String(row.expires_at)).getTime() <= Date.now()) {
    throw new Error("Invalid or expired token");
  }

  const newEmail = normalizeEmail(String(row.new_email));
  const taken = await db.execute({
    sql: "select id from user where email = ? and id != ? limit 1",
    args: [newEmail, input.userId],
  });
  if (taken.rows[0]) {
    throw new Error("This email is already registered");
  }

  const now = isoNow();
  await db.execute({
    sql: "update user set email = ?, emailVerified = 1, emailVerifiedAt = ?, updatedAt = ? where id = ?",
    args: [newEmail, now, now, input.userId],
  });
  await db.execute({
    sql: "update app_email_change set consumed_at = ? where id = ?",
    args: [now, String(row.id)],
  });

  return { email: newEmail };
}

export async function logoutUser(request: Request) {
  await ensureAuthTables();
  try {
    await getAuth().api.signOut({ headers: request.headers });
  } catch {
    // Already signed out or invalid session — clearing client state is enough.
  }

  // Clear the pre-Better-Auth cookie so upgraded browsers do not keep sending it.
  const cookieHeader = request.headers.get("cookie") ?? "";
  const legacyCookie = cookieHeader
    .split(/;\s*/)
    .find((part) => part.startsWith("music_tool_session="));
  if (legacyCookie) {
    const db = getAuthClient();
    const sessionId = decodeURIComponent(legacyCookie.split("=").slice(1).join("="));
    if (sessionId) {
      await db.execute({ sql: "delete from app_session where id = ?", args: [sessionId] }).catch(() => undefined);
    }
  }
}
