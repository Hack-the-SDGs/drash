"use client";

import { useState, useCallback, useEffect, useRef } from "react";

/**
 * File-manager-style selection hook.
 *
 * - Ctrl/Cmd + click → toggle single item
 * - Shift + click → range select (from last anchor to current)
 * - Regular click → no selection change (normal navigation)
 * - Escape → clear selection
 */
export function useSelection(orderedIds: string[]) {
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const anchorRef = useRef<string | null>(null);

  // Clear stale selections when the visible list changes
  useEffect(() => {
    setSelected((prev) => {
      const idSet = new Set(orderedIds);
      const next = new Set<string>();
      for (const id of prev) {
        if (idSet.has(id)) next.add(id);
      }
      if (next.size === prev.size) return prev;
      return next;
    });
  }, [orderedIds]);

  // ESC to clear
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape" && selected.size > 0) {
        setSelected(new Set());
        anchorRef.current = null;
      }
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [selected.size]);

  /**
   * Call this from a row's onClick handler, passing the native event.
   * Returns true if the click was consumed by selection (caller should
   * preventDefault / skip navigation).
   */
  const handleClick = useCallback(
    (id: string, e: React.MouseEvent) => {
      const isCtrl = e.metaKey || e.ctrlKey;
      const isShift = e.shiftKey;

      if (!isCtrl && !isShift) return false; // normal click – not consumed

      e.preventDefault();

      if (isCtrl) {
        setSelected((prev) => {
          const next = new Set(prev);
          if (next.has(id)) next.delete(id);
          else next.add(id);
          return next;
        });
        anchorRef.current = id;
        return true;
      }

      if (isShift) {
        const anchor = anchorRef.current;
        if (!anchor) {
          // no anchor yet – treat as single select
          setSelected(new Set([id]));
          anchorRef.current = id;
          return true;
        }
        const startIdx = orderedIds.indexOf(anchor);
        const endIdx = orderedIds.indexOf(id);
        if (startIdx === -1 || endIdx === -1) return true;
        const lo = Math.min(startIdx, endIdx);
        const hi = Math.max(startIdx, endIdx);
        const range = orderedIds.slice(lo, hi + 1);
        setSelected((prev) => {
          const next = new Set(prev);
          for (const rid of range) next.add(rid);
          return next;
        });
        return true;
      }

      return false;
    },
    [orderedIds],
  );

  const clearSelection = useCallback(() => {
    setSelected(new Set());
    anchorRef.current = null;
  }, []);

  return { selected, handleClick, clearSelection };
}
