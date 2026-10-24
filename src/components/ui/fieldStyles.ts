export const controlClasses =
  "w-full border border-border bg-bg px-3 py-2 text-text placeholder:text-muted " +
  "aria-[invalid=true]:border-danger disabled:opacity-60";

export function describedBy(id: string, hint?: string, error?: string) {
  const ids = [hint ? `${id}-hint` : null, error ? `${id}-error` : null].filter(Boolean);
  return ids.length > 0 ? ids.join(" ") : undefined;
}
