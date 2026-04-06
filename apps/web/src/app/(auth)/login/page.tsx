// Login page -- handles email/password authentication via Supabase Auth.
// This page is in the (auth) route group, which uses a layout without the
// AppNav since unauthenticated users should not see the main navigation.
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabase";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  // Error message from Supabase (e.g. "Invalid login credentials").
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    // signInWithPassword authenticates against Supabase Auth using email + password.
    // On success, Supabase sets session cookies automatically (handled by the
    // Supabase JS client), which the middleware will read on subsequent requests.
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      // Display the error message from Supabase (e.g. wrong password, user not found).
      setError(error.message);
      setLoading(false);
    } else {
      // On successful login, redirect to the dashboard. The middleware will
      // now allow access since a valid session cookie exists.
      router.push("/dashboard");
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[var(--muted)]">
      <div className="w-full max-w-sm">
        <h1 className="text-xl font-semibold mb-6 text-center">Sign in to Radar</h1>
        <form onSubmit={handleSubmit} className="bg-white border border-[var(--border)] rounded-lg p-6 space-y-4">
          {error && (
            <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded px-3 py-2">{error}</p>
          )}
          <div>
            <label className="block text-sm font-medium mb-1">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full border border-[var(--border)] rounded-md px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="w-full border border-[var(--border)] rounded-md px-3 py-2 text-sm"
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-[var(--foreground)] text-white py-2 rounded-md text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-50"
          >
            {loading ? "Signing in..." : "Sign in"}
          </button>
          <p className="text-sm text-center text-[var(--muted-foreground)]">
            No account?{" "}
            <Link href="/signup" className="underline text-[var(--foreground)]">
              Sign up
            </Link>
          </p>
        </form>
      </div>
    </div>
  );
}
