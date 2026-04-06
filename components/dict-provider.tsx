"use client";

import { createContext, useContext } from "react";

type Dictionary = Awaited<
  ReturnType<typeof import("@/lib/dictionaries").getDictionary>
>;

const DictContext = createContext<Dictionary | null>(null);

export function DictProvider({
  dict,
  children,
}: {
  dict: Dictionary;
  children: React.ReactNode;
}) {
  return <DictContext value={dict}>{children}</DictContext>;
}

export function useDict(): Dictionary {
  const dict = useContext(DictContext);
  if (!dict) {
    throw new Error("useDict must be used within a DictProvider");
  }
  return dict;
}
