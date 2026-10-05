import { NextResponse } from "next/server";
import { HttpError } from "@/server/auth";
import { ServiceError } from "@/server/records-service";
import type { ApiResponse } from "@/types";

export function ok<T>(data: T, init?: { status?: number; message?: string }) {
  const body: ApiResponse<T> = { success: true, data, message: init?.message };
  return NextResponse.json(body, { status: init?.status ?? 200 });
}

export function fail(error: string, status = 400) {
  const body: ApiResponse<never> = { success: false, error };
  return NextResponse.json(body, { status });
}

/** Wraps a route handler: maps HttpError / ServiceError to JSON responses and logs the rest. */
export function handle<Args extends unknown[]>(fn: (...args: Args) => Promise<Response>) {
  return async (...args: Args): Promise<Response> => {
    try {
      return await fn(...args);
    } catch (err) {
      if (err instanceof HttpError || err instanceof ServiceError) return fail(err.message, err.status);
      if (err instanceof SyntaxError) return fail("Invalid JSON body", 400);
      console.error("[api] unhandled error:", err);
      return fail("Internal server error", 500);
    }
  };
}

export function pagination(url: URL, defaultSize = 10) {
  const page = Math.max(1, parseInt(url.searchParams.get("page") || "1", 10) || 1);
  const pageSize = Math.min(200, Math.max(1, parseInt(url.searchParams.get("pageSize") || String(defaultSize), 10) || defaultSize));
  return { page, pageSize, limit: pageSize, offset: (page - 1) * pageSize };
}

export function paginated<T>(items: T[], total: number, page: number, pageSize: number) {
  return ok({ items, total, page, pageSize, totalPages: Math.max(1, Math.ceil(total / pageSize)) });
}
