import Link from "next/link";
import { Suspense } from "react";
import { KanbanBoard } from "@/components/kanban/KanbanBoard";
import { buttonClasses } from "@/components/ui/buttonStyles";
import { EmptyState } from "@/components/ui/EmptyState";
import { PageHeader } from "@/components/ui/PageHeader";
import { Skeleton } from "@/components/ui/Skeleton";
import { requireUser } from "@/lib/auth";
import { listJobCards } from "@/lib/jobs/queries";

export default function BoardPage() {
  return (
    <>
      <PageHeader
        label="PIPELINE.BOARD"
        title="Job board"
        description="Drag cards between stages, or use the stage menu on each card."
        actions={
          <Link href="/jobs/new" className={buttonClasses("primary")}>
            Add job
          </Link>
        }
      />
      <Suspense fallback={<Skeleton label="Loading board" className="h-96" />}>
        <BoardData />
      </Suspense>
    </>
  );
}

async function BoardData() {
  await requireUser();
  const cards = await listJobCards();

  if (cards.length === 0) {
    return (
      <EmptyState
        title="No jobs yet"
        description="Add your first job to start tracking your applications."
        action={
          <Link href="/jobs/new" className={buttonClasses("primary", "sm")}>
            Add job
          </Link>
        }
      />
    );
  }
  return <KanbanBoard initialCards={cards} />;
}
