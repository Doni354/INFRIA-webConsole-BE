"use client";

import React, { useState, useRef, useEffect } from "react";
import { aiService } from "@/services/ai.service";
import { runtimeTestService } from "@/services/runtime-test.service";
import { PlaygroundMessage } from "@/types";
import { Button } from "@/components/ui/Button";
import { Send, Bot, User, Loader2 } from "lucide-react";

function generateId() {
  return Math.random().toString(36).slice(2);
}

export function Playground({ projectId }: { projectId: string }) {
  const [sessionId] = useState(() =>
    runtimeTestService.newSessionId("dashboard")
  );
  const [messages, setMessages] = useState<PlaygroundMessage[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [assistantName, setAssistantName] = useState("INFRIA Assistant");
  const [error, setError] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    aiService.get(projectId).then((cfg) => {
      setAssistantName(cfg.assistantName);
    }).catch(() => {});
  }, [projectId]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, loading]);

  async function handleSend() {
    const text = input.trim();
    if (!text || loading) return;
    setInput("");
    setError(null);

    const userMsg: PlaygroundMessage = {
      id: generateId(),
      role: "user",
      content: text,
      timestamp: new Date().toISOString(),
    };
    setMessages((m) => [...m, userMsg]);
    setLoading(true);

    try {
      const result = await runtimeTestService.sendMessage({
        projectId,
        sessionId,
        message: text,
        source: "DASHBOARD", // Dashboard playground tagged as DASHBOARD
      });

      const route =
        result.type === "function_call"
          ? "FUNCTION"
          : result.__trace?.ragChunksInjected && result.__trace.ragChunksInjected > 0
          ? "RAG"
          : "DIRECT";

      const aiMsg: PlaygroundMessage = {
        id: generateId(),
        role: "assistant",
        content:
          result.type === "function_call"
            ? `[Function Call] AI requested: \`${result.data.function}\``
            : result.data.content ?? "No response.",
        timestamp: new Date().toISOString(),
        metadata: {
          route: route as NonNullable<PlaygroundMessage["metadata"]>["route"],
          requestId: result.requestId,
          sources: result.__trace?.ragChunksInjected,
          functionCall:
            result.type === "function_call"
              ? {
                  name: result.data.function ?? "",
                  args: result.data.args ?? {},
                }
              : undefined,
        },
      };
      setMessages((m) => [...m, aiMsg]);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to reach backend.";
      setError(msg);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="bg-bg-surface flex flex-col w-full h-full flex-1 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border-subtle flex-shrink-0">
        <div className="flex items-center gap-2">
          <div className="w-5 h-5 rounded bg-accent-muted border border-accent-border flex items-center justify-center">
            <Bot className="w-3 h-3 text-accent" />
          </div>
          <span className="text-sm font-semibold text-text-primary">
            Quick AI Test
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-1.5 h-1.5 rounded-full bg-accent" />
          <span className="text-xs text-text-muted">Source: DASHBOARD</span>
        </div>
      </div>

      {/* Messages */}
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto px-4 py-3 space-y-3"
      >
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full gap-2 text-center py-8">
            <div className="flex gap-1.5 mb-1">
              {[0, 1, 2].map((i) => (
                <div
                  key={i}
                  className="w-2 h-2 rounded-full bg-accent/25"
                />
              ))}
            </div>
            <p className="text-sm text-text-muted">
              Ask something to test your AI.
            </p>
            <p className="text-xs text-text-muted opacity-60">
              {assistantName} is ready.
            </p>
          </div>
        )}

        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex gap-2.5 ${
              msg.role === "user" ? "justify-end" : ""
            }`}
          >
            {msg.role === "assistant" && (
              <div className="w-6 h-6 rounded-full bg-accent-muted border border-accent-border flex items-center justify-center flex-shrink-0 mt-0.5">
                <Bot className="w-3.5 h-3.5 text-accent" />
              </div>
            )}
            <div className={`max-w-[80%] ${msg.role === "user" ? "order-1" : ""}`}>
              <div
                className={`px-3 py-2 rounded-lg text-sm leading-relaxed ${
                  msg.role === "user"
                    ? "bg-accent text-white"
                    : "bg-bg-elevated border border-border-default text-text-primary"
                }`}
              >
                {msg.metadata?.functionCall ? (
                  <div className="space-y-1">
                    <div className="text-xs font-semibold text-status-warning">
                      ⚡ Function Call
                    </div>
                    <code className="text-xs font-mono block">
                      {msg.metadata.functionCall.name}
                    </code>
                    <pre className="text-xs font-mono text-text-muted bg-bg-surface rounded px-2 py-1 mt-1 overflow-auto">
                      {JSON.stringify(msg.metadata.functionCall.args, null, 2)}
                    </pre>
                  </div>
                ) : (
                  msg.content
                )}
              </div>
              {msg.role === "assistant" && msg.metadata && (
                <div className="flex items-center gap-2 mt-1 px-1 flex-wrap">
                  {msg.metadata.route && (
                    <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-accent-muted text-accent uppercase">
                      {msg.metadata.route}
                    </span>
                  )}
                  {msg.metadata.sources != null && msg.metadata.sources > 0 && (
                    <span className="text-[10px] text-text-muted">
                      {msg.metadata.sources} source{msg.metadata.sources > 1 ? "s" : ""}
                    </span>
                  )}
                  {msg.metadata.requestId && (
                    <span className="text-[10px] font-mono text-text-muted">
                      {msg.metadata.requestId.slice(0, 10)}…
                    </span>
                  )}
                </div>
              )}
            </div>
            {msg.role === "user" && (
              <div className="w-6 h-6 rounded-full bg-bg-elevated border border-border-default flex items-center justify-center flex-shrink-0 mt-0.5">
                <User className="w-3.5 h-3.5 text-text-muted" />
              </div>
            )}
          </div>
        ))}

        {loading && (
          <div className="flex gap-2.5">
            <div className="w-6 h-6 rounded-full bg-accent-muted border border-accent-border flex items-center justify-center flex-shrink-0">
              <Bot className="w-3.5 h-3.5 text-accent" />
            </div>
            <div className="bg-bg-elevated border border-border-default rounded-lg px-3 py-2.5">
              <div className="flex gap-1">
                {[0, 1, 2].map((i) => (
                  <div
                    key={i}
                    className="w-1.5 h-1.5 rounded-full bg-accent animate-bounce"
                    style={{ animationDelay: `${i * 0.15}s` }}
                  />
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Error banner */}
      {error && (
        <div className="mx-3 mb-2 px-3 py-2 rounded-md bg-status-error/10 border border-status-error/30 text-xs text-status-error">
          {error}
        </div>
      )}

      {/* Input */}
      <div className="px-3 pb-3 pt-2 border-t border-border-subtle flex-shrink-0">
        <div className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && handleSend()}
            placeholder="Ask something..."
            className="flex-1 h-8 px-3 bg-bg-elevated border border-border-default rounded text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent transition-colors"
          />
          <Button
            variant="primary"
            size="sm"
            onClick={handleSend}
            loading={loading}
            icon={loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
          >
            Send
          </Button>
        </div>
      </div>
    </div>
  );
}
