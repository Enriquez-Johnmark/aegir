"use server";

import { redirect } from "next/navigation";
import { z } from "zod";

import { signInSchema } from "@/features/auth/schemas";
import { signInErrorMessage } from "@/features/auth/sign-in-error";
import { safeNextPath } from "@/lib/safe-redirect";
import { createClient } from "@/lib/supabase/server";

export type SignInState = {
  email?: string;
  formError?: string;
  fieldErrors?: { email?: string[]; password?: string[] };
};

export async function signIn(_previous: SignInState, formData: FormData): Promise<SignInState> {
  const parsed = signInSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });

  if (!parsed.success) {
    return {
      email: String(formData.get("email") ?? ""),
      fieldErrors: z.flattenError(parsed.error).fieldErrors,
    };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword(parsed.data);

  if (error) {
    // One message for unknown email and wrong password; Auth being down says so (D-052).
    return { email: parsed.data.email, formError: signInErrorMessage(error) };
  }

  redirect(safeNextPath(formData.get("next")));
}

export async function signOut(): Promise<void> {
  const supabase = await createClient();
  // "local" ends only this browser's session. The default ("global") would also
  // sign out the same account everywhere else, e.g. other people on a shared demo login.
  await supabase.auth.signOut({ scope: "local" });
  redirect("/login");
}
