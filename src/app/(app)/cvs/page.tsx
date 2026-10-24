import { Suspense } from "react";
import { CvUploadForm } from "@/components/cvs/CvUploadForm";
import { ResumeCard } from "@/components/cvs/ResumeCard";
import { EmptyState } from "@/components/ui/EmptyState";
import { PageHeader } from "@/components/ui/PageHeader";
import { Panel } from "@/components/ui/Panel";
import { Skeleton } from "@/components/ui/Skeleton";
import { requireUser } from "@/lib/auth";
import { listResumes } from "@/lib/cvs/queries";

export default function CvsPage() {
  return (
    <>
      <PageHeader
        label="CV.STORAGE"
        title="Your CVs"
        description="Upload CVs and keep every version. Each upload is a new, unchangeable version."
      />
      <div className="grid gap-6 xl:grid-cols-[24rem_minmax(0,1fr)]">
        <Panel label="CV.UPLOAD" title="Upload a new CV" className="self-start">
          <CvUploadForm />
        </Panel>
        <Suspense fallback={<Skeleton label="Loading CVs" className="h-64" />}>
          <CvList />
        </Suspense>
      </div>
    </>
  );
}

async function CvList() {
  await requireUser();
  const resumes = await listResumes();

  if (resumes.length === 0) {
    return <EmptyState title="No CVs yet" description="Upload your first CV to compare it with job descriptions later." />;
  }
  return (
    <div className="flex flex-col gap-6">
      {resumes.map((resume) => (
        <ResumeCard key={resume.id} resume={resume} />
      ))}
    </div>
  );
}
