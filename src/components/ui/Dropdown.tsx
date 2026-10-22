"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Icon } from "./Icon";
import { cn } from "@/lib/utils";

export type DropdownOption<T extends string> = {
  value: T;
  label: string;
  description?: string;
};

type DropdownProps<T extends string> = {
  value: T;
  options: DropdownOption<T>[];
  onChange: (value: T) => void;
  label?: string;
  className?: string;
};

// Custom select/dropdown (tanpa elemen <select> bawaan).
export function Dropdown<T extends string>({ value, options, onChange, label, className }: DropdownProps<T>) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const current = options.find((o) => o.value === value);

  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [open]);

  return (
    <div className={cn("relative", className)} ref={ref}>
      {label && <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-white/50">{label}</label>}
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={cn(
          "flex w-full items-center justify-between gap-2 rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-left text-sm font-medium text-white transition hover:border-white/25 hover:bg-white/10",
          open && "border-[#ff4d6d]/60 ring-2 ring-[#ff4d6d]/25",
        )}
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        <span>{current?.label ?? "Pilih"}</span>
        <motion.span animate={{ rotate: open ? 180 : 0 }} transition={{ duration: 0.18 }}>
          <Icon name="angle-small-down" size={16} className="text-white/60" />
        </motion.span>
      </button>
      <AnimatePresence>
        {open && (
          <motion.ul
            role="listbox"
            initial={{ opacity: 0, y: -6, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.98 }}
            transition={{ duration: 0.15 }}
            className="absolute z-30 mt-2 w-full overflow-hidden rounded-xl border border-white/10 bg-[#1a1c33] p-1.5 shadow-[0_18px_40px_-10px_rgba(0,0,0,0.6)]"
          >
            {options.map((opt) => (
              <li key={opt.value}>
                <button
                  type="button"
                  role="option"
                  aria-selected={opt.value === value}
                  onClick={() => {
                    onChange(opt.value);
                    setOpen(false);
                  }}
                  className={cn(
                    "flex w-full flex-col rounded-lg px-3 py-2 text-left text-sm transition",
                    opt.value === value ? "bg-[#ff4d6d]/15 text-white" : "text-white/75 hover:bg-white/8 hover:text-white",
                  )}
                >
                  <span className="font-medium">{opt.label}</span>
                  {opt.description && <span className="text-xs text-white/45">{opt.description}</span>}
                </button>
              </li>
            ))}
          </motion.ul>
        )}
      </AnimatePresence>
    </div>
  );
}
