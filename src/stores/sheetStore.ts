import type React from "react";
import { create } from "zustand";

export interface SheetEntry {
  key: number;
  visible: boolean;
  onClose: () => void;
  children: React.ReactNode;
}

interface SheetState {
  entries: SheetEntry[];
  register: (entry: SheetEntry) => void;
  unregister: (key: number) => void;
  update: (key: number, updates: Partial<Pick<SheetEntry, "visible" | "children" | "onClose">>) => void;
}

export const useSheetStore = create<SheetState>((set) => ({
  entries: [],
  register: (entry) =>
    set((s) => ({
      entries: [...s.entries.filter((e) => e.key !== entry.key), entry],
    })),
  unregister: (key) =>
    set((s) => ({ entries: s.entries.filter((e) => e.key !== key) })),
  update: (key, updates) =>
    set((s) => ({
      entries: s.entries.map((e) =>
        e.key === key ? { ...e, ...updates } : e,
      ),
    })),
}));

let nextKey = 0;
const activeKeys = new Set<number>();

export function registerSheet(
  visible: boolean,
  onClose: () => void,
  children: React.ReactNode,
): number {
  const key = nextKey++;
  activeKeys.add(key);
  useSheetStore.getState().register({ key, visible, onClose, children });
  return key;
}

export function updateSheet(
  key: number,
  visible: boolean,
  onClose: () => void,
  children: React.ReactNode,
) {
  useSheetStore.getState().update(key, { visible, onClose, children });
}

export function unregisterSheet(key: number) {
  activeKeys.delete(key);
  useSheetStore.getState().unregister(key);
}
