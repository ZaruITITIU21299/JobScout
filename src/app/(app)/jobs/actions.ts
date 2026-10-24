"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { fail, fromDatabaseError, ok, UNAUTHENTICATED, validationFailure } from "@/lib/actionResult";
import { getUserOrNull } from "@/lib/auth";
import { fetchJobPosting, type FetchJobFailure } from "@/lib/jobs/fetchJobPosting";
import { createJobCardSchema, httpUrlSchema, moveJobCardSchema, updateJobCardSchema } from "@/lib/jobs/schemas";
import { logger } from "@/lib/logger";
import { createClient } from "@/lib/supabase/server";
import type { ActionResult, JobPrefill, Stage } from "@/lib/types";

const FETCH_FAILURE_MESSAGES: Record<FetchJobFailure, string> = {
  INVALID_URL: "This link is not valid.",
  BLOCKED_HOST: "This link points to an address JobScout is not allowed to open.",
  UNREACHABLE: "The page could not be opened. The site may block automated access.",
  NOT_HTML: "The link does not lead to a web page.",
  TOO_LARGE: "The page is too large to read.",
  TIMEOUT: "The page took too long to respond.",
};

/** Best-effort prefill from a JD link (FR-2.2). The user always reviews the result before saving. */
export async function fetchJobFromLink(rawUrl: string): Promise<ActionResult<JobPrefill>> {
  if (!(await getUserOrNull())) return { error: UNAUTHENTICATED };

  const parsed = httpUrlSchema.safeParse(rawUrl.trim());
  if (!parsed.success) return validationFailure(parsed.error);

  const result = await fetchJobPosting(parsed.data);
  if (!result.ok) {
    logger.info("jobs.link_fetch_failed", { reason: result.reason });
    return fail("UPSTREAM_ERROR", `${FETCH_FAILURE_MESSAGES[result.reason]} Please paste the job description manually.`);
  }

  return ok({ ...result.job, sourceUrl: result.finalUrl });
}

export async function createJobCard(
  _prev: ActionResult<null> | null,
  formData: FormData,
): Promise<ActionResult<null>> {
  if (!(await getUserOrNull())) return { error: UNAUTHENTICATED };

  const parsed = createJobCardSchema.safeParse({
    companyName: formData.get("companyName"),
    position: formData.get("position"),
    appliedAt: formData.get("appliedAt"),
    jdText: formData.get("jdText"),
    sourceUrl: formData.get("sourceUrl") ?? "",
  });
  if (!parsed.success) return validationFailure(parsed.error);

  const supabase = await createClient();
  const { error } = await supabase.rpc("create_job_card", {
    p_company_name: parsed.data.companyName,
    p_position: parsed.data.position,
    p_jd_text: parsed.data.jdText,
    p_applied_at: parsed.data.appliedAt,
    p_source_url: parsed.data.sourceUrl || null,
  });

  if (error) {
    logger.warn("jobs.create_failed", { code: error.code });
    return { error: fromDatabaseError(error, "This job description is already on your board.") };
  }

  revalidatePath("/board");
  redirect("/board");
}

export async function moveJobCard(cardId: string, toStage: Stage, toIndex: number): Promise<ActionResult<null>> {
  if (!(await getUserOrNull())) return { error: UNAUTHENTICATED };

  const parsed = moveJobCardSchema.safeParse({ cardId, toStage, toIndex });
  if (!parsed.success) return fail("VALIDATION_ERROR", "This move is not valid.");

  const supabase = await createClient();
  const { error } = await supabase.rpc("move_job_card", {
    p_card_id: parsed.data.cardId,
    p_to_stage: parsed.data.toStage,
    p_to_index: parsed.data.toIndex,
  });

  if (error) {
    logger.warn("jobs.move_failed", { code: error.code });
    return { error: fromDatabaseError(error) };
  }
  return ok(null);
}

export async function updateJobCard(
  _prev: ActionResult<null> | null,
  formData: FormData,
): Promise<ActionResult<null>> {
  if (!(await getUserOrNull())) return { error: UNAUTHENTICATED };

  const parsed = updateJobCardSchema.safeParse({
    id: formData.get("id"),
    companyName: formData.get("companyName"),
    position: formData.get("position"),
    appliedAt: formData.get("appliedAt"),
  });
  if (!parsed.success) return validationFailure(parsed.error);

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("job_cards")
    .update({
      company_name: parsed.data.companyName,
      position: parsed.data.position,
      applied_at: parsed.data.appliedAt,
    })
    .eq("id", parsed.data.id)
    .select("id");

  if (error) {
    logger.warn("jobs.update_failed", { code: error.code });
    return { error: fromDatabaseError(error) };
  }
  // RLS turns another user's card into "0 rows updated", which is reported as not found.
  if (data.length === 0) return fail("NOT_FOUND", "This job card no longer exists.");

  revalidatePath(`/jobs/${parsed.data.id}`);
  return ok(null);
}

export async function deleteJobCard(cardId: string): Promise<ActionResult<null>> {
  if (!(await getUserOrNull())) return { error: UNAUTHENTICATED };

  const id = z.uuid().safeParse(cardId);
  if (!id.success) return fail("VALIDATION_ERROR", "This job card is not valid.");

  const supabase = await createClient();
  const { data, error } = await supabase.from("job_cards").delete().eq("id", id.data).select("id");

  if (error) {
    logger.warn("jobs.delete_failed", { code: error.code });
    return { error: fromDatabaseError(error) };
  }
  if (data.length === 0) return fail("NOT_FOUND", "This job card no longer exists.");

  revalidatePath("/board");
  redirect("/board");
}
