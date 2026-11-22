import { createClient } from "@libsql/client";
import { randomUUID } from "node:crypto";

function readEnv(name) {
  const value = process.env[name]?.trim();
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

function parseArgs(argv) {
  const options = { dryRun: false, help: false };
  for (const arg of argv) {
    if (arg === "--help" || arg === "-h") {
      options.help = true;
      continue;
    }
    if (arg === "--dry-run") {
      options.dryRun = true;
      continue;
    }
    throw new Error(`Unknown argument: ${arg}`);
  }
  return options;
}

function isoNow() {
  return new Date().toISOString();
}

async function tableExists(db, table) {
  const result = await db.execute({
    sql: "select name from sqlite_master where type = 'table' and name = ? limit 1",
    args: [table],
  });
  return result.rows.length > 0;
}

async function ensureSchema(db) {
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
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  if (options.help) {
    console.log(`
Usage: node scripts/migrate-auth-to-better-auth.mjs [--dry-run]

Copies legacy app_user credentials into Better Auth tables:
  app_user  -> user   (same id, email, name, verification, admin flag)
  password  -> account (providerId "credential", accountId = user id)

Idempotent: existing Better Auth users/accounts are left untouched.
Active legacy sessions are not copied; users sign in once after the upgrade.
The legacy tables are preserved for rollback.

Requires environment variables:
  MUSIC_TURSO_DATABASE_URL, MUSIC_TURSO_AUTH_TOKEN
`);
    return;
  }

  const db = createClient({
    url: readEnv("MUSIC_TURSO_DATABASE_URL"),
    authToken: readEnv("MUSIC_TURSO_AUTH_TOKEN"),
  });

  if (!options.dryRun) {
    await ensureSchema(db);
  }

  if (!(await tableExists(db, "app_user"))) {
    console.log("No app_user table found — nothing to migrate.");
    return;
  }

  const legacyUsers = await db.execute(
    "select id, email, name, email_verified_at, is_admin, password_hash, created_at, updated_at from app_user",
  );

  let usersCreated = 0;
  let accountsCreated = 0;
  let skipped = 0;

  for (const raw of legacyUsers.rows) {
    const row = raw;
    const id = String(row.id);
    const email = String(row.email).trim().toLowerCase();
    const name = String(row.name || email.split("@")[0] || email);
    const createdAt = String(row.created_at || isoNow());
    const updatedAt = String(row.updated_at || createdAt);
    const verifiedAt = row.email_verified_at ? String(row.email_verified_at) : null;

    const existingByEmail = await db.execute({
      sql: "select id from user where email = ? limit 1",
      args: [email],
    });
    if (existingByEmail.rows.length === 0) {
      if (options.dryRun) {
        console.log(`[dry-run] would create user ${email}`);
      } else {
        await db.execute({
          sql: `
            insert into user (id, name, email, emailVerified, emailVerifiedAt, image, isAdmin, createdAt, updatedAt)
            values (?, ?, ?, ?, ?, null, ?, ?, ?)
          `,
          args: [id, name, email, verifiedAt ? 1 : 0, verifiedAt, Number(row.is_admin ?? 0) === 1 ? 1 : 0, createdAt, updatedAt],
        });
        usersCreated += 1;
      }
    } else {
      skipped += 1;
    }

    const existingAccount = await db.execute({
      sql: "select id from account where providerId = 'credential' and userId = ? limit 1",
      args: [id],
    });
    if (existingAccount.rows.length === 0) {
      if (options.dryRun) {
        console.log(`[dry-run] would create credential account for ${email}`);
      } else {
        await db.execute({
          sql: `
            insert into account (id, accountId, providerId, userId, password, createdAt, updatedAt)
            values (?, ?, 'credential', ?, ?, ?, ?)
          `,
          args: [randomUUID(), id, id, String(row.password_hash), createdAt, updatedAt],
        });
        accountsCreated += 1;
      }
    }
  }

  console.log(options.dryRun ? "Dry run complete." : "Migration complete.");
  console.log(`  Legacy users scanned: ${legacyUsers.rows.length}`);
  console.log(`  Users created:        ${usersCreated}`);
  console.log(`  Accounts created:     ${accountsCreated}`);
  console.log(`  Existing users kept:  ${skipped}`);
}

main().catch((error) => {
  console.error(`Error: ${error.message}`);
  process.exit(1);
});
