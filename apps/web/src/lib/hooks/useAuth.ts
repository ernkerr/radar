// Custom React hook for Supabase authentication state.
// Used by every authenticated page to get the current user and a signOut function.
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import type { User } from "@supabase/supabase-js";

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    // getUser() makes a one-time check of the current session by reading the
    // auth token from cookies/localStorage. This handles the initial page load.
    supabase.auth.getUser().then(({ data: { user } }) => {
      setUser(user);
      setLoading(false);
    });

    // onAuthStateChange sets up a realtime listener that fires whenever the
    // auth state changes (login, logout, token refresh). This keeps the user
    // state in sync if the session changes while the page is open (e.g. token
    // expiry and automatic refresh, or sign-out in another tab).
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    // Cleanup: unsubscribe from the auth listener when the component unmounts
    // to prevent memory leaks and stale state updates.
    return () => subscription.unsubscribe();
  }, []);

  // Signs the user out of Supabase (clears the session) and navigates
  // to the login page. The middleware will prevent access to any protected
  // route after this.
  async function signOut() {
    await supabase.auth.signOut();
    router.push("/login");
  }

  return { user, loading, signOut };
}
