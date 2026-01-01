import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Graphite - Your files, faster",
  description:
    "Blazing fast cloud storage. No throttling. No limits. Your full internet speed, every time.",
  keywords: [
    "cloud storage",
    "fast upload",
    "file storage",
    "creators",
    "video editing",
  ],
  authors: [{ name: "Graphite" }],
  openGraph: {
    title: "Graphite - Your files, faster",
    description:
      "Cloud storage that actually uses your internet speed. No throttling. No limits. Just fast.",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body className="font-sans antialiased">
        {children}
      </body>
    </html>
  );
}
