"use client";

import { useCallback, useRef, useState } from "react";
import { Upload, FileText, X } from "lucide-react";
import { cn, formatFileSize } from "@/lib/utils";
import { ALLOWED_FILE_EXTENSIONS, MAX_FILE_SIZE_MB } from "@/lib/config";
import { Button } from "@/components/ui/Button";

interface DocumentUploaderProps {
  onUpload: (
    file: File,
    onProgress?: (progress: number) => void,
    signal?: AbortSignal
  ) => Promise<void>;
  loading?: boolean;
}

export function DocumentUploader({ onUpload, loading }: DocumentUploaderProps) {
  const [dragActive, setDragActive] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);
  const abortRef = useRef<AbortController | null>(null);

  const validateFile = (file: File): string | null => {
    const ext = "." + file.name.split(".").pop()?.toLowerCase();
    if (!ALLOWED_FILE_EXTENSIONS.includes(ext)) {
      return "Invalid file type. Allowed: PDF, JPG, JPEG, PNG";
    }
    if (file.size > MAX_FILE_SIZE_MB * 1024 * 1024) {
      return `File size exceeds ${MAX_FILE_SIZE_MB}MB limit`;
    }
    return null;
  };

  const handleFile = (file: File) => {
    const err = validateFile(file);
    if (err) {
      setError(err);
      setSelectedFile(null);
      return;
    }
    setError(null);
    setProgress(0);
    setSelectedFile(file);
  };

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  }, []);

  const handleUpload = async () => {
    if (!selectedFile) return;
    setProgress(0);
    abortRef.current = new AbortController();
    try {
      await onUpload(selectedFile, setProgress, abortRef.current.signal);
    } finally {
      abortRef.current = null;
    }
  };

  const cancelUpload = () => {
    abortRef.current?.abort();
    abortRef.current = null;
    setProgress(0);
  };

  return (
    <div className="space-y-4">
      <div
        onDragOver={(e) => { e.preventDefault(); setDragActive(true); }}
        onDragLeave={() => setDragActive(false)}
        onDrop={handleDrop}
        className={cn(
          "relative rounded-lg border-2 border-dashed p-12 text-center transition-all duration-200",
          dragActive
            ? "border-[var(--gov-navy-light)] bg-blue-50/50"
            : "border-[var(--gov-border)] bg-white hover:border-[var(--gov-navy-light)]/50",
          error && "border-red-300 bg-red-50/30"
        )}
      >
        <Upload className="mx-auto h-10 w-10 text-[var(--gov-navy-light)]" />
        <p className="mt-4 text-sm font-semibold text-[var(--gov-navy)]">
          Drag and drop your land record document here
        </p>
        <p className="mt-1 text-xs text-[var(--gov-text-muted)]">
          PDF, JPG, JPEG, PNG — Max {MAX_FILE_SIZE_MB}MB
        </p>
        <label className="mt-4 inline-block">
          <span className="cursor-pointer rounded-md bg-slate-800 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700">
            Browse Files
          </span>
          <input
            type="file"
            className="hidden"
            accept=".pdf,.jpg,.jpeg,.png"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) handleFile(file);
            }}
          />
        </label>
      </div>

      {error && <p className="text-sm text-red-600" role="alert">{error}</p>}

      {selectedFile && (
        <div className="flex items-center gap-3 rounded-lg border border-slate-200 bg-slate-50 p-4">
          <FileText className="h-8 w-8 text-slate-500" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-slate-800 truncate">{selectedFile.name}</p>
            <p className="text-xs text-slate-500">{formatFileSize(selectedFile.size)}</p>
            {(loading || progress > 0) && (
              <div className="mt-2">
                <div className="h-1.5 w-full rounded-full bg-slate-200 overflow-hidden">
                  <div
                    className="h-full bg-slate-700 transition-all duration-300"
                    style={{ width: `${loading && progress === 0 ? 30 : progress}%` }}
                  />
                </div>
                <p className="text-xs text-slate-500 mt-1">
                  {progress >= 100 ? "Processing..." : progress > 0 ? `${progress}% uploaded` : "Uploading..."}
                </p>
              </div>
            )}
          </div>
          {!loading ? (
            <button
              onClick={() => { setSelectedFile(null); setProgress(0); }}
              className="rounded p-1 hover:bg-slate-200"
              aria-label="Remove file"
            >
              <X className="h-4 w-4 text-slate-500" />
            </button>
          ) : (
            <Button variant="outline" size="sm" onClick={cancelUpload}>
              Cancel
            </Button>
          )}
        </div>
      )}

      {selectedFile && !loading && (
        <Button onClick={handleUpload} className="w-full">
          Upload Document
        </Button>
      )}
    </div>
  );
}
