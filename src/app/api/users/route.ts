import { NextRequest } from "next/server";
import { getSessionPayload } from "@/lib/auth";
import { store, generateId } from "@/lib/store";
import { hashPassword } from "@/lib/auth";
import { apiSuccess, unauthorized, forbidden, apiError } from "@/lib/api-utils";
import type { User } from "@/types";

export async function GET() {
  const session = await getSessionPayload();
  if (!session) return unauthorized();
  if (session.role !== "ADMIN") return forbidden();

  return apiSuccess({ users: store.users });
}

export async function POST(request: NextRequest) {
  const session = await getSessionPayload();
  if (!session) return unauthorized();
  if (session.role !== "ADMIN") return forbidden();

  try {
    const body = await request.json();
    const { email, name, role, password, district } = body;

    if (!email || !name || !role || !password) {
      return apiError("All fields are required");
    }

    if (store.users.find((u) => u.email === email)) {
      return apiError("User already exists");
    }

    const user: User = {
      id: generateId("U"),
      email,
      name,
      role,
      district,
      createdAt: new Date().toISOString(),
    };

    const hash = await hashPassword(password);
    store.addUser(user, hash);

    return apiSuccess({ user });
  } catch {
    return apiError("Failed to create user", 500);
  }
}
