import type { InputHTMLAttributes } from "react";
import { FieldShell } from "@/components/ui/FieldShell";
import { controlClasses, describedBy } from "@/components/ui/fieldStyles";

type InputProps = InputHTMLAttributes<HTMLInputElement> & {
  id: string;
  label: string;
  hint?: string;
  error?: string;
};

export function Input({ id, label, hint, error, required, className = "", ...rest }: InputProps) {
  return (
    <FieldShell id={id} label={label} hint={hint} error={error} required={required}>
      <input
        id={id}
        required={required}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy(id, hint, error)}
        className={`${controlClasses} min-h-10 ${className}`}
        {...rest}
      />
    </FieldShell>
  );
}
