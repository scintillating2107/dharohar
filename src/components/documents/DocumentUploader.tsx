"use client";

import { useRef, useState } from "react";
import { Upload, FileText, X } from "lucide-react";
import { cn, formatFileSize } from "@/lib/utils";
import { ALLOWED_FILE_EXTENSIONS, MAX_FILE_SIZE_MB } from "@/lib/config";
import { useLocale } from "@/contexts/LocaleContext";

/** File picker with drag & drop. Validates type and size before the file reaches the form. */
export function DocumentUploader({
  file,
  onFileChange,
  disabled,
  progress,
}: {
  file: File | null;
  onFileChange: (file: File | null) => void;
  disabled?: boolean;
  /** Upload progress 0–100 while submitting */
  progress?: number;
}) {
  const { t } = useLocale();
  const [dragActive, setDragActive] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const accept = (f: File) => {
    const ext = "." + (f.name.split(".").pop() ?? "").toLowerCase();
    if (!ALLOWED_FILE_EXTENSIONS.includes(ext)) {
      setError(t("Unsupported file type. Use PDF, JPG, PNG or TIFF."));
      return;
    }
    if (f.size > MAX_FILE_SIZE_MB * 1024 * 1024) {
      setError(t("File is larger than {n} MB.", { n: MAX_FILE_SIZE_MB }));
      return;
    }
    setError(null);
    onFileChange(f);
  };

  return (
    <div className="space-y-3">
      {!file && (
        <div
          onDragOver={(e) => {
            e.preventDefault();
            if (!disabled) setDragActive(true);
          }}
          onDragLeave={() => setDragActive(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragActive(false);
            const f = e.dataTransfer.files[0];
            if (f && !disabled) accept(f);
          }}
          className={cn(
            "rounded-lg border-2 border-dashed px-6 py-10 sm:py-12 text-center transition-colors",
            dragActive ? "border-[var(--gov-navy-light)] bg-blue-50/50" : "border-[var(--gov-border)] bg-white",
            error && "border-red-300 bg-red-50/30"
          )}
        >
          <Upload className="mx-auto h-10 w-10 text-[var(--gov-navy-light)]" aria-hidden="true" />
          <p className="mt-4 text-sm font-semibold text-[var(--gov-navy)]">{t("Drag and drop the scanned land record here")}</p>
          <p className="mt-1 text-xs text-[var(--gov-text-muted)]">{t("PDF, JPG, PNG or TIFF — up to {n} MB", { n: MAX_FILE_SIZE_MB })}</p>
          <button
            type="button"
            disabled={disabled}
            onClick={() => inputRef.current?.click()}
            className="mt-4 rounded-md bg-[var(--gov-navy)] px-4 py-2 text-sm font-semibold text-white hover:bg-[var(--gov-navy-light)] disabled:opacity-50"
          >
            {t("Choose file")}
          </button>
          <input
            ref={inputRef}
            type="file"
            className="sr-only"
            accept=".pdf,.jpg,.jpeg,.png,.tif,.tiff"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) accept(f);
              e.target.value = "";
            }}
          />
        </div>
      )}

      {error && (
        <p className="text-sm text-red-700" role="alert">
          {error}
        </p>
      )}

      {file && (
        <div className="flex items-center gap-3 rounded-lg border border-[var(--gov-border-light)] bg-[var(--gov-bg-subtle)] p-4">
          <FileText className="h-8 w-8 text-[var(--gov-navy-light)] flex-shrink-0" aria-hidden="true" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-[var(--gov-navy)] truncate">{file.name}</p>
            <p className="text-xs text-[var(--gov-text-muted)]">{formatFileSize(file.size)}</p>
            {progress !== undefined && progress > 0 && (
              <div className="mt-2" role="progressbar" aria-valuenow={progress} aria-valuemin={0} aria-valuemax={100}>
                <div className="h-1.5 w-full rounded-full bg-[var(--gov-border-light)] overflow-hidden">
                  <div className="h-full bg-[var(--gov-navy)] transition-all duration-300" style={{ width: `${progress}%` }} />
                </div>
                <p className="text-xs text-[var(--gov-text-muted)] mt-1">{progress >= 100 ? t("Saving…") : t("{n}% uploaded", { n: progress })}</p>
              </div>
            )}
          </div>
          {!disabled && (
            <button type="button" onClick={() => onFileChange(null)} className="rounded p-1 hover:bg-white" aria-label={t("Remove file")}>
              <X className="h-4 w-4 text-[var(--gov-text-muted)]" />
            </button>
          )}
        </div>
      )}
    </div>
  );
}
