"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { cn, formatBytes } from "@/lib/utils";
import { Upload, Cloud, X, CheckCircle2, AlertCircle } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import Uppy from "@uppy/core";
import Tus from "@uppy/tus";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "https://api.graphite.atxcopy.com";
const supabase = createClient();

interface UploadFile {
  id: string;
  name: string;
  size: number;
  progress: number;
  speed: number;
  status: "uploading" | "complete" | "error";
  error?: string;
}

interface UploadZoneProps {
  onUploadComplete?: () => void;
}

export function UploadZone({ onUploadComplete }: UploadZoneProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [uploads, setUploads] = useState<UploadFile[]>([]);
  const uppyRef = useRef<Uppy | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const uppy = new Uppy({
      restrictions: {
        maxFileSize: 10 * 1024 * 1024 * 1024, // 10GB
      },
      autoProceed: true,
    });

    uppy.use(Tus, {
      endpoint: `${API_URL}/upload`,
      chunkSize: 10 * 1024 * 1024, // 10MB chunks - larger = fewer requests
      retryDelays: [0, 1000], // Only 1 retry to prevent spam
      parallelUploads: 10, // 10 parallel chunk uploads for max speed
      removeFingerprintOnSuccess: true, // Clean up after upload
      async onBeforeRequest(req) {
        // Validate session first with getUser(), then get fresh token
        const { data: { user }, error: userError } = await supabase.auth.getUser();
        if (userError || !user) {
          console.error("Auth error:", userError?.message || "No user");
          return;
        }

        const { data: { session } } = await supabase.auth.getSession();
        if (session?.access_token) {
          req.setHeader("Authorization", `Bearer ${session.access_token}`);
        } else {
          console.error("No access token in session");
        }
      },
    });

    uppy.on("file-added", (file) => {
      setUploads((prev) => [
        ...prev,
        {
          id: file.id,
          name: file.name,
          size: file.size || 0,
          progress: 0,
          speed: 0,
          status: "uploading",
        },
      ]);
    });

    uppy.on("upload-progress", (file, progress) => {
      if (!file) return;
      const speed = progress.bytesUploaded / ((Date.now() - (file.meta.startTime as number || Date.now())) / 1000);

      setUploads((prev) =>
        prev.map((u) =>
          u.id === file.id
            ? {
                ...u,
                progress: progress.bytesTotal ? (progress.bytesUploaded / progress.bytesTotal) * 100 : 0,
                speed,
              }
            : u
        )
      );
    });

    uppy.on("upload-success", (file) => {
      if (!file) return;
      setUploads((prev) =>
        prev.map((u) =>
          u.id === file.id ? { ...u, progress: 100, status: "complete" } : u
        )
      );
      onUploadComplete?.();
    });

    uppy.on("upload-error", (file, error) => {
      if (!file) return;
      setUploads((prev) =>
        prev.map((u) =>
          u.id === file.id
            ? { ...u, status: "error", error: error.message }
            : u
        )
      );
    });

    uppy.on("file-added", (file) => {
      file.meta.startTime = Date.now();
    });

    uppyRef.current = uppy;

    return () => {
      uppy.cancelAll();
    };
  }, [onUploadComplete]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);

    const files = Array.from(e.dataTransfer.files);
    files.forEach((file) => {
      uppyRef.current?.addFile({
        name: file.name,
        type: file.type,
        data: file,
        meta: {
          filename: file.name,
          filetype: file.type,
        },
      });
    });
  }, []);

  const handleClick = useCallback(() => {
    inputRef.current?.click();
  }, []);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    files.forEach((file) => {
      uppyRef.current?.addFile({
        name: file.name,
        type: file.type,
        data: file,
        meta: {
          filename: file.name,
          filetype: file.type,
        },
      });
    });
    if (inputRef.current) {
      inputRef.current.value = "";
    }
  }, []);

  const removeUpload = useCallback((id: string) => {
    uppyRef.current?.removeFile(id);
    setUploads((prev) => prev.filter((u) => u.id !== id));
  }, []);

  const clearCompleted = useCallback(() => {
    setUploads((prev) => prev.filter((u) => u.status !== "complete"));
  }, []);

  const activeUploads = uploads.filter((u) => u.status === "uploading");
  const completedUploads = uploads.filter((u) => u.status === "complete");

  return (
    <div className="space-y-4">
      <input
        ref={inputRef}
        type="file"
        multiple
        onChange={handleFileSelect}
        className="hidden"
      />

      <div
        onClick={handleClick}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={cn(
          "relative cursor-pointer rounded-2xl border-2 border-dashed p-12 text-center transition-all",
          isDragging
            ? "border-accent bg-accent/10"
            : "border-border bg-card hover:border-muted-foreground hover:bg-card/80"
        )}
      >
        <div className="flex flex-col items-center gap-4">
          <div
            className={cn(
              "rounded-full p-4 transition-colors",
              isDragging ? "bg-accent/20" : "bg-card"
            )}
          >
            {isDragging ? (
              <Cloud className="h-8 w-8 text-accent" />
            ) : (
              <Upload className="h-8 w-8 text-muted" />
            )}
          </div>
          <div>
            <p className="text-lg font-medium">
              {isDragging ? "Drop files here" : "Drag files here"}
            </p>
            <p className="mt-1 text-sm text-muted">or click to browse</p>
            <p className="mt-2 text-xs text-muted-foreground">
              Up to 10GB per file • Blazing fast parallel uploads
            </p>
          </div>
        </div>
      </div>

      {/* Active Uploads */}
      {activeUploads.length > 0 && (
        <div className="rounded-xl border border-border bg-card p-4">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-sm font-medium">
              Uploading {activeUploads.length} file{activeUploads.length > 1 ? "s" : ""}
            </h3>
          </div>
          <div className="space-y-3">
            {activeUploads.map((upload) => (
              <div key={upload.id} className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="truncate font-medium">{upload.name}</span>
                  <div className="flex items-center gap-3">
                    <span className="text-xs text-muted-foreground">
                      {formatBytes(upload.speed)}/s
                    </span>
                    <span className="text-xs text-accent">
                      {upload.progress.toFixed(0)}%
                    </span>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        removeUpload(upload.id);
                      }}
                      className="text-muted-foreground hover:text-foreground"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                </div>
                <div className="h-1.5 overflow-hidden rounded-full bg-border">
                  <div
                    className="h-full bg-accent transition-all duration-300"
                    style={{ width: `${upload.progress}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Completed Uploads */}
      {completedUploads.length > 0 && (
        <div className="rounded-xl border border-border bg-card p-4">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-sm font-medium text-green-500">
              <CheckCircle2 className="mr-2 inline h-4 w-4" />
              {completedUploads.length} file{completedUploads.length > 1 ? "s" : ""} uploaded
            </h3>
            <button
              onClick={clearCompleted}
              className="text-xs text-muted-foreground hover:text-foreground"
            >
              Clear
            </button>
          </div>
          <div className="space-y-2">
            {completedUploads.slice(0, 5).map((upload) => (
              <div key={upload.id} className="flex items-center justify-between text-sm">
                <span className="truncate">{upload.name}</span>
                <span className="text-xs text-muted-foreground">
                  {formatBytes(upload.size)}
                </span>
              </div>
            ))}
            {completedUploads.length > 5 && (
              <p className="text-xs text-muted-foreground">
                +{completedUploads.length - 5} more
              </p>
            )}
          </div>
        </div>
      )}

      {/* Error Uploads */}
      {uploads.filter((u) => u.status === "error").length > 0 && (
        <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-4">
          <h3 className="mb-2 text-sm font-medium text-red-500">
            <AlertCircle className="mr-2 inline h-4 w-4" />
            Upload errors
          </h3>
          <div className="space-y-2">
            {uploads
              .filter((u) => u.status === "error")
              .map((upload) => (
                <div key={upload.id} className="text-sm">
                  <span className="truncate">{upload.name}</span>
                  <span className="ml-2 text-xs text-red-400">
                    {upload.error || "Upload failed"}
                  </span>
                </div>
              ))}
          </div>
        </div>
      )}
    </div>
  );
}
