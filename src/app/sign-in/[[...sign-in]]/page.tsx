import Link from "next/link";

// Auth temporarily disabled
export default function SignInPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <div className="text-center">
        <h1 className="text-2xl font-bold">Sign In</h1>
        <p className="mt-2 text-muted-foreground">
          Authentication is temporarily disabled.
        </p>
        <Link
          href="/"
          className="mt-4 inline-block text-accent hover:underline"
        >
          Return to home
        </Link>
      </div>
    </div>
  );
}
