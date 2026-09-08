"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { projectService } from "@/services/project.service";
import { runtimeTestService } from "@/services/runtime-test.service";
import { Project, PlaygroundMessage } from "@/types";
import {
  Loader2,
  Plus,
  Send,
  Bot,
  ArrowRight,
  BarChart2,
  BookOpen,
  Zap,
  Clock,
  ChevronRight,
  LogOut,
} from "lucide-react";
import { ThemeToggle } from "@/components/ui/ThemeToggle";
import { Badge } from "@/components/ui/Badge";
import Link from "next/link";

function generateId() {
  return Math.random().toString(36).slice(2);
}

function formatDate(iso: string) {
  try {
    return new Date(iso).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  } catch {
    return "—";
  }
}

export default function ConsoleLandingPage() {
  const { user, loading, signOut } = useAuth();
  const router = useRouter();
  const [projects, setProjects] = useState<Project[]>([]);
  const [fetching, setFetching] = useState(true);

  // Quick AI Test state
  const [selectedProjectId, setSelectedProjectId] = useState<string>("");
  const [sessionId] = useState(() => runtimeTestService.newSessionId("dashboard"));
  const [messages, setMessages] = useState<PlaygroundMessage[]>([]);
  const [inputMsg, setInputMsg] = useState("");
  const [aiLoading, setAiLoading] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!loading && !user) {
      router.replace("/login");
      return;
    }
    if (user) {
      projectService.list().then((data) => {
        setProjects(data);
        if (data.length > 0) setSelectedProjectId(data[0].id);
        setFetching(false);
      });
    }
  }, [user, loading, router]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, aiLoading]);

  async function handleAITest() {
    const text = inputMsg.trim();
    if (!text || aiLoading || !selectedProjectId) return;
    setInputMsg("");

    const userMsg: PlaygroundMessage = {
      id: generateId(),
      role: "user",
      content: text,
      timestamp: new Date().toISOString(),
    };
    setMessages((m) => [...m, userMsg]);
    setAiLoading(true);

    try {
      const result = await runtimeTestService.sendMessage({
        projectId: selectedProjectId,
        sessionId,
        message: text,
        source: "DASHBOARD",
      });

      const route: NonNullable<PlaygroundMessage["metadata"]>["route"] =
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
          route,
          requestId: result.requestId,
          sources: result.__trace?.ragChunksInjected,
          functionCall:
            result.type === "function_call"
              ? { name: result.data.function ?? "", args: result.data.args ?? {} }
              : undefined,
        },
      };
      setMessages((m) => [...m, aiMsg]);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to reach backend.";
      setMessages((m) => [
        ...m,
        {
          id: generateId(),
          role: "assistant",
          content: `Error: ${msg}`,
          timestamp: new Date().toISOString(),
        },
      ]);
    } finally {
      setAiLoading(false);
    }
  }


  async function handleSignOut() {
    await signOut();
    router.replace("/login");
  }

  if (loading || fetching) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-bg-base">
        <Loader2 className="h-7 w-7 text-accent animate-spin" />
      </div>
    );
  }

  if (!user) return null;

  const greeting = (() => {
    const h = new Date().getHours();
    if (h < 12) return "Good morning";
    if (h < 17) return "Good afternoon";
    return "Good evening";
  })();

  const firstName = user.displayName?.split(" ")[0] ?? "Developer";

  return (
    <div className="min-h-screen bg-bg-base text-text-primary flex flex-col">
      {/* Header */}
      <header className="h-14 border-b border-border-default bg-bg-surface px-6 flex items-center justify-between sticky top-0 z-20">
        <div className="flex items-center gap-3">
          {/* INFRIA Logo slot */}
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-md bg-accent flex items-center justify-center">
              <span className="text-white text-xs font-black">IN</span>
            </div>
            <span className="text-sm font-bold tracking-tight text-text-primary hidden sm:block">
              INFRIA
            </span>
          </div>
          <span className="text-border-strong hidden sm:block">|</span>
          <span className="text-sm font-medium text-text-muted hidden sm:block">
            Console
          </span>
        </div>

        <div className="flex items-center gap-3">
          <ThemeToggle />
          <div className="flex items-center gap-2.5 pl-3 border-l border-border-subtle">
            {user.photoURL ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={user.photoURL}
                alt={user.displayName ?? "avatar"}
                className="w-7 h-7 rounded-full border border-border-default"
              />
            ) : (
              <div className="w-7 h-7 rounded-full bg-accent-muted border border-accent-border flex items-center justify-center">
                <span className="text-accent text-xs font-semibold">
                  {user.displayName ? user.displayName[0].toUpperCase() : "U"}
                </span>
              </div>
            )}
            <span className="text-sm font-medium text-text-secondary hidden sm:inline-block">
              {firstName}
            </span>
          </div>
          <button
            onClick={handleSignOut}
            title="Sign Out"
            className="p-1.5 text-text-muted hover:text-status-error transition-colors"
            aria-label="Sign out"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </header>

      <main className="flex-1 overflow-y-auto w-full max-w-6xl mx-auto px-6 py-10">
        {/* Greeting */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-text-primary">
            {greeting}, {firstName} 👋
          </h1>
          <p className="text-text-muted text-sm mt-1">
            {user.email} &nbsp;·&nbsp; Personal Workspace
          </p>
        </div>

        {/* Projects Section */}
        <section className="mb-10">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-semibold text-text-primary">
              Projects
            </h2>
            <Link
              href="/new"
              className="flex items-center gap-1.5 px-3 py-1.5 bg-accent text-white text-sm font-medium rounded-md hover:bg-accent-hover transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              New Project
            </Link>
          </div>

          {projects.length === 0 ? (
            <div className="bg-bg-surface border border-border-default rounded-xl p-12 text-center">
              <div className="w-12 h-12 rounded-full bg-accent-muted border border-accent-border flex items-center justify-center mx-auto mb-4">
                <Plus className="w-5 h-5 text-accent" />
              </div>
              <h3 className="text-base font-semibold text-text-primary mb-1">
                No projects yet
              </h3>
              <p className="text-sm text-text-muted mb-6 max-w-sm mx-auto">
                Create your first INFRIA project to start building AI-powered
                infrastructure.
              </p>
              <Link
                href="/new"
                className="inline-flex items-center gap-2 px-4 py-2 bg-accent text-white text-sm font-medium rounded-md hover:bg-accent-hover transition-colors"
              >
                <Plus className="w-4 h-4" />
                Create Project
              </Link>
            </div>
          ) : (
            <div className="bg-bg-surface border border-border-default rounded-xl overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-bg-elevated border-b border-border-subtle">
                  <tr>
                    <th className="px-5 py-3 text-left text-xs font-semibold text-text-muted uppercase tracking-wider">
                      Project
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-text-muted uppercase tracking-wider hidden sm:table-cell">
                      Status
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-text-muted uppercase tracking-wider hidden md:table-cell">
                      Knowledge
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-text-muted uppercase tracking-wider hidden md:table-cell">
                      Functions
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-text-muted uppercase tracking-wider hidden lg:table-cell">
                      Created
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-text-muted uppercase tracking-wider">
                      Open
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border-subtle">
                  {projects.map((p) => (
                    <tr
                      key={p.id}
                      className="hover:bg-bg-hover transition-colors group"
                    >
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-lg bg-accent-muted border border-accent-border flex items-center justify-center text-accent font-bold text-sm flex-shrink-0">
                            {p.name.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <p className="font-semibold text-text-primary">
                              {p.name}
                            </p>
                            <p className="text-xs text-text-muted font-mono">
                              {p.id}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3.5 hidden sm:table-cell">
                        <Badge
                          variant={
                            p.status === "active" ? "success" : "default"
                          }
                        >
                          {p.status.toUpperCase()}
                        </Badge>
                      </td>
                      <td className="px-4 py-3.5 hidden md:table-cell">
                        <div className="flex items-center gap-1.5 text-text-secondary">
                          <BookOpen className="w-3.5 h-3.5 text-text-muted" />
                          <span>{p.knowledgeCount}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3.5 hidden md:table-cell">
                        <div className="flex items-center gap-1.5 text-text-secondary">
                          <Zap className="w-3.5 h-3.5 text-text-muted" />
                          <span>{p.functionCount}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3.5 hidden lg:table-cell">
                        <div className="flex items-center gap-1.5 text-text-muted text-xs">
                          <Clock className="w-3 h-3" />
                          {formatDate(p.createdAt)}
                        </div>
                      </td>
                      <td className="px-4 py-3.5 text-right">
                        <Link
                          href={`/${p.id}`}
                          className="inline-flex items-center gap-1 text-xs font-medium text-accent hover:underline"
                        >
                          Open
                          <ChevronRight className="w-3.5 h-3.5" />
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        {/* Quick AI Test */}
        <section className="mb-10">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-semibold text-text-primary">
              Quick AI Test
            </h2>
            {selectedProjectId && (
              <Link
                href={`/${selectedProjectId}/simulator`}
                className="flex items-center gap-1 text-xs text-accent hover:underline"
              >
                Full Simulator
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            )}
          </div>

          <div className="bg-bg-surface border border-border-default rounded-xl overflow-hidden">
            {/* Project selector for AI test */}
            {projects.length > 0 && (
              <div className="px-4 py-3 border-b border-border-subtle bg-bg-elevated flex items-center gap-3">
                <Bot className="w-4 h-4 text-accent flex-shrink-0" />
                <span className="text-sm text-text-muted">Testing project:</span>
                <select
                  value={selectedProjectId}
                  onChange={(e) => setSelectedProjectId(e.target.value)}
                  className="text-sm font-medium text-text-primary bg-transparent border-none outline-none cursor-pointer"
                  aria-label="Select project for AI test"
                >
                  {projects.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
                <div className="ml-auto flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-accent" />
                  <span className="text-xs text-text-muted">
                    Source: DASHBOARD
                  </span>
                </div>
              </div>
            )}

            {/* Chat messages */}
            <div className="h-64 overflow-y-auto px-4 py-4 flex flex-col gap-3 bg-bg-base">
              {messages.length === 0 && (
                <div className="flex flex-col items-center justify-center h-full gap-2 text-center">
                  <div className="flex gap-1.5">
                    {[0, 1, 2].map((i) => (
                      <div
                        key={i}
                        className="w-2 h-2 rounded-full bg-accent/30"
                        style={{ animationDelay: `${i * 0.15}s` }}
                      />
                    ))}
                  </div>
                  <p className="text-sm text-text-muted">
                    {projects.length === 0
                      ? "Create a project first to test AI."
                      : "Ask something to test your AI configuration..."}
                  </p>
                </div>
              )}

              {messages.map((msg) => (
                <div
                  key={msg.id}
                  className={`flex gap-2 ${
                    msg.role === "user" ? "justify-end" : "justify-start"
                  }`}
                >
                  {msg.role === "assistant" && (
                    <div className="w-6 h-6 rounded-full bg-accent-muted border border-accent-border flex items-center justify-center flex-shrink-0 mt-0.5">
                      <Bot className="w-3.5 h-3.5 text-accent" />
                    </div>
                  )}
                  <div className="max-w-[75%]">
                    <div
                      className={`px-3 py-2 rounded-lg text-sm leading-relaxed ${
                        msg.role === "user"
                          ? "bg-accent text-white"
                          : "bg-bg-surface border border-border-default text-text-primary"
                      }`}
                    >
                      {msg.content}
                    </div>
                    {msg.role === "assistant" && msg.metadata && (
                      <div className="flex items-center gap-3 mt-1 px-1 flex-wrap">
                        {msg.metadata.route && (
                          <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-bg-elevated text-text-muted uppercase">
                            {msg.metadata.route}
                          </span>
                        )}
                        {msg.metadata.latencyMs && (
                          <span className="text-[10px] text-text-muted">
                            {(msg.metadata.latencyMs / 1000).toFixed(2)}s
                          </span>
                        )}
                        {msg.metadata.requestId && (
                          <span className="text-[10px] font-mono text-text-muted">
                            {msg.metadata.requestId.slice(0, 12)}…
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              ))}

              {aiLoading && (
                <div className="flex gap-2">
                  <div className="w-6 h-6 rounded-full bg-accent-muted border border-accent-border flex items-center justify-center flex-shrink-0">
                    <Bot className="w-3.5 h-3.5 text-accent" />
                  </div>
                  <div className="bg-bg-surface border border-border-default rounded-lg px-3 py-2.5">
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
              <div ref={chatEndRef} />
            </div>

            {/* Input */}
            <div className="px-4 py-3 border-t border-border-subtle bg-bg-surface flex gap-2">
              <input
                type="text"
                value={inputMsg}
                onChange={(e) => setInputMsg(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleAITest()}
                placeholder={
                  projects.length === 0
                    ? "Create a project first..."
                    : "Ask INFRIA something..."
                }
                disabled={projects.length === 0 || aiLoading}
                className="flex-1 bg-bg-elevated border border-border-default text-text-primary rounded-md px-3 py-2 text-sm focus:outline-none focus:border-accent disabled:opacity-50 transition-colors"
              />
              <button
                onClick={handleAITest}
                disabled={!inputMsg.trim() || aiLoading || projects.length === 0}
                className="h-9 px-4 rounded-md bg-accent text-white font-medium flex items-center justify-center shrink-0 disabled:opacity-50 hover:bg-accent-hover transition-colors"
                aria-label="Send message"
              >
                {aiLoading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Send className="w-4 h-4" />
                )}
              </button>
            </div>
          </div>
        </section>

        {/* Quick Links */}
        {projects.length > 0 && selectedProjectId && (
          <section>
            <h2 className="text-base font-semibold text-text-primary mb-4">
              Quick Access
            </h2>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {[
                { label: "Knowledge", icon: BookOpen, href: `/${selectedProjectId}/knowledge`, desc: "Manage RAG content" },
                { label: "Functions", icon: Zap, href: `/${selectedProjectId}/functions`, desc: "Register callbacks" },
                { label: "Simulator", icon: BarChart2, href: `/${selectedProjectId}/simulator`, desc: "Full test environment" },
                { label: "Analytics", icon: BarChart2, href: `/${selectedProjectId}/analytics`, desc: "Runtime observability" },
              ].map((item) => (
                <Link
                  key={item.label}
                  href={item.href}
                  className="group bg-bg-surface border border-border-default rounded-xl p-4 hover:border-accent hover:bg-accent-muted/30 transition-all"
                >
                  <item.icon className="w-5 h-5 text-accent mb-2 group-hover:scale-110 transition-transform" />
                  <p className="text-sm font-semibold text-text-primary">
                    {item.label}
                  </p>
                  <p className="text-xs text-text-muted mt-0.5">{item.desc}</p>
                </Link>
              ))}
            </div>
          </section>
        )}
      </main>
    </div>
  );
}
