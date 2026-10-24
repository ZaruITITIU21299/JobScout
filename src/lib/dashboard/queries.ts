import { z } from "zod";
import { stageSchema } from "@/lib/jobs/schemas";
import { logger } from "@/lib/logger";
import { createClient } from "@/lib/supabase/server";
import type { Stage } from "@/lib/types";

export type DashboardData = {
  cards: { stage: Stage; appliedAt: string }[];
  warningCount: number;
};

const cardRowSchema = z.object({ stage: stageSchema, applied_at: z.string() });
const assessmentRowSchema = z.object({ job_posting_id: z.string() });

/** Everything the dashboard needs, read as the user (RLS scopes every query to their own data). */
export async function getDashboardData(): Promise<DashboardData> {
  const supabase = await createClient();

  const [cardsResult, warningsResult] = await Promise.all([
    supabase.from("job_cards").select("stage, applied_at"),
    // Postings on the user's board whose latest scam verdict is a warning. Empty until scam detection exists.
    supabase.from("latest_scam_assessments").select("job_posting_id").in("verdict", ["misleading", "scam"]),
  ]);

  if (cardsResult.error || warningsResult.error) {
    logger.error("dashboard.load_failed", {
      cardsCode: cardsResult.error?.code,
      warningsCode: warningsResult.error?.code,
    });
    throw new Error("Could not load the dashboard.");
  }

  const cards = z
    .array(cardRowSchema)
    .parse(cardsResult.data)
    .map((row) => ({ stage: row.stage, appliedAt: row.applied_at }));
  const warnings = z.array(assessmentRowSchema).parse(warningsResult.data);

  return { cards, warningCount: new Set(warnings.map((w) => w.job_posting_id)).size };
}
