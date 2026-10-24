import Link from "next/link";
import { Suspense } from "react";
import { BarList } from "@/components/dashboard/BarList";
import { buttonClasses } from "@/components/ui/buttonStyles";
import { EmptyState } from "@/components/ui/EmptyState";
import { PageHeader } from "@/components/ui/PageHeader";
import { Panel } from "@/components/ui/Panel";
import { Skeleton } from "@/components/ui/Skeleton";
import { requireUser } from "@/lib/auth";
import { DASHBOARD_WEEKS, STAGE_LABELS } from "@/lib/config";
import { getDashboardData } from "@/lib/dashboard/queries";
import { countByStage, countByWeek } from "@/lib/dashboard/stats";
import { formatIsoDate } from "@/lib/dates";

export default function DashboardPage() {
  return (
    <>
      <PageHeader label="PIPELINE.STATS" title="Dashboard" description="A summary of your job search." />
      <Suspense fallback={<Skeleton label="Loading dashboard" className="h-96" />}>
        <DashboardContent />
      </Suspense>
    </>
  );
}

async function DashboardContent() {
  await requireUser();
  const { cards, warningCount } = await getDashboardData();

  if (cards.length === 0) {
    return (
      <EmptyState
        title="Nothing to show yet"
        description="The dashboard fills in once you add jobs to your board."
        action={
          <Link href="/jobs/new" className={buttonClasses("primary", "sm")}>
            Add job
          </Link>
        }
      />
    );
  }

  const funnel = countByStage(cards);
  const weeks = countByWeek(
    cards.map((c) => c.appliedAt),
    DASHBOARD_WEEKS,
    new Date(),
  );

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <Panel label="WIDGET.01" title="Pipeline funnel">
        <BarList
          caption="Number of jobs in each stage"
          items={funnel.map((s) => ({ label: STAGE_LABELS[s.stage], value: s.count }))}
        />
      </Panel>

      <Panel label="WIDGET.02" title="Applications over time">
        <BarList
          caption={`Jobs per week by application date, last ${DASHBOARD_WEEKS} weeks`}
          items={weeks.map((w) => ({ label: `Wk ${formatIsoDate(w.weekStart).slice(0, 6)}`, value: w.count }))}
        />
        <p className="mt-2 text-xs text-muted">Weeks start on Monday, grouped by application date.</p>
      </Panel>

      <Panel label="WIDGET.03" title="Top missing skills">
        <EmptyState
          title="Not available yet"
          description="This appears after you run a skill-gap analysis between a CV and a job (coming in a later phase)."
        />
      </Panel>

      <Panel label="WIDGET.04" title="Scam warnings">
        <p className="font-display text-5xl font-bold">{warningCount}</p>
        <p className="text-sm text-muted">
          {warningCount === 1 ? "job on your board has" : "jobs on your board have"} a scam warning. Scam detection is
          added in a later phase, so this stays at 0 until then.
        </p>
      </Panel>
    </div>
  );
}
