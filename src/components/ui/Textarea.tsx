import type { TextareaHTMLAttributes } from "react";
import { FieldShell } from "@/components/ui/FieldShell";
import { controlClasses, describedBy } from "@/components/ui/fieldStyles";

type TextareaProps = TextareaHTMLAttributes<HTMLTextAreaElement> & {
  id: string;
  label: string;
  hint?: string;
  error?: string;
};

export function Textarea({ id, label, hint, error, required, className = "", ...rest }: TextareaProps) {
  return (
    <FieldShell id={id} label={label} hint={hint} error={error} required={required}>
      <textarea
        id={id}
        required={required}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy(id, hint, error)}
        className={`${controlClasses} min-h-40 leading-relaxed ${className}`}
        {...rest}
      />
    </FieldShell>
  );
}
