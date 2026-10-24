import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { z } from "zod";
import { DeleteJobButton } from "@/components/jobs/DeleteJobButton";
import { EditJobForm } from "@/components/jobs/EditJobForm";
import { Badge } from "@/components/ui/Badge";
import { buttonClasses } from "@/components/ui/buttonStyles";
import { PageHeader } from "@/components/ui/PageHeader";
import { Panel } from "@/components/ui/Panel";
import { Skeleton } from "@/components/ui/Skeleton";
import { requireUser } from "@/lib/auth";
import { STAGE_LABELS } from "@/lib/config";
import { getJobCard } from "@/lib/jobs/queries";

export default function JobPage({ params }: PageProps<"/jobs/[id]">) {
  return (
    <Suspense fallback={<Skeleton label="Loading job" className="h-96" />}>
      <JobDetail params={params} />
    </Suspense>
  );
}

async function JobDetail({ params }: { params: PageProps<"/jobs/[id]">["params"] }) {
  await requireUser();
  const { id } = await params;
  if (!z.uuid().safeParse(id).success) notFound();

  const card = await getJobCard(id);
  if (!card) notFound();

  return (
    <>
      <PageHeader
        label="PIPELINE.CARD"
        title={card.position}
        description={card.companyName}
        actions={
          <Link href="/board" className={buttonClasses("ghost", "sm")}>
            Back to board
          </Link>
        }
      />
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_22rem]">
        <Panel label="JD.TEXT" title="Job description">
          {card.sourceUrl ? (
            <p className="mb-4 text-sm">
              <span className="text-muted">Source: </span>
              <a
                href={card.sourceUrl}
                target="_blank"
                rel="noopener noreferrer nofollow"
                className="break-all text-accent underline underline-offset-4"
              >
                {card.sourceUrl}
              </a>
            </p>
          ) : null}
          <p className="whitespace-pre-wrap leading-relaxed">{card.jdText}</p>
        </Panel>
        <div className="flex flex-col gap-6">
          <Panel label="CARD.META" title="Details" actions={<Badge>{STAGE_LABELS[card.stage]}</Badge>}>
            <EditJobForm card={card} />
          </Panel>
          <Panel label="CARD.DANGER" title="Delete">
            <DeleteJobButton cardId={card.id} />
          </Panel>
        </div>
      </div>
    </>
  );
}
