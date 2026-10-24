// Central configuration. Values marked PROPOSED are not yet approved by the student.

/** Kanban stages, in board order (approved: docs/REQUIREMENTS.md, Open Question 1). */
export const STAGES = ["saved", "applied", "interview", "offer", "rejected"] as const;

export const STAGE_LABELS: Record<(typeof STAGES)[number], string> = {
  saved: "Saved",
  applied: "Applied",
  interview: "Interview",
  offer: "Offer",
  rejected: "Rejected",
};

export const COMPANY_NAME_MAX_LENGTH = 200;
export const POSITION_MAX_LENGTH = 200;
// PROPOSED: needs approval. Mirrored in the create_job_card database function.
export const JD_TEXT_MAX_LENGTH = 20_000;

export const CV_TITLE_MAX_LENGTH = 100;
// PROPOSED: needs approval. Mirrored in the "resumes" storage bucket file_size_limit.
export const CV_MAX_BYTES = 5 * 1024 * 1024;
export const CV_BUCKET = "resumes";
export const CV_MIME_TYPES = {
  pdf: "application/pdf",
  docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
} as const;
export const CV_SIGNED_URL_SECONDS = 60;

// JD link fetching (FR-2.2, best-effort). PROPOSED: needs approval.
export const JD_FETCH_TIMEOUT_MS = 8_000;
export const JD_FETCH_MAX_BYTES = 2 * 1024 * 1024;
export const JD_FETCH_MAX_REDIRECTS = 3;

// Dashboard
export const DASHBOARD_WEEKS = 8;
