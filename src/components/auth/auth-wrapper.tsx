"use client";

import { ReactNode, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { User } from "@supabase/supabase-js";
import { useRouter } from "next/navigation";
import Link from "next/link";

// Hook to get current user
export function useUser() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);
      setLoading(false);
    };

    getUser();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, [supabase.auth]);

  return { user, loading };
}

// Show children only when signed out
export function SignedOut({ children }: { children: ReactNode }) {
  const { user, loading } = useUser();

  if (loading) return null;
  if (user) return null;

  return <>{children}</>;
}

// Show children only when signed in
export function SignedIn({ children }: { children: ReactNode }) {
  const { user, loading } = useUser();

  if (loading) return null;
  if (!user) return null;

  return <>{children}</>;
}

// Sign in button - links to /login
export function SignInButton({
  children,
}: {
  children: ReactNode;
  mode?: "modal" | "redirect";
}) {
  return <Link href="/login">{children}</Link>;
}

// Sign up button - links to /signup
export function SignUpButton({
  children,
}: {
  children: ReactNode;
  mode?: "modal" | "redirect";
}) {
  return <Link href="/signup">{children}</Link>;
}

// User avatar button
export function UserButton({ afterSignOutUrl }: { afterSignOutUrl?: string }) {
  const { user } = useUser();
  const router = useRouter();
  const supabase = createClient();
  const [open, setOpen] = useState(false);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    // Use window.location for a full page redirect to clear all state
    window.location.href = afterSignOutUrl || "/";
  };

  if (!user) return null;

  const initials = user.email?.charAt(0).toUpperCase() || "U";

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="flex h-8 w-8 items-center justify-center rounded-full bg-accent text-sm font-medium text-accent-foreground"
      >
        {initials}
      </button>

      {open && (
        <>
          <div
            className="fixed inset-0 z-40"
            onClick={() => setOpen(false)}
          />
          <div className="absolute right-0 top-10 z-50 w-48 rounded-lg border border-border bg-card p-2 shadow-lg">
            <div className="px-3 py-2 text-xs text-muted-foreground truncate">
              {user.email}
            </div>
            <button
              onClick={handleSignOut}
              className="w-full rounded-md px-3 py-2 text-left text-sm hover:bg-accent/10 transition-colors"
            >
              Sign out
            </button>
          </div>
        </>
      )}
    </div>
  );
}

// Sign out button
export function SignOutButton({
  children,
  redirectUrl,
}: {
  children: ReactNode;
  redirectUrl?: string;
}) {
  const supabase = createClient();

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    // Use window.location for a full page redirect to clear all state
    window.location.href = redirectUrl || "/";
  };

  return (
    <div onClick={handleSignOut} style={{ cursor: "pointer" }}>
      {children}
    </div>
  );
}
