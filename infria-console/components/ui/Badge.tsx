"use client";

import React from "react";

type Variant = "default" | "success" | "warning" | "error" | "info" | "muted" | "accent";
type Size = "sm" | "md";

interface BadgeProps {
  children: React.ReactNode;
  variant?: Variant;
  size?: Size;
  dot?: boolean;
  className?: string;
}

const variantStyles: Record<Variant, string> = {
  default: "bg-bg-elevated text-text-secondary border-border-default",
  success: "bg-status-success-muted text-status-success border-status-success/20",
  warning: "bg-status-warning-muted text-status-warning border-status-warning/20",
  error: "bg-status-error-muted text-status-error border-status-error/20",
  info: "bg-status-info-muted text-status-info border-status-info/20",
  muted: "bg-bg-surface text-text-muted border-border-subtle",
  accent: "bg-accent-muted text-accent border-accent-border",
};

const dotColors: Record<Variant, string> = {
  default: "bg-text-muted",
  success: "bg-status-success",
  warning: "bg-status-warning",
  error: "bg-status-error",
  info: "bg-status-info",
  muted: "bg-text-muted",
  accent: "bg-accent",
};

export function Badge({ children, variant = "default", size = "sm", dot = false, className = "" }: BadgeProps) {
  const sizeClass = size === "sm" ? "px-2 py-0.5 text-xs" : "px-2.5 py-1 text-sm";

  return (
    <span
      className={`inline-flex items-center gap-1.5 font-medium rounded border ${variantStyles[variant]} ${sizeClass} ${className}`}
    >
      {dot && (
        <span
          className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${dotColors[variant]}`}
        />
      )}
      {children}
    </span>
  );
}

export function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; variant: Variant }> = {
    active: { label: "Active", variant: "success" },
    inactive: { label: "Inactive", variant: "muted" },
    draft: { label: "Draft", variant: "muted" },
    processing: { label: "Processing", variant: "warning" },
    ready: { label: "Ready", variant: "success" },
    failed: { label: "Failed", variant: "error" },
    archived: { label: "Archived", variant: "muted" },
    revoked: { label: "Revoked", variant: "error" },
  };
  const { label, variant } = map[status] ?? { label: status, variant: "default" };
  return <Badge variant={variant} dot>{label}</Badge>;
}
