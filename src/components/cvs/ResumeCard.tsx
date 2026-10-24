import { CvUploadForm } from "@/components/cvs/CvUploadForm";
import { DeleteCvButton } from "@/components/cvs/DeleteCvButton";
import { Badge } from "@/components/ui/Badge";
import { Panel } from "@/components/ui/Panel";
import { formatTimestamp } from "@/lib/dates";
import type { Resume } from "@/lib/types";

function formatSize(bytes: number) {
  return bytes < 1024 * 1024 ? `${Math.max(1, Math.round(bytes / 1024))} KB` : `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

export function ResumeCard({ resume }: { resume: Resume }) {
  return (
    <Panel
      label="CV.RECORD"
      title={resume.title}
      actions={<Badge>{`${resume.versions.length} version${resume.versions.length === 1 ? "" : "s"}`}</Badge>}
    >
      <div className="flex flex-col gap-6">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <caption className="sr-only">Versions of {resume.title}</caption>
            <thead className="hud-label">
              <tr className="border-b border-border">
                <th scope="col" className="py-2 pr-3 font-normal">Version</th>
                <th scope="col" className="py-2 pr-3 font-normal">File</th>
                <th scope="col" className="py-2 pr-3 font-normal">Uploaded</th>
                <th scope="col" className="py-2 pr-3 font-normal">AI consent</th>
                <th scope="col" className="py-2 font-normal">
                  <span className="sr-only">Actions</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {resume.versions.map((version) => (
                <tr key={version.id} className="border-b border-border align-top">
                  <td className="py-3 pr-3 font-mono">v{version.versionNo}</td>
                  <td className="py-3 pr-3">
                    <a
                      href={`/cvs/versions/${version.id}/download`}
                      className="break-all text-accent underline underline-offset-4"
                    >
                      {version.fileName}
                    </a>
                    <span className="block text-muted">{formatSize(version.fileSizeBytes)}</span>
                  </td>
                  <td className="py-3 pr-3">{formatTimestamp(version.createdAt)}</td>
                  <td className="py-3 pr-3">{version.llmConsent ? "Yes" : "No"}</td>
                  <td className="py-3">
                    <DeleteCvButton kind="version" id={version.id} versionNo={version.versionNo} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="border-t border-border pt-4">
          <p className="hud-label mb-3">{"// NEW.VERSION"}</p>
          <CvUploadForm resumeId={resume.id} />
        </div>

        <div className="border-t border-border pt-4">
          <DeleteCvButton kind="resume" id={resume.id} />
        </div>
      </div>
    </Panel>
  );
}
