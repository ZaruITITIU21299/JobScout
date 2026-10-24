"use client";

import { useActionState, useState, useTransition } from "react";
import { createJobCard, fetchJobFromLink } from "@/app/(app)/jobs/actions";
import { Banner } from "@/components/ui/Banner";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Panel } from "@/components/ui/Panel";
import { Textarea } from "@/components/ui/Textarea";
import { COMPANY_NAME_MAX_LENGTH, JD_TEXT_MAX_LENGTH, POSITION_MAX_LENGTH } from "@/lib/config";
import { todayLocalIso } from "@/lib/dates";
import type { JobPrefill } from "@/lib/types";

type FetchStatus =
  | { status: "idle" }
  | { status: "success"; message: string }
  | { status: "error"; message: string };

const EMPTY_PREFILL: JobPrefill = { companyName: "", position: "", jdText: "", sourceUrl: "" };

export function JobForm() {
  const [state, formAction, saving] = useActionState(createJobCard, null);
  const [fetching, startFetch] = useTransition();
  const [link, setLink] = useState("");
  const [prefill, setPrefill] = useState<JobPrefill>(EMPTY_PREFILL);
  // Changing the key remounts the fields so they pick up the fetched values as new defaults.
  const [prefillVersion, setPrefillVersion] = useState(0);
  const [fetchStatus, setFetchStatus] = useState<FetchStatus>({ status: "idle" });

  const fieldErrors = state?.error?.fieldErrors;

  function handleFetch() {
    startFetch(async () => {
      const result = await fetchJobFromLink(link);
      if (result.error) {
        setFetchStatus({ status: "error", message: result.error.fieldErrors?.form ?? result.error.message });
        setPrefill({ ...EMPTY_PREFILL, sourceUrl: link.trim() });
      } else {
        setFetchStatus({
          status: "success",
          message: "Details filled in from the page. Check every field before saving.",
        });
        setPrefill(result.data);
      }
      setPrefillVersion((v) => v + 1);
    });
  }

  function submit(formData: FormData) {
    if (!formData.get("appliedAt")) formData.set("appliedAt", todayLocalIso());
    formAction(formData);
  }

  return (
    <div className="flex flex-col gap-6">
      <Panel label="STEP.01" title="Paste a link (optional)">
        <div className="flex flex-col gap-3">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
            <div className="flex-1">
              <Input
                id="link"
                type="url"
                label="Job post link"
                placeholder="https://"
                value={link}
                onChange={(e) => setLink(e.target.value)}
                hint="JobScout tries to read the company, position, and description. Some sites block this."
              />
            </div>
            <Button variant="secondary" onClick={handleFetch} disabled={fetching || link.trim() === ""}>
              {fetching ? "Fetching…" : "Fetch details"}
            </Button>
          </div>
          <div aria-live="polite">
            {fetchStatus.status === "error" ? (
              <Banner variant="caution" title="Could not read the page">
                {fetchStatus.message}
              </Banner>
            ) : null}
            {fetchStatus.status === "success" ? <Banner variant="info">{fetchStatus.message}</Banner> : null}
          </div>
        </div>
      </Panel>

      <Panel label="STEP.02" title="Job details">
        <form action={submit} className="flex flex-col gap-4" noValidate key={prefillVersion}>
          {state?.error && !fieldErrors ? <Banner variant="danger">{state.error.message}</Banner> : null}
          <input type="hidden" name="sourceUrl" value={prefill.sourceUrl} />

          <div className="grid gap-4 sm:grid-cols-2">
            <Input
              id="companyName"
              name="companyName"
              label="Company name"
              required
              maxLength={COMPANY_NAME_MAX_LENGTH}
              defaultValue={prefill.companyName}
              error={fieldErrors?.companyName}
            />
            <Input
              id="position"
              name="position"
              label="Position"
              required
              maxLength={POSITION_MAX_LENGTH}
              defaultValue={prefill.position}
              error={fieldErrors?.position}
            />
          </div>
          <div className="sm:max-w-xs">
            <Input
              id="appliedAt"
              name="appliedAt"
              type="date"
              label="Application date"
              hint="Leave empty to use today."
              error={fieldErrors?.appliedAt}
            />
          </div>
          <Textarea
            id="jdText"
            name="jdText"
            label="Job description"
            required
            rows={14}
            maxLength={JD_TEXT_MAX_LENGTH}
            defaultValue={prefill.jdText}
            hint="Paste the full text of the job post."
            error={fieldErrors?.jdText}
          />
          {fieldErrors?.sourceUrl ? <Banner variant="danger">{fieldErrors.sourceUrl}</Banner> : null}

          <div className="flex justify-end">
            <Button type="submit" variant="primary" disabled={saving}>
              {saving ? "Saving…" : "Save job"}
            </Button>
          </div>
        </form>
      </Panel>
    </div>
  );
}
