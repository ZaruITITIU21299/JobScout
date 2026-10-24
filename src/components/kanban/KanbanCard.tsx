"use client";

import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import Link from "next/link";
import { STAGE_LABELS, STAGES } from "@/lib/config";
import { formatIsoDate } from "@/lib/dates";
import type { JobCard, Stage } from "@/lib/types";

type KanbanCardProps = {
  card: JobCard;
  onMoveTo: (cardId: string, stage: Stage) => void;
  disabled: boolean;
};

export function KanbanCard({ card, onMoveTo, disabled }: KanbanCardProps) {
  const { attributes, listeners, setNodeRef, setActivatorNodeRef, transform, transition, isDragging } = useSortable({
    id: card.id,
  });
  const selectId = `move-${card.id}`;

  return (
    <li
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={`flex flex-col gap-2 border border-border bg-surface-raised p-3 ${
        isDragging ? "relative z-10 border-accent opacity-80" : "hover:border-accent-dim"
      }`}
    >
      <div className="flex items-start gap-2">
        <button
          type="button"
          ref={setActivatorNodeRef}
          {...attributes}
          {...listeners}
          aria-label={`Drag ${card.position} at ${card.companyName}`}
          className="flex min-h-10 min-w-8 cursor-grab touch-none items-center justify-center border border-border font-mono text-muted hover:text-accent active:cursor-grabbing"
        >
          <span aria-hidden="true">⋮⋮</span>
        </button>
        <div className="min-w-0 flex-1">
          <Link
            href={`/jobs/${card.id}`}
            className="block font-semibold leading-snug text-text underline-offset-4 hover:text-accent hover:underline"
          >
            {card.position}
          </Link>
          <p className="truncate text-sm text-muted">{card.companyName}</p>
        </div>
      </div>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="font-mono text-xs text-muted">
          <span className="sr-only">Applied </span>
          {formatIsoDate(card.appliedAt)}
        </p>
        <div className="flex items-center gap-1">
          <label htmlFor={selectId} className="sr-only">
            Move {card.position} to stage
          </label>
          <select
            id={selectId}
            value={card.stage}
            disabled={disabled}
            onChange={(e) => {
              const stage = STAGES.find((s) => s === e.target.value);
              if (stage && stage !== card.stage) onMoveTo(card.id, stage);
            }}
            className="min-h-9 border border-border bg-bg px-2 text-sm text-text"
          >
            {STAGES.map((stage) => (
              <option key={stage} value={stage}>
                {STAGE_LABELS[stage]}
              </option>
            ))}
          </select>
        </div>
      </div>
    </li>
  );
}
