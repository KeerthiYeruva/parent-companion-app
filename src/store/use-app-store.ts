"use client";

import dayjs from "dayjs";
import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { db } from "@/lib/db";
import { demoChildren, demoDocuments, demoItems } from "@/lib/seed";
import { deriveStatus } from "@/lib/status";
import type { AppState } from "@/types/domain";

const childColors = ["bg-blue-500", "bg-emerald-500", "bg-amber-500", "bg-rose-500"];

const createId = (prefix: string) => `${prefix}-${crypto.randomUUID()}`;

export const useAppStore = create<AppState>()(
  persist(
    (set, get) => ({
      children: [],
      items: [],
      documents: [],
      importIssues: [],
      selectedChildIds: [],
      addChild: (child) => {
        const colorTag = childColors[get().children.length % childColors.length];
        set((state) => ({
          children: [...state.children, { ...child, id: createId("child"), colorTag }],
        }));
      },
      addItem: (item) => {
        set((state) => ({
          items: [
            ...state.items,
            {
              ...item,
              id: createId("item"),
              status: deriveStatus(item.dueDate),
            },
          ],
        }));
      },
      toggleItemComplete: (id) => {
        set((state) => ({
          items: state.items.map((item) => {
            if (item.id !== id) {
              return item;
            }

            const completedAt = item.completedAt ? undefined : new Date().toISOString();
            return {
              ...item,
              completedAt,
              status: deriveStatus(item.dueDate, completedAt),
            };
          }),
        }));
      },
      addDocument: (document) => {
        const newDoc = {
          ...document,
          id: createId("doc"),
          uploadedAt: dayjs().toISOString(),
        };

        db.documents.put(newDoc).catch(() => {
          // Dexie sync is best-effort for local backups.
        });

        set((state) => ({
          documents: [newDoc, ...state.documents],
        }));
      },
      setSelectedChildIds: (childIds) => {
        set({ selectedChildIds: childIds });
      },
      seedDemoData: () => {
        if (get().children.length > 0) {
          return;
        }

        set({
          children: demoChildren,
          items: demoItems,
          documents: demoDocuments,
          selectedChildIds: demoChildren.map((child) => child.id),
        });
      },
    }),
    {
      name: "parent-companion-store",
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        children: state.children,
        items: state.items,
        documents: state.documents,
        importIssues: state.importIssues,
        selectedChildIds: state.selectedChildIds,
      }),
    },
  ),
);
