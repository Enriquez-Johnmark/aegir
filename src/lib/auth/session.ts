import "server-only";

import { redirect } from "next/navigation";
import { connection } from "next/server";
import { cache } from "react";

import type { OrgRole } from "@/lib/auth/roles";
import { createClient } from "@/lib/supabase/server";

export type CurrentUser = {
  id: string;
  email: string;
  fullName: string;
  role: OrgRole;
  organization: { id: string; name: string };
};

export type SessionState =
  | { status: "anonymous" }
  | { status: "no-membership"; email: string }
  | { status: "member"; user: CurrentUser };

/**
 * Resolves the signed-in user and their organization once per request.
 *
 * getClaims() verifies the JWT (never trust getSession() on the server). The
 * membership lookup runs through RLS as the user, so it can only ever return
 * the caller's own membership.
 *
 * MVP: a user belongs to one organization; the oldest membership is used.
 */
export const getSessionState = cache(async (): Promise<SessionState> => {
  // Authentication is always per request: opt out of prerendering and runtime
  // prefetching (supabase-js reads the clock while restoring the session).
  await connection();
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getClaims();
  if (error || !data?.claims) {
    return { status: "anonymous" };
  }

  const userId = data.claims.sub;
  const email = typeof data.claims.email === "string" ? data.claims.email : "";

  const { data: membership, error: membershipError } = await supabase
    .from("memberships")
    .select("role, organization:organizations (id, name), profile:profiles (full_name)")
    .eq("user_id", userId)
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (membershipError) {
    throw new Error("Could not load your organization membership.", { cause: membershipError });
  }

  if (!membership?.organization || !membership.profile) {
    return { status: "no-membership", email };
  }

  return {
    status: "member",
    user: {
      id: userId,
      email,
      fullName: membership.profile.full_name,
      role: membership.role,
      organization: { id: membership.organization.id, name: membership.organization.name },
    },
  };
});

/** For pages and DAL functions that need a member; redirects everyone else. */
export async function requireUser(): Promise<CurrentUser> {
  const session = await getSessionState();
  if (session.status === "anonymous") {
    redirect("/login");
  }
  if (session.status === "no-membership") {
    redirect("/no-access");
  }
  return session.user;
}
