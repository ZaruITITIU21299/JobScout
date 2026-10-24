import { STAGES } from "@/lib/config";
import type { JobCard, Stage } from "@/lib/types";

// Pure Kanban state logic (no React, no network) so it can be unit-tested.

export type Columns = Record<Stage, JobCard[]>;

export function isStage(value: unknown): value is Stage {
  return typeof value === "string" && (STAGES as readonly string[]).includes(value);
}

export function groupByStage(cards: JobCard[]): Columns {
  const columns: Columns = { saved: [], applied: [], interview: [], offer: [], rejected: [] };
  for (const card of cards) columns[card.stage].push(card);
  for (const stage of STAGES) columns[stage].sort((a, b) => a.sortOrder - b.sortOrder);
  return columns;
}

export function findCard(columns: Columns, cardId: string): { stage: Stage; index: number } | null {
  for (const stage of STAGES) {
    const index = columns[stage].findIndex((card) => card.id === cardId);
    if (index !== -1) return { stage, index };
  }
  return null;
}

function renumber(cards: JobCard[], stage: Stage): JobCard[] {
  return cards.map((card, index) => ({ ...card, stage, sortOrder: index }));
}

/**
 * Moves a card to `toStage` at `toIndex` (clamped), returning new columns.
 * `toIndex` counts the other cards in the target column, which matches public.move_job_card.
 */
export function moveCard(columns: Columns, cardId: string, toStage: Stage, toIndex: number): Columns {
  const from = findCard(columns, cardId);
  if (!from) return columns;

  const card = columns[from.stage][from.index];
  if (!card) return columns;

  const source = columns[from.stage].filter((c) => c.id !== cardId);
  const target = from.stage === toStage ? source : [...columns[toStage]];
  const index = Math.max(0, Math.min(toIndex, target.length));
  target.splice(index, 0, card);

  return {
    ...columns,
    [from.stage]: renumber(source, from.stage),
    [toStage]: renumber(target, toStage),
  };
}
