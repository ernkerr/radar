// Client-side Supabase client singleton.
// This client is used in all "use client" components for data fetching and auth.
// It uses the anon (public) key, which means all queries go through Supabase's
// Row Level Security (RLS) policies. For operations that need to bypass RLS
// (like account setup during signup), the server-side API route in
// /api/auth/setup/route.ts uses a separate client with the service role key.
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";

// These env vars are prefixed with NEXT_PUBLIC_ so Next.js exposes them to
// the browser bundle. They are safe to expose -- the anon key only grants
// access allowed by RLS policies.
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

// The Database generic parameter gives the client full type information about
// table names, column types, and relationships. This enables autocomplete and
// type checking on .from("tableName").select("column") calls throughout the app.
export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey);
