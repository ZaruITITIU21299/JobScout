import type { ReactNode } from "react";

type BannerVariant = "info" | "success" | "caution" | "danger";

const styles: Record<BannerVariant, { box: string; icon: string; label: string }> = {
  info: { box: "border-info text-text", icon: "i", label: "Info" },
  success: { box: "border-success text-text", icon: "✓", label: "Success" },
  caution: { box: "border-caution text-text", icon: "!", label: "Caution" },
  danger: { box: "border-danger text-text", icon: "✕", label: "Error" },
};

const iconColor: Record<BannerVariant, string> = {
  info: "text-info",
  success: "text-success",
  caution: "text-caution",
  danger: "text-danger",
};

type BannerProps = {
  variant: BannerVariant;
  title?: string;
  children: ReactNode;
};

/** Status message with icon + text so meaning never depends on color alone. */
export function Banner({ variant, title, children }: BannerProps) {
  const style = styles[variant];
  return (
    <div
      role={variant === "danger" ? "alert" : "status"}
      className={`chamfer flex gap-3 border-l-4 bg-surface-raised px-4 py-3 ${style.box}`}
    >
      <span aria-hidden="true" className={`font-mono font-bold ${iconColor[variant]}`}>
        [{style.icon}]
      </span>
      <div className="flex flex-col gap-1 text-sm">
        <p className="font-semibold">{title ?? style.label}</p>
        <div>{children}</div>
      </div>
    </div>
  );
}
