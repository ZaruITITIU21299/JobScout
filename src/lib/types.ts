import type { STAGES } from "@/lib/config";

export type Stage = (typeof STAGES)[number];

export type JobCard = {
  id: string;
  companyName: string;
  position: string;
  appliedAt: string;
  stage: Stage;
  sortOrder: number;
};

export type JobCardDetail = JobCard & {
  sourceUrl: string | null;
  jdText: string;
  createdAt: string;
};

export type ResumeVersion = {
  id: string;
  versionNo: number;
  fileName: string;
  mimeType: string;
  fileSizeBytes: number;
  llmConsent: boolean;
  createdAt: string;
};

export type Resume = {
  id: string;
  title: string;
  createdAt: string;
  versions: ResumeVersion[];
};

/** Prefilled job data from a pasted link. Always reviewed by the user before saving (FR-2.4). */
export type JobPrefill = {
  companyName: string;
  position: string;
  jdText: string;
  sourceUrl: string;
};

/** Standard result of a server action (same shape as the API rule in 20-api-data.mdc). */
export type ActionResult<T = null> =
  | { data: T; error?: undefined }
  | { data?: undefined; error: ActionError };

export type ActionError = {
  code: ActionErrorCode;
  message: string;
  fieldErrors?: Record<string, string>;
};

export type ActionErrorCode =
  | "VALIDATION_ERROR"
  | "UNAUTHENTICATED"
  | "NOT_FOUND"
  | "CONFLICT"
  | "UPSTREAM_ERROR"
  | "INTERNAL_ERROR";
