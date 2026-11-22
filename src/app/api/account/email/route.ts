import { errorResponse, jsonResponse, parseJsonBody } from "@/lib/api";
import { requestEmailChange, requireApiUser } from "@/lib/auth";
import { enforceRateLimit } from "@/lib/rate-limit";

export async function POST(request: Request) {
  try {
    const user = await requireApiUser(request);
    const body = await parseJsonBody<{ password?: string; newEmail?: string }>(request, {});
    if (!body.password || !body.newEmail) {
      throw new Error("Password and new email are required");
    }

    // Email-flood guard: 5 requests / hour per account.
    const limited = enforceRateLimit(request, "account:email", {
      limit: 5,
      windowMs: 60 * 60_000,
      identifier: user.id,
    });
    if (limited) return limited;
    const result = await requestEmailChange({
      userId: user.id,
      password: body.password,
      newEmail: body.newEmail,
    });
    return jsonResponse(result);
  } catch (error) {
    const message = (error as Error).message || "Failed to request email change";
    const status = message === "Unauthorized" ? 401 : 400;
    return errorResponse(message, status);
  }
}
