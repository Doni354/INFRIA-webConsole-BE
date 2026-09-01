"use client";

import React, { useState } from "react";
import { Check, Copy } from "lucide-react";

interface CodeBlockProps {
  code: string;
  language?: string;
  filename?: string;
  showCopy?: boolean;
}

export function CodeBlock({
  code,
  language = "bash",
  filename,
  showCopy = true,
}: CodeBlockProps) {
  const [copied, setCopied] = useState(false);

  function handleCopy() {
    navigator.clipboard.writeText(code).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  return (
    <div className="rounded-md border border-border-default overflow-hidden">
      {(filename || showCopy) && (
        <div className="flex items-center justify-between px-3 py-1.5 bg-bg-elevated border-b border-border-default">
          <span className="text-xs text-text-muted font-mono">
            {filename ?? language}
          </span>
          {showCopy && (
            <button
              onClick={handleCopy}
              className="flex items-center gap-1 text-xs text-text-muted hover:text-text-primary transition-colors cursor-pointer"
            >
              {copied ? (
                <>
                  <Check className="w-3 h-3 text-status-success" />
                  <span className="text-status-success">Copied</span>
                </>
              ) : (
                <>
                  <Copy className="w-3 h-3" />
                  <span>Copy</span>
                </>
              )}
            </button>
          )}
        </div>
      )}
      <pre className="p-4 bg-bg-surface overflow-x-auto text-xs font-mono text-text-primary leading-relaxed">
        <code>{code}</code>
      </pre>
    </div>
  );
}
