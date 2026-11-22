import { toNextJsHandler } from "better-auth/next-js";

import { ensureAuthTables, getAuth } from "@/lib/auth";

async function handleAuthRequest(request: Request) {
  await ensureAuthTables();
  return getAuth().handler(request);
}

export const { GET, POST, PATCH, PUT, DELETE } = toNextJsHandler(handleAuthRequest);
