"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";
import { fail, ok, validationFailure } from "@/lib/actionResult";
import { logger } from "@/lib/logger";
import { createClient } from "@/lib/supabase/server";
import type { ActionResult } from "@/lib/types";

const signInSchema = z.object({
  email: z.email("Enter a valid email address.").max(254),
  password: z.string().min(1, "Enter your password.").max(72),
});

// PROPOSED: needs approval. Should match the minimum password length set in Supabase Auth settings.
const PASSWORD_MIN_LENGTH = 8;

const signUpSchema = z.object({
  email: z.email("Enter a valid email address.").max(254),
  password: z
    .string()
    .min(PASSWORD_MIN_LENGTH, `Use at least ${PASSWORD_MIN_LENGTH} characters.`)
    .max(72, "Use at most 72 characters."),
});

export async function signIn(_prev: ActionResult<string> | null, formData: FormData): Promise<ActionResult<string>> {
  const parsed = signInSchema.safeParse({ email: formData.get("email"), password: formData.get("password") });
  if (!parsed.success) return validationFailure(parsed.error);

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword(parsed.data);
  if (error) {
    if (error.code === "email_not_confirmed") {
      return fail("VALIDATION_ERROR", "Please confirm your email first. Check your inbox for the link.");
    }
    // Same message for unknown email and wrong password, so accounts cannot be discovered.
    return fail("VALIDATION_ERROR", "Email or password is incorrect.");
  }

  redirect("/board");
}

export async function signUp(_prev: ActionResult<string> | null, formData: FormData): Promise<ActionResult<string>> {
  const parsed = signUpSchema.safeParse({ email: formData.get("email"), password: formData.get("password") });
  if (!parsed.success) return validationFailure(parsed.error);

  const origin = (await headers()).get("origin");
  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({
    ...parsed.data,
    options: origin ? { emailRedirectTo: `${origin}/auth/callback` } : undefined,
  });

  if (error) {
    logger.warn("auth.sign_up_failed", { code: error.code ?? "unknown" });
    if (error.code === "weak_password") {
      return fail("VALIDATION_ERROR", "This password is too weak. Try a longer one.", { password: "Too weak." });
    }
    return fail("INTERNAL_ERROR", "Could not create the account. Please try again.");
  }

  // With email confirmation off, Supabase signs the user in immediately.
  if (data.session) redirect("/board");

  return ok("Check your inbox and open the confirmation link to finish signing up.");
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}
