"use client";

import { useDroppable } from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { KanbanCard } from "@/components/kanban/KanbanCard";
import { STAGE_LABELS } from "@/lib/config";
import type { JobCard, Stage } from "@/lib/types";

type KanbanColumnProps = {
  stage: Stage;
  cards: JobCard[];
  onMoveTo: (cardId: string, stage: Stage) => void;
  disabled: boolean;
};

export function KanbanColumn({ stage, cards, onMoveTo, disabled }: KanbanColumnProps) {
  const { setNodeRef, isOver } = useDroppable({ id: stage });
  const headingId = `column-${stage}`;

  return (
    <section
      aria-labelledby={headingId}
      className={`flex min-w-64 flex-1 flex-col border bg-surface ${isOver ? "border-accent" : "border-border"}`}
    >
      <header className="flex items-center justify-between border-b border-border px-3 py-2">
        <h2 id={headingId} className="font-display text-lg font-semibold uppercase tracking-wider">
          {STAGE_LABELS[stage]}
        </h2>
        <span className="font-mono text-xs text-muted">
          {cards.length}
          <span className="sr-only"> cards</span>
        </span>
      </header>
      <SortableContext items={cards.map((c) => c.id)} strategy={verticalListSortingStrategy}>
        <ul ref={setNodeRef} className="flex min-h-32 flex-1 flex-col gap-2 p-2">
          {cards.map((card) => (
            <KanbanCard key={card.id} card={card} onMoveTo={onMoveTo} disabled={disabled} />
          ))}
          {cards.length === 0 ? (
            <li className="border border-dashed border-border px-3 py-6 text-center text-sm text-muted">
              No cards. Drop one here.
            </li>
          ) : null}
        </ul>
      </SortableContext>
    </section>
  );
}
