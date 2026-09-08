"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { useParams } from "next/navigation";
import ReactMarkdown from "react-markdown";
import {
  Send,
  TerminalSquare,
  AlertTriangle,
  Code2,
  Database,
  Zap,
  RefreshCcw,
  Loader2,
  Plus,
  Trash2,
  MessageSquare,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { runtimeTestService } from "@/services/runtime-test.service";
import { chatSessionService, ChatSession } from "@/services/chatSession.service";
import { analyticsService } from "@/services/analytics.service";
import { usePersistedSession } from "@/hooks/usePersistedSession";
import { PlaygroundMessage } from "@/types";

type TraceLog = {
  id: string;
  type: "system" | "rag" | "function" | "llm" | "error";
  message: string;
  timestamp: string;
};

function generateId() {
  return Math.random().toString(36).slice(2);
}

function formatRelativeTime(iso: string) {
  try {
    const diff = Date.now() - new Date(iso).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return "just now";
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric" });
  } catch {
    return "";
  }
}

export default function SimulatorPage() {
  const { projectId } = useParams<{ projectId: string }>();

  // ── Session persistence across tab switches ──────────────────
  const { sessionId, resetSession: persistedReset } = usePersistedSession(
    projectId,
    "sim"
  );

  // ── Session list (Firestore) ──────────────────────────────────
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [sessionsLoading, setSessionsLoading] = useState(true);
  const [activeSessionId, setActiveSessionId] = useState<string>(sessionId);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // ── Chat state ────────────────────────────────────────────────
  const [messages, setMessages] = useState<PlaygroundMessage[]>([
    {
      id: "welcome",
      role: "assistant",
      content:
        "Hello! I am INFRIA Assistant. Send a message to test your RAG and Function Calling configuration.",
      timestamp: new Date().toISOString(),
    },
  ]);
  const [inputMsg, setInputMsg] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [sessionInitialized, setSessionInitialized] = useState(false);

  // ── Trace logs ────────────────────────────────────────────────
  const [logs, setLogs] = useState<TraceLog[]>([]);

  const logsEndRef = useRef<HTMLDivElement>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);

  // ── Load session list ─────────────────────────────────────────
  const loadSessions = useCallback(async () => {
    try {
      const list = await chatSessionService.list(projectId);
      setSessions(list);
    } catch {
      // If Firestore not configured yet, show empty
      setSessions([]);
    } finally {
      setSessionsLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    loadSessions();
  }, [loadSessions]);

  // ── Load messages when active session changes ─────────────────
  useEffect(() => {
    async function loadMessages() {
      if (!activeSessionId) return;
      try {
        const history = await chatSessionService.getMessages(projectId, activeSessionId);
        if (history.length > 0) {
          setMessages(history);
        } else {
          setMessages([
            {
              id: "welcome",
              role: "assistant",
              content:
                "Hello! I am INFRIA Assistant. Send a message to test your RAG and Function Calling configuration.",
              timestamp: new Date().toISOString(),
            },
          ]);
        }
        setLogs([]);
      } catch {
        // New session or no history — keep welcome message
      }
      setSessionInitialized(true);
    }
    loadMessages();
  }, [activeSessionId, projectId]);

  useEffect(() => {
    logsEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [logs]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isTyping]);

  // ── Add trace log ─────────────────────────────────────────────
  const addLog = (type: TraceLog["type"], message: string) => {
    setLogs((prev) => [
      ...prev,
      {
        id: generateId(),
        type,
        message,
        timestamp: new Date().toISOString().substring(11, 23),
      },
    ]);
  };

  // ── New Session ───────────────────────────────────────────────
  async function handleNewSession() {
    const newId = persistedReset();
    setActiveSessionId(newId);
    setMessages([
      {
        id: "welcome",
        role: "assistant",
        content:
          "New session started. Send a message to begin.",
        timestamp: new Date().toISOString(),
      },
    ]);
    setLogs([]);
    setSessionInitialized(false);
  }

  // ── Reset current session ─────────────────────────────────────
  async function handleResetSession() {
    const newId = persistedReset();
    setActiveSessionId(newId);
    setMessages([
      {
        id: "welcome",
        role: "assistant",
        content: "Session reset. Send a message to begin a new test.",
        timestamp: new Date().toISOString(),
      },
    ]);
    setLogs([]);
    setSessionInitialized(false);
  }

  // ── Switch to a saved session ─────────────────────────────────
  function handleSelectSession(sess: ChatSession) {
    setActiveSessionId(sess.id);
  }

  // ── Delete session ────────────────────────────────────────────
  async function handleDeleteSession(e: React.MouseEvent, sessId: string) {
    e.stopPropagation();
    if (!confirm("Delete this session and all its messages?")) return;
    setDeletingId(sessId);
    try {
      await chatSessionService.delete(projectId, sessId);
      setSessions((prev) => prev.filter((s) => s.id !== sessId));
      if (activeSessionId === sessId) {
        handleNewSession();
      }
    } finally {
      setDeletingId(null);
    }
  }

  // ── Send message ──────────────────────────────────────────────
  const handleSend = async () => {
    if (!inputMsg.trim() || isTyping) return;
    const userText = inputMsg.trim();
    setInputMsg("");

    const userMsg: PlaygroundMessage = {
      id: generateId(),
      role: "user",
      content: userText,
      timestamp: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, userMsg]);
    setIsTyping(true);
    addLog("system", `[SIMULATOR] Dispatching to INFRIA backend…`);

    const start = Date.now();
    let isFirstMessage = !sessionInitialized && messages.filter(m => m.role === "user").length === 0;

    // Ensure session doc exists on first real message
    try {
      if (!sessionInitialized || isFirstMessage) {
        await chatSessionService.create(projectId, activeSessionId, "SIMULATOR", userText);
        setSessionInitialized(true);
        isFirstMessage = true;
      }
      // Save user message to Firestore
      await chatSessionService.addMessage(projectId, activeSessionId, userMsg);
    } catch {
      // Firestore write failed — continue anyway
    }

    try {
      // Get conversation history for LLM memory (last 10 msgs)
      const conversationHistory = messages
        .filter((m) => m.role !== "assistant" || m.id !== "welcome")
        .slice(-10)
        .map((m) => ({ role: m.role, content: m.content }));

      const result = await runtimeTestService.sendMessage({
        projectId,
        sessionId: activeSessionId,
        message: userText,
        source: "SIMULATOR",
        conversationHistory,
      });

      const latencyMs = Date.now() - start;

      addLog(
        "system",
        `[RESPONSE] 200 OK · ${result.requestId ?? "n/a"} · ${latencyMs}ms`
      );

      if (result.__trace) {
        const t = result.__trace;
        addLog(
          "system",
          `[N8N] ${t.functionsInjected ?? 0} function schemas injected`
        );
        if (t.ragFallback) {
          addLog(
            "rag",
            `[RAG MISS] No context ≥ ${Math.round((t.ragThreshold ?? 0) * 100)}% → fallback`
          );
        } else if (t.ragChunksInjected && t.ragChunksInjected > 0) {
          addLog(
            "rag",
            `[RAG HIT] ${t.ragChunksInjected}/${t.ragTopK ?? t.ragChunksInjected} chunks (≥${Math.round((t.ragThreshold ?? 0) * 100)}%)`
          );
          t.chunksPreview?.forEach((txt: string, i: number) => {
            addLog("rag", `  ↳ Chunk ${i + 1}: "${txt}"`);
          });
        }
      }

      let route: NonNullable<PlaygroundMessage["metadata"]>["route"] = "DIRECT";
      let responseContent = "";

      if (result.type === "message") {
        addLog("llm", `[LLM] Message response received.`);
        responseContent = result.data.content ?? "";
        route =
          result.__trace?.ragChunksInjected && result.__trace.ragChunksInjected > 0
            ? "RAG"
            : "DIRECT";
      } else if (result.type === "function_call") {
        addLog("function", `[FUNCTION] AI requested: ${result.data.function}()`);
        responseContent = `[System] Function intercepted: AI requested \`${result.data.function}\``;
        route = "FUNCTION";
      }

      const assistantMsg: PlaygroundMessage = {
        id: generateId(),
        role: "assistant",
        content: responseContent,
        timestamp: new Date().toISOString(),
        metadata: {
          route,
          requestId: result.requestId,
          latencyMs,
          sources: result.__trace?.ragChunksInjected,
        },
      };

      setMessages((prev) => [...prev, assistantMsg]);

      // Save assistant message to Firestore
      try {
        await chatSessionService.addMessage(projectId, activeSessionId, assistantMsg);
      } catch {
        // Non-critical
      }

      // Record analytics event
      try {
        await analyticsService.recordEvent(projectId, {
          requestId: result.requestId,
          timestamp: new Date().toISOString(),
          source: "SIMULATOR",
          route,
          status: "SUCCESS",
          latencyMs,
          retrievalSources: result.__trace?.ragChunksInjected,
          sessionId: activeSessionId,
        });
      } catch {
        // Non-critical
      }

      // Refresh session list (title + count update)
      if (isFirstMessage) {
        loadSessions();
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Unknown error";
      addLog("error", `[ERROR] ${msg}`);

      const errMsg: PlaygroundMessage = {
        id: generateId(),
        role: "assistant",
        content: `Error: ${msg}`,
        timestamp: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, errMsg]);

      // Record error event
      try {
        await analyticsService.recordEvent(projectId, {
          timestamp: new Date().toISOString(),
          source: "SIMULATOR",
          route: "DIRECT",
          status: "ERROR",
          latencyMs: Date.now() - start,
          sessionId: activeSessionId,
        });
      } catch {
        // Non-critical
      }
    } finally {
      setIsTyping(false);
    }
  };

  // ── Trace log styles ──────────────────────────────────────────
  const getLogStyle = (type: TraceLog["type"]) => {
    switch (type) {
      case "system": return "text-text-muted";
      case "rag": return "text-yellow-500 dark:text-yellow-400";
      case "function": return "text-accent";
      case "llm": return "text-status-info";
      case "error": return "text-status-error";
    }
  };

  const getLogIcon = (type: TraceLog["type"]) => {
    switch (type) {
      case "system": return <TerminalSquare className="w-3 h-3 mt-0.5 shrink-0" />;
      case "rag": return <Database className="w-3 h-3 mt-0.5 shrink-0" />;
      case "function": return <Code2 className="w-3 h-3 mt-0.5 shrink-0" />;
      case "error": return <AlertTriangle className="w-3 h-3 mt-0.5 shrink-0" />;
      case "llm": return <Zap className="w-3 h-3 mt-0.5 shrink-0" />;
    }
  };

  const lastAssistantMsg = [...messages].reverse().find(m => m.role === "assistant" && m.id !== "welcome");

  return (
    <div className="flex flex-col h-[calc(100vh-56px)] w-full overflow-hidden">
      {/* Header */}
      <div className="px-6 py-4 flex items-center justify-between border-b border-border-default shrink-0 bg-bg-surface">
        <div>
          <h1 className="text-xl font-bold text-text-primary">
            Simulator & Trace Debugger
          </h1>
          <p className="text-text-muted text-sm flex items-center gap-2">
            Test RAG and Function Calling in real-time.
            <span className="inline-flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-accent" />
              <span className="text-xs font-medium text-text-muted">SIMULATOR</span>
            </span>
          </p>
        </div>
        <button
          onClick={handleResetSession}
          className="flex items-center gap-1.5 text-sm font-medium text-text-muted hover:text-accent transition-colors"
          aria-label="Reset session"
        >
          <RefreshCcw className="w-4 h-4" />
          Reset
        </button>
      </div>

      <div className="flex-1 flex overflow-hidden">

        {/* ── Session Sidebar ──────────────────────────────────── */}
        <div
          className={`shrink-0 border-r border-border-default bg-bg-surface flex flex-col transition-all duration-200 ${
            sidebarCollapsed ? "w-12" : "w-56"
          }`}
        >
          {/* Sidebar header */}
          <div className="flex items-center justify-between px-3 py-3 border-b border-border-subtle">
            {!sidebarCollapsed && (
              <span className="text-xs font-bold text-text-muted uppercase tracking-widest">
                Sessions
              </span>
            )}
            <div className={`flex items-center gap-1 ${sidebarCollapsed ? "w-full justify-center" : ""}`}>
              {!sidebarCollapsed && (
                <button
                  onClick={handleNewSession}
                  title="New session"
                  className="p-1 rounded-md hover:bg-accent-muted text-text-muted hover:text-accent transition-colors"
                  aria-label="New session"
                >
                  <Plus className="w-3.5 h-3.5" />
                </button>
              )}
              <button
                onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
                className="p-1 rounded-md hover:bg-bg-hover text-text-muted transition-colors"
                aria-label={sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
              >
                {sidebarCollapsed ? (
                  <ChevronRight className="w-3.5 h-3.5" />
                ) : (
                  <ChevronLeft className="w-3.5 h-3.5" />
                )}
              </button>
            </div>
          </div>

          {!sidebarCollapsed && (
            <>
              {/* New session button */}
              <div className="px-2 pt-2">
                <button
                  onClick={handleNewSession}
                  className="w-full flex items-center gap-2 px-3 py-2 rounded-lg bg-accent text-white text-xs font-semibold hover:bg-accent-hover transition-colors"
                >
                  <Plus className="w-3.5 h-3.5" />
                  New Session
                </button>
              </div>

              {/* Session list */}
              <div className="flex-1 overflow-y-auto py-2 px-2 space-y-0.5">
                {sessionsLoading ? (
                  <div className="flex items-center justify-center py-6">
                    <Loader2 className="w-4 h-4 text-accent animate-spin" />
                  </div>
                ) : sessions.length === 0 ? (
                  <p className="text-xs text-text-muted text-center px-2 pt-4 leading-relaxed">
                    No sessions yet.
                    <br />
                    Start chatting!
                  </p>
                ) : (
                  sessions.map((sess) => (
                    <div
                      key={sess.id}
                      onClick={() => handleSelectSession(sess)}
                      className={`group relative flex items-start gap-2 px-2.5 py-2 rounded-lg cursor-pointer text-xs transition-colors ${
                        activeSessionId === sess.id
                          ? "bg-accent-muted text-accent"
                          : "text-text-secondary hover:bg-bg-hover hover:text-text-primary"
                      }`}
                    >
                      <MessageSquare className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                      <div className="flex-1 min-w-0">
                        <p className="truncate font-medium leading-snug">
                          {sess.title}
                        </p>
                        <p className="text-text-muted mt-0.5">
                          {formatRelativeTime(sess.updatedAt)}
                        </p>
                      </div>
                      {/* Delete button */}
                      <button
                        onClick={(e) => handleDeleteSession(e, sess.id)}
                        disabled={deletingId === sess.id}
                        className="absolute right-1.5 top-1.5 opacity-0 group-hover:opacity-100 p-0.5 rounded text-text-muted hover:text-status-error transition-all"
                        aria-label="Delete session"
                      >
                        {deletingId === sess.id ? (
                          <Loader2 className="w-3 h-3 animate-spin" />
                        ) : (
                          <Trash2 className="w-3 h-3" />
                        )}
                      </button>
                    </div>
                  ))
                )}
              </div>
            </>
          )}

          {/* Collapsed state — just icons */}
          {sidebarCollapsed && (
            <div className="flex-1 flex flex-col items-center pt-2 gap-1">
              <button
                onClick={handleNewSession}
                title="New session"
                className="p-2 rounded-lg hover:bg-accent-muted text-text-muted hover:text-accent transition-colors"
                aria-label="New session"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>

        {/* ── Chat Panel ───────────────────────────────────────── */}
        <div className="w-full lg:w-[420px] xl:w-[480px] border-r border-border-default bg-bg-surface flex flex-col shrink-0">
          {/* Chat header */}
          <div className="bg-bg-elevated border-b border-border-default p-3.5 flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-accent-muted flex items-center justify-center border border-accent-border">
              <span className="text-accent text-xs font-bold">AI</span>
            </div>
            <div className="min-w-0">
              <h2 className="font-bold text-sm text-text-primary">
                INFRIA Assistant
              </h2>
              <p className="text-xs text-text-muted flex items-center gap-1 truncate">
                <span className="w-1.5 h-1.5 rounded-full bg-accent shrink-0" />
                Session: {activeSessionId.slice(0, 16)}
              </p>
            </div>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-3 bg-bg-base">
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`max-w-[85%] rounded-xl px-4 py-3 text-sm leading-relaxed shadow-sm border ${
                    msg.role === "user"
                      ? "bg-accent text-white border-accent"
                      : "bg-bg-surface text-text-primary border-border-strong"
                  }`}
                >
                  {msg.role === "user" ? (
                    msg.content
                  ) : (
                    <div className="prose prose-sm max-w-none text-text-primary leading-relaxed">
                      <ReactMarkdown>{msg.content}</ReactMarkdown>
                    </div>
                  )}
                </div>
              </div>
            ))}

            {/* Metadata bar for last assistant message */}
            {lastAssistantMsg?.metadata && (
              <div className="flex items-center gap-2 flex-wrap px-1">
                {lastAssistantMsg.metadata.route && (
                  <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-accent-muted text-accent uppercase">
                    {lastAssistantMsg.metadata.route}
                  </span>
                )}
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-bg-elevated text-text-muted uppercase">
                  SIMULATOR
                </span>
                {lastAssistantMsg.metadata.latencyMs && (
                  <span className="text-[10px] text-text-muted">
                    {(lastAssistantMsg.metadata.latencyMs / 1000).toFixed(2)}s
                  </span>
                )}
                {lastAssistantMsg.metadata.sources != null &&
                  lastAssistantMsg.metadata.sources > 0 && (
                    <span className="text-[10px] text-text-muted">
                      {lastAssistantMsg.metadata.sources} sources
                    </span>
                  )}
                {lastAssistantMsg.metadata.requestId && (
                  <span className="text-[10px] font-mono text-text-muted">
                    {lastAssistantMsg.metadata.requestId}
                  </span>
                )}
              </div>
            )}

            {isTyping && (
              <div className="flex justify-start">
                <div className="bg-bg-surface border border-border-strong rounded-xl px-4 py-3 shadow-sm flex gap-1.5 items-center">
                  {[0, 1, 2].map((i) => (
                    <span
                      key={i}
                      className="w-2 h-2 rounded-full bg-accent animate-bounce"
                      style={{ animationDelay: `${i * 150}ms` }}
                    />
                  ))}
                </div>
              </div>
            )}
            <div ref={chatEndRef} />
          </div>

          {/* Input */}
          <div className="bg-bg-surface border-t border-border-default p-3 flex gap-2">
            <input
              type="text"
              value={inputMsg}
              onChange={(e) => setInputMsg(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && handleSend()}
              placeholder="Send a test message…"
              className="flex-1 bg-bg-elevated border border-border-strong text-text-primary rounded-lg px-4 py-2 text-sm focus:outline-none focus:border-accent transition-colors"
              disabled={isTyping}
            />
            <button
              onClick={handleSend}
              disabled={!inputMsg.trim() || isTyping}
              className="h-10 w-10 rounded-lg bg-accent text-white flex items-center justify-center shrink-0 disabled:opacity-50 hover:bg-accent-hover transition-colors"
              aria-label="Send message"
            >
              {isTyping ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Send className="w-4 h-4" />
              )}
            </button>
          </div>
        </div>

        {/* ── Trace Logs ───────────────────────────────────────── */}
        {/* Light mode: bg-bg-base (light gray). Dark mode: #0d1117 (GitHub dark) */}
        <div className="flex-1 bg-bg-base dark:bg-[#0d1117] flex flex-col font-mono text-sm overflow-hidden">
          <div className="bg-bg-elevated dark:bg-[#161b22] text-text-muted border-b border-border-default px-4 py-2.5 flex justify-between items-center shrink-0">
            <span className="font-bold flex items-center gap-2 text-xs">
              <TerminalSquare className="w-3.5 h-3.5 text-accent" />
              BACKEND TRACE
            </span>
            <span className="text-text-muted text-xs opacity-60">
              n8n · {projectId}
            </span>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-1.5 text-[12px] leading-relaxed">
            {logs.length === 0 ? (
              <div className="text-text-muted opacity-40 italic mt-6 text-center">
                Waiting for interactions…
                <br />
                <span className="text-[10px]">
                  Send a message to begin tracing.
                </span>
              </div>
            ) : (
              logs.map((log) => (
                <div
                  key={log.id}
                  className="flex items-start gap-3 hover:bg-black/5 dark:hover:bg-white/5 px-1 py-0.5 rounded transition-colors"
                >
                  <div className="text-text-muted opacity-50 w-24 shrink-0 tabular-nums">
                    {log.timestamp}
                  </div>
                  <div className={`flex-1 flex gap-2 ${getLogStyle(log.type)}`}>
                    {getLogIcon(log.type)}
                    <span className="break-words font-medium">{log.message}</span>
                  </div>
                </div>
              ))
            )}
            {isTyping && (
              <div className="flex items-start gap-3 px-1 py-0.5">
                <div className="text-text-muted opacity-40 w-24 shrink-0">Processing</div>
                <div className="flex-1 text-text-muted flex items-center gap-2">
                  <div className="w-1.5 h-1.5 bg-accent rounded-full animate-ping" />
                  Awaiting LLM response…
                </div>
              </div>
            )}
            <div ref={logsEndRef} />
          </div>
        </div>
      </div>
    </div>
  );
}
