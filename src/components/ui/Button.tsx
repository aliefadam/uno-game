"use client";

import { forwardRef } from "react";
import type { ButtonHTMLAttributes, ReactNode } from "react";
import { motion, type HTMLMotionProps } from "framer-motion";
import { cn } from "@/lib/utils";
import { sfx } from "@/lib/sound";

type Variant = "primary" | "secondary" | "ghost" | "danger" | "outline";
type Size = "sm" | "md" | "lg" | "icon";

type ButtonProps = {
  variant?: Variant;
  size?: Size;
  icon?: ReactNode;
  iconRight?: ReactNode;
  loading?: boolean;
  fullWidth?: boolean;
  silent?: boolean;
} & Omit<
  ButtonHTMLAttributes<HTMLButtonElement>,
  "color" | "onDrag" | "onDragStart" | "onDragEnd" | "onAnimationStart" | "onAnimationEnd" | "onAnimationIteration"
> &
  Pick<HTMLMotionProps<"button">, "whileTap" | "whileHover">;

const base =
  "relative inline-flex select-none items-center justify-center gap-2 rounded-2xl font-semibold transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-[#0b0d1a] disabled:cursor-not-allowed disabled:opacity-50 whitespace-nowrap";

const variants: Record<Variant, string> = {
  primary:
    "bg-gradient-to-br from-[#ff4d6d] to-[#ff8a3d] text-white shadow-[0_8px_24px_-6px_rgba(255,77,109,0.55)] hover:brightness-110 focus-visible:ring-[#ff4d6d]",
  secondary:
    "bg-white/10 text-white backdrop-blur hover:bg-white/15 border border-white/10 focus-visible:ring-white/40",
  outline:
    "bg-transparent text-white border border-white/25 hover:bg-white/10 focus-visible:ring-white/40",
  ghost: "bg-transparent text-white/80 hover:bg-white/10 hover:text-white focus-visible:ring-white/30",
  danger:
    "bg-gradient-to-br from-rose-600 to-rose-500 text-white shadow-[0_8px_20px_-6px_rgba(225,29,72,0.6)] hover:brightness-110 focus-visible:ring-rose-400",
};

const sizes: Record<Size, string> = {
  sm: "h-9 px-3.5 text-sm",
  md: "h-11 px-5 text-[0.95rem]",
  lg: "h-14 px-7 text-base",
  icon: "h-10 w-10 p-0",
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { className, variant = "primary", size = "md", icon, iconRight, loading, fullWidth, silent, children, onClick, ...props },
  ref,
) {
  return (
    <motion.button
      ref={ref}
      whileTap={{ scale: 0.96 }}
      whileHover={{ scale: 1.015 }}
      transition={{ duration: 0.12 }}
      className={cn(base, variants[variant], sizes[size], fullWidth && "w-full", className)}
      onClick={(e) => {
        if (!silent) sfx.click();
        onClick?.(e);
      }}
      {...props}
    >
      {loading ? (
        <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />
      ) : (
        icon
      )}
      {children && <span>{children}</span>}
      {iconRight}
    </motion.button>
  );
});
