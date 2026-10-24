"use client";

import { deleteResume, deleteResumeVersion } from "@/app/(app)/cvs/actions";
import { ConfirmButton } from "@/components/ui/ConfirmButton";

type DeleteCvButtonProps =
  | { kind: "resume"; id: string }
  | { kind: "version"; id: string; versionNo: number };

export function DeleteCvButton(props: DeleteCvButtonProps) {
  if (props.kind === "resume") {
    return (
      <ConfirmButton
        label="Delete CV"
        confirmLabel="Yes, delete all versions"
        description="Delete this CV and every version of it?"
        onConfirm={() => deleteResume(props.id)}
      />
    );
  }
  return (
    <ConfirmButton
      label={`Delete v${props.versionNo}`}
      confirmLabel="Yes, delete"
      description={`Delete version ${props.versionNo}?`}
      onConfirm={() => deleteResumeVersion(props.id)}
    />
  );
}
