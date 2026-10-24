"use client";

import { useSearchParams } from "next/navigation";
import { Banner } from "@/components/ui/Banner";

/** Shown when the email confirmation link was invalid or expired. */
export function CallbackError() {
  const error = useSearchParams().get("error");
  if (error !== "confirmation_failed") return null;
  return (
    <Banner variant="danger" title="Link not valid">
      The confirmation link is invalid or has expired. Sign in, or sign up again to get a new link.
    </Banner>
  );
}
