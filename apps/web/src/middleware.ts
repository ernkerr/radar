// Auth middleware -- runs on every request (except static assets) before the
// page component renders. Its job is to check if the user has a valid Supabase
// session and redirect unauthenticated users to /login.
import { createServerClient } from "@supabase/ssr";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// Paths that should be accessible without authentication.
// /login and /signup are the auth UI, /api/auth is the signup setup endpoint.
const publicPaths = ["/login", "/signup", "/api/auth"];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Skip auth check for public paths -- let them through immediately.
  if (publicPaths.some((p) => pathname.startsWith(p))) {
    return NextResponse.next();
  }

  // Create a mutable response so we can attach updated cookies to it.
  let response = NextResponse.next({
    request: { headers: request.headers },
  });

  // Create a server-side Supabase client using the @supabase/ssr package.
  // This client reads/writes auth tokens from cookies (not localStorage),
  // which is required for server-side auth in Next.js middleware.
  // The cookie handlers synchronize tokens between the incoming request
  // cookies and the outgoing response cookies so that token refreshes
  // (handled internally by Supabase) are persisted back to the browser.
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          // Write updated cookies to both the request (for downstream middleware)
          // and the response (to send back to the browser).
          cookiesToSet.forEach(({ name, value, options }) => {
            request.cookies.set(name, value);
            response.cookies.set(name, value, options);
          });
        },
      },
    }
  );

  // Validate the session by calling getUser (which verifies the JWT server-side).
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // If no valid user session exists, redirect to the login page.
  if (!user) {
    const loginUrl = new URL("/login", request.url);
    return NextResponse.redirect(loginUrl);
  }

  return response;
}

// Matcher config tells Next.js which routes should run this middleware.
// The regex excludes Next.js internal assets (_next/static, _next/image)
// and favicon.ico so that static file requests skip the auth check.
export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico).*)",
  ],
};
