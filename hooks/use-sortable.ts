"use client";

import { useState, useMemo } from "react";

export type SortDirection = "asc" | "desc";

export interface SortConfig<T> {
  defaultKey: string;
  defaultDirection: SortDirection;
  sortFns: Record<string, (a: T, b: T) => number>;
}

export interface SortState {
  sortKey: string;
  direction: SortDirection;
}

export function useSortable<T>(items: T[], config: SortConfig<T>) {
  const [state, setState] = useState<SortState>({
    sortKey: config.defaultKey,
    direction: config.defaultDirection,
  });

  const sorted = useMemo(() => {
    const fn = config.sortFns[state.sortKey];
    if (!fn) return items;
    const result = [...items].sort(fn);
    return state.direction === "desc" ? result.reverse() : result;
  }, [items, state.sortKey, state.direction, config.sortFns]);

  function toggleSort(key: string) {
    setState((prev) => {
      if (prev.sortKey === key) {
        return { ...prev, direction: prev.direction === "asc" ? "desc" : "asc" };
      }
      return { sortKey: key, direction: "asc" };
    });
  }

  return { sorted, sortKey: state.sortKey, direction: state.direction, toggleSort };
}
