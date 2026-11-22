import { errorResponse, jsonResponse, parseJsonBody } from "@/lib/api";
import { loginUser } from "@/lib/auth";
import { enforceRateLimit } from "@/lib/rate-limit";

export async function POST(request: Request) {
  try {
    const body = await parseJsonBody<{ email?: string; password?: string }>(request, {});

    // Brute-force guard: 10 attempts / 5 min per IP and per targeted account.
    const limited = enforceRateLimit(request, "auth:login", {
      limit: 10,
      windowMs: 5 * 60_000,
      identifier: body.email,
    });
    if (limited) return limited;

    const user = await loginUser({
      email: body.email || "",
      password: body.password || "",
    });
    return jsonResponse({ user });
  } catch (error) {
    return errorResponse((error as Error).message || "Failed to login", 400);
  }
}