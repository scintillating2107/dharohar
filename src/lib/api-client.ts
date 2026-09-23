import type { ApiResponse } from "@/types";

export class ApiError extends Error {
  constructor(
    message: string,
    public status: number = 500
  ) {
    super(message);
    this.name = "ApiError";
  }
}

async function handleResponse<T>(response: Response): Promise<T> {
  const data: ApiResponse<T> = await response.json();
  if (!response.ok || !data.success) {
    throw new ApiError(data.error || "An error occurred", response.status);
  }
  return data.data as T;
}

export async function apiGet<T>(path: string): Promise<T> {
  const response = await fetch(path, {
    credentials: "include",
    headers: { "Content-Type": "application/json" },
  });
  return handleResponse<T>(response);
}

export async function apiPost<T>(
  path: string,
  body?: unknown
): Promise<T> {
  const response = await fetch(path, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: body ? JSON.stringify(body) : undefined,
  });
  return handleResponse<T>(response);
}

export async function apiPut<T>(
  path: string,
  body?: unknown
): Promise<T> {
  const response = await fetch(path, {
    method: "PUT",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: body ? JSON.stringify(body) : undefined,
  });
  return handleResponse<T>(response);
}

export async function apiDelete<T>(path: string): Promise<T> {
  const response = await fetch(path, {
    method: "DELETE",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
  });
  return handleResponse<T>(response);
}

export async function apiUpload<T>(
  path: string,
  formData: FormData,
  onProgress?: (progress: number) => void,
  signal?: AbortSignal
): Promise<T> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("POST", path);
    xhr.withCredentials = true;

    if (signal) {
      if (signal.aborted) {
        reject(new ApiError("Upload cancelled"));
        return;
      }
      signal.addEventListener("abort", () => {
        xhr.abort();
        reject(new ApiError("Upload cancelled"));
      });
    }

    if (onProgress) {
      xhr.upload.onprogress = (e) => {
        if (e.lengthComputable) {
          onProgress(Math.round((e.loaded / e.total) * 100));
        }
      };
    }

    xhr.onload = () => {
      try {
        const data = JSON.parse(xhr.responseText);
        if (xhr.status >= 200 && xhr.status < 300 && data.success) {
          resolve(data.data);
        } else {
          reject(new ApiError(data.error || "Upload failed", xhr.status));
        }
      } catch {
        reject(new ApiError("Invalid response", xhr.status));
      }
    };

    xhr.onerror = () => reject(new ApiError("Network error"));
    xhr.onabort = () => reject(new ApiError("Upload cancelled"));
    xhr.send(formData);
  });
}
