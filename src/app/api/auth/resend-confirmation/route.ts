import { errorResponse, jsonResponse, parseJsonBody } from "@/lib/api";
import { resendEmailConfirmation } from "@/lib/auth";
import { enforceRateLimit } from "@/lib/rate-limit";

export async function POST(request: Request) {
  try {
    const body = await parseJsonBody<{ email?: string }>(request, {});

    // Email-flood guard: 5 requests / hour per IP and per submitted email.
    const limited = enforceRateLimit(request, "auth:resend-confirmation", {
      limit: 5,
      windowMs: 60 * 60_000,
      identifier: body.email,
    });
    if (limited) return limited;

    const verificationUrl = await resendEmailConfirmation(body.email || "");
    return jsonResponse({
      ok: true,
      message: verificationUrl
        ? "Email delivery is paused — use the link below to confirm instead."
        : "If the email exists, a confirmation message has been sent.",
      verificationUrl,
    });
  } catch (error) {
    return errorResponse((error as Error).message || "Failed to resend confirmation", 400);
  }
}