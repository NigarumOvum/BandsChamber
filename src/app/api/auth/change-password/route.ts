import { errorResponse, jsonResponse, parseJsonBody } from "@/lib/api";
import { changePasswordByEmail } from "@/lib/auth";
import { enforceRateLimit } from "@/lib/rate-limit";

export async function POST(request: Request) {
  try {
    const body = await parseJsonBody<{ email?: string; currentPassword?: string; nextPassword?: string }>(
      request,
      {},
    );
    if (!body.email || !body.currentPassword || !body.nextPassword) {
      throw new Error("Email, current and new passwords are required");
    }

    // Password-guessing guard: 10 attempts / hour per IP and per account.
    const limited = enforceRateLimit(request, "auth:change-password", {
      limit: 10,
      windowMs: 60 * 60_000,
      identifier: body.email,
    });
    if (limited) return limited;
    await changePasswordByEmail({
      email: body.email,
      currentPassword: body.currentPassword,
      nextPassword: body.nextPassword,
    });
    return jsonResponse({ ok: true });
  } catch (error) {
    return errorResponse((error as Error).message || "Failed to change password", 400);
  }
}
