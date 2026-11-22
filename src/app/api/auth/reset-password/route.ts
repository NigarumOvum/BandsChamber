import { errorResponse, jsonResponse, parseJsonBody } from "@/lib/api";
import { resetPassword } from "@/lib/auth";
import { enforceRateLimit } from "@/lib/rate-limit";

export async function POST(request: Request) {
  try {
    const body = await parseJsonBody<{ token?: string; password?: string }>(request, {});

    // Token-guessing guard: 10 attempts / hour per IP.
    const limited = enforceRateLimit(request, "auth:reset-password", {
      limit: 10,
      windowMs: 60 * 60_000,
    });
    if (limited) return limited;

    await resetPassword(body.token || "", body.password || "");
    return jsonResponse({ ok: true, message: "Password updated. You can log in with the new password." });
  } catch (error) {
    return errorResponse((error as Error).message || "Failed to reset password", 400);
  }
}