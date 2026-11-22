#!/usr/bin/env node
/**
 * One-off ops script: turn every `is_shared_with_all = 1` project private.
 *
 * Projects used to be created shared-with-all by default, which made every
 * song in such a project readable by all logged-in users. New projects now
 * default to private; run this script once on existing deployments to reset
 * legacy rows. Sharing can be re-enabled per project in the Band Manager.
 *
 * Usage:
 *   node scripts/make-projects-private.mjs [--dry-run]
 *
 * Requires MUSIC_TURSO_DATABASE_URL / MUSIC_TURSO_AUTH_TOKEN (or a local
 * libSQL file URL) in the environment.
 */
import { createClient } from "@libsql/client";

function readEnv(name) {
  const value = process.env[name]?.trim();
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

const dryRun = process.argv.includes("--dry-run");

const db = createClient({
  url: readEnv("MUSIC_TURSO_DATABASE_URL"),
  authToken: readEnv("MUSIC_TURSO_AUTH_TOKEN"),
});

const affected = await db.execute(
  "select id, name, slug from projects where is_shared_with_all = 1",
);

console.log(`Projects currently shared with all users: ${affected.rows.length}`);
for (const row of affected.rows) {
  console.log(`  - ${row.name} (${row.slug})`);
}

if (dryRun) {
  console.log("Dry run — no changes made.");
} else if (affected.rows.length > 0) {
  const result = await db.execute(
    "update projects set is_shared_with_all = 0, updated_at = ? where is_shared_with_all = 1",
    [new Date().toISOString()],
  );
  console.log(`Set ${result.rowsAffected ?? 0} project(s) to private.`);
}
