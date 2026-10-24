import { STAGES } from "@/lib/config";
import type { Stage } from "@/lib/types";

// Pure dashboard calculations, computed from real data only.

export type StageCount = { stage: Stage; count: number };
export type WeekCount = { weekStart: string; count: number };

export function countByStage(cards: { stage: Stage }[]): StageCount[] {
  return STAGES.map((stage) => ({ stage, count: cards.filter((c) => c.stage === stage).length }));
}

function toIsoDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

/** Monday (UTC) of the week containing `date`. */
function weekStartOf(date: Date): Date {
  const d = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  const offset = (d.getUTCDay() + 6) % 7;
  d.setUTCDate(d.getUTCDate() - offset);
  return d;
}

/** Applications per week for the last `weeks` weeks (oldest first), by application date. `today` is injected for testability. */
export function countByWeek(appliedDates: string[], weeks: number, today: Date): WeekCount[] {
  const currentWeek = weekStartOf(today);
  const buckets: WeekCount[] = [];
  for (let i = weeks - 1; i >= 0; i--) {
    const start = new Date(currentWeek);
    start.setUTCDate(start.getUTCDate() - i * 7);
    buckets.push({ weekStart: toIsoDate(start), count: 0 });
  }

  for (const applied of appliedDates) {
    const date = new Date(`${applied}T00:00:00Z`);
    if (Number.isNaN(date.getTime())) continue;
    const key = toIsoDate(weekStartOf(date));
    const bucket = buckets.find((b) => b.weekStart === key);
    if (bucket) bucket.count += 1;
  }
  return buckets;
}
