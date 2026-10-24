export type ButtonVariant = "primary" | "secondary" | "ghost" | "danger";
export type ButtonSize = "sm" | "md";

const base =
  "inline-flex items-center justify-center gap-2 border font-display font-semibold uppercase tracking-wider " +
  "transition-colors duration-200 disabled:cursor-not-allowed disabled:opacity-50";

const variants: Record<ButtonVariant, string> = {
  primary: "border-accent bg-accent text-on-accent hover:bg-accent-dim hover:border-accent-dim",
  secondary: "border-border bg-surface-raised text-text hover:border-accent",
  ghost: "border-transparent bg-transparent text-muted hover:text-text hover:border-border",
  danger: "border-danger bg-transparent text-danger hover:bg-danger hover:text-on-accent",
};

const sizes: Record<ButtonSize, string> = {
  sm: "min-h-9 px-3 text-sm",
  md: "min-h-10 px-4 text-base",
};

/** Shared classes so links can look like buttons without duplicating styles. */
export function buttonClasses(variant: ButtonVariant = "secondary", size: ButtonSize = "md", extra = "") {
  return `${base} ${variants[variant]} ${sizes[size]} ${extra}`.trim();
}
