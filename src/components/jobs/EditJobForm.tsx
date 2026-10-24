"use client";

import { useActionState } from "react";
import { updateJobCard } from "@/app/(app)/jobs/actions";
import { Banner } from "@/components/ui/Banner";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { COMPANY_NAME_MAX_LENGTH, POSITION_MAX_LENGTH } from "@/lib/config";
import type { JobCardDetail } from "@/lib/types";

export function EditJobForm({ card }: { card: JobCardDetail }) {
  const [state, formAction, saving] = useActionState(updateJobCard, null);
  const fieldErrors = state?.error?.fieldErrors;

  return (
    <form action={formAction} className="flex flex-col gap-4" noValidate>
      <div aria-live="polite">
        {state?.data === null ? <Banner variant="success">Changes saved.</Banner> : null}
        {state?.error && !fieldErrors ? <Banner variant="danger">{state.error.message}</Banner> : null}
      </div>
      <input type="hidden" name="id" value={card.id} />
      <Input
        id="companyName"
        name="companyName"
        label="Company name"
        required
        maxLength={COMPANY_NAME_MAX_LENGTH}
        defaultValue={card.companyName}
        error={fieldErrors?.companyName}
      />
      <Input
        id="position"
        name="position"
        label="Position"
        required
        maxLength={POSITION_MAX_LENGTH}
        defaultValue={card.position}
        error={fieldErrors?.position}
      />
      <Input
        id="appliedAt"
        name="appliedAt"
        type="date"
        label="Application date"
        required
        defaultValue={card.appliedAt}
        error={fieldErrors?.appliedAt}
      />
      <div>
        <Button type="submit" variant="primary" disabled={saving}>
          {saving ? "Saving…" : "Save changes"}
        </Button>
      </div>
    </form>
  );
}
