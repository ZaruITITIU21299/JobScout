"use client";

import { useState, useTransition } from "react";
import { Banner } from "@/components/ui/Banner";
import { Button } from "@/components/ui/Button";
import type { ActionResult } from "@/lib/types";

type ConfirmButtonProps = {
  label: string;
  confirmLabel: string;
  description: string;
  onConfirm: () => Promise<ActionResult<null> | undefined>;
};

/** Two-step destructive button: the first click asks for confirmation, the second runs the action. */
export function ConfirmButton({ label, confirmLabel, description, onConfirm }: ConfirmButtonProps) {
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function run() {
    startTransition(async () => {
      const result = await onConfirm();
      if (result?.error) {
        setError(result.error.message);
        setConfirming(false);
      }
    });
  }

  return (
    <div className="flex flex-col gap-2">
      {error ? <Banner variant="danger">{error}</Banner> : null}
      {confirming ? (
        <div role="group" aria-label={description} className="flex flex-wrap items-center gap-2">
          <span className="text-sm text-muted">{description}</span>
          <Button variant="danger" size="sm" onClick={run} disabled={pending}>
            {pending ? "Deleting…" : confirmLabel}
          </Button>
          <Button variant="ghost" size="sm" onClick={() => setConfirming(false)} disabled={pending}>
            Cancel
          </Button>
        </div>
      ) : (
        <div>
          <Button variant="danger" size="sm" onClick={() => setConfirming(true)}>
            {label}
          </Button>
        </div>
      )}
    </div>
  );
}
