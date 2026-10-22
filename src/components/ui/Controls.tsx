"use client";

import { forwardRef } from "react";
import type { InputHTMLAttributes, ReactNode } from "react";
import { motion } from "framer-motion";
import { cn, initials, pickColorForName } from "@/lib/utils";
import { Icon } from "./Icon";

// ---------------------------------------------------------------------
// TextField — input teks custom (tetap pakai <input> native di bawahnya
// karena itu satu-satunya elemen yang bisa menerima keyboard/IME dengan
// benar, tetapi seluruh styling & perilaku dibungkus komponen sendiri).
// ---------------------------------------------------------------------
type TextFieldProps = {
  label?: string;
  hint?: string;
  icon?: string;
} & InputHTMLAttributes<HTMLInputElement>;

export const TextField = forwardRef<HTMLInputElement, TextFieldProps>(function TextField(
  { label, hint, icon, className, ...props },
  ref,
) {
  return (
    <label className="block">
      {label && <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-white/50">{label}</span>}
      <span className="relative flex items-center">
        {icon && <Icon name={icon} size={16} className="pointer-events-none absolute left-4 text-white/40" />}
        <input
          ref={ref}
          className={cn(
            "h-12 w-full rounded-xl border border-white/10 bg-white/5 px-4 text-sm font-medium text-white placeholder:text-white/35 outline-none transition focus:border-[#ff4d6d]/60 focus:ring-2 focus:ring-[#ff4d6d]/25",
            icon && "pl-10",
            className,
          )}
          {...props}
        />
      </span>
      {hint && <span className="mt-1.5 block text-xs text-white/40">{hint}</span>}
    </label>
  );
});

// ---------------------------------------------------------------------
// Toggle — custom switch (bukan <input type="checkbox">)
// ---------------------------------------------------------------------
export function Toggle({
  checked,
  onChange,
  disabled,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={cn(
        "relative h-7 w-12 shrink-0 rounded-full transition-colors duration-200 disabled:opacity-40",
        checked ? "bg-gradient-to-r from-[#ff4d6d] to-[#ff8a3d]" : "bg-white/15",
      )}
    >
      <motion.span
        layout
        transition={{ type: "spring", stiffness: 500, damping: 32 }}
        className="absolute top-1 h-5 w-5 rounded-full bg-white shadow"
        style={{ left: checked ? "calc(100% - 24px)" : "4px" }}
      />
    </button>
  );
}

// ---------------------------------------------------------------------
// NumberStepper — pengganti <input type="number">
// ---------------------------------------------------------------------
export function NumberStepper({
  value,
  min,
  max,
  onChange,
  label,
}: {
  value: number;
  min: number;
  max: number;
  onChange: (v: number) => void;
  label?: string;
}) {
  return (
    <div>
      {label && <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-white/50">{label}</span>}
      <div className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/5 p-1.5">
        <button
          type="button"
          disabled={value <= min}
          onClick={() => onChange(Math.max(min, value - 1))}
          className="flex h-9 w-9 items-center justify-center rounded-lg bg-white/5 text-white transition hover:bg-white/15 disabled:opacity-30"
        >
          <Icon name="minus-small" size={16} />
        </button>
        <span className="flex-1 text-center text-lg font-extrabold tabular-nums text-white">{value}</span>
        <button
          type="button"
          disabled={value >= max}
          onClick={() => onChange(Math.min(max, value + 1))}
          className="flex h-9 w-9 items-center justify-center rounded-lg bg-white/5 text-white transition hover:bg-white/15 disabled:opacity-30"
        >
          <Icon name="plus-small" size={16} />
        </button>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------
// SegmentedControl — pengganti radio-group/select untuk pilihan singkat
// ---------------------------------------------------------------------
export function SegmentedControl<T extends string>({
  value,
  options,
  onChange,
}: {
  value: T;
  options: { value: T; label: string }[];
  onChange: (v: T) => void;
}) {
  return (
    <div className="inline-flex rounded-xl border border-white/10 bg-white/5 p-1">
      {options.map((opt) => (
        <button
          key={opt.value}
          type="button"
          onClick={() => onChange(opt.value)}
          className={cn(
            "relative rounded-lg px-3.5 py-1.5 text-sm font-semibold transition",
            value === opt.value ? "text-white" : "text-white/50 hover:text-white/80",
          )}
        >
          {value === opt.value && (
            <motion.span
              layoutId="segmented-pill"
              className="absolute inset-0 rounded-lg bg-gradient-to-br from-[#ff4d6d] to-[#ff8a3d]"
              transition={{ type: "spring", stiffness: 500, damping: 34 }}
            />
          )}
          <span className="relative">{opt.label}</span>
        </button>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------
// Avatar
// ---------------------------------------------------------------------
export function Avatar({ name, size = 40, className }: { name: string; size?: number; className?: string }) {
  const bg = pickColorForName(name || "?");
  return (
    <span
      className={cn("flex shrink-0 items-center justify-center rounded-full font-extrabold text-white shadow-inner", className)}
      style={{ width: size, height: size, background: bg, fontSize: size * 0.38 }}
    >
      {initials(name)}
    </span>
  );
}

// ---------------------------------------------------------------------
// Badge
// ---------------------------------------------------------------------
export function Badge({ children, tone = "default" }: { children: ReactNode; tone?: "default" | "host" | "success" | "warning" }) {
  const tones: Record<string, string> = {
    default: "bg-white/10 text-white/70",
    host: "bg-gradient-to-r from-amber-400 to-orange-400 text-[#2a1800]",
    success: "bg-emerald-400/20 text-emerald-300",
    warning: "bg-amber-400/20 text-amber-300",
  };
  return <span className={cn("rounded-full px-2.5 py-1 text-[0.65rem] font-bold uppercase tracking-wide", tones[tone])}>{children}</span>;
}
