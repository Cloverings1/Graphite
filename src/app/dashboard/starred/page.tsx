"use client";

import { useCallback, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { FileBrowser } from "@/components/dashboard/file-browser";
import type { FileItem } from "@/types";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "https://api.graphite.atxcopy.com";

export default function StarredPage() {
  const [files, setFiles] = useState<FileItem[]>([]);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  const fetchFiles = useCallback(async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        setLoading(false);
        return;
      }

      const res = await fetch(`${API_URL}/api/files?starred=true`, {
        headers: { Authorization: `Bearer ${session.access_token}` },
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
      console.error("Failed to fetch starred files:", error);
    } finally {
      setLoading(false);
    }
  }, [supabase.auth]);

  useEffect(() => {
    fetchFiles();
  }, [fetchFiles]);

  return (
    <FileBrowser
      files={files}
      title="Starred"
      loading={loading}
      onUpdate={fetchFiles}
    />
  );
}
