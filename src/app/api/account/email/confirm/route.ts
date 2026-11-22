import { errorResponse, jsonResponse, parseJsonBody } from "@/lib/api";
import { confirmEmailChange, requireApiUser } from "@/lib/auth";
import { enforceRateLimit } from "@/lib/rate-limit";

export async function POST(request: Request) {
  try {
    const user = await requireApiUser(request);
    const body = await parseJsonBody<{ token?: string }>(request, {});
    if (!body.token) {
      throw new Error("Token is required");
    }

    // Token-guessing guard: 30 attempts / hour per account.
    const limited = enforceRateLimit(request, "account:email-confirm", {
      limit: 30,
      windowMs: 60 * 60_000,
      identifier: user.id,
    });
    if (limited) return limited;

    const result = await confirmEmailChange({ userId: user.id, token: body.token });
    return jsonResponse({ ok: true, email: result.email });
  } catch (error) {
    const message = (error as Error).message || "Failed to confirm email change";
    const status = message === "Unauthorized" ? 401 : 400;
    return errorResponse(message, status);
  }
}
