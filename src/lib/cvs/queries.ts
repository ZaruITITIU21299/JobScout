import { z } from "zod";
import { logger } from "@/lib/logger";
import { createClient } from "@/lib/supabase/server";
import type { Resume } from "@/lib/types";

const resumeRowSchema = z.object({
  id: z.string(),
  title: z.string(),
  created_at: z.string(),
  resume_versions: z.array(
    z.object({
      id: z.string(),
      version_no: z.number(),
      file_name: z.string(),
      mime_type: z.string(),
      file_size_bytes: z.number(),
      llm_consent: z.boolean(),
      created_at: z.string(),
    }),
  ),
});

/** The signed-in user's CVs with their versions, newest version first. RLS limits rows to the owner. */
export async function listResumes(): Promise<Resume[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("resumes")
    .select(
      "id, title, created_at, resume_versions(id, version_no, file_name, mime_type, file_size_bytes, llm_consent, created_at)",
    )
    .order("created_at", { ascending: false });

  if (error) {
    logger.error("cvs.list_failed", { code: error.code });
    throw new Error("Could not load CVs.");
  }

  return z
    .array(resumeRowSchema)
    .parse(data)
    .map((row) => ({
      id: row.id,
      title: row.title,
      createdAt: row.created_at,
      versions: row.resume_versions
        .map((v) => ({
          id: v.id,
          versionNo: v.version_no,
          fileName: v.file_name,
          mimeType: v.mime_type,
          fileSizeBytes: v.file_size_bytes,
          llmConsent: v.llm_consent,
          createdAt: v.created_at,
        }))
        .sort((a, b) => b.versionNo - a.versionNo),
    }));
}
