import { apiGet, apiPost } from "@/lib/api-client";
import type { User } from "@/types";

export const authService = {
  login: (email: string, password: string) =>
    apiPost<{ user: User; token: string }>("/api/auth/login", { email, password }),
  logout: () => apiPost("/api/auth/logout"),
  me: () => apiGet<{ user: User }>("/api/auth/me"),
};
