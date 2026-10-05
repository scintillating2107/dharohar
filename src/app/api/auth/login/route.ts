import { authenticate, clientIp, createSessionToken, setSessionCookie } from "@/server/auth";
import { fail, handle, ok } from "@/server/http";

export const POST = handle(async (request: Request) => {
  const { email, password } = await request.json();
  if (!email || !password) return fail("Email and password are required");
  const user = await authenticate(email, password, clientIp(request));
  await setSessionCookie(await createSessionToken(user));
  return ok({ user }, { message: "Login successful" });
});
