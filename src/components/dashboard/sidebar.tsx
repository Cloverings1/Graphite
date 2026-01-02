"use client";

import { useState, useEffect } from "react";
import { Logo } from "@/components/icons/logo";
import { SidebarNav } from "./sidebar-nav";
import { FolderList } from "./folder-list";
import { StorageIndicator } from "./storage-indicator";
import { Button } from "@/components/ui/button";
import { Settings, HelpCircle, LogOut } from "lucide-react";
import { SignOutButton, UserButton } from "@/components/auth/auth-wrapper";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "https://api.graphite.atxcopy.com";

export function Sidebar() {
  const [usedStorage, setUsedStorage] = useState(0);
  const [totalStorage, setTotalStorage] = useState(100 * 1024 * 1024 * 1024); // 100GB default
  const supabase = createClient();

  useEffect(() => {
    const fetchStorage = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) return;

      try {
        const res = await fetch(`${API_URL}/api/storage`, {
          headers: { Authorization: `Bearer ${session.access_token}` },
        });
        if (res.ok) {
          const data = await res.json();
          setUsedStorage(data.used || 0);
          setTotalStorage(data.limit || 100 * 1024 * 1024 * 1024);
        }
      } catch (err) {
        console.error("Failed to fetch storage:", err);
      }
    };

    fetchStorage();
  }, [supabase]);

  return (
    <aside className="flex h-screen w-60 flex-col border-r border-border bg-background">
      {/* Logo */}
      <div className="flex h-16 items-center justify-between px-6">
        <Link href="/">
          <Logo />
        </Link>
        <UserButton afterSignOutUrl="/" />
      </div>

      {/* Navigation */}
      <div className="flex-1 overflow-y-auto px-3 py-4">
        <SidebarNav />

        <div className="my-6 h-px bg-border" />

        <FolderList />
      </div>

      {/* Bottom section */}
      <div className="border-t border-border p-4">
        <StorageIndicator used={usedStorage} total={totalStorage} />

        <div className="mt-4 flex items-center justify-between">
          <Button variant="ghost" size="sm" className="gap-2">
            <Settings className="h-4 w-4" />
            Settings
          </Button>
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <HelpCircle className="h-4 w-4" />
            </Button>
            <SignOutButton redirectUrl="/">
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <LogOut className="h-4 w-4" />
              </Button>
            </SignOutButton>
          </div>
        </div>
      </div>
    </aside>
  );
}
