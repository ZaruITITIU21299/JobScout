"use client";

import Link from "next/link";
import { useActionState } from "react";
import { Banner } from "@/components/ui/Banner";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import type { ActionResult } from "@/lib/types";

type AuthAction = (prev: ActionResult<string> | null, formData: FormData) => Promise<ActionResult<string>>;

type AuthFormProps = {
  mode: "login" | "signup";
  action: AuthAction;
};

export function AuthForm({ mode, action }: AuthFormProps) {
  const [state, formAction, pending] = useActionState(action, null);
  const isLogin = mode === "login";

  return (
    <form action={formAction} className="flex flex-col gap-4" noValidate>
      {state?.error ? <Banner variant="danger">{state.error.message}</Banner> : null}
      {state?.data ? <Banner variant="success" title="Almost done">{state.data}</Banner> : null}

      <Input
        id="email"
        name="email"
        type="email"
        label="Email"
        autoComplete="email"
        required
        error={state?.error?.fieldErrors?.email}
      />
      <Input
        id="password"
        name="password"
        type="password"
        label="Password"
        autoComplete={isLogin ? "current-password" : "new-password"}
        hint={isLogin ? undefined : "At least 8 characters."}
        required
        error={state?.error?.fieldErrors?.password}
      />

      <Button type="submit" variant="primary" disabled={pending}>
        {pending ? "Please wait…" : isLogin ? "Sign in" : "Create account"}
      </Button>

      <p className="text-sm text-muted">
        {isLogin ? "No account yet? " : "Already have an account? "}
        <Link href={isLogin ? "/signup" : "/login"} className="text-accent underline underline-offset-4">
          {isLogin ? "Create one" : "Sign in"}
        </Link>
      </p>
    </form>
  );
}
