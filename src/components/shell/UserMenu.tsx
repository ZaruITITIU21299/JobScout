import { signOut } from "@/app/(auth)/actions";
import { Button } from "@/components/ui/Button";
import { requireUser } from "@/lib/auth";

export async function UserMenu() {
  const user = await requireUser();

  return (
    <div className="flex items-center gap-3">
      <span className="hidden text-sm text-muted sm:inline">{user.email ?? "Signed in"}</span>
      <form action={signOut}>
        <Button type="submit" variant="ghost" size="sm">
          Sign out
        </Button>
      </form>
    </div>
  );
}
