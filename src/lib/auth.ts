import { cache } from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export type CurrentUser = {
  id: string;
  email: string | null;
};

/** Verifies the session token (getClaims checks the signature) and returns the user, or null. */
export const getUserOrNull = cache(async (): Promise<CurrentUser | null> => {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getClaims();
  const claims = data?.claims;
  if (error || !claims?.sub) return null;
  return { id: claims.sub, email: typeof claims.email === "string" ? claims.email : null };
});

/** For pages: redirects to the sign-in page when there is no valid session. */
export async function requireUser(): Promise<CurrentUser> {
  const user = await getUserOrNull();
  if (!user) redirect("/login");
  return user;
}
