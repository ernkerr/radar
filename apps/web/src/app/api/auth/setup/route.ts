import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";

// Use service role key to bypass RLS for account setup
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(request: NextRequest) {
  const { userId, email, companyName } = await request.json();

  if (!userId || !email || !companyName) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  const slug = companyName
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

  // Create company
  const { data: company, error: companyError } = await supabaseAdmin
    .from("companies")
    .insert({ name: companyName, slug })
    .select()
    .single();

  if (companyError) {
    return NextResponse.json({ error: companyError.message }, { status: 500 });
  }

  // Create user record linked to company
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

  return NextResponse.json({ companyId: company.id });
}
