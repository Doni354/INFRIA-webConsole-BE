"use client";

import React, { useState, useRef, useEffect } from "react";
import { knowledgeService } from "@/services/knowledge.service";
import { aiService } from "@/services/ai.service";
import { PlaygroundMessage } from "@/types";
import { Button } from "@/components/ui/Button";
import { Send, Bot, User, Maximize2, Zap } from "lucide-react";

function generateId() {
  return Math.random().toString(36).slice(2);
}

function mockAIResponse(query: string, knowledgeList: string[]): PlaygroundMessage["metadata"] & { content: string } {
  const lower = query.toLowerCase();
  const isFunction =
    lower.includes("status") || lower.includes("pesanan") || lower.includes("order");

  if (isFunction) {
    return {
      content: "",
      route: "FUNCTION",
      latencyMs: Math.floor(Math.random() * 400) + 200,
      functionCall: {
        name: "check_order_status",
        args: { orderId: "ORD-" + Math.floor(Math.random() * 9000 + 1000) },
      },
    };
  }

  const matched = knowledgeList.find((k) =>
    k.toLowerCase().split(" ").some((word) => lower.includes(word))
  );

  if (matched) {
    return {
      content: `Berdasarkan knowledge base saya: ${matched}`,
      route: "RAG",
      latencyMs: Math.floor(Math.random() * 800) + 400,
      sources: Math.floor(Math.random() * 3) + 1,
    };
  }

  return {
    content:
      "Maaf, saya tidak memiliki informasi yang cukup untuk menjawab pertanyaan tersebut. Silakan hubungi tim kami untuk bantuan lebih lanjut.",
    route: "DIRECT",
    latencyMs: Math.floor(Math.random() * 300) + 150,
  };
}

export function Playground({ projectId }: { projectId: string }) {
  const [messages, setMessages] = useState<PlaygroundMessage[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [knowledgeTitles, setKnowledgeTitles] = useState<string[]>([]);
  const [assistantName, setAssistantName] = useState("INFRIA Assistant");
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    knowledgeService.list(projectId).then((list) => {
      setKnowledgeTitles(list.filter((k) => k.status === "ready").map((k) => k.title));
    });
    aiService.get(projectId).then((cfg) => {
      setAssistantName(cfg.assistantName);
    });
  }, [projectId]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  async function handleSend() {
    const text = input.trim();
    if (!text || loading) return;
    setInput("");

    const userMsg: PlaygroundMessage = {
      id: generateId(),
      role: "user",
      content: text,
      timestamp: new Date().toISOString(),
    };
    setMessages((m) => [...m, userMsg]);
    setLoading(true);

    await new Promise((r) => setTimeout(r, 400 + Math.random() * 600));

    const { content, ...metadata } = mockAIResponse(text, knowledgeTitles);
    const aiMsg: PlaygroundMessage = {
      id: generateId(),
      role: "assistant",
      content:
        metadata.functionCall
          ? `[Function Call] Executing \`${metadata.functionCall.name}\`...`
          : content,
      timestamp: new Date().toISOString(),
      metadata,
    };
    setMessages((m) => [...m, aiMsg]);
    setLoading(false);
  }

  return (
    <div className="bg-bg-surface border border-border-default rounded-lg flex flex-col w-full h-full flex-1">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border-subtle">
        <div className="flex items-center gap-2">
          <Bot className="w-4 h-4 text-accent" />
          <span className="text-sm font-medium text-text-primary">INFRIA Playground</span>
        </div>
        <span className="text-xs text-text-muted">{assistantName}</span>
      </div>

      {/* Messages */}
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto px-4 py-3 space-y-3"
      >
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full gap-2 text-center">
            <Bot className="w-8 h-8 text-text-muted" />
            <p className="text-sm text-text-muted">Ask something to test your AI configuration.</p>
          </div>
        )}

        {messages.map((msg) => (
          <div key={msg.id} className={`flex gap-2.5 ${msg.role === "user" ? "justify-end" : ""}`}>
            {msg.role === "assistant" && (
              <div className="w-6 h-6 rounded-full bg-accent-muted border border-accent-border flex items-center justify-center flex-shrink-0 mt-0.5">
                <Bot className="w-3.5 h-3.5 text-accent" />
              </div>
            )}
            <div className={`max-w-[75%] ${msg.role === "user" ? "order-1" : ""}`}>
              <div
                className={`px-3 py-2 rounded-lg text-sm leading-relaxed ${
                  msg.role === "user"
                    ? "bg-accent text-white"
                    : "bg-bg-elevated border border-border-default text-text-primary"
                }`}
              >
                {msg.metadata?.functionCall ? (
                  <div className="space-y-1">
                    <div className="flex items-center gap-1.5 text-status-warning text-xs font-medium">
                      <Zap className="w-3 h-3" />
                      Function Call
                    </div>
                    <code className="text-xs font-mono text-text-secondary block">
                      {msg.metadata.functionCall.name}
                    </code>
                    <pre className="text-xs font-mono text-text-muted bg-bg-surface rounded px-2 py-1 mt-1">
                      {JSON.stringify(msg.metadata.functionCall.args, null, 2)}
                    </pre>
                  </div>
                ) : msg.content}
              </div>
              {msg.role === "assistant" && msg.metadata && (
                <div className="flex items-center gap-3 mt-1 px-1">
                  {msg.metadata.route && (
                    <span className="text-xs text-text-muted">Route: {msg.metadata.route}</span>
                  )}
                  {msg.metadata.latencyMs && (
                    <span className="text-xs text-text-muted">{(msg.metadata.latencyMs / 1000).toFixed(2)}s</span>
                  )}
                  {msg.metadata.sources && (
                    <span className="text-xs text-text-muted">Sources: {msg.metadata.sources}</span>
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
                    className="w-1.5 h-1.5 rounded-full bg-text-muted animate-bounce"
                    style={{ animationDelay: `${i * 0.15}s` }}
                  />
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Input */}
      <div className="px-3 pb-3 pt-2 border-t border-border-subtle">
        <div className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && handleSend()}
            placeholder="Ask something..."
            className="flex-1 h-8 px-3 bg-bg-elevated border border-border-default rounded text-sm
              text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent
              transition-colors"
          />
          <Button
            variant="primary"
            size="sm"
            onClick={handleSend}
            loading={loading}
            icon={<Send className="w-3.5 h-3.5" />}
          >
            Send
          </Button>
        </div>
      </div>
    </div>
  );
}
