export interface ParsedDocumentMetadata {
  owner_name?: string;
  khasra_number?: string;
  khata_number?: string;
  village?: string;
  district?: string;
  state?: string;
  tehsil?: string;
}

const KHASRA_PATTERNS = [
  /(?:khasra|khasra_no|khasra-number)[_\s-]*(\d+\s*[/-]\s*\d+)/i,
  /(\d{2,4}\s*[/-]\s*\d{1,4})(?=\.(pdf|jpg|jpeg|png)$)/i,
  /_(\d{2,4}[-_]\d{1,4})\.(pdf|jpg|jpeg|png)$/i,
];

const VILLAGE_PATTERNS = [
  /(?:record|land|khasra)[_\s-]+([a-z][a-z\s-]{2,30}?)[_\s-]+\d/i,
  /(?:village|gaon)[_\s-]+([a-z][a-z\s-]{2,30})/i,
];

const OWNER_PATTERNS = [
  /(?:owner|malik)[_\s-]+([a-z][a-z\s-]{2,40})/i,
];

const KHATA_PATTERN = /(?:khata|khata_no)[_\s-]*(\d+)/i;

export function parseDocumentMetadata(
  fileName: string,
  hints?: Partial<ParsedDocumentMetadata>
): ParsedDocumentMetadata {
  const base = fileName.replace(/\.(pdf|jpg|jpeg|png)$/i, "");
  const normalized = base.replace(/[_-]+/g, " ").trim();

  const metadata: ParsedDocumentMetadata = {
    district: hints?.district,
    state: hints?.state || "Uttar Pradesh",
    tehsil: hints?.tehsil,
    village: hints?.village,
    owner_name: hints?.owner_name,
    khasra_number: hints?.khasra_number,
    khata_number: hints?.khata_number,
  };

  if (!metadata.khasra_number) {
    for (const pattern of KHASRA_PATTERNS) {
      const match = fileName.match(pattern);
      if (match?.[1]) {
        metadata.khasra_number = match[1].replace(/\s+/g, "").replace("-", "/");
        break;
      }
    }
  }

  if (!metadata.village) {
    for (const pattern of VILLAGE_PATTERNS) {
      const match = normalized.match(pattern);
      if (match?.[1]) {
        metadata.village = titleCase(match[1].trim());
        break;
      }
    }
  }

  if (!metadata.owner_name) {
    for (const pattern of OWNER_PATTERNS) {
      const match = normalized.match(pattern);
      if (match?.[1]) {
        metadata.owner_name = titleCase(match[1].trim());
        break;
      }
    }
  }

  if (!metadata.khata_number) {
    const khataMatch = normalized.match(KHATA_PATTERN);
    if (khataMatch?.[1]) metadata.khata_number = khataMatch[1];
  }

  return metadata;
}

function titleCase(value: string): string {
  return value
    .split(/\s+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join(" ");
}
