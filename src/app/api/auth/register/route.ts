import { NextRequest } from "next/server";
import { store } from "@/lib/store";
import { hashPassword, createToken, setAuthCookie } from "@/lib/auth";
import { apiSuccess, apiError } from "@/lib/api-utils";

/** Demo citizen self-registration (training / presentation). */
export async function POST(request: NextRequest) {
  try {
    const { name, email, password } = await request.json();

    if (!name?.trim() || !email?.trim() || !password) {
      return apiError("Name, email, and password are required");
    }
    if (password.length < 6) {
      return apiError("Password must be at least 6 characters");
    }

    const normalized = email.trim().toLowerCase();
    const existing = store.users.find((u) => u.email.toLowerCase() === normalized);
    if (existing) {
      return apiError("An account with this email already exists", 409);
    }

    const now = new Date().toISOString();
    const id = `U${String(store.users.length + 1).padStart(3, "0")}`;
    const user = {
      id,
      email: normalized,
      name: name.trim(),
      role: "CITIZEN" as const,
      district: "Lucknow",
      createdAt: now,
    };
    const hash = await hashPassword(password);
    store.addUser(user, hash);

    const token = await createToken(user);
    await setAuthCookie(token);

    return apiSuccess({ user, token }, "Registration successful");
  } catch {
    return apiError("Registration failed", 500);
  }
}
