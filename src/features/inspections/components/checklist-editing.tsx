"use client";

import { createContext, use, useCallback, useMemo, useState } from "react";

type ChecklistEditing = {
  /** Checks with an unsaved finding or an unanswered "replace this failure?" question. */
  openEdits: number;
  setEditing: (itemId: string, editing: boolean) => void;
};

const ChecklistEditingContext = createContext<ChecklistEditing | null>(null);

/**
 * Lets the Complete buttons know when a check is mid-edit, so completion (which
 * freezes the checklist) can't silently drop an unsaved finding.
 */
export function ChecklistEditingProvider({ children }: { children: React.ReactNode }) {
  const [editing, setEditingIds] = useState<ReadonlySet<string>>(() => new Set());
  const setEditing = useCallback((itemId: string, isEditing: boolean) => {
    setEditingIds((previous) => {
      if (previous.has(itemId) === isEditing) {
        return previous;
      }
      const next = new Set(previous);
      if (isEditing) {
        next.add(itemId);
      } else {
        next.delete(itemId);
      }
      return next;
    });
  }, []);
  const value = useMemo(() => ({ openEdits: editing.size, setEditing }), [editing, setEditing]);
  return <ChecklistEditingContext value={value}>{children}</ChecklistEditingContext>;
}

export function useChecklistEditing(): ChecklistEditing {
  return use(ChecklistEditingContext) ?? { openEdits: 0, setEditing: () => {} };
}

/** Why Complete is unavailable, or `ready` once it can be used. */
export function CompleteHint({ id, pending, ready }: { id: string; pending: number; ready?: string }) {
  const { openEdits } = useChecklistEditing();
  const text =
    pending > 0
      ? `Record ${pending} more ${pending === 1 ? "check" : "checks"} to complete the inspection.`
      : openEdits > 0
        ? "Save or cancel the open finding to complete the inspection."
        : ready;
  if (!text) {
    return null;
  }
  return (
    <span id={id} className="text-sm text-muted-foreground tabular-nums">
      {text}
    </span>
  );
}
