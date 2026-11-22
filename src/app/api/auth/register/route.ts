import { errorResponse, jsonResponse, parseJsonBody } from "@/lib/api";
import { registerUser } from "@/lib/auth";
import { enforceRateLimit } from "@/lib/rate-limit";

export async function POST(request: Request) {
  try {
    const body = await parseJsonBody<{ name?: string; email?: string; password?: string }>(request, {});

    // Creation guard: 5 registrations / hour per IP and per submitted email.
    const limited = enforceRateLimit(request, "auth:register", {
      limit: 5,
      windowMs: 60 * 60_000,
      identifier: body.email,
    });
    if (limited) return limited;

    const result = await registerUser({
      name: body.name || null,
      email: body.email || "",
      password: body.password || "",
    });
    return jsonResponse({ user: result.user, requiresEmailConfirmation: true, verificationUrl: result.verificationUrl }, 201);
  } catch (error) {
    return errorResponse((error as Error).message || "Failed to register", 400);
  }
}