import { z } from "zod";
import { jobCardDetailRowSchema, jobCardRowSchema } from "@/lib/jobs/schemas";
import { logger } from "@/lib/logger";
import { createClient } from "@/lib/supabase/server";
import type { JobCard, JobCardDetail } from "@/lib/types";

// Reads run with the user-scoped client, so RLS limits results to the signed-in user's own cards.

function toJobCard(row: z.infer<typeof jobCardRowSchema>): JobCard {
  return {
    id: row.id,
    companyName: row.company_name,
    position: row.position,
    appliedAt: row.applied_at,
    stage: row.stage,
    sortOrder: row.sort_order,
  };
}

export async function listJobCards(): Promise<JobCard[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("job_cards")
    .select("id, company_name, position, applied_at, stage, sort_order")
    .order("stage")
    .order("sort_order")
    .order("created_at");

  if (error) {
    logger.error("jobs.list_failed", { code: error.code });
    throw new Error("Could not load job cards.");
  }
  return z.array(jobCardRowSchema).parse(data).map(toJobCard);
}

export async function getJobCard(id: string): Promise<JobCardDetail | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("job_cards")
    .select("id, company_name, position, applied_at, stage, sort_order, created_at, job_postings(source_url, jd_text)")
    .eq("id", id)
    .maybeSingle();

  if (error) {
    logger.error("jobs.get_failed", { code: error.code });
    throw new Error("Could not load the job card.");
  }
  if (!data) return null;

  const row = jobCardDetailRowSchema.parse(data);
  return {
    ...toJobCard(row),
    createdAt: row.created_at,
    sourceUrl: row.job_postings.source_url,
    jdText: row.job_postings.jd_text,
  };
}
