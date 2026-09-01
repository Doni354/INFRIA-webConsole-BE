"use client";

import React, { ReactNode } from "react";

interface EmptyStateProps {
  icon?: ReactNode;
  title: string;
  description: string;
  action?: ReactNode;
}

export function EmptyState({ icon, title, description, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
      {icon && (
        <div className="w-12 h-12 rounded-xl bg-bg-elevated border border-border-default flex items-center justify-center mb-4 text-text-muted">
          {icon}
        </div>
      )}
      <h3 className="text-base font-semibold text-text-primary mb-1">{title}</h3>
      <p className="text-sm text-text-muted max-w-sm leading-relaxed">{description}</p>
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

interface ErrorStateProps {
  message?: string;
  requestId?: string;
  onRetry?: () => void;
}

export function ErrorState({ message = "Something went wrong.", requestId, onRetry }: ErrorStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
      <div className="w-10 h-10 rounded-lg bg-status-error-muted border border-status-error/20 flex items-center justify-center mb-4">
        <span className="text-status-error text-base">!</span>
      </div>
      <p className="text-sm text-text-primary mb-1">{message}</p>
      {requestId && (
        <p className="text-xs text-text-muted font-mono mb-3">Request ID: {requestId}</p>
      )}
      {onRetry && (
        <button
          onClick={onRetry}
          className="text-xs text-accent hover:underline cursor-pointer"
        >
          Try again
        </button>
      )}
    </div>
  );
}
