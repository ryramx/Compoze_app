import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useUndoRedo } from "./useUndoRedo";

describe("useUndoRedo", () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it("supports undo/redo across debounced changes", () => {
    let current: { text: string } = { text: "a" };
    const onApply = vi.fn((snap: { text: string }) => {
      current = snap;
    });

    const { result, rerender } = renderHook(
      ({ value }) => useUndoRedo(value, onApply, { debounceMs: 100 }),
      { initialProps: { value: current } },
    );

    act(() => {
      vi.advanceTimersByTime(100);
    });

    current = { text: "b" };
    rerender({ value: current });
    act(() => {
      vi.advanceTimersByTime(100);
    });

    expect(result.current.canUndo).toBe(true);

    act(() => {
      result.current.undo();
    });
    expect(onApply).toHaveBeenCalledWith({ text: "a" });
    expect(result.current.canRedo).toBe(true);

    act(() => {
      result.current.redo();
    });
    expect(onApply).toHaveBeenLastCalledWith({ text: "b" });
  });

  it("caps the history stack at maxHistory entries", () => {
    let current = { n: 0 };
    const onApply = vi.fn((snap: { n: number }) => {
      current = snap;
    });

    const { result, rerender } = renderHook(
      ({ value }) => useUndoRedo(value, onApply, { debounceMs: 10, maxHistory: 2 }),
      { initialProps: { value: current } },
    );
    act(() => {
      vi.advanceTimersByTime(10);
    });

    for (let i = 1; i <= 5; i++) {
      current = { n: i };
      rerender({ value: current });
      act(() => {
        vi.advanceTimersByTime(10);
      });
    }

    let undoCount = 0;
    while (result.current.canUndo && undoCount < 10) {
      act(() => {
        result.current.undo();
      });
      undoCount++;
    }
    expect(undoCount).toBeLessThanOrEqual(2);
  });
});
