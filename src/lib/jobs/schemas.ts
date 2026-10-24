import { z } from "zod";
import { COMPANY_NAME_MAX_LENGTH, JD_TEXT_MAX_LENGTH, POSITION_MAX_LENGTH, STAGES } from "@/lib/config";

export const stageSchema = z.enum(STAGES);

const companyName = z
  .string()
  .trim()
  .min(1, "Enter the company name.")
  .max(COMPANY_NAME_MAX_LENGTH, `Use at most ${COMPANY_NAME_MAX_LENGTH} characters.`);

const position = z
  .string()
  .trim()
  .min(1, "Enter the position.")
  .max(POSITION_MAX_LENGTH, `Use at most ${POSITION_MAX_LENGTH} characters.`);

const appliedAt = z.iso.date("Enter a valid date.");

export const httpUrlSchema = z
  .url({ protocol: /^https?$/, message: "Enter a link starting with http:// or https://." })
  .max(2048, "This link is too long.");

export const createJobCardSchema = z.object({
  companyName,
  position,
  appliedAt,
  jdText: z
    .string()
    .trim()
    .min(1, "Paste the job description.")
    .max(JD_TEXT_MAX_LENGTH, `The job description is too long (max ${JD_TEXT_MAX_LENGTH} characters).`),
  sourceUrl: z.union([z.literal(""), httpUrlSchema]),
});

export const updateJobCardSchema = z.object({
  id: z.uuid(),
  companyName,
  position,
  appliedAt,
});

export const moveJobCardSchema = z.object({
  cardId: z.uuid(),
  toStage: stageSchema,
  toIndex: z.number().int().min(0).max(10_000),
});

/** Database row shapes, parsed instead of cast (types are not generated yet). */
export const jobCardRowSchema = z.object({
  id: z.string(),
  company_name: z.string(),
  position: z.string(),
  applied_at: z.string(),
  stage: stageSchema,
  sort_order: z.number(),
});

export const jobCardDetailRowSchema = jobCardRowSchema.extend({
  created_at: z.string(),
  job_postings: z.object({
    source_url: z.string().nullable(),
    jd_text: z.string(),
  }),
});
