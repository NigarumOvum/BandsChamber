import { errorResponse, jsonResponse, parseJsonBody } from "@/lib/api";
import { confirmEmail } from "@/lib/auth";
import { enforceRateLimit } from "@/lib/rate-limit";

export async function POST(request: Request) {
  try {
    const body = await parseJsonBody<{ token?: string }>(request, {});

    // Token-guessing guard: 30 attempts / hour per IP.
    const limited = enforceRateLimit(request, "auth:verify-email", {
      limit: 30,
      windowMs: 60 * 60_000,
    });
    if (limited) return limited;

    await confirmEmail(body.token || "");
    return jsonResponse({ ok: true, message: "Your email is now confirmed." });
  } catch (error) {
    return errorResponse((error as Error).message || "Failed to confirm email", 400);
  }
}