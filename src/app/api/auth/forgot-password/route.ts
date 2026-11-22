import { errorResponse, jsonResponse, parseJsonBody } from "@/lib/api";
import { requestPasswordReset } from "@/lib/auth";
import { enforceRateLimit } from "@/lib/rate-limit";

export async function POST(request: Request) {
  try {
    const body = await parseJsonBody<{ email?: string }>(request, {});

    // Email-flood guard: 5 requests / hour per IP and per submitted email.
    const limited = enforceRateLimit(request, "auth:forgot-password", {
      limit: 5,
      windowMs: 60 * 60_000,
      identifier: body.email,
    });
    if (limited) return limited;

    const resetUrl = await requestPasswordReset(body.email || "");
    return jsonResponse({
      ok: true,
      message: resetUrl
        ? "Email delivery is paused — use the link below to reset instead."
        : "If the email exists, a reset link has been sent.",
      resetUrl,
    });
  } catch (error) {
    return errorResponse((error as Error).message || "Failed to request password reset", 400);
  }
}