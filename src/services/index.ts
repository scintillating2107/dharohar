import { apiGet, apiPost } from "@/lib/api-client";
import type {
  DashboardStats,
  VerificationTask,
  LandRecord,
  ValidationResult,
  Parcel,
  AuditEvent,
  PaginatedResponse,
} from "@/types";

export const dashboardService = {
  getStats: () => apiGet<{
    stats: DashboardStats;
    recentDocuments: unknown[];
    recentVerification: unknown[];
    recentValidationIssues: unknown[];
  }>("/api/dashboard"),
};

export const verificationService = {
  list: (params?: Record<string, string>) => {
    const qs = params ? `?${new URLSearchParams(params)}` : "";
    return apiGet<PaginatedResponse<VerificationTask>>(`/api/verification${qs}`);
  },
  get: (id: string) =>
    apiGet<{ task: VerificationTask; record: LandRecord; document: unknown }>(
      `/api/verification/${id}`
    ),
  action: (id: string, body: { action: string; fields?: Record<string, string>; comment?: string }) =>
    apiPost(`/api/verification/${id}`, body),
};

export const recordService = {
  list: (params?: Record<string, string>) => {
    const qs = params ? `?${new URLSearchParams(params)}` : "";
    return apiGet<PaginatedResponse<LandRecord>>(`/api/records${qs}`);
  },
  get: (id: string) =>
    apiGet<{ record: LandRecord; document?: unknown; auditEvents: AuditEvent[]; parcel?: Parcel }>(
      `/api/records/${id}`
    ),
};

export const validationService = {
  get: (params?: Record<string, string>) => {
    const qs = params ? `?${new URLSearchParams(params)}` : "";
    return apiGet<{ validation: ValidationResult; record: LandRecord }>(`/api/validation${qs}`);
  },
};

export const gisService = {
  getParcels: (params?: Record<string, string>) => {
    const qs = params ? `?${new URLSearchParams(params)}` : "";
    return apiGet<{ parcels: Parcel[] }>(`/api/gis${qs}`);
  },
};

export const auditService = {
  list: (params?: Record<string, string>) => {
    const qs = params ? `?${new URLSearchParams(params)}` : "";
    return apiGet<PaginatedResponse<AuditEvent>>(`/api/audit${qs}`);
  },
};

export const notificationService = {
  getCounts: () =>
    apiGet<{
      pendingVerification: number;
      processingDocuments: number;
      validationIssues: number;
      total: number;
    }>("/api/notifications"),
};

export const governmentIntegrationService = {
  syncRecord: async (_recordId: string) => ({ success: true, message: "Mock sync completed" }),
  fetchExistingRecord: async (_khasra: string) => null,
  checkOwnership: async (_owner: string, _khasra: string) => ({ match: true }),
  checkDuplicate: async (_recordId: string) => ({ duplicate: false, similarity: 0 }),
};

export { authService } from "./authService";
export { documentService } from "./documentService";
