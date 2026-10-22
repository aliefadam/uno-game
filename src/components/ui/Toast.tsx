"use client";

import { createContext, useCallback, useContext, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "framer-motion";
import { Icon } from "./Icon";
import type { ToastVariant } from "@/lib/types";
import { randomId } from "@/lib/utils";

type ToastItem = {
  id: string;
  message: string;
  variant: ToastVariant;
};

type ToastContextValue = {
  show: (message: string, variant?: ToastVariant) => void;
};

const ToastContext = createContext<ToastContextValue | null>(null);

const ICONS: Record<ToastVariant, string> = {
  default: "info",
  success: "check",
  error: "triangle-warning",
  warning: "exclamation",
};

const RING: Record<ToastVariant, string> = {
  default: "border-white/15 text-white",
  success: "border-emerald-400/40 text-emerald-300",
  error: "border-rose-400/40 text-rose-300",
  warning: "border-amber-400/40 text-amber-300",
};

export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([]);

  const show = useCallback((message: string, variant: ToastVariant = "default") => {
    const id = randomId("toast");
    setItems((prev) => [...prev, { id, message, variant }]);
    setTimeout(() => {
      setItems((prev) => prev.filter((t) => t.id !== id));
    }, 3600);
  }, []);

  const value = useMemo(() => ({ show }), [show]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      {typeof document !== "undefined" &&
        createPortal(
          <div className="pointer-events-none fixed inset-x-0 top-4 z-[200] flex flex-col items-center gap-2 px-4 sm:top-6">
            <AnimatePresence>
              {items.map((t) => (
                <motion.div
                  key={t.id}
                  layout
                  initial={{ opacity: 0, y: -20, scale: 0.9 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -14, scale: 0.95 }}
                  transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
                  className={`pointer-events-auto flex max-w-sm items-center gap-2.5 rounded-2xl border bg-[#13152a]/95 px-4 py-3 text-sm font-medium shadow-[0_20px_40px_-12px_rgba(0,0,0,0.6)] backdrop-blur ${RING[t.variant]}`}
                >
                  <Icon name={ICONS[t.variant]} solid size={18} />
                  <span className="text-white/90">{t.message}</span>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>,
          document.body,
        )}
    </ToastContext.Provider>
  );
}

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast harus dipakai di dalam ToastProvider");
  return ctx;
}
