"use client";

import { deleteJobCard } from "@/app/(app)/jobs/actions";
import { ConfirmButton } from "@/components/ui/ConfirmButton";

export function DeleteJobButton({ cardId }: { cardId: string }) {
  return (
    <ConfirmButton
      label="Delete job"
      confirmLabel="Yes, delete"
      description="Delete this job card and its history?"
      onConfirm={() => deleteJobCard(cardId)}
    />
  );
}
