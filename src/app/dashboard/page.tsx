"use client";

import { useCallback, useEffect, useState } from "react";
import { UploadZone } from "@/components/dashboard/upload-zone";
import { FileBrowser } from "@/components/dashboard/file-browser";
import type { FileItem } from "@/types";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://172.237.157.209";

export default function DashboardPage() {
  const [files, setFiles] = useState<FileItem[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchFiles = useCallback(async () => {
    try {
      // Auth temporarily disabled - using mock token
      const res = await fetch(`${API_URL}/api/files?parent_id=null`, {
        headers: {
          // Token will be added when auth is re-enabled
        },
      });

      if (res.ok) {
        const data = await res.json();
        const transformedFiles: FileItem[] = data.map((file: Record<string, unknown>) => ({
          id: file.id,
          name: file.name,
          type: file.type,
          size: file.size,
          mimeType: file.mime_type,
          createdAt: new Date(file.created_at as string),
          updatedAt: new Date(file.updated_at as string),
          starred: file.starred,
          parentId: file.parent_id,
        }));
        setFiles(transformedFiles);
      }
    } catch (error) {
      console.error("Failed to fetch files:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchFiles();
  }, [fetchFiles]);

  const handleUploadComplete = useCallback(() => {
    fetchFiles();
  }, [fetchFiles]);

  return (
    <div className="space-y-8">
      <UploadZone onUploadComplete={handleUploadComplete} />
      <FileBrowser
        files={files}
        title="All Files"
        loading={loading}
      />
    </div>
  );
}
