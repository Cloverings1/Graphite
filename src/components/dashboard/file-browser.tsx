"use client";

import { useState } from "react";
import { FileItem } from "@/types";
import { FileItemRow } from "./file-item";
import { ViewToggle } from "./view-toggle";
import { SearchBar } from "./search-bar";
import { cn } from "@/lib/utils";

interface FileBrowserProps {
  files: FileItem[];
  title?: string;
  loading?: boolean;
  onUpdate?: () => void;
}

export function FileBrowser({ files, title = "All Files", loading = false, onUpdate }: FileBrowserProps) {
  const [view, setView] = useState<"list" | "grid">("list");

  return (
    <div className="flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-border pb-4">
        <h1 className="text-xl font-semibold">{title}</h1>
        <div className="flex items-center gap-4">
          <SearchBar />
          <ViewToggle view={view} onViewChange={setView} />
        </div>
      </div>

      {/* File list/grid */}
      <div className="mt-4">
        {loading ? (
          <div className="py-12 text-center text-muted">
            <div className="inline-block h-6 w-6 animate-spin rounded-full border-2 border-current border-t-transparent" />
            <p className="mt-2">Loading files...</p>
          </div>
        ) : files.length === 0 ? (
          <div className="py-12 text-center text-muted">
            No files yet. Upload something to get started.
          </div>
        ) : view === "grid" ? (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
            {files.map((file) => (
              <FileItemRow key={file.id} file={file} view="grid" onUpdate={onUpdate} />
            ))}
          </div>
        ) : (
          <div className="space-y-1">
            {/* List header */}
            <div className="flex items-center gap-4 px-4 py-2 text-xs font-medium uppercase tracking-wider text-muted">
              <div className="w-5" /> {/* Icon spacer */}
              <div className="flex-1">Name</div>
              <div className="w-4" /> {/* Star spacer */}
              <div className="w-20 text-right">Size</div>
              <div className="w-28 text-right">Modified</div>
              <div className="w-8" /> {/* Actions spacer */}
            </div>
            {files.map((file) => (
              <FileItemRow key={file.id} file={file} view="list" onUpdate={onUpdate} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
