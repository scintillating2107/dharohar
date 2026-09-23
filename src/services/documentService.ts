import { apiGet, apiPost, apiUpload } from "@/lib/api-client";
import type { Document, PaginatedResponse, UploadResult } from "@/types";

export const documentService = {
  list: (params?: Record<string, string>) => {
    const qs = params ? `?${new URLSearchParams(params)}` : "";
    return apiGet<PaginatedResponse<Document>>(`/api/documents${qs}`);
  },
  get: (id: string) => apiGet<{ document: Document; record?: unknown }>(`/api/documents/${id}`),
  upload: (file: File, onProgress?: (p: number) => void) => {
    const formData = new FormData();
    formData.append("file", file);
    return apiUpload<UploadResult>("/api/documents", formData, onProgress);
  },
  startProcessing: (id: string) =>
    apiPost<{ documentId: string; message: string }>(`/api/documents/${id}/process`),
  getProcessingStatus: (id: string) =>
    apiGet<{ status: string; steps: unknown[] }>(`/api/documents/${id}/process`),
};
