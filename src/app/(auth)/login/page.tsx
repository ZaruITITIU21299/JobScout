import { Suspense } from "react";
import { signIn } from "@/app/(auth)/actions";
import { AuthForm } from "@/app/(auth)/AuthForm";
import { CallbackError } from "@/app/(auth)/login/CallbackError";

export default function LoginPage() {
  return (
    <div className="flex flex-col gap-6">
      <h1 className="font-display text-3xl font-bold uppercase tracking-wide">Sign in</h1>
      <Suspense fallback={null}>
        <CallbackError />
      </Suspense>
      <AuthForm mode="login" action={signIn} />
    </div>
  );
}
