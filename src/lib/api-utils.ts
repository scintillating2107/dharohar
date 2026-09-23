import { NextResponse } from "next/server";
import type { ApiResponse } from "@/types";

export function apiSuccess<T>(data: T, message?: string, status = 200) {
  const body: ApiResponse<T> = { success: true, data, message };
  return NextResponse.json(body, { status });
}

export function apiError(error: string, status = 400) {
  const body: ApiResponse<never> = { success: false, error };
  return NextResponse.json(body, { status });
}

export function unauthorized(message = "Unauthorized") {
  return apiError(message, 401);
}

export function forbidden(message = "Forbidden") {
  return apiError(message, 403);
}

export function notFound(message = "Not found") {
  return apiError(message, 404);
}
