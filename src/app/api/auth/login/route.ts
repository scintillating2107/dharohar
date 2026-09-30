import { NextRequest } from "next/server";
import { store } from "@/lib/store";
import { verifyPassword, hashPassword, createToken, setAuthCookie } from "@/lib/auth";
import { DEMO_CREDENTIALS } from "@/lib/config";
import { apiSuccess, apiError } from "@/lib/api-utils";

const demoHashes: Record<string, string> = {};

async function getDemoHash(email: string, password: string): Promise<string> {
  if (!demoHashes[email]) {
    demoHashes[email] = await hashPassword(password);
  }
  return demoHashes[email];
}

export async function POST(request: NextRequest) {
  try {
    const { email, password } = await request.json();

    if (!email || !password) {
      return apiError("Email and password are required");
    }

    let user = store.users.find(
      (u) => u.email.toLowerCase() === email.toLowerCase()
    );

    const demoCred = DEMO_CREDENTIALS.find(
      (c) => c.email.toLowerCase() === email.toLowerCase()
    );

    if (!user && demoCred?.role === "CITIZEN") {
      const now = new Date().toISOString();
      user = {
        id: "U005",
        email: demoCred.email,
        name: "Ramesh Singh",
        role: "CITIZEN",
        district: "Lucknow",
        createdAt: now,
      };
      const hash = await getDemoHash(demoCred.email, demoCred.password);
      store.addUser(user, hash);
    }

    if (!user) {
      return apiError("Invalid credentials", 401);
    }

    let valid = false;
    if (demoCred) {
      const hash = await getDemoHash(demoCred.email, demoCred.password);
      valid = await verifyPassword(password, hash);
    } else if (store.passwordHashes[email]) {
      valid = await verifyPassword(password, store.passwordHashes[email]);
    }

    if (!valid) {
      return apiError("Invalid credentials", 401);
    }

    const token = await createToken(user);
    await setAuthCookie(token);

    return apiSuccess({ user, token }, "Login successful");
  } catch {
    return apiError("Login failed", 500);
  }
}
