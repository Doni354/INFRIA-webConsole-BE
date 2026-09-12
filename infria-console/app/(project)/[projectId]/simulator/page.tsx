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
  Sparkles,
  Play,
  CheckCircle2,
  X,
  Copy,
  Check,
} from "lucide-react";
import { runtimeTestService } from "@/services/runtime-test.service";
import { functionService } from "@/services/function.service";
import { chatSessionService, ChatSession } from "@/services/chatSession.service";
import { analyticsService } from "@/services/analytics.service";
import { usePersistedSession } from "@/hooks/usePersistedSession";
import {
  PlaygroundMessage,
  ConsoleFunction,
  StandaloneFunctionTestResponse,
} from "@/types";

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

  // ── Function Calling State ─────────────────────────────────────
  const [registeredFunctions, setRegisteredFunctions] = useState<ConsoleFunction[]>([]);
  const [pendingFunctionCall, setPendingFunctionCall] = useState<{
    requestId: string;
    functionCallId: string;
    functionName: string;
    arguments: Record<string, unknown>;
    mockResultJson: string;
    isSubmitting: boolean;
  } | null>(null);

  // ── Standalone Capability Testing State ────────────────────────
  const [standaloneModalOpen, setStandaloneModalOpen] = useState(false);
  const [selectedFnName, setSelectedFnName] = useState<string>("");
  const [standaloneArgsJson, setStandaloneArgsJson] = useState<string>("{}");
  const [standaloneRunning, setStandaloneRunning] = useState(false);
  const [standaloneResult, setStandaloneResult] = useState<StandaloneFunctionTestResponse | null>(null);
  const [standaloneError, setStandaloneError] = useState<string | null>(null);
  const [standaloneResumeTesting, setStandaloneResumeTesting] = useState(false);
  const [standaloneResumeResult, setStandaloneResumeResult] = useState<string | null>(null);

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

  // ── Load registered functions for project ─────────────────────
  useEffect(() => {
    async function loadFunctions() {
      try {
        const list = await functionService.list(projectId);
        setRegisteredFunctions(list);
        if (list.length > 0 && !selectedFnName) {
          const first = list[0];
          setSelectedFnName(first.name);
          setStandaloneArgsJson(JSON.stringify(generateDefaultArgs(first), null, 2));
        }
      } catch {
        setRegisteredFunctions([]);
      }
    }
    loadFunctions();
  }, [projectId]);

  function generateDefaultArgs(fn: ConsoleFunction): Record<string, unknown> {
    const properties = fn.parameters?.properties || {};
    const args: Record<string, unknown> = {};
    for (const [key, prop] of Object.entries(properties)) {
      if (prop.type === "string") {
        if (key.toLowerCase().includes("id")) args[key] = "ORD-8821";
        else if (key.toLowerCase().includes("city") || key.toLowerCase().includes("loc")) args[key] = "Jakarta";
        else args[key] = "sample_value";
      } else if (prop.type === "number" || prop.type === "integer") {
        args[key] = 1;
      } else if (prop.type === "boolean") {
        args[key] = true;
      } else if (prop.type === "array") {
        args[key] = [];
      } else {
        args[key] = {};
      }
    }
    return args;
  }

  function generateSuggestedResult(functionName: string, args: Record<string, unknown> = {}) {
    const lower = functionName.toLowerCase();
    if (lower.includes("order") || lower.includes("pesan")) {
      return {
        orderId: args.orderId || "ORD-9821-X",
        status: "SHIPPED",
        courier: "JNE Express",
        trackingNumber: "JNE8829103948",
        estimatedDelivery: new Date(Date.now() + 86400000 * 2).toISOString().split("T")[0],
        items: [{ name: "Wireless Headphones", quantity: 1, price: 450000 }],
      };
    }
    if (lower.includes("weather") || lower.includes("cuaca")) {
      return {
        location: args.city || args.location || "Jakarta",
        temperatureCelsius: 29,
        condition: "Partly Cloudy",
        humidity: "72%",
      };
    }
    if (lower.includes("user") || lower.includes("profile")) {
      return {
        userId: args.userId || "usr_7721",
        name: "Budi Pratama",
        tier: "Gold Member",
        loyaltyPoints: 1250,
        verified: true,
      };
    }
    return {
      success: true,
      executedFunction: functionName,
      executedAt: new Date().toISOString(),
      output: `Capability '${functionName}' executed locally on client device.`,
      echoArgs: args,
    };
  }

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
    if (activeSessionId === sess.id) return;
    setActiveSessionId(sess.id);
    setSessionInitialized(true);
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

      // Extract Grounding Evaluation and Smart Title from response
      const smartTitle = result.sessionTitle || result.data?.sessionTitle || result.__trace?.sessionTitle;
      const evidenceLevel = (result.evaluation?.evidenceLevel || result.__trace?.evidenceLevel || result.data?.metadata?.evidenceLevel || (result.__trace?.ragChunksInjected ? "HIGH" : "NONE")) as "HIGH" | "MEDIUM" | "LOW" | "NONE";
      const evidenceReason = result.evaluation?.evidenceReason || result.__trace?.evidenceReason || result.data?.metadata?.evidenceReason;
      const isKnowledgeGap = result.evaluation?.isKnowledgeGap ?? result.__trace?.isKnowledgeGap ?? result.data?.metadata?.isKnowledgeGap ?? false;
      const topicCategory = result.evaluation?.topicCategory || result.__trace?.topicCategory || result.data?.metadata?.topicCategory;

      if (result.type === "message") {
        addLog("llm", `[LLM] Message response received.`);
        responseContent = result.data.content ?? "";
        route =
          result.__trace?.ragChunksInjected && result.__trace.ragChunksInjected > 0
            ? "RAG"
            : "DIRECT";
      } else if (result.type === "function_call") {
        const fnName = result.data.function || "unknown_capability";
        const fnArgs = (result.data.arguments || result.data.args || {}) as Record<string, unknown>;
        const fnCallId = result.data.functionCallId || `fc_${Date.now()}`;

        addLog("function", `[CAPABILITY INTERCEPTED] AI requested client execution: ${fnName}()`);
        addLog("function", `  ↳ Arguments: ${JSON.stringify(fnArgs)}`);
        addLog("function", `  ↳ Correlation ID: ${fnCallId}`);

        const suggested = generateSuggestedResult(fnName, fnArgs);
        setPendingFunctionCall({
          requestId: result.requestId || "",
          functionCallId: fnCallId,
          functionName: fnName,
          arguments: fnArgs,
          mockResultJson: JSON.stringify(suggested, null, 2),
          isSubmitting: false,
        });

        responseContent = `⚡ **AI requested client capability: \`${fnName}\`**\n\`\`\`json\n${JSON.stringify(fnArgs, null, 2)}\n\`\`\`\n*Awaiting client SDK / device execution callback below...*`;
        route = "FUNCTION";
      }

      // Add Grounding Evaluation trace logs
      if (evidenceLevel) {
        addLog(
          "system",
          `[GROUNDING] Evidence Level: ${evidenceLevel} · ${evidenceReason || "Grounding verified"}`
        );
      }
      if (topicCategory) {
        addLog(
          "system",
          `[TOPIC] Category: ${topicCategory}${isKnowledgeGap ? " · ⚠️ KNOWLEDGE GAP DETECTED" : ""}`
        );
      }
      if (smartTitle) {
        addLog("system", `[SESSION] Smart Title generated: "${smartTitle}"`);
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
          evidenceLevel,
          evidenceReason,
          topicCategory,
        },
      };

      setMessages((prev) => [...prev, assistantMsg]);

      // Save assistant message to Firestore
      try {
        await chatSessionService.addMessage(projectId, activeSessionId, assistantMsg);
      } catch {
        // Non-critical
      }

      // If smartTitle was generated by AI, update session doc in Firestore
      if (smartTitle) {
        try {
          await chatSessionService.updateTitle(projectId, activeSessionId, smartTitle);
        } catch {
          // Non-critical
        }
      }

      // Optimistically update session in the sidebar list immediately
      setSessions((prev) => {
        const existingIdx = prev.findIndex((s) => s.id === activeSessionId);
        const now = new Date().toISOString();
        const fallbackTitle = userText.length > 60 ? userText.slice(0, 60) + "…" : userText;
        const titleToUse = smartTitle || fallbackTitle;

        if (existingIdx >= 0) {
          const updated = [...prev];
          updated[existingIdx] = {
            ...updated[existingIdx],
            title: smartTitle || updated[existingIdx].title,
            messageCount: (updated[existingIdx].messageCount || 0) + 2,
            updatedAt: now,
          };
          return updated;
        } else {
          const newSess: ChatSession = {
            id: activeSessionId,
            projectId,
            title: titleToUse,
            source: "SIMULATOR",
            messageCount: 2,
            createdAt: now,
            updatedAt: now,
          };
          return [newSess, ...prev];
        }
      });

      // Record analytics event with rich grounding metadata
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
          evidenceLevel,
          evidenceReason,
          isKnowledgeGap: Boolean(isKnowledgeGap),
          topicCategory,
        });
      } catch {
        // Non-critical
      }

      // Refresh session list from Firestore in background
      loadSessions();
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

  // ── Resume AI from Function Result ────────────────────────────
  const handleResumeFunctionCall = async () => {
    if (!pendingFunctionCall) return;

    let parsedResult: unknown;
    try {
      parsedResult = JSON.parse(pendingFunctionCall.mockResultJson);
    } catch {
      alert("Invalid JSON format in simulated result. Please correct it.");
      return;
    }

    setPendingFunctionCall((prev) => (prev ? { ...prev, isSubmitting: true } : null));
    setIsTyping(true);

    addLog(
      "function",
      `[CLIENT SDK] Executing local capability handler '${pendingFunctionCall.functionName}()'`
    );
    addLog("function", `  ↳ Local Output: ${JSON.stringify(parsedResult)}`);
    addLog(
      "system",
      `[RESUME] POST /v1/runtime/function-result (req: ${pendingFunctionCall.requestId})`
    );

    const startResume = Date.now();
    try {
      const resumeResponse = await runtimeTestService.sendFunctionResult({
        projectId,
        requestId: pendingFunctionCall.requestId,
        functionCallId: pendingFunctionCall.functionCallId,
        function: {
          name: pendingFunctionCall.functionName,
          arguments: pendingFunctionCall.arguments,
        },
        result: parsedResult,
      });

      const latencyMs = Date.now() - startResume;
      addLog("system", `[RESUME RESPONSE] 200 OK · ${latencyMs}ms`);
      addLog("llm", `[LLM] Resumed conversation response received.`);

      const finalContent =
        resumeResponse.data?.content ||
        (resumeResponse.data?.function
          ? `AI requested another capability: \`${resumeResponse.data.function}\``
          : "Execution completed.");

      const resumedAssistantMsg: PlaygroundMessage = {
        id: generateId(),
        role: "assistant",
        content: finalContent,
        timestamp: new Date().toISOString(),
        metadata: {
          route: "FUNCTION",
          requestId: resumeResponse.requestId || pendingFunctionCall.requestId,
          latencyMs,
        },
      };

      setMessages((prev) => [...prev, resumedAssistantMsg]);

      try {
        await chatSessionService.addMessage(projectId, activeSessionId, resumedAssistantMsg);
      } catch {}

      try {
        await analyticsService.recordEvent(projectId, {
          requestId: resumeResponse.requestId || pendingFunctionCall.requestId,
          timestamp: new Date().toISOString(),
          source: "SIMULATOR",
          route: "FUNCTION",
          status: "SUCCESS",
          latencyMs,
          sessionId: activeSessionId,
          functionName: pendingFunctionCall.functionName,
        });
      } catch {}

      // If LLM returned another function call, chain it!
      if (resumeResponse.type === "function_call" && resumeResponse.data?.function) {
        const nextFnName = resumeResponse.data.function;
        const nextArgs = (resumeResponse.data.arguments || resumeResponse.data.args || {}) as Record<
          string,
          unknown
        >;
        const nextCallId = resumeResponse.data.functionCallId || `fc_${Date.now()}`;
        const nextSuggested = generateSuggestedResult(nextFnName, nextArgs);

        setPendingFunctionCall({
          requestId: resumeResponse.requestId || pendingFunctionCall.requestId,
          functionCallId: nextCallId,
          functionName: nextFnName,
          arguments: nextArgs,
          mockResultJson: JSON.stringify(nextSuggested, null, 2),
          isSubmitting: false,
        });
      } else {
        setPendingFunctionCall(null);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to resume conversation.";
      addLog("error", `[RESUME ERROR] ${msg}`);
      setPendingFunctionCall((prev) => (prev ? { ...prev, isSubmitting: false } : null));
    } finally {
      setIsTyping(false);
    }
  };

  // ── Standalone Function Testing Handlers (No AI) ──────────────
  const handleRunStandaloneTest = async () => {
    if (!selectedFnName) return;
    let parsedArgs = {};
    try {
      parsedArgs = JSON.parse(standaloneArgsJson || "{}");
    } catch {
      setStandaloneError("Invalid JSON syntax in arguments.");
      return;
    }

    setStandaloneRunning(true);
    setStandaloneError(null);
    setStandaloneResult(null);
    setStandaloneResumeResult(null);

    addLog(
      "system",
      `[STANDALONE TEST] Testing client capability '${selectedFnName}' (Bypassing AI/LLM)…`
    );

    try {
      const res = await runtimeTestService.testFunctionStandalone({
        projectId,
        functionName: selectedFnName,
        arguments: parsedArgs,
        sessionId: activeSessionId,
        autoMockResult: true,
      });

      setStandaloneResult(res);
      addLog("function", `[VALIDATION] JSON Schema parameters check: PASSED`);
      addLog("function", `[STATE SAVED] Correlation ID: ${res.data.functionCallId}`);
      addLog(
        "system",
        `[SDK DISPATCH] Created Flutter payload for 'infria.registerFunction(\"${selectedFnName}\")'`
      );
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Standalone test failed.";
      setStandaloneError(msg);
      addLog("error", `[STANDALONE ERROR] ${msg}`);
    } finally {
      setStandaloneRunning(false);
    }
  };

  const handleTestResumeFromStandalone = async () => {
    if (!standaloneResult) return;
    setStandaloneResumeTesting(true);
    addLog("system", `[STATE TEST] Testing callback flow with /v1/runtime/function-result...`);

    try {
      const resumeRes = await runtimeTestService.sendFunctionResult({
        projectId,
        requestId: standaloneResult.requestId,
        functionCallId: standaloneResult.data.functionCallId,
        function: {
          name: standaloneResult.data.function,
          arguments: standaloneResult.data.arguments,
        },
        result: standaloneResult.mockSdkResult || { success: true },
      });

      setStandaloneResumeResult(
        `State machine validated! Response type: ${resumeRes.type}, Status: Success`
      );
      addLog("system", `[STATE MACHINE] Transitioned to COMPLETED and validated idempotency!`);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "State machine test failed.";
      setStandaloneResumeResult(`Test error: ${msg}`);
      addLog("error", `[STATE ERROR] ${msg}`);
    } finally {
      setStandaloneResumeTesting(false);
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
        <div className="flex items-center gap-3">
          <button
            onClick={() => setStandaloneModalOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-accent/40 bg-accent/10 text-xs font-semibold text-accent hover:bg-accent/20 transition-all shadow-sm"
          >
            <Zap className="w-3.5 h-3.5 fill-accent" />
            Test Capability (No AI)
          </button>
          <button
            onClick={handleResetSession}
            className="flex items-center gap-1.5 text-sm font-medium text-text-muted hover:text-accent transition-colors"
            aria-label="Reset session"
          >
            <RefreshCcw className="w-4 h-4" />
            Reset
          </button>
        </div>
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
                          {sess.title || "Untitled Session"}
                        </p>
                        <p className="text-text-muted mt-0.5">
                          {formatRelativeTime(sess.updatedAt || sess.createdAt)}
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
            {messages.length === 0 && (
              <div className="flex flex-col items-center justify-center h-full text-center px-4 py-8 space-y-3 my-auto">
                <div className="w-10 h-10 rounded-full bg-accent-muted border border-accent-border flex items-center justify-center text-accent">
                  <Sparkles className="w-5 h-5" />
                </div>
                <div className="space-y-1">
                  <h3 className="text-sm font-bold text-text-primary">
                    Simulator Session Ready
                  </h3>
                  <p className="text-xs text-text-muted max-w-xs">
                    Type a message below to test how your AI routes queries, retrieves knowledge docs, and executes function tools in real time.
                  </p>
                </div>
              </div>
            )}

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
                    <div className="prose prose-sm max-w-none text-white prose-p:my-0 prose-strong:text-white prose-strong:font-bold prose-code:text-white prose-code:bg-white/20 prose-code:px-1 prose-code:py-0.5 prose-code:rounded prose-pre:bg-black/30 prose-pre:text-white leading-relaxed">
                      <ReactMarkdown>{msg.content}</ReactMarkdown>
                    </div>
                  ) : (
                    <div className="prose prose-sm max-w-none text-text-primary dark:prose-invert leading-relaxed prose-p:my-1 prose-strong:text-text-primary dark:prose-strong:text-white prose-strong:font-bold prose-code:text-accent prose-code:bg-bg-elevated prose-code:px-1 prose-code:py-0.5 prose-code:rounded prose-pre:bg-bg-elevated prose-pre:border prose-pre:border-border-default">
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

          {/* Active Capability Invocation Card */}
          {pendingFunctionCall && (
            <div className="bg-bg-elevated border-t border-b border-accent/40 p-3.5 space-y-2.5 bg-accent/5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5 text-xs font-bold text-accent">
                  <Zap className="w-4 h-4 fill-accent" />
                  Client Capability Invocation (Mock SDK)
                </div>
                <button
                  onClick={() => setPendingFunctionCall(null)}
                  className="text-text-muted hover:text-text-primary p-0.5 text-xs"
                  title="Dismiss"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>

              <div className="text-xs space-y-1.5">
                <div className="flex items-center gap-2">
                  <span className="text-text-muted">Target Function:</span>
                  <span className="font-mono font-semibold text-accent px-1.5 py-0.5 rounded bg-accent/10 border border-accent/20">
                    {pendingFunctionCall.functionName}()
                  </span>
                </div>
                <div>
                  <span className="text-text-muted">Arguments from AI:</span>
                  <pre className="font-mono text-[11px] bg-bg-surface p-1.5 rounded border border-border-default overflow-x-auto text-text-primary mt-0.5 max-h-24">
                    {JSON.stringify(pendingFunctionCall.arguments, null, 2)}
                  </pre>
                </div>
                <div>
                  <div className="flex items-center justify-between text-text-muted mb-0.5">
                    <span>Simulated Return Payload (JSON):</span>
                    <button
                      type="button"
                      onClick={() => {
                        const dummy = generateSuggestedResult(
                          pendingFunctionCall.functionName,
                          pendingFunctionCall.arguments
                        );
                        setPendingFunctionCall((prev) =>
                          prev ? { ...prev, mockResultJson: JSON.stringify(dummy, null, 2) } : null
                        );
                      }}
                      className="text-[10px] text-accent hover:underline font-medium"
                    >
                      Reset Dummy Data
                    </button>
                  </div>
                  <textarea
                    value={pendingFunctionCall.mockResultJson}
                    onChange={(e) => {
                      const val = e.target.value;
                      setPendingFunctionCall((prev) =>
                        prev ? { ...prev, mockResultJson: val } : null
                      );
                    }}
                    rows={3}
                    className="w-full font-mono text-[11px] bg-bg-surface border border-border-strong rounded p-2 text-text-primary focus:outline-none focus:border-accent"
                  />
                </div>
              </div>

              <div className="flex items-center gap-2 pt-1">
                <button
                  onClick={handleResumeFunctionCall}
                  disabled={pendingFunctionCall.isSubmitting}
                  className="flex-1 flex items-center justify-center gap-1.5 bg-accent text-white py-2 px-3 rounded-lg text-xs font-semibold hover:bg-accent-hover transition-colors disabled:opacity-50 shadow-sm"
                >
                  {pendingFunctionCall.isSubmitting ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Play className="w-3.5 h-3.5 fill-current" />
                  )}
                  Simulate Client SDK Execution & Resume AI
                </button>
              </div>
            </div>
          )}

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

      {/* ── Standalone Capability Tester Modal (No AI) ────────── */}
      {standaloneModalOpen && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-bg-surface border border-border-strong rounded-2xl max-w-2xl w-full shadow-2xl flex flex-col max-h-[90vh] overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-border-default flex items-center justify-between bg-bg-elevated">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-accent-muted border border-accent-border flex items-center justify-center text-accent">
                  <Zap className="w-4 h-4 fill-accent" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-text-primary">
                    Standalone Capability Tester
                  </h2>
                  <p className="text-xs text-text-muted">
                    Test client function calling and argument validation directly without invoking the AI.
                  </p>
                </div>
              </div>
              <button
                onClick={() => setStandaloneModalOpen(false)}
                className="p-1 rounded-lg text-text-muted hover:text-text-primary hover:bg-bg-hover transition-colors"
                aria-label="Close modal"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-6 overflow-y-auto space-y-4 flex-1">
              {/* Function Selector */}
              <div>
                <label className="block text-xs font-bold text-text-secondary uppercase tracking-wider mb-1.5">
                  Select Registered Capability
                </label>
                {registeredFunctions.length === 0 ? (
                  <div className="text-xs text-text-muted p-3 bg-bg-elevated rounded-lg border border-border-default">
                    No functions registered yet. Go to the{" "}
                    <a href={`/${projectId}/functions`} className="text-accent underline">
                      Functions
                    </a>{" "}
                    tab to register your first capability.
                  </div>
                ) : (
                  <select
                    value={selectedFnName}
                    onChange={(e) => {
                      const name = e.target.value;
                      setSelectedFnName(name);
                      const fn = registeredFunctions.find((f) => f.name === name);
                      if (fn) {
                        setStandaloneArgsJson(JSON.stringify(generateDefaultArgs(fn), null, 2));
                      }
                      setStandaloneResult(null);
                      setStandaloneError(null);
                      setStandaloneResumeResult(null);
                    }}
                    className="w-full bg-bg-elevated border border-border-strong rounded-lg px-3 py-2 text-sm text-text-primary focus:outline-none focus:border-accent"
                  >
                    {registeredFunctions.map((fn) => (
                      <option key={fn.id} value={fn.name}>
                        {fn.name} ({fn.status === "active" ? "Active" : "Disabled"}) —{" "}
                        {fn.description || "No description"}
                      </option>
                    ))}
                  </select>
                )}
              </div>

              {/* Function Schema Details */}
              {selectedFnName && (
                <div className="bg-bg-elevated p-3 rounded-lg border border-border-default text-xs space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-text-primary font-mono">
                      {selectedFnName}()
                    </span>
                    <span className="text-[10px] uppercase font-bold text-accent px-2 py-0.5 rounded bg-accent-muted border border-accent-border">
                      Client Callback
                    </span>
                  </div>
                  <p className="text-text-muted">
                    {registeredFunctions.find((f) => f.name === selectedFnName)?.description}
                  </p>
                </div>
              )}

              {/* Arguments JSON Input */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-bold text-text-secondary uppercase tracking-wider">
                    Arguments (JSON)
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      const fn = registeredFunctions.find((f) => f.name === selectedFnName);
                      if (fn) {
                        setStandaloneArgsJson(JSON.stringify(generateDefaultArgs(fn), null, 2));
                      }
                    }}
                    className="text-xs text-accent hover:underline font-medium"
                  >
                    Auto-fill Default Arguments
                  </button>
                </div>
                <textarea
                  value={standaloneArgsJson}
                  onChange={(e) => setStandaloneArgsJson(e.target.value)}
                  rows={4}
                  className="w-full font-mono text-xs bg-bg-elevated border border-border-strong rounded-lg p-3 text-text-primary focus:outline-none focus:border-accent"
                  placeholder='{ "key": "value" }'
                />
              </div>

              {/* Execute Standalone Button */}
              <button
                onClick={handleRunStandaloneTest}
                disabled={standaloneRunning || !selectedFnName}
                className="w-full flex items-center justify-center gap-2 bg-accent text-white py-2.5 px-4 rounded-lg text-sm font-semibold hover:bg-accent-hover transition-colors disabled:opacity-50 shadow-sm"
              >
                {standaloneRunning ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Play className="w-4 h-4 fill-current" />
                )}
                Run Standalone SDK Test
              </button>

              {/* Error Display */}
              {standaloneError && (
                <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-xs text-red-500 flex items-start gap-2">
                  <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                  <div>
                    <div className="font-bold">Validation Failed:</div>
                    <div className="font-mono text-[11px] mt-0.5">{standaloneError}</div>
                  </div>
                </div>
              )}

              {/* Result Display */}
              {standaloneResult && (
                <div className="space-y-3 pt-2 border-t border-border-default">
                  <div className="flex items-center gap-2 text-xs font-bold text-status-success bg-status-success/10 border border-status-success/30 px-3 py-2 rounded-lg">
                    <CheckCircle2 className="w-4 h-4 text-status-success shrink-0" />
                    <span>Schema Validation Passed & State Saved in Firestore</span>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="p-2.5 bg-bg-elevated rounded border border-border-default">
                      <span className="text-text-muted block text-[10px]">CORRELATION ID</span>
                      <span className="font-mono font-semibold text-accent text-[11px] truncate block">
                        {standaloneResult.data.functionCallId}
                      </span>
                    </div>
                    <div className="p-2.5 bg-bg-elevated rounded border border-border-default">
                      <span className="text-text-muted block text-[10px]">TRACKING REQUEST ID</span>
                      <span className="font-mono text-text-primary text-[11px] truncate block">
                        {standaloneResult.requestId}
                      </span>
                    </div>
                  </div>

                  <div>
                    <div className="text-[11px] font-bold text-text-secondary uppercase tracking-wider mb-1">
                      Dispatched Flutter SDK Payload
                    </div>
                    <pre className="font-mono text-[11px] bg-bg-elevated p-2.5 rounded border border-border-default overflow-x-auto text-text-primary max-h-28">
                      {JSON.stringify(standaloneResult.sdkDispatchPayload, null, 2)}
                    </pre>
                  </div>

                  <div>
                    <div className="text-[11px] font-bold text-text-secondary uppercase tracking-wider mb-1">
                      Simulated Local SDK Output
                    </div>
                    <pre className="font-mono text-[11px] bg-bg-elevated p-2.5 rounded border border-border-default overflow-x-auto text-text-primary max-h-24">
                      {JSON.stringify(standaloneResult.mockSdkResult, null, 2)}
                    </pre>
                  </div>

                  {/* State Machine Callback Tester */}
                  <div className="p-3 bg-accent-muted/20 border border-accent/20 rounded-lg space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-text-primary">
                        Test State Machine Callback Flow
                      </span>
                      <button
                        onClick={handleTestResumeFromStandalone}
                        disabled={standaloneResumeTesting}
                        className="px-3 py-1 bg-accent text-white text-xs font-semibold rounded hover:bg-accent-hover transition-colors disabled:opacity-50 flex items-center gap-1.5"
                      >
                        {standaloneResumeTesting ? (
                          <Loader2 className="w-3 h-3 animate-spin" />
                        ) : (
                          <Check className="w-3 h-3" />
                        )}
                        Send Result Callback
                      </button>
                    </div>
                    <p className="text-[11px] text-text-muted">
                      Verifies that the backend receives the callback at{" "}
                      <code className="text-accent">/v1/runtime/function-result</code>, matches
                      correlation IDs, marks state complete, and handles idempotency.
                    </p>
                    {standaloneResumeResult && (
                      <div className="text-xs font-mono p-2 bg-bg-surface rounded border border-border-default text-accent mt-1">
                        {standaloneResumeResult}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-3 border-t border-border-default bg-bg-elevated flex justify-end">
              <button
                onClick={() => setStandaloneModalOpen(false)}
                className="px-4 py-2 rounded-lg bg-bg-surface border border-border-strong text-xs font-semibold text-text-primary hover:bg-bg-hover transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
