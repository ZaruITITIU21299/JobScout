"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { fail, fromDatabaseError, ok, UNAUTHENTICATED, validationFailure } from "@/lib/actionResult";
import { getUserOrNull } from "@/lib/auth";
import { CV_BUCKET, CV_TITLE_MAX_LENGTH } from "@/lib/config";
import { checkCvFile, CV_HEAD_BYTES, safeFileName, type CvFileCheck } from "@/lib/cvs/cvFile";
import { logger } from "@/lib/logger";
import { createClient } from "@/lib/supabase/server";
import type { ActionResult } from "@/lib/types";

type SupabaseClient = Awaited<ReturnType<typeof createClient>>;
type ValidCv = Extract<CvFileCheck, { ok: true }> & { file: File };

// Row shapes are parsed because database types are not generated yet.
const idRowSchema = z.object({ id: z.uuid() });
const versionRowSchema = z.object({ id: z.uuid(), resume_id: z.uuid(), storage_path: z.string() });
const storagePathsSchema = z.array(z.object({ storage_path: z.string() }));

const titleSchema = z
  .string()
  .trim()
  .min(1, "Give this CV a name, for example \"Backend CV\".")
  .max(CV_TITLE_MAX_LENGTH, `Use at most ${CV_TITLE_MAX_LENGTH} characters.`);

async function readCvFile(formData: FormData): Promise<ValidCv | { ok: false; message: string }> {
  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) return { ok: false, message: "Choose a PDF or DOCX file." };
  const head = new Uint8Array(await file.slice(0, CV_HEAD_BYTES).arrayBuffer());
  const check = checkCvFile(file.name, file.size, head);
  return check.ok ? { ...check, file } : check;
}

/** Uploads the file and inserts the version row; removes the file again if the row cannot be saved. */
async function storeVersion(
  supabase: SupabaseClient,
  userId: string,
  resumeId: string,
  versionNo: number,
  cv: ValidCv,
  llmConsent: boolean,
): Promise<ActionResult<null>> {
  const storagePath = `${userId}/${resumeId}/${versionNo}.${cv.kind}`;

  const upload = await supabase.storage
    .from(CV_BUCKET)
    .upload(storagePath, cv.file, { contentType: cv.mimeType, upsert: false });
  if (upload.error) {
    logger.warn("cvs.upload_failed", { resumeId, versionNo });
    return fail("INTERNAL_ERROR", "The file could not be uploaded. Please try again.");
  }

  const { error } = await supabase.from("resume_versions").insert({
    resume_id: resumeId,
    version_no: versionNo,
    storage_path: storagePath,
    file_name: safeFileName(cv.file.name),
    mime_type: cv.mimeType,
    file_size_bytes: cv.file.size,
    llm_consent: llmConsent,
    consented_at: llmConsent ? new Date().toISOString() : null,
  });

  if (error) {
    logger.warn("cvs.version_insert_failed", { code: error.code, resumeId });
    await supabase.storage.from(CV_BUCKET).remove([storagePath]);
    return { error: fromDatabaseError(error, "Another upload finished at the same time. Please try again.") };
  }
  return ok(null);
}

export async function uploadResume(
  _prev: ActionResult<string> | null,
  formData: FormData,
): Promise<ActionResult<string>> {
  const user = await getUserOrNull();
  if (!user) return { error: UNAUTHENTICATED };

  const title = titleSchema.safeParse(formData.get("title"));
  if (!title.success) return validationFailure(title.error);

  const cv = await readCvFile(formData);
  if (!cv.ok) return fail("VALIDATION_ERROR", cv.message, { file: cv.message });

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("resumes")
    .insert({ user_id: user.id, title: title.data })
    .select("id")
    .single();
  if (error) {
    logger.warn("cvs.resume_insert_failed", { code: error.code });
    return { error: fromDatabaseError(error) };
  }
  const resume = idRowSchema.parse(data);

  const stored = await storeVersion(supabase, user.id, resume.id, 1, cv, formData.get("llmConsent") === "on");
  if (stored.error) {
    await supabase.from("resumes").delete().eq("id", resume.id);
    return { error: stored.error };
  }

  revalidatePath("/cvs");
  return ok("CV uploaded.");
}

export async function uploadResumeVersion(
  _prev: ActionResult<string> | null,
  formData: FormData,
): Promise<ActionResult<string>> {
  const user = await getUserOrNull();
  if (!user) return { error: UNAUTHENTICATED };

  const resumeId = z.uuid().safeParse(formData.get("resumeId"));
  if (!resumeId.success) return fail("VALIDATION_ERROR", "This CV is not valid.");

  const cv = await readCvFile(formData);
  if (!cv.ok) return fail("VALIDATION_ERROR", cv.message, { file: cv.message });

  const supabase = await createClient();
  const { data: resumeRow } = await supabase.from("resumes").select("id").eq("id", resumeId.data).maybeSingle();
  const found = idRowSchema.safeParse(resumeRow);
  if (!found.success) return fail("NOT_FOUND", "This CV no longer exists.");
  const resume = found.data;

  const { data: latest } = await supabase
    .from("resume_versions")
    .select("version_no")
    .eq("resume_id", resume.id)
    .order("version_no", { ascending: false })
    .limit(1)
    .maybeSingle();
  const nextVersion = z.object({ version_no: z.number() }).safeParse(latest);
  const versionNo = nextVersion.success ? nextVersion.data.version_no + 1 : 1;

  const stored = await storeVersion(supabase, user.id, resume.id, versionNo, cv, formData.get("llmConsent") === "on");
  if (stored.error) return { error: stored.error };

  revalidatePath("/cvs");
  return ok(`Version ${versionNo} uploaded.`);
}

export async function deleteResumeVersion(versionId: string): Promise<ActionResult<null>> {
  if (!(await getUserOrNull())) return { error: UNAUTHENTICATED };

  const id = z.uuid().safeParse(versionId);
  if (!id.success) return fail("VALIDATION_ERROR", "This version is not valid.");

  const supabase = await createClient();
  const { data: versionRow } = await supabase
    .from("resume_versions")
    .select("id, resume_id, storage_path")
    .eq("id", id.data)
    .maybeSingle();
  const found = versionRowSchema.safeParse(versionRow);
  if (!found.success) return fail("NOT_FOUND", "This version no longer exists.");
  const version = found.data;

  // Remove the file first: if that fails, the row stays so the user can retry and no file is orphaned.
  const removed = await supabase.storage.from(CV_BUCKET).remove([version.storage_path]);
  if (removed.error) {
    logger.warn("cvs.file_remove_failed", { versionId: version.id });
    return fail("INTERNAL_ERROR", "The file could not be deleted. Please try again.");
  }

  const { error } = await supabase.from("resume_versions").delete().eq("id", version.id);
  if (error) return { error: fromDatabaseError(error) };

  const { count } = await supabase
    .from("resume_versions")
    .select("id", { count: "exact", head: true })
    .eq("resume_id", version.resume_id);
  if (count === 0) await supabase.from("resumes").delete().eq("id", version.resume_id);

  revalidatePath("/cvs");
  return ok(null);
}

export async function deleteResume(resumeId: string): Promise<ActionResult<null>> {
  if (!(await getUserOrNull())) return { error: UNAUTHENTICATED };

  const id = z.uuid().safeParse(resumeId);
  if (!id.success) return fail("VALIDATION_ERROR", "This CV is not valid.");

  const supabase = await createClient();
  const { data: versions, error: listError } = await supabase
    .from("resume_versions")
    .select("storage_path")
    .eq("resume_id", id.data);
  if (listError) return { error: fromDatabaseError(listError) };

  const paths = storagePathsSchema.parse(versions).map((v) => v.storage_path);
  if (paths.length > 0) {
    const removed = await supabase.storage.from(CV_BUCKET).remove(paths);
    if (removed.error) {
      logger.warn("cvs.file_remove_failed", { resumeId: id.data });
      return fail("INTERNAL_ERROR", "The files could not be deleted. Please try again.");
    }
  }

  const { data, error } = await supabase.from("resumes").delete().eq("id", id.data).select("id");
  if (error) return { error: fromDatabaseError(error) };
  if (data.length === 0) return fail("NOT_FOUND", "This CV no longer exists.");

  revalidatePath("/cvs");
  return ok(null);
}
