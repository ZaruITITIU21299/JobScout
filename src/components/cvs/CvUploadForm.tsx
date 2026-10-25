"use client";

import { startTransition, useActionState, useEffect, useRef, type FormEvent } from "react";
import { uploadResume, uploadResumeVersion } from "@/app/(app)/cvs/actions";
import { Banner } from "@/components/ui/Banner";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { CV_MAX_BYTES, CV_TITLE_MAX_LENGTH } from "@/lib/config";

type CvUploadFormProps = {
  /** When set, the form uploads a new version of this CV instead of creating a new CV. */
  resumeId?: string;
};

const MAX_MB = Math.round(CV_MAX_BYTES / 1024 / 1024);

export function CvUploadForm({ resumeId }: CvUploadFormProps) {
  const [state, formAction, pending] = useActionState(resumeId ? uploadResumeVersion : uploadResume, null);
  const prefix = resumeId ? `v-${resumeId}` : "new-cv";
  const fieldErrors = state?.error?.fieldErrors;
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state?.data) formRef.current?.reset();
  }, [state]);

  // Submitting via onSubmit instead of `action` stops React from clearing the fields when the upload fails.
  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    startTransition(() => formAction(formData));
  }

  return (
    <form ref={formRef} onSubmit={handleSubmit} className="flex flex-col gap-4" noValidate>
      <div aria-live="polite">
        {state?.data ? <Banner variant="success">{state.data}</Banner> : null}
        {state?.error && !fieldErrors ? <Banner variant="danger">{state.error.message}</Banner> : null}
      </div>

      {resumeId ? (
        <input type="hidden" name="resumeId" value={resumeId} />
      ) : (
        <Input
          id={`${prefix}-title`}
          name="title"
          label="CV name"
          required
          maxLength={CV_TITLE_MAX_LENGTH}
          placeholder="Backend CV"
          error={fieldErrors?.form}
        />
      )}

      <Input
        id={`${prefix}-file`}
        name="file"
        type="file"
        label={resumeId ? "New version file" : "CV file"}
        required
        accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
        hint={`PDF or DOCX, up to ${MAX_MB} MB.`}
        error={fieldErrors?.file}
        className="file:mr-3 file:border-0 file:bg-surface-raised file:px-3 file:py-1 file:text-text"
      />

      <div className="flex items-start gap-3">
        <input
          id={`${prefix}-consent`}
          name="llmConsent"
          type="checkbox"
          className="mt-1 size-5 accent-accent"
          aria-describedby={`${prefix}-consent-hint`}
        />
        <div className="flex flex-col gap-1">
          <label htmlFor={`${prefix}-consent`} className="text-sm font-medium">
            Allow AI skill extraction for this CV
          </label>
          <p id={`${prefix}-consent-hint`} className="text-sm text-muted">
            JobScout will send the CV text once to an AI service (Google Gemini) to list your skills. Without
            consent the CV is still stored, but skill-gap analysis will not be available for it.
          </p>
        </div>
      </div>

      <div>
        <Button type="submit" variant={resumeId ? "secondary" : "primary"} disabled={pending}>
          {pending ? "Uploading…" : resumeId ? "Upload new version" : "Upload CV"}
        </Button>
      </div>
    </form>
  );
}
