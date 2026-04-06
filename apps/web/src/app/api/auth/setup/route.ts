// Auth setup API route -- called during signup to create the company and user
// records in the application tables. This runs server-side (Next.js API route)
// so we can safely use the SUPABASE_SERVICE_ROLE_KEY, which bypasses Row Level
// Security (RLS). The service role key must never be exposed to the browser --
// it has full unrestricted access to all tables. This is the only place in the
// app that uses it.
import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";

// Admin client using the service role key -- bypasses all RLS policies.
// This is necessary because a newly created user has no matching rows in
// public.users yet, so RLS policies that check user identity would block
// the insert that creates their user record (chicken-and-egg problem).
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(request: NextRequest) {
  const { userId, email, companyName } = await request.json();

  if (!userId || !email || !companyName) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  // Generate a URL-safe slug from the company name for use in URLs or as
  // a unique identifier. Converts to lowercase, replaces non-alphanumeric
  // characters with hyphens, and trims leading/trailing hyphens.
  // e.g. "Aquanor Ice Fresh" -> "aquanor-ice-fresh"
  const slug = companyName
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

  // Step 1: Create the company record. The .select().single() chain returns
  // the newly created row so we can use company.id in the next step.
  const { data: company, error: companyError } = await supabaseAdmin
    .from("companies")
    .insert({ name: companyName, slug })
    .select()
    .single();

  if (companyError) {
    return NextResponse.json({ error: companyError.message }, { status: 500 });
  }

  // Step 2: Create the user record in public.users, linking the Supabase Auth
  // user (by userId) to the newly created company. The first user for a company
  // is always given the "admin" role.
  const { error: userError } = await supabaseAdmin
    .from("users")
    .insert({
      id: userId,
      company_id: company.id,
      email,
      role: "admin",
    });

  if (userError) {
    return NextResponse.json({ error: userError.message }, { status: 500 });
  }

  // Return the company ID so the client could use it if needed.
  return NextResponse.json({ companyId: company.id });
}
