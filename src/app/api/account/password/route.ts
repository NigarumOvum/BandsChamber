import { errorResponse, jsonResponse, parseJsonBody } from "@/lib/api";
import { changePassword, getApiSession, requireApiUser } from "@/lib/auth";
import { enforceRateLimit } from "@/lib/rate-limit";

export async function POST(request: Request) {
  try {
    const user = await requireApiUser(request);
    const body = await parseJsonBody<{ currentPassword?: string; nextPassword?: string }>(request, {});
    if (!body.currentPassword || !body.nextPassword) {
      throw new Error("Current and new passwords are required");
    }

    // Guessing guard: 10 attempts / hour per account.
    const limited = enforceRateLimit(request, "account:password", {
      limit: 10,
      windowMs: 60 * 60_000,
      identifier: user.id,
    });
    if (limited) return limited;

    const session = await getApiSession(request);
    await changePassword({
      userId: user.id,
      currentPassword: body.currentPassword,
      nextPassword: body.nextPassword,
      keepSessionId: session?.session.id ?? null,
    });
    return jsonResponse({ ok: true });
  } catch (error) {
    const message = (error as Error).message || "Failed to change password";
    const status = message === "Unauthorized" ? 401 : 400;
    return errorResponse(message, status);
  }
}
