import type { OCRResult, ExtractionResult, ValidationResult, ImageProcessingResult } from "@/types";

export const mockImageProcessingResult = (
  documentId: string,
  pageCount: number
): ImageProcessingResult => ({
  document_id: documentId,
  pages: Array.from({ length: pageCount }, (_, i) => ({
    page: i + 1,
    processed_image_url: `/samples/land-record-page-${(i % 3) + 1}.svg`,
    quality_score: 82 + Math.floor(Math.random() * 15),
    blur_detected: false,
    skew_angle: 0.4,
    rotation_corrected: true,
  })),
});

export const mockOCRResult = (documentId: string): OCRResult => ({
  document_id: documentId,
  pages: [
    {
      page: 1,
      language: "hi",
      text: "खसरा संख्या 235/1, खाता संख्या 124, मालिक राम सिंह, पिता मोहन सिंह...",
      regions: [
        {
          text: "राम सिंह",
          confidence: 0.96,
          bbox: [120, 200, 350, 240],
          fieldKey: "owner_name",
        },
        {
          text: "मोहन सिंह",
          confidence: 0.91,
          bbox: [120, 260, 350, 300],
          fieldKey: "father_name",
        },
        {
          text: "235/1",
          confidence: 0.99,
          bbox: [400, 150, 500, 190],
          fieldKey: "khasra_number",
        },
        {
          text: "124",
          confidence: 0.98,
          bbox: [520, 150, 580, 190],
          fieldKey: "khata_number",
        },
        {
          text: "0.2450",
          confidence: 0.67,
          bbox: [120, 320, 220, 360],
          fieldKey: "area",
        },
      ],
    },
  ],
});

export const mockExtractionResult = (documentId: string): ExtractionResult => ({
  document_id: documentId,
  fields: {
    owner_name: { value: "Ram Singh", confidence: 0.96 },
    father_name: { value: "Mohan Singh", confidence: 0.91 },
    khasra_number: { value: "235/1", confidence: 0.99 },
    khata_number: { value: "124", confidence: 0.98 },
    area: { value: "0.2450", unit: "hectare", confidence: 0.67, needsReview: true },
    village: { value: "Chinhat", confidence: 0.95 },
    tehsil: { value: "Sadar", confidence: 0.97 },
    district: { value: "Lucknow", confidence: 0.98 },
    state: { value: "Uttar Pradesh", confidence: 0.99 },
    registration_number: { value: "REG-2024-4521", confidence: 0.88 },
    mutation_number: { value: "MUT-2023-1189", confidence: 0.85 },
    mutation_date: { value: "2023-08-15", confidence: 0.82 },
  },
});

export const mockValidationResult = (documentId: string): ValidationResult => ({
  document_id: documentId,
  validation_status: "REVIEW_REQUIRED",
  validation_score: 86,
  errors: [],
  warnings: [
    {
      field: "area",
      type: "HISTORICAL_MISMATCH",
      message: "Area differs from previous record",
      current_value: "0.2450 hectare",
      previous_value: "0.3200 hectare",
    },
  ],
  duplicate: { detected: false, similarity: 0 },
  passed_checks: [
    "Khasra format valid",
    "Required fields present",
    "Village verified",
    "Khata number format valid",
  ],
});

export const mockDashboardStats = {
  total_documents: 12540,
  processed_documents: 11820,
  verified_records: 9420,
  pending_verification: 1230,
  validation_issues: 340,
  average_confidence: 94.7,
};

export const mockStateProgress = [
  { state: "Uttar Pradesh", total: 4200, processed: 3980, verified: 3200, percentage: 76 },
  { state: "Madhya Pradesh", total: 3100, processed: 2900, verified: 2400, percentage: 77 },
  { state: "Rajasthan", total: 2800, processed: 2650, verified: 2100, percentage: 75 },
  { state: "Bihar", total: 2440, processed: 2290, verified: 1720, percentage: 71 },
];

export const mockDistrictProgress = [
  { district: "Lucknow", state: "Uttar Pradesh", total: 890, processed: 845, verified: 720, percentage: 81 },
  { district: "Kanpur", state: "Uttar Pradesh", total: 760, processed: 710, verified: 580, percentage: 76 },
  { district: "Bhopal", state: "Madhya Pradesh", total: 650, processed: 620, verified: 510, percentage: 78 },
  { district: "Jaipur", state: "Rajasthan", total: 580, processed: 550, verified: 430, percentage: 74 },
  { district: "Patna", state: "Bihar", total: 520, processed: 490, verified: 360, percentage: 69 },
];

export const mockProcessingChart = [
  { month: "Apr", uploaded: 820, processed: 780, verified: 650 },
  { month: "May", uploaded: 950, processed: 910, verified: 780 },
  { month: "Jun", uploaded: 1100, processed: 1050, verified: 890 },
  { month: "Jul", uploaded: 1250, processed: 1180, verified: 980 },
  { month: "Aug", uploaded: 1380, processed: 1310, verified: 1100 },
  { month: "Sep", uploaded: 1520, processed: 1450, verified: 1200 },
];

export const mockVerificationChart = [
  { name: "Approved", value: 620, color: "#1a7f37" },
  { name: "Pending", value: 1230, color: "#e8750a" },
  { name: "Rejected", value: 85, color: "#dc2626" },
  { name: "Sent Back", value: 42, color: "#64748b" },
];

export const mockValidationChart = [
  { name: "Valid", value: 8900, color: "#1a7f37" },
  { name: "Review Required", value: 340, color: "#e8750a" },
  { name: "Invalid", value: 180, color: "#dc2626" },
];
