// Client-side Supabase client singleton.
// Uses @supabase/ssr's createBrowserClient which stores auth tokens in COOKIES
// (not localStorage). This is critical because our Next.js middleware reads
// cookies to check authentication. If we used the default createClient from
// @supabase/supabase-js, it would store tokens in localStorage which the
// server-side middleware can't access — causing authenticated users to get
// redirected to /login.
import { createBrowserClient } from "@supabase/ssr";
import type { Database } from "@/types/database";

// These env vars are prefixed with NEXT_PUBLIC_ so Next.js exposes them to
// the browser bundle. They are safe to expose — the anon key only grants
// access allowed by RLS policies.
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

// The Database generic parameter gives the client full type information about
// table names, column types, and relationships. This enables autocomplete and
// type checking on .from("tableName").select("column") calls throughout the app.
export const supabase = createBrowserClient<Database>(supabaseUrl, supabaseAnonKey);
