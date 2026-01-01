"use client";

import { Logo } from "@/components/icons/logo";
import { SidebarNav } from "./sidebar-nav";
import { FolderList } from "./folder-list";
import { StorageIndicator } from "./storage-indicator";
import { Button } from "@/components/ui/button";
import { Settings, HelpCircle, LogOut } from "lucide-react";
import { SignOutButton, UserButton } from "@/components/auth/auth-wrapper";
import Link from "next/link";

export function Sidebar() {
  // Empty storage for now - will be connected to real data later
  const usedStorage = 0;
  const totalStorage = 100 * 1024 * 1024 * 1024; // 100GB (Creator plan default)

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
