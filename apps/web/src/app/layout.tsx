// Root layout for the Next.js App Router.
// This file wraps every page in the application. In the App Router, layout.tsx
// files define shared UI (html/body tags, providers, global styles) that persist
// across navigations. The exported `metadata` object is used by Next.js to set
// <title> and <meta> tags for SEO. The `children` prop receives the current
// page component, which Next.js swaps out on route changes.
import type { Metadata } from "next";
import "./globals.css";

// Next.js reads this exported object at build/render time to populate <head> tags.
export const metadata: Metadata = {
  title: "Radar",
  description: "Compliance monitoring for seafood importers",
};

// The root layout must return <html> and <body> tags. Every page in the app
// renders inside {children}. There are no client-side providers here because
// auth state is managed per-page via the useAuth hook and Supabase middleware.
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
