import Link from "next/link";
import { JobForm } from "@/components/jobs/JobForm";
import { buttonClasses } from "@/components/ui/buttonStyles";
import { PageHeader } from "@/components/ui/PageHeader";

export default function NewJobPage() {
  return (
    <>
      <PageHeader
        label="PIPELINE.NEW"
        title="Add a job"
        description="Paste a link to fill in the details automatically, or enter them yourself."
        actions={
          <Link href="/board" className={buttonClasses("ghost", "sm")}>
            Back to board
          </Link>
        }
      />
      <JobForm />
    </>
  );
}
