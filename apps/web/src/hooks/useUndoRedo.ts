import { useEffect, useRef, useState } from "react";

interface UseUndoRedoOptions {
  debounceMs?: number;
  maxHistory?: number;
}

/**
 * Generic snapshot-based undo/redo. Watches `value` (pass a memoized object
 * so its reference only changes when something meaningful does) and, after a
 * short debounce, pushes the *previous* value onto the history stack so each
 * burst of rapid edits collapses into a single undo step. `onApply` is
 * called to restore a snapshot (e.g. write it back into a store).
 */
export function useUndoRedo<T>(
  value: T | undefined,
  onApply: (snapshot: T) => void,
  { debounceMs = 400, maxHistory = 100 }: UseUndoRedoOptions = {},
) {
  const historyRef = useRef<T[]>([]);
  const futureRef = useRef<T[]>([]);
  const isApplyingRef = useRef(false);
  const lastSnapshotRef = useRef<string>("");
  const [, forceRender] = useState(0);
  const bumpUI = () => forceRender((n) => n + 1);

  useEffect(() => {
    if (value === undefined) return;
    if (isApplyingRef.current) {
      isApplyingRef.current = false;
      return;
    }
    const serialized = JSON.stringify(value);
    if (serialized === lastSnapshotRef.current) return;
    // debounce: collapse rapid changes into one entry
    const t = setTimeout(() => {
      historyRef.current.push(JSON.parse(lastSnapshotRef.current || serialized));
      if (historyRef.current.length > maxHistory) historyRef.current.shift();
      lastSnapshotRef.current = serialized;
      futureRef.current = [];
      bumpUI();
    }, debounceMs);
    return () => clearTimeout(t);
  }, [value, debounceMs, maxHistory]);

  const applySnapshot = (snap: T) => {
    isApplyingRef.current = true;
    onApply(snap);
    lastSnapshotRef.current = JSON.stringify(snap);
  };

  const undo = () => {
    if (value === undefined || historyRef.current.length === 0) return;
    const prev = historyRef.current.pop()!;
    futureRef.current.push(value);
    applySnapshot(prev);
    bumpUI();
  };

  const redo = () => {
    if (value === undefined || futureRef.current.length === 0) return;
    const next = futureRef.current.pop()!;
    historyRef.current.push(value);
    applySnapshot(next);
    bumpUI();
  };

  return {
    undo,
    redo,
    canUndo: historyRef.current.length > 0,
    canRedo: futureRef.current.length > 0,
  };
}
