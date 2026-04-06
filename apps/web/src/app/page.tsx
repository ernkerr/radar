// Home page (the "/" route). This page exists solely to redirect users to
// /dashboard. The root URL has no standalone UI -- the dashboard is the real
// landing page for authenticated users. Using Next.js's server-side `redirect`
// here means the redirect happens before any HTML is sent to the browser,
// so the user never sees a flash of empty content.
import { redirect } from "next/navigation";

export default function Home() {
  // Server-side redirect (HTTP 307). The auth middleware will intercept
  // unauthenticated users before they even reach this component, sending
  // them to /login instead.
  redirect("/dashboard");
}
