import type { ZodError } from "zod";
import type { ActionError, ActionErrorCode, ActionResult } from "@/lib/types";

export function ok<T>(data: T): ActionResult<T> {
  return { data };
}

export function fail<T = never>(
  code: ActionErrorCode,
  message: string,
  fieldErrors?: Record<string, string>,
): ActionResult<T> {
  return { error: { code, message, fieldErrors } };
}

export function validationFailure<T = never>(error: ZodError): ActionResult<T> {
  const fieldErrors: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = issue.path.join(".") || "form";
    fieldErrors[key] ??= issue.message;
  }
  return fail("VALIDATION_ERROR", "Please fix the highlighted fields.", fieldErrors);
}

export const UNAUTHENTICATED: ActionError = {
  code: "UNAUTHENTICATED",
  message: "Your session has expired. Please sign in again.",
};

type PostgresLikeError = { code?: string; message?: string };

/** Maps a Postgres/PostgREST error to a safe, user-facing error. Never returns raw database messages. */
export function fromDatabaseError(error: PostgresLikeError, conflictMessage = "This item already exists."): ActionError {
  switch (error.code) {
    case "23505":
      return { code: "CONFLICT", message: conflictMessage };
    case "22023":
    case "23514":
      return { code: "VALIDATION_ERROR", message: "Some values are invalid. Please check the form." };
    case "P0002":
      return { code: "NOT_FOUND", message: "This item no longer exists." };
    case "42501":
      return { code: "UNAUTHENTICATED", message: "You are not allowed to do this. Please sign in again." };
    default:
      return { code: "INTERNAL_ERROR", message: "Something went wrong. Please try again." };
  }
}
