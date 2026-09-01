"use client";

import React, { useEffect, useState } from "react";
import { Check, Info, AlertTriangle, X, XCircle } from "lucide-react";

type ToastType = "success" | "error" | "warning" | "info";

interface Toast {
  id: string;
  message: string;
  type: ToastType;
}

let toastRef: ((t: Toast) => void) | null = null;

export function showToast(message: string, type: ToastType = "success") {
  if (toastRef) {
    toastRef({ id: Date.now().toString(), message, type });
  }
}

const icons: Record<ToastType, React.ReactNode> = {
  success: <Check className="w-4 h-4 text-status-success" />,
  error: <XCircle className="w-4 h-4 text-status-error" />,
  warning: <AlertTriangle className="w-4 h-4 text-status-warning" />,
  info: <Info className="w-4 h-4 text-status-info" />,
};

const borders: Record<ToastType, string> = {
  success: "border-l-status-success",
  error: "border-l-status-error",
  warning: "border-l-status-warning",
  info: "border-l-status-info",
};

export function ToastProvider() {
  const [toasts, setToasts] = useState<Toast[]>([]);

  useEffect(() => {
    toastRef = (t: Toast) => {
      setToasts((prev) => [...prev, t]);
      setTimeout(() => {
        setToasts((prev) => prev.filter((x) => x.id !== t.id));
      }, 3500);
    };
    return () => { toastRef = null; };
  }, []);

  function dismiss(id: string) {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }

  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 max-w-sm w-full">
      {toasts.map((t) => (
        <div
          key={t.id}
          className={`flex items-start gap-3 px-3 py-2.5 bg-bg-elevated border border-border-default
            border-l-2 ${borders[t.type]} rounded-md shadow-lg animate-in slide-in-from-right-5 duration-200`}
        >
          <span className="mt-0.5 flex-shrink-0">{icons[t.type]}</span>
          <span className="text-sm text-text-primary flex-1 leading-snug">{t.message}</span>
          <button onClick={() => dismiss(t.id)} className="text-text-muted hover:text-text-primary mt-0.5 cursor-pointer">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      ))}
    </div>
  );
}
