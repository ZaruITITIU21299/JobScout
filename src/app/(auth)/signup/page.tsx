import { signUp } from "@/app/(auth)/actions";
import { AuthForm } from "@/app/(auth)/AuthForm";

export default function SignUpPage() {
  return (
    <div className="flex flex-col gap-6">
      <h1 className="font-display text-3xl font-bold uppercase tracking-wide">Create account</h1>
      <AuthForm mode="signup" action={signUp} />
    </div>
  );
}
