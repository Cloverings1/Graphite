"use client";

import { useState, useRef, useEffect } from "react";
import { FileItem as FileItemType } from "@/types";
import { formatBytes, formatDate, cn } from "@/lib/utils";
import {
  File,
  Film,
  Image,
  FileArchive,
  FileAudio,
  FileText,
  Folder,
  Star,
  MoreVertical,
  Download,
  Pencil,
  FolderInput,
  Trash2,
  StarOff,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "https://api.graphite.atxcopy.com";

interface FileItemProps {
  file: FileItemType;
  view: "list" | "grid";
  onUpdate?: () => void;
}

function getFileIcon(file: FileItemType) {
  if (file.type === "folder") return Folder;

  const mimeType = file.mimeType || "";
  if (mimeType.startsWith("video/")) return Film;
  if (mimeType.startsWith("image/")) return Image;
  if (mimeType.startsWith("audio/")) return FileAudio;
  if (mimeType.includes("zip") || mimeType.includes("archive")) return FileArchive;
  if (mimeType.includes("pdf") || mimeType.includes("document")) return FileText;

  return File;
}

export function FileItemRow({ file, view, onUpdate }: FileItemProps) {
  const Icon = getFileIcon(file);
  const [menuOpen, setMenuOpen] = useState(false);
  const [renaming, setRenaming] = useState(false);
  const [newName, setNewName] = useState(file.name);
  const [loading, setLoading] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const supabase = createClient();

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    };
    if (menuOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [menuOpen]);

  // Focus input when renaming
  useEffect(() => {
    if (renaming && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [renaming]);

  const getAuthHeaders = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    return { Authorization: `Bearer ${session?.access_token}` };
  };

  const handleDownload = async () => {
    setMenuOpen(false);
    try {
      const headers = await getAuthHeaders();
      const response = await fetch(`${API_URL}/api/files/${file.id}/download`, { headers });
      if (!response.ok) throw new Error("Download failed");

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = file.name;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err) {
      console.error("Download error:", err);
    }
  };

  const handleRename = async () => {
    if (!newName.trim() || newName === file.name) {
      setRenaming(false);
      setNewName(file.name);
      return;
    }

    setLoading(true);
    try {
      const headers = await getAuthHeaders();
      const response = await fetch(`${API_URL}/api/files/${file.id}`, {
        method: "PATCH",
        headers: { ...headers, "Content-Type": "application/json" },
        body: JSON.stringify({ name: newName.trim() }),
      });
      if (!response.ok) throw new Error("Rename failed");
      onUpdate?.();
    } catch (err) {
      console.error("Rename error:", err);
      setNewName(file.name);
    } finally {
      setLoading(false);
      setRenaming(false);
    }
  };

  const handleToggleStar = async () => {
    setMenuOpen(false);
    try {
      const headers = await getAuthHeaders();
      await fetch(`${API_URL}/api/files/${file.id}`, {
        method: "PATCH",
        headers: { ...headers, "Content-Type": "application/json" },
        body: JSON.stringify({ starred: !file.starred }),
      });
      onUpdate?.();
    } catch (err) {
      console.error("Star toggle error:", err);
    }
  };

  const handleDelete = async () => {
    setMenuOpen(false);
    if (!confirm(`Move "${file.name}" to trash?`)) return;

    try {
      const headers = await getAuthHeaders();
      await fetch(`${API_URL}/api/files/${file.id}`, {
        method: "DELETE",
        headers,
      });
      onUpdate?.();
    } catch (err) {
      console.error("Delete error:", err);
    }
  };

  const menuItems = [
    { icon: Download, label: "Download", onClick: handleDownload, show: file.type === "file" },
    { icon: Pencil, label: "Rename", onClick: () => { setMenuOpen(false); setRenaming(true); }, show: true },
    { icon: file.starred ? StarOff : Star, label: file.starred ? "Unstar" : "Star", onClick: handleToggleStar, show: true },
    { icon: FolderInput, label: "Move to...", onClick: () => { setMenuOpen(false); alert("Move feature coming soon!"); }, show: true },
    { icon: Trash2, label: "Delete", onClick: handleDelete, show: true, danger: true },
  ];

  const renderMenu = () => (
    <div
      ref={menuRef}
      className="absolute right-0 top-full z-50 mt-1 w-48 rounded-lg border border-border bg-card py-1 shadow-lg"
    >
      {menuItems.filter(item => item.show).map((item, i) => (
        <button
          key={i}
          onClick={item.onClick}
          className={cn(
            "flex w-full items-center gap-3 px-4 py-2 text-sm transition-colors hover:bg-accent/10",
            item.danger && "text-red-500 hover:bg-red-500/10"
          )}
        >
          <item.icon className="h-4 w-4" />
          {item.label}
        </button>
      ))}
    </div>
  );

  const renderName = () => {
    if (renaming) {
      return (
        <form
          onSubmit={(e) => { e.preventDefault(); handleRename(); }}
          className="flex items-center gap-2"
        >
          <input
            ref={inputRef}
            type="text"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onBlur={handleRename}
            onKeyDown={(e) => e.key === "Escape" && setRenaming(false)}
            disabled={loading}
            className="w-full rounded border border-accent bg-background px-2 py-1 text-sm outline-none"
          />
        </form>
      );
    }
    return <p className="truncate text-sm font-medium">{file.name}</p>;
  };

  if (view === "grid") {
    return (
      <div className="group relative rounded-xl border border-border bg-card p-4 transition-colors hover:border-muted-foreground">
        <div className="flex flex-col items-center gap-3">
          <div className="rounded-lg bg-background p-4">
            <Icon className="h-8 w-8 text-muted" />
          </div>
          <div className="w-full text-center">
            {renaming ? (
              <form onSubmit={(e) => { e.preventDefault(); handleRename(); }}>
                <input
                  ref={inputRef}
                  type="text"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  onBlur={handleRename}
                  onKeyDown={(e) => e.key === "Escape" && setRenaming(false)}
                  disabled={loading}
                  className="w-full rounded border border-accent bg-background px-2 py-1 text-center text-sm outline-none"
                />
              </form>
            ) : (
              <>
                <p className="truncate text-sm font-medium">{file.name}</p>
                <p className="text-xs text-muted">
                  {file.size ? formatBytes(file.size) : "--"}
                </p>
              </>
            )}
          </div>
        </div>
        {file.starred && (
          <Star className="absolute right-2 top-2 h-4 w-4 fill-accent text-accent" />
        )}
        <div className="absolute right-2 bottom-2">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
            onClick={(e) => { e.stopPropagation(); setMenuOpen(!menuOpen); }}
          >
            <MoreVertical className="h-4 w-4" />
          </Button>
          {menuOpen && renderMenu()}
        </div>
      </div>
    );
  }

  return (
    <div className="group flex items-center gap-4 rounded-lg border border-transparent px-4 py-3 transition-colors hover:border-border hover:bg-card">
      <Icon className="h-5 w-5 shrink-0 text-muted" />

      <div className="min-w-0 flex-1">
        {renderName()}
      </div>

      <div className="flex items-center gap-6 text-sm text-muted">
        {file.starred && (
          <Star className="h-4 w-4 fill-accent text-accent" />
        )}
        <span className="w-20 text-right">
          {file.size ? formatBytes(file.size) : "--"}
        </span>
        <span className="w-28 text-right">{formatDate(file.updatedAt)}</span>
        <div className="relative">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
            onClick={(e) => { e.stopPropagation(); setMenuOpen(!menuOpen); }}
          >
            <MoreVertical className="h-4 w-4" />
          </Button>
          {menuOpen && renderMenu()}
        </div>
      </div>
    </div>
  );
}
