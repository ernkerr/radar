// Signup page -- implements a two-step account creation flow:
// Step 1: Create the Supabase Auth user (email + password) using the client-side
//         anon key. This only creates the auth.users record in Supabase Auth.
// Step 2: Call the /api/auth/setup API route to create the company and public.users
//         records. This must happen server-side via API route because:
//         - The public.users and companies tables have RLS policies that prevent
//           unauthenticated inserts.
//         - The API route uses the SUPABASE_SERVICE_ROLE_KEY to bypass RLS,
//           which must never be exposed to the browser.
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabase";

export default function SignupPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      // Step 1: Create the auth user in Supabase Auth
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password,
      });

      if (authError) {
        setError(authError.message);
        setLoading(false);
        return;
      }

      if (!authData.user) {
        setError("Signup succeeded but no user was returned. Check Supabase email confirmation settings.");
        setLoading(false);
        return;
      }

      // Step 2: Create company + user record via API route
      const res = await fetch("/api/auth/setup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: authData.user.id,
          email: authData.user.email,
          companyName,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error || "Failed to set up account");
        setLoading(false);
        return;
      }

      // Step 3: Sign in to create the session
      const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (signInError) {
        setError(`Account created but auto-login failed: ${signInError.message}. Please sign in manually.`);
        setLoading(false);
        return;
      }

      // Redirect with full page load so middleware picks up cookies
      window.location.href = "/dashboard";

    } catch (err) {
      console.error("Signup error:", err);
      setError(`Unexpected error: ${err}`);
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[var(--muted)]">
      <div className="w-full max-w-sm">
        <h1 className="text-xl font-semibold mb-6 text-center">Create your Radar account</h1>
        <form onSubmit={handleSubmit} className="bg-white border border-[var(--border)] rounded-lg p-6 space-y-4">
          {error && (
            <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded px-3 py-2">{error}</p>
          )}
          <div>
            <label className="block text-sm font-medium mb-1">Company name</label>
            <input
              type="text"
              value={companyName}
              onChange={(e) => setCompanyName(e.target.value)}
              required
              className="w-full border border-[var(--border)] rounded-md px-3 py-2 text-sm"
              placeholder="e.g. Aquanor Ice Fresh"
            />
          </div>
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
              minLength={6}
              className="w-full border border-[var(--border)] rounded-md px-3 py-2 text-sm"
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-[var(--foreground)] text-white py-2 rounded-md text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-50"
          >
            {loading ? "Creating account..." : "Create account"}
          </button>
          <p className="text-sm text-center text-[var(--muted-foreground)]">
            Already have an account?{" "}
            <Link href="/login" className="underline text-[var(--foreground)]">
              Sign in
            </Link>
          </p>
        </form>
      </div>
    </div>
  );
}
