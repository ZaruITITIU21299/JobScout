"use client";

import {
  closestCorners,
  DndContext,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type Announcements,
  type DragEndEvent,
  type DragOverEvent,
  type UniqueIdentifier,
} from "@dnd-kit/core";
import { sortableKeyboardCoordinates } from "@dnd-kit/sortable";
import { useRef, useState, useTransition } from "react";
import { moveJobCard } from "@/app/(app)/jobs/actions";
import { KanbanColumn } from "@/components/kanban/KanbanColumn";
import { STAGE_LABELS, STAGES } from "@/lib/config";
import { findCard, groupByStage, isStage, moveCard, type Columns } from "@/lib/kanban/board";
import type { JobCard, Stage } from "@/lib/types";

type KanbanBoardProps = {
  initialCards: JobCard[];
};

/** Resolves a drop target (a column id or a card id) to a stage and index. */
function resolveTarget(columns: Columns, overId: UniqueIdentifier): { stage: Stage; index: number } | null {
  if (isStage(overId)) return { stage: overId, index: columns[overId].length };
  return findCard(columns, String(overId));
}

export function KanbanBoard({ initialCards }: KanbanBoardProps) {
  const [columns, setColumns] = useState<Columns>(() => groupByStage(initialCards));
  const [status, setStatus] = useState("");
  const [saving, startSaving] = useTransition();
  // Board state before the current drag, used to roll back if saving fails.
  const snapshot = useRef<Columns | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  function cardLabel(id: UniqueIdentifier) {
    const found = findCard(columns, String(id));
    const card = found ? columns[found.stage][found.index] : undefined;
    return card ? `${card.position} at ${card.companyName}` : "card";
  }

  const announcements: Announcements = {
    onDragStart: ({ active }) => `Picked up ${cardLabel(active.id)}.`,
    onDragOver: ({ active, over }) => {
      const target = over ? resolveTarget(columns, over.id) : null;
      return target ? `${cardLabel(active.id)} is over ${STAGE_LABELS[target.stage]}.` : undefined;
    },
    onDragEnd: ({ active, over }) => {
      const target = over ? resolveTarget(columns, over.id) : null;
      return target ? `Dropped ${cardLabel(active.id)} in ${STAGE_LABELS[target.stage]}.` : "Dropped.";
    },
    onDragCancel: ({ active }) => `Cancelled. ${cardLabel(active.id)} returned to its place.`,
  };

  function persist(cardId: string, stage: Stage, index: number, rollback: Columns) {
    startSaving(async () => {
      const result = await moveJobCard(cardId, stage, index);
      if (result.error) {
        setColumns(rollback);
        setStatus(`Could not save the move: ${result.error.message} The card was put back.`);
      } else {
        setStatus(`Saved: moved to ${STAGE_LABELS[stage]}.`);
      }
    });
  }

  function handleDragStart() {
    snapshot.current = columns;
    setStatus("");
  }

  // Moving between columns while dragging, so the card previews in its new column.
  function handleDragOver({ active, over }: DragOverEvent) {
    if (!over) return;
    const from = findCard(columns, String(active.id));
    const to = resolveTarget(columns, over.id);
    if (!from || !to || from.stage === to.stage) return;
    setColumns(moveCard(columns, String(active.id), to.stage, to.index));
  }

  function handleDragEnd({ active, over }: DragEndEvent) {
    const before = snapshot.current;
    snapshot.current = null;
    if (!over || !before) {
      if (before) setColumns(before);
      return;
    }

    const cardId = String(active.id);
    const from = findCard(columns, cardId);
    const to = resolveTarget(columns, over.id);
    if (!from || !to) return;

    const next = from.stage === to.stage ? moveCard(columns, cardId, to.stage, to.index) : columns;
    setColumns(next);

    const original = findCard(before, cardId);
    const final = findCard(next, cardId);
    if (!final || (original && original.stage === final.stage && original.index === final.index)) return;
    persist(cardId, final.stage, final.index, before);
  }

  function handleDragCancel() {
    if (snapshot.current) setColumns(snapshot.current);
    snapshot.current = null;
  }

  // Non-drag alternative: the "Move to stage" select puts the card at the end of the chosen column.
  function handleMoveTo(cardId: string, stage: Stage) {
    const before = columns;
    const index = columns[stage].length;
    setColumns(moveCard(columns, cardId, stage, index));
    persist(cardId, stage, index, before);
  }

  return (
    <div className="flex flex-col gap-3">
      <p className="sr-only">
        To move a card with the keyboard, use its stage menu, or focus its drag handle, press Space, use the
        arrow keys, and press Space again to drop.
      </p>
      <div role="status" aria-live="polite" className="min-h-6 text-sm text-muted">
        {saving ? "Saving…" : status}
      </div>
      <DndContext
        id="job-board"
        sensors={sensors}
        collisionDetection={closestCorners}
        accessibility={{ announcements }}
        onDragStart={handleDragStart}
        onDragOver={handleDragOver}
        onDragEnd={handleDragEnd}
        onDragCancel={handleDragCancel}
      >
        <div className="flex gap-3 overflow-x-auto pb-2">
          {STAGES.map((stage) => (
            <KanbanColumn
              key={stage}
              stage={stage}
              cards={columns[stage]}
              onMoveTo={handleMoveTo}
              disabled={saving}
            />
          ))}
        </div>
      </DndContext>
    </div>
  );
}
