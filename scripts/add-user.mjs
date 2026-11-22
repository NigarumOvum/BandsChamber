import { createClient } from "@libsql/client";
import { randomBytes, randomUUID, scryptSync } from "node:crypto";

function readEnv(name) {
  const value = process.env[name]?.trim();
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

function parseArgs(argv) {
  const options = { email: null, name: null, password: null, admin: false, help: false };
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--help" || arg === "-h") {
      options.help = true;
      continue;
    }
    if (arg === "--email") {
      options.email = argv[index + 1]?.trim().toLowerCase() || null;
      index += 1;
      continue;
    }
    if (arg === "--name") {
      options.name = argv[index + 1]?.trim() || null;
      index += 1;
      continue;
    }
    if (arg === "--password") {
      options.password = argv[index + 1] || null;
      index += 1;
      continue;
    }
    if (arg === "--admin") {
      options.admin = true;
      continue;
    }
    throw new Error(`Unknown argument: ${arg}`);
  }
  return options;
}

function printHelp() {
  console.log(`
Usage: node scripts/add-user.mjs [options]

Creates a user directly in the Better Auth tables (user + account).

Options:
  --email <email>      Required. Email of the user to create.
  --name <name>        Optional. Display name.
  --password <pass>    Optional. Password to set (min 8 chars).
                       If omitted, a random password is generated and printed.
  --admin              Optional. Mark the user as admin.
  --help               Show this help.

Requires environment variables:
  MUSIC_TURSO_DATABASE_URL, MUSIC_TURSO_AUTH_TOKEN
`);
}

function generatePassword() {
  return randomBytes(12).toString("base64url").slice(0, 16);
}

function hashPassword(password) {
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(password, salt, 64).toString("hex");
  return `${salt}:${hash}`;
}

function isoNow() {
  return new Date().toISOString();
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
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  if (options.help) {
    printHelp();
    return;
  }

  const email = options.email || "";
  if (!email.includes("@")) {
    throw new Error("A valid --email is required");
  }

  const password = options.password || generatePassword();
  if (password.length < 8) {
    throw new Error("Password must be at least 8 characters");
  }

  const db = createClient({
    url: readEnv("MUSIC_TURSO_DATABASE_URL"),
    authToken: readEnv("MUSIC_TURSO_AUTH_TOKEN"),
  });

  await ensureSchema(db);

  const existing = await db.execute({
    sql: "select id from user where email = ? limit 1",
    args: [email],
  });
  if (existing.rows[0]) {
    throw new Error(`Email already registered: ${email}`);
  }

  const now = isoNow();
  const userId = randomUUID();
  const name = options.name || email.split("@")[0] || email;

  await db.execute({
    sql: `
      insert into user (id, name, email, emailVerified, emailVerifiedAt, image, isAdmin, createdAt, updatedAt)
      values (?, ?, ?, 1, ?, null, ?, ?, ?)
    `,
    args: [userId, name, email, now, options.admin ? 1 : 0, now, now],
  });
  await db.execute({
    sql: `
      insert into account (id, accountId, providerId, userId, password, createdAt, updatedAt)
      values (?, ?, 'credential', ?, ?, ?, ?)
    `,
    args: [randomUUID(), userId, userId, hashPassword(password), now, now],
  });

  console.log("User created successfully:");
  console.log(`  Email:    ${email}`);
  console.log(`  Password: ${password}`);
  console.log(`  Name:     ${name}`);
  console.log(`  Admin:    ${options.admin ? "yes" : "no"}`);
  console.log(`  Email verified: yes (can log in immediately)`);
}

main().catch((error) => {
  console.error(`Error: ${error.message}`);
  process.exit(1);
});
