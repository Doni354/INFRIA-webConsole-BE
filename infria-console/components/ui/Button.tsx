"use client";

import React from "react";
import { Loader2 } from "lucide-react";

type Variant = "primary" | "secondary" | "ghost" | "danger" | "outline";
type Size = "sm" | "md" | "lg";

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  loading?: boolean;
  icon?: React.ReactNode;
}

const variantStyles: Record<Variant, string> = {
  primary:
    "bg-accent hover:bg-accent-hover text-white border-transparent shadow-[0_0_0_1px_rgba(79,142,245,0.3)]",
  secondary:
    "bg-bg-elevated hover:bg-bg-active text-text-primary border-border-default",
  ghost:
    "bg-transparent hover:bg-bg-hover text-text-secondary hover:text-text-primary border-transparent",
  danger:
    "bg-status-error-muted hover:bg-red-900/40 text-status-error border-status-error/30",
  outline:
    "bg-transparent hover:bg-bg-hover text-accent border-accent-border hover:border-accent/50",
};

const sizeStyles: Record<Size, string> = {
  sm: "h-7 px-3 text-xs gap-1.5 rounded",
  md: "h-8 px-3.5 text-sm gap-2 rounded",
  lg: "h-9 px-4 text-sm gap-2 rounded-md",
};

export function Button({
  children,
  variant = "secondary",
  size = "md",
  loading = false,
  icon,
  className = "",
  disabled,
  ...props
}: ButtonProps) {
  return (
    <button
      className={`inline-flex items-center justify-center font-medium border whitespace-nowrap
        transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer
        ${variantStyles[variant]} ${sizeStyles[size]} ${className}`}
      disabled={disabled || loading}
      {...props}
    >
      {loading ? (
        <Loader2 className="w-3.5 h-3.5 animate-spin" />
      ) : icon ? (
        <span className="flex-shrink-0">{icon}</span>
      ) : null}
      {children}
    </button>
  );
}
