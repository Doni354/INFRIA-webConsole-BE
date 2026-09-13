"use client";

import React, { useEffect, useState, useCallback } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import {
  Activity,
  Clock,
  Zap,
  ZapOff,
  CheckCircle2,
  XCircle,
  ChevronDown,
  RefreshCcw,
  Loader2,
  Database,
  AlertTriangle,
  FileText,
  ArrowUpRight,
  Sparkles,
  Sliders,
  Layers,
  Search,
  ShieldCheck,
  Check,
  Copy,
  TerminalSquare,
  HelpCircle,
} from "lucide-react";
import {
  analyticsService,
  AnalyticsFilters,
} from "@/services/analytics.service";
import {
  AnalyticsMetrics,
  ActivityEntry,
  ExecutionSource,
  ExecutionRoute,
  ExecutionStatus,
} from "@/types";
import { DocumentSnapshot } from "firebase/firestore";

// ── Tag badge helpers ──────────────────────────────────────────

function SourceTag({ source }: { source: ExecutionSource }) {
  const map: Record<ExecutionSource, string> = {
    DASHBOARD: "bg-blue-500/10 text-blue-400 border-blue-500/20",
    SIMULATOR: "bg-accent-muted text-accent border-accent-border",
    SDK: "bg-purple-500/10 text-purple-400 border-purple-500/20",
  };
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold uppercase border ${map[source] ?? "bg-bg-elevated text-text-muted"}`}
    >
      {source}
    </span>
  );
}

function RouteTag({ route }: { route: ExecutionRoute }) {
  const map: Record<ExecutionRoute, string> = {
    RAG: "bg-yellow-500/10 text-yellow-400 border-yellow-500/20",
    FUNCTION: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
    DIRECT: "bg-bg-elevated text-text-muted border-border-default",
  };
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold uppercase border ${map[route] ?? ""}`}
    >
      {route}
    </span>
  );
}

function StatusTag({ status }: { status: ExecutionStatus }) {
  const map: Record<ExecutionStatus, string> = {
    SUCCESS: "bg-status-success/10 text-status-success border-status-success/20",
    ERROR: "bg-status-error/10 text-status-error border-status-error/20",
    FALLBACK: "bg-status-warning/10 text-status-warning border-status-warning/20",
  };
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold uppercase border ${map[status] ?? ""}`}
    >
      {status}
    </span>
  );
}

function EvidenceBadge({ level }: { level?: "HIGH" | "MEDIUM" | "LOW" | "NONE" | string }) {
  if (!level) return <span className="text-text-muted text-xs">—</span>;

  const map: Record<string, { bg: string; label: string }> = {
    HIGH: { bg: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20", label: "HIGH" },
    MEDIUM: { bg: "bg-yellow-500/10 text-yellow-400 border-yellow-500/20", label: "MEDIUM" },
    LOW: { bg: "bg-orange-500/10 text-orange-400 border-orange-500/20", label: "LOW" },
    NONE: { bg: "bg-red-500/10 text-red-400 border-red-500/20", label: "NONE" },
  };

  const style = map[level] || { bg: "bg-bg-elevated text-text-muted border-border-default", label: level };

  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold uppercase border ${style.bg}`}>
      {style.label}
    </span>
  );
}

function formatTs(iso: string) {
  try {
    return new Date(iso).toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
  } catch {
    return iso;
  }
}

// ── Execution Detail Drawer ────────────────────────────────────

function ExecutionDrawer({
  entry,
  onClose,
  projectId,
}: {
  entry: ActivityEntry;
  onClose: () => void;
  projectId: string;
}) {
  const [copied, setCopied] = useState(false);

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div
        className="flex-1 bg-black/40 backdrop-blur-sm"
        onClick={onClose}
        aria-label="Close execution detail"
      />
      <div className="w-full max-w-xl bg-bg-surface border-l border-border-default flex flex-col h-full shadow-2xl overflow-hidden animate-in slide-in-from-right duration-200">
        <div className="px-5 py-4 border-b border-border-subtle flex items-center justify-between bg-bg-elevated">
          <div>
            <h3 className="font-semibold text-text-primary text-sm flex items-center gap-2">
              <TerminalSquare className="w-4 h-4 text-accent" />
              Execution Deep Trace
            </h3>
            <p className="text-[11px] text-text-muted mt-0.5 font-mono">
              {entry.requestId || entry.id}
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-text-muted hover:text-text-primary p-1.5 rounded-lg hover:bg-bg-hover transition-colors text-xs font-medium"
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-4 text-xs">
          {/* Tags */}
          <div className="flex flex-wrap gap-2 items-center">
            <SourceTag source={entry.source} />
            <RouteTag route={entry.route} />
            <StatusTag status={entry.status} />
            <EvidenceBadge level={entry.evidenceLevel} />
            {entry.isKnowledgeGap && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-status-warning/10 text-status-warning border border-status-warning/20">
                <AlertTriangle className="w-3 h-3" />
                KNOWLEDGE GAP
              </span>
            )}
          </div>

          {/* User Query Card */}
          {entry.querySnippet && (
            <div className="bg-bg-elevated p-3.5 rounded-xl border border-border-subtle space-y-1">
              <span className="text-[10px] uppercase font-bold text-text-muted tracking-wider">
                User Query
              </span>
              <p className="text-sm font-medium text-text-primary">
                "{entry.querySnippet}"
              </p>
            </div>
          )}

          {/* Assistant Response Card */}
          {entry.responseSnippet && (
            <div className="bg-bg-elevated p-3.5 rounded-xl border border-border-subtle space-y-1">
              <span className="text-[10px] uppercase font-bold text-text-muted tracking-wider">
                Assistant Response
              </span>
              <p className="text-xs text-text-primary leading-relaxed whitespace-pre-wrap">
                {entry.responseSnippet}
              </p>
            </div>
          )}

          {/* Grounding & Evidence Analysis */}
          <div className="bg-bg-surface border border-border-default rounded-xl p-4 space-y-2.5">
            <span className="text-[10px] font-bold uppercase tracking-wider text-text-muted block">
              n8n Grounding & Evidence Reason
            </span>
            <div className="p-3 bg-bg-elevated rounded-lg border border-border-subtle">
              <p className="text-text-primary font-medium leading-relaxed">
                {entry.evidenceReason || "Evaluasi otomatis tidak memuat keterangan teks."}
              </p>
            </div>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="p-2 bg-bg-elevated rounded border border-border-subtle">
                <span className="text-[10px] text-text-muted uppercase font-bold block">Topic</span>
                <span className="font-semibold text-text-primary">{entry.topicCategory || "General"}</span>
              </div>
              <div className="p-2 bg-bg-elevated rounded border border-border-subtle">
                <span className="text-[10px] text-text-muted uppercase font-bold block">Latency</span>
                <span className="font-semibold text-text-primary">{entry.latencyMs ? `${entry.latencyMs}ms` : "—"}</span>
              </div>
            </div>
          </div>

          {/* RAG Context Chunks Inspector */}
          {entry.trace && (
            <div className="bg-bg-surface border border-border-default rounded-xl p-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold uppercase tracking-wider text-text-muted">
                  RAG Retrieval Telemetry
                </span>
                <span className="text-[11px] text-text-muted">
                  Threshold: {Math.round((entry.trace.ragThreshold ?? 0.7) * 100)}%
                </span>
              </div>

              <div className="grid grid-cols-3 gap-2 text-center text-xs">
                <div className="p-2 bg-bg-elevated rounded border border-border-subtle">
                  <span className="text-[10px] text-text-muted font-bold block uppercase">Chunks</span>
                  <span className="text-sm font-bold text-accent">{entry.trace.ragChunksInjected ?? 0}</span>
                </div>
                <div className="p-2 bg-bg-elevated rounded border border-border-subtle">
                  <span className="text-[10px] text-text-muted font-bold block uppercase">Top-K</span>
                  <span className="text-sm font-bold text-text-primary">{entry.trace.ragTopK ?? 5}</span>
                </div>
                <div className="p-2 bg-bg-elevated rounded border border-border-subtle">
                  <span className="text-[10px] text-text-muted font-bold block uppercase">Fallback</span>
                  <span className="text-sm font-bold text-yellow-500">{entry.trace.ragFallback ? "YES" : "NO"}</span>
                </div>
              </div>

              {entry.trace.chunksPreview && entry.trace.chunksPreview.length > 0 && (
                <div className="space-y-1.5 pt-1">
                  <span className="text-[10px] font-bold text-text-muted uppercase">Chunks Preview:</span>
                  {entry.trace.chunksPreview.map((chunk, i) => (
                    <div key={i} className="p-2 bg-bg-elevated rounded border border-border-subtle font-mono text-[10px] text-text-secondary leading-relaxed">
                      <span className="text-accent font-bold">#{i + 1}: </span>
                      {chunk}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Action Button if Gap */}
          {entry.isKnowledgeGap && (
            <div className="p-3.5 bg-status-warning/10 border border-status-warning/30 rounded-xl space-y-2">
              <p className="text-xs text-status-warning font-semibold">
                ⚠️ Pertanyaan ini belum didukung oleh dokumen Knowledge Base.
              </p>
              <Link
                href={`/${projectId}/knowledge/new?title=${encodeURIComponent(entry.topicCategory || entry.querySnippet || "")}`}
                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-accent text-white text-xs font-semibold hover:bg-accent-hover transition-colors"
              >
                + Buat Dokumen Baru di Knowledge Base
              </Link>
            </div>
          )}

          {/* Raw Metadata JSON */}
          <div className="border-t border-border-subtle pt-3">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[10px] uppercase font-bold text-text-muted tracking-wider">
                Raw Event JSON
              </span>
              <button
                onClick={() => {
                  navigator.clipboard.writeText(JSON.stringify(entry, null, 2));
                  setCopied(true);
                  setTimeout(() => setCopied(false), 2000);
                }}
                className="flex items-center gap-1 text-[11px] text-accent hover:underline"
              >
                {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                {copied ? "Copied" : "Copy"}
              </button>
            </div>
            <pre className="p-3 bg-bg-elevated rounded-xl border border-border-default font-mono text-[10px] overflow-x-auto max-h-48 text-text-primary">
              {JSON.stringify(entry, null, 2)}
            </pre>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Main Analytics Page ────────────────────────────────────────

export default function AnalyticsPage() {
  const { projectId } = useParams<{ projectId: string }>();

  const [filters, setFilters] = useState<AnalyticsFilters>({
    timeRange: "24h",
    source: "ALL",
    route: "ALL",
    status: "ALL",
  });

  const [metrics, setMetrics] = useState<AnalyticsMetrics | null>(null);
  const [metricsLoading, setMetricsLoading] = useState(true);
  const [metricsError, setMetricsError] = useState<string | null>(null);

  const [entries, setEntries] = useState<ActivityEntry[]>([]);
  const [cursor, setCursor] = useState<DocumentSnapshot | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [listLoading, setListLoading] = useState(true);
  const [listError, setListError] = useState<string | null>(null);
  const [loadingMore, setLoadingMore] = useState(false);

  const [selectedEntry, setSelectedEntry] = useState<ActivityEntry | null>(null);
  const [gapTab, setGapTab] = useState<"missing" | "ambiguous" | "outofscope">("missing");

  const loadMetrics = useCallback(async () => {
    setMetricsLoading(true);
    setMetricsError(null);
    try {
      const m = await analyticsService.getMetrics(projectId, filters);
      setMetrics(m);
    } catch (err: unknown) {
      setMetricsError(
        err instanceof Error ? err.message : "Failed to load metrics."
      );
    } finally {
      setMetricsLoading(false);
    }
  }, [projectId, filters]);

  const loadEntries = useCallback(
    async (reset = true) => {
      if (reset) {
        setListLoading(true);
        setListError(null);
        setCursor(null);
      } else {
        setLoadingMore(true);
      }

      try {
        const result = await analyticsService.getActivity(
          projectId,
          filters,
          reset ? null : cursor
        );
        setEntries((prev) => (reset ? result.entries : [...prev, ...result.entries]));
        setCursor(result.cursor);
        setHasMore(result.hasMore);
      } catch (err: unknown) {
        const msg =
          err instanceof Error ? err.message : "Failed to load executions.";
        if (reset) setListError(msg);
      } finally {
        setListLoading(false);
        setLoadingMore(false);
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [projectId, filters]
  );

  // Load on filter change
  useEffect(() => {
    loadMetrics();
    loadEntries(true);
  }, [loadMetrics, loadEntries]);

  const totalReq = metrics?.totalRequests ?? 0;
  const ev = metrics?.evidenceBreakdown ?? { high: 0, medium: 0, low: 0, none: 0 };
  const pHigh = totalReq > 0 ? Math.round((ev.high / totalReq) * 100) : 0;
  const pMedium = totalReq > 0 ? Math.round((ev.medium / totalReq) * 100) : 0;
  const pLow = totalReq > 0 ? Math.round((ev.low / totalReq) * 100) : 0;
  const pNone = totalReq > 0 ? Math.round((ev.none / totalReq) * 100) : 0;

  return (
    <div className="flex flex-col gap-6 w-full pb-16">
      {/* Page Header + Filters */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-text-primary flex items-center gap-2">
            AI Observability & Analytics
          </h1>
          <p className="text-text-muted text-sm mt-0.5">
            Knowledge health monitor, grounding metrics, and runtime observability for{" "}
            <span className="font-mono text-text-secondary">{projectId}</span>
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Source filter */}
          <div className="relative">
            <select
              value={filters.source ?? "ALL"}
              onChange={(e) =>
                setFilters((f) => ({
                  ...f,
                  source: e.target.value as ExecutionSource | "ALL",
                }))
              }
              className="appearance-none text-xs px-3 py-1.5 pr-7 bg-bg-surface border border-border-default rounded-lg text-text-secondary focus:outline-none focus:border-accent cursor-pointer font-medium"
              aria-label="Filter by source"
            >
              <option value="ALL">Source: All Traffic</option>
              <option value="SDK">SDK (Live Production)</option>
              <option value="SIMULATOR">Simulator (Test Runs)</option>
              <option value="DASHBOARD">Dashboard</option>
            </select>
            <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-text-muted pointer-events-none" />
          </div>

          {/* Time Range */}
          <div className="flex items-center bg-bg-surface border border-border-default rounded-lg overflow-hidden text-xs">
            {(["24h", "7d", "30d"] as const).map((r) => (
              <button
                key={r}
                onClick={() => setFilters((f) => ({ ...f, timeRange: r }))}
                className={`px-3 py-1.5 transition-colors ${
                  filters.timeRange === r
                    ? "bg-accent text-white font-semibold"
                    : "text-text-secondary hover:bg-bg-hover"
                }`}
              >
                {r}
              </button>
            ))}
          </div>

          {/* Refresh */}
          <button
            onClick={() => {
              loadMetrics();
              loadEntries(true);
            }}
            className="p-2 bg-bg-surface border border-border-default rounded-lg text-text-muted hover:text-accent transition-colors"
            aria-label="Refresh analytics"
          >
            <RefreshCcw className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* ── Grounding Health & Executive KPIs ────────────────────── */}
      {metricsError ? (
        <div className="bg-status-error/10 border border-status-error/30 rounded-xl px-5 py-4 text-sm text-status-error">
          {metricsError}
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
          {/* Grounding Health Meter (5 cols) */}
          <div className="lg:col-span-5 bg-bg-surface border border-border-default rounded-2xl p-5 flex flex-col justify-between shadow-sm">
            <div>
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-text-muted flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-accent" />
                  Grounding Health Score
                </span>
                <span
                  className={`text-xs font-bold px-2.5 py-0.5 rounded-full ${
                    (metrics?.groundingScore ?? 100) >= 80
                      ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                      : (metrics?.groundingScore ?? 100) >= 60
                      ? "bg-yellow-500/10 text-yellow-400 border border-yellow-500/20"
                      : "bg-red-500/10 text-red-400 border border-red-500/20"
                  }`}
                >
                  {(metrics?.groundingScore ?? 100) >= 80 ? "Fully Grounded" : "Needs Refinement"}
                </span>
              </div>

              <div className="flex items-baseline gap-3 my-3">
                <span className="text-4xl font-extrabold text-text-primary tracking-tight">
                  {metricsLoading ? "—" : `${metrics?.groundingScore ?? 100}%`}
                </span>
                <span className="text-xs text-text-muted">
                  jawaban AI didukung data Knowledge Base valid (HIGH + MEDIUM)
                </span>
              </div>

              {/* Segmented Evidence Bar */}
              <div className="space-y-1.5">
                <div className="w-full h-3 rounded-full overflow-hidden bg-bg-elevated flex">
                  {pHigh > 0 && (
                    <div
                      style={{ width: `${pHigh}%` }}
                      className="bg-emerald-500 transition-all duration-500"
                      title={`HIGH: ${pHigh}%`}
                    />
                  )}
                  {pMedium > 0 && (
                    <div
                      style={{ width: `${pMedium}%` }}
                      className="bg-yellow-500 transition-all duration-500"
                      title={`MEDIUM: ${pMedium}%`}
                    />
                  )}
                  {pLow > 0 && (
                    <div
                      style={{ width: `${pLow}%` }}
                      className="bg-orange-500 transition-all duration-500"
                      title={`LOW: ${pLow}%`}
                    />
                  )}
                  {pNone > 0 && (
                    <div
                      style={{ width: `${pNone}%` }}
                      className="bg-red-500 transition-all duration-500"
                      title={`NONE: ${pNone}%`}
                    />
                  )}
                  {totalReq === 0 && (
                    <div className="w-full bg-border-default opacity-40" />
                  )}
                </div>

                <div className="grid grid-cols-4 gap-1 text-[11px] pt-1">
                  <div className="flex items-center gap-1 text-text-secondary">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
                    <span>High: {ev.high}</span>
                  </div>
                  <div className="flex items-center gap-1 text-text-secondary">
                    <span className="w-2 h-2 rounded-full bg-yellow-500 shrink-0" />
                    <span>Med: {ev.medium}</span>
                  </div>
                  <div className="flex items-center gap-1 text-text-secondary">
                    <span className="w-2 h-2 rounded-full bg-orange-500 shrink-0" />
                    <span>Low: {ev.low}</span>
                  </div>
                  <div className="flex items-center gap-1 text-text-secondary">
                    <span className="w-2 h-2 rounded-full bg-red-500 shrink-0" />
                    <span>None: {ev.none}</span>
                  </div>
                </div>
              </div>
            </div>

            <p className="text-[11px] text-text-muted border-t border-border-subtle pt-2.5 mt-3">
              💡 <strong>Tips:</strong> Pertanyaan ambigu dinilai <strong>MEDIUM</strong> (perlu edit dokumen), sedangkan pertanyaan out-of-scope/iseng tidak merusak reputasi KB.
            </p>
          </div>

          {/* KPI Grid (7 cols) */}
          <div className="lg:col-span-7 grid grid-cols-2 sm:grid-cols-3 gap-3">
            {[
              {
                title: "Total Requests",
                value: metrics?.totalRequests.toLocaleString() ?? "0",
                icon: <Activity className="w-4 h-4 text-accent" />,
                subtitle: `${metrics?.successfulRequests ?? 0} sukses`,
              },
              {
                title: "True Knowledge Gaps",
                value: metrics?.trueGapsCount.toLocaleString() ?? "0",
                icon: <AlertTriangle className="w-4 h-4 text-status-warning" />,
                subtitle: "pertanyaan tanpa data KB",
                highlight: (metrics?.trueGapsCount ?? 0) > 0,
              },
              {
                title: "Dokumen Ambigu",
                value: metrics?.ambiguousDocsCount.toLocaleString() ?? "0",
                icon: <HelpCircle className="w-4 h-4 text-yellow-400" />,
                subtitle: "evidence level MEDIUM",
              },
              {
                title: "Function Calls",
                value: metrics?.functionCalls.toLocaleString() ?? "0",
                icon: <Zap className="w-4 h-4 text-emerald-400" />,
                subtitle: "intersep capability",
              },
              {
                title: "RAG Hit Rate",
                value: `${metrics?.ragHitRate ?? 100}%`,
                icon: <Database className="w-4 h-4 text-accent" />,
                subtitle: `avg ${metrics?.avgRetrievalSources ?? 0} chunk`,
              },
              {
                title: "Avg Latency",
                value: metrics?.avgLatencyMs ? `${metrics.avgLatencyMs}ms` : "—",
                icon: <Clock className="w-4 h-4 text-text-muted" />,
                subtitle: "runtime end-to-end",
              },
            ].map((kpi, idx) => (
              <div
                key={idx}
                className={`bg-bg-surface border rounded-xl p-4 flex flex-col justify-between shadow-sm ${
                  kpi.highlight
                    ? "border-status-warning/40 bg-status-warning/5"
                    : "border-border-default"
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs text-text-muted font-medium">
                    {kpi.title}
                  </span>
                  {kpi.icon}
                </div>
                <div>
                  <p className="text-xl font-bold text-text-primary">
                    {metricsLoading ? "—" : kpi.value}
                  </p>
                  <p className="text-[11px] text-text-muted mt-0.5 truncate">
                    {kpi.subtitle}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Knowledge Gap & Query Intelligence ("Data nya ada belum?") ── */}
      <div className="bg-bg-surface border border-border-default rounded-2xl overflow-hidden shadow-sm">
        <div className="p-5 border-b border-border-default bg-bg-elevated flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div>
            <h3 className="font-bold text-text-primary text-base flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-accent" />
              Knowledge Gap & Query Intelligence
            </h3>
            <p className="text-xs text-text-muted mt-0.5">
              Analisa pertanyaan pelanggan: apakah dokumen pendukung sudah tersedia di Knowledge Base atau butuh perbaikan.
            </p>
          </div>

          {/* Filter Tabs */}
          <div className="flex items-center bg-bg-surface border border-border-default rounded-lg p-1 text-xs">
            <button
              onClick={() => setGapTab("missing")}
              className={`px-3 py-1.5 rounded-md font-semibold transition-colors ${
                gapTab === "missing"
                  ? "bg-status-warning/20 text-status-warning font-bold"
                  : "text-text-muted hover:text-text-primary"
              }`}
            >
              🚨 Missing Data ({metrics?.trueGapsCount ?? 0})
            </button>
            <button
              onClick={() => setGapTab("ambiguous")}
              className={`px-3 py-1.5 rounded-md font-semibold transition-colors ${
                gapTab === "ambiguous"
                  ? "bg-yellow-500/20 text-yellow-400 font-bold"
                  : "text-text-muted hover:text-text-primary"
              }`}
            >
              ⚠️ Ambigu ({metrics?.ambiguousDocsCount ?? 0})
            </button>
            <button
              onClick={() => setGapTab("outofscope")}
              className={`px-3 py-1.5 rounded-md font-semibold transition-colors ${
                gapTab === "outofscope"
                  ? "bg-accent/20 text-accent font-bold"
                  : "text-text-muted hover:text-text-primary"
              }`}
            >
              ℹ️ Out of Scope ({metrics?.outOfScopeCount ?? 0})
            </button>
          </div>
        </div>

        <div className="p-5">
          {gapTab === "missing" && (
            <div className="space-y-3">
              {!metrics?.trueGaps || metrics.trueGaps.length === 0 ? (
                <div className="text-center py-10 text-xs text-text-muted space-y-1">
                  <CheckCircle2 className="w-8 h-8 text-status-success mx-auto mb-2" />
                  <p className="font-semibold text-text-primary">
                    Tidak ada Knowledge Gap terdeteksi!
                  </p>
                  <p>Semua pertanyaan bisnis pengguna berhasil dijawab oleh Knowledge Base Anda.</p>
                </div>
              ) : (
                metrics.trueGaps.map((gap, i) => (
                  <div
                    key={i}
                    className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-3.5 bg-bg-elevated rounded-xl border border-border-subtle hover:border-status-warning/40 transition-colors"
                  >
                    <div className="space-y-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-status-warning/10 text-status-warning uppercase">
                          Gap Prioritas Tinggi
                        </span>
                        <span className="text-[10px] font-medium text-text-muted">
                          Topik: <strong className="text-text-primary">{gap.topicCategory}</strong>
                        </span>
                        <span className="text-[10px] font-mono text-text-muted">
                          Ditanyakan {gap.count}x
                        </span>
                      </div>
                      <p className="text-sm font-semibold text-text-primary">
                        "{gap.querySnippet}"
                      </p>
                      {gap.evidenceReason && (
                        <p className="text-xs text-text-muted italic">
                          💡 Catatan Evaluasi: {gap.evidenceReason}
                        </p>
                      )}
                    </div>

                    <Link
                      href={`/${projectId}/knowledge/new?title=${encodeURIComponent(gap.topicCategory || gap.querySnippet)}`}
                      className="shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-accent text-white text-xs font-semibold hover:bg-accent-hover transition-colors shadow-sm"
                    >
                      + Tambah Dokumen
                    </Link>
                  </div>
                ))
              )}
            </div>
          )}

          {gapTab === "ambiguous" && (
            <div className="space-y-3">
              {!metrics?.ambiguousDocs || metrics.ambiguousDocs.length === 0 ? (
                <div className="text-center py-10 text-xs text-text-muted space-y-1">
                  <CheckCircle2 className="w-8 h-8 text-status-success mx-auto mb-2" />
                  <p className="font-semibold text-text-primary">
                    Tidak ada dokumen ambigu!
                  </p>
                  <p>Semua jawaban berbasis RAG memiliki tingkat kepastian tinggi (HIGH).</p>
                </div>
              ) : (
                metrics.ambiguousDocs.map((item, i) => (
                  <div
                    key={i}
                    className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-3.5 bg-bg-elevated rounded-xl border border-border-subtle hover:border-yellow-500/40 transition-colors"
                  >
                    <div className="space-y-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-yellow-500/10 text-yellow-400 uppercase">
                          Evidence MEDIUM (Ambigu)
                        </span>
                        <span className="text-[10px] font-medium text-text-muted">
                          Topik: <strong className="text-text-primary">{item.topicCategory}</strong>
                        </span>
                        <span className="text-[10px] font-mono text-text-muted">
                          Ditanyakan {item.count}x
                        </span>
                      </div>
                      <p className="text-sm font-semibold text-text-primary">
                        "{item.querySnippet}"
                      </p>
                      {item.evidenceReason && (
                        <p className="text-xs text-yellow-500/90 leading-relaxed">
                          ⚠️ {item.evidenceReason}
                        </p>
                      )}
                    </div>

                    <Link
                      href={`/${projectId}/knowledge`}
                      className="shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border-default text-text-primary text-xs font-semibold hover:bg-bg-hover transition-colors"
                    >
                      Review Dokumen KB
                    </Link>
                  </div>
                ))
              )}
            </div>
          )}

          {gapTab === "outofscope" && (
            <div className="space-y-3">
              {!metrics?.outOfScopeQueries || metrics.outOfScopeQueries.length === 0 ? (
                <div className="text-center py-10 text-xs text-text-muted space-y-1">
                  <p className="font-semibold text-text-primary">
                    Tidak ada pertanyaan di luar lingkup.
                  </p>
                  <p>Semua pertanyaan yang masuk terfokus pada domain aplikasi Anda.</p>
                </div>
              ) : (
                <>
                  <div className="p-3 bg-accent/5 border border-accent/20 rounded-xl text-xs text-text-muted mb-3 leading-relaxed">
                    ℹ️ <strong>Pertanyaan Di Luar Lingkup (Non-Domain):</strong> Pertanyaan umum, sapaan, atau pertanyaan yang tidak masuk akal bagi aplikasi Anda. Ditandai agar <strong>tidak merusak skor kelengkapan dokumen Knowledge Base</strong> Anda.
                  </div>
                  {metrics.outOfScopeQueries.map((item, i) => (
                    <div
                      key={i}
                      className="flex items-center justify-between gap-3 p-3 bg-bg-elevated rounded-xl border border-border-subtle"
                    >
                      <div className="space-y-0.5 min-w-0">
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-bg-surface text-text-muted uppercase">
                          {item.topicCategory}
                        </span>
                        <p className="text-xs font-medium text-text-primary truncate">
                          "{item.querySnippet}"
                        </p>
                      </div>
                      <span className="text-xs font-mono text-text-muted shrink-0">
                        {item.count}x
                      </span>
                    </div>
                  ))}
                </>
              )}
            </div>
          )}
        </div>
      </div>

      {/* ── 2-Column Section: Top Topics & AI Config Diagnostics ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Left: Top Inquired Topics */}
        <div className="bg-bg-surface border border-border-default rounded-2xl p-5 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-text-primary text-sm flex items-center gap-2">
              <Layers className="w-4 h-4 text-accent" />
              Top Inquired Topics
            </h3>
            <span className="text-xs text-text-muted">Distribusi Minat User</span>
          </div>

          {!metrics?.topTopics || metrics.topTopics.length === 0 ? (
            <div className="text-center py-8 text-xs text-text-muted">
              Belum ada topik pertanyaan yang tercatat.
            </div>
          ) : (
            <div className="space-y-2.5">
              {metrics.topTopics.slice(0, 6).map((topic, i) => (
                <div key={i} className="space-y-1">
                  <div className="flex justify-between text-xs font-medium">
                    <span className="text-text-primary truncate">{topic.category}</span>
                    <span className="text-text-muted font-mono">{topic.count} ({topic.percentage}%)</span>
                  </div>
                  <div className="w-full h-2 bg-bg-elevated rounded-full overflow-hidden">
                    <div
                      className="h-full bg-accent rounded-full transition-all duration-500"
                      style={{ width: `${Math.max(topic.percentage, 5)}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Right: AI Config & Function Calling Diagnostics */}
        <div className="bg-bg-surface border border-border-default rounded-2xl p-5 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-text-primary text-sm flex items-center gap-2">
              <Sliders className="w-4 h-4 text-accent" />
              AI Config & Capability Advisor
            </h3>
            <span className="text-xs text-text-muted">Auto Recommendations</span>
          </div>

          {/* RAG Threshold Advisory */}
          <div className="p-3.5 bg-bg-elevated rounded-xl border border-border-subtle space-y-2">
            <span className="text-[10px] font-bold uppercase tracking-wider text-text-muted block">
              RAG Retrieval Performance
            </span>
            <div className="flex items-center justify-between text-xs">
              <span className="text-text-muted">Chunk Hit Rate:</span>
              <span className="font-bold text-text-primary">{metrics?.ragHitRate ?? 100}%</span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-text-muted">Average Chunks Pulled:</span>
              <span className="font-bold text-text-primary">{metrics?.avgRetrievalSources ?? 0}</span>
            </div>
            <p className="text-[11px] text-text-muted leading-relaxed pt-1 border-t border-border-subtle">
              {(metrics?.ragHitRate ?? 100) < 70
                ? "⚠️ Tingkat fallback cukup tinggi (>30%). Pertimbangkan menurunkan retrievalThreshold di AI Config ke 0.60 atau menambah variasi sinonim."
                : "✅ Pengambilan chunk RAG berjalan optimal. Dokumen cocok dengan query pengguna."}
            </p>
          </div>

          {/* Function Calling Opportunities */}
          <div className="space-y-2">
            <span className="text-[10px] font-bold uppercase tracking-wider text-text-muted block">
              Saran Function Calling Baru
            </span>
            {!metrics?.functionOpportunities || metrics.functionOpportunities.length === 0 ? (
              <div className="text-xs text-text-muted py-2">
                Tidak ada kebutuhan function calling baru yang terdeteksi dari query user.
              </div>
            ) : (
              metrics.functionOpportunities.slice(0, 3).map((opp, idx) => (
                <div key={idx} className="p-2.5 bg-accent/5 border border-accent/20 rounded-lg text-xs flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    <span className="font-mono font-bold text-accent">
                      {opp.suggestedFunction}()
                    </span>
                    <p className="text-[11px] text-text-muted truncate">
                      Pemicu: "{opp.querySnippet}"
                    </p>
                  </div>
                  <Link
                    href={`/${projectId}/functions/new?name=${encodeURIComponent(opp.suggestedFunction)}`}
                    className="text-[11px] font-semibold text-accent hover:underline shrink-0"
                  >
                    + Buat
                  </Link>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* ── Recent Executions Table ──────────────────────────────── */}
      <div className="bg-bg-surface border border-border-default rounded-2xl overflow-hidden shadow-sm">
        <div className="px-5 py-4 border-b border-border-default flex flex-col sm:flex-row gap-3 sm:items-center justify-between bg-bg-elevated">
          <div>
            <h3 className="font-bold text-text-primary text-sm">
              Recent Executions Log
            </h3>
            <p className="text-xs text-text-muted">
              Klik pada baris untuk membuka Deep Trace Drawer lengkap dengan evaluasi n8n & RAG chunks.
            </p>
          </div>

          {/* Route filter */}
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative">
              <select
                value={filters.route ?? "ALL"}
                onChange={(e) =>
                  setFilters((f) => ({
                    ...f,
                    route: e.target.value as ExecutionRoute | "ALL",
                  }))
                }
                className="appearance-none text-xs px-3 py-1.5 pr-6 bg-bg-surface border border-border-default rounded-md text-text-secondary focus:outline-none focus:border-accent cursor-pointer"
                aria-label="Filter by route"
              >
                <option value="ALL">Route: All</option>
                <option value="RAG">RAG</option>
                <option value="FUNCTION">FUNCTION</option>
                <option value="DIRECT">DIRECT</option>
              </select>
              <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3 h-3 text-text-muted pointer-events-none" />
            </div>

            {/* Status filter */}
            <div className="relative">
              <select
                value={filters.status ?? "ALL"}
                onChange={(e) =>
                  setFilters((f) => ({
                    ...f,
                    status: e.target.value as ExecutionStatus | "ALL",
                  }))
                }
                className="appearance-none text-xs px-3 py-1.5 pr-6 bg-bg-surface border border-border-default rounded-md text-text-secondary focus:outline-none focus:border-accent cursor-pointer"
                aria-label="Filter by status"
              >
                <option value="ALL">Status: All</option>
                <option value="SUCCESS">SUCCESS</option>
                <option value="ERROR">ERROR</option>
                <option value="FALLBACK">FALLBACK</option>
              </select>
              <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3 h-3 text-text-muted pointer-events-none" />
            </div>
          </div>
        </div>

        {/* Table */}
        {listLoading ? (
          <div className="flex items-center justify-center py-16 gap-2 text-text-muted">
            <Loader2 className="w-4 h-4 animate-spin text-accent" />
            <span className="text-sm">Loading executions…</span>
          </div>
        ) : listError ? (
          <div className="px-5 py-8 text-sm text-status-error text-center">
            {listError}
          </div>
        ) : entries.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 gap-3 text-center">
            <Database className="w-8 h-8 text-text-muted" />
            <p className="text-sm font-medium text-text-secondary">
              No executions found
            </p>
            <p className="text-xs text-text-muted max-w-xs">
              Uji AI pada Simulator atau lakukan request melalui SDK untuk mencatat log runtime.
            </p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="border-b border-border-subtle text-text-muted text-xs bg-bg-surface">
                  <tr>
                    <th className="px-5 py-3 font-semibold uppercase tracking-wider">
                      Time
                    </th>
                    <th className="px-4 py-3 font-semibold uppercase tracking-wider">
                      Query Snippet
                    </th>
                    <th className="px-4 py-3 font-semibold uppercase tracking-wider">
                      Source
                    </th>
                    <th className="px-4 py-3 font-semibold uppercase tracking-wider">
                      Route
                    </th>
                    <th className="px-4 py-3 font-semibold uppercase tracking-wider">
                      Evidence
                    </th>
                    <th className="px-4 py-3 font-semibold uppercase tracking-wider hidden md:table-cell">
                      Latency
                    </th>
                    <th className="px-4 py-3 font-semibold uppercase tracking-wider">
                      Status
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border-subtle">
                  {entries.map((entry) => (
                    <tr
                      key={entry.id}
                      onClick={() => setSelectedEntry(entry)}
                      className="hover:bg-bg-hover transition-colors cursor-pointer group"
                    >
                      <td className="px-5 py-3 text-text-muted text-xs tabular-nums whitespace-nowrap">
                        {formatTs(entry.timestamp)}
                      </td>
                      <td className="px-4 py-3 text-xs max-w-xs truncate text-text-primary font-medium">
                        {entry.querySnippet || (entry.functionName ? `fn: ${entry.functionName}()` : "—")}
                      </td>
                      <td className="px-4 py-3">
                        <SourceTag source={entry.source} />
                      </td>
                      <td className="px-4 py-3">
                        <RouteTag route={entry.route} />
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1.5">
                          <EvidenceBadge level={entry.evidenceLevel} />
                          {entry.isKnowledgeGap && (
                            <span className="text-[10px] text-status-warning font-bold" title="Knowledge Gap">
                              ⚠️
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-text-secondary text-xs hidden md:table-cell">
                        {entry.latencyMs ? `${entry.latencyMs}ms` : "—"}
                      </td>
                      <td className="px-4 py-3">
                        <StatusTag status={entry.status} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Load More */}
            {hasMore && (
              <div className="px-5 py-4 border-t border-border-subtle text-center">
                <button
                  onClick={() => loadEntries(false)}
                  disabled={loadingMore}
                  className="flex items-center gap-2 mx-auto text-sm font-medium text-accent hover:underline disabled:opacity-50"
                >
                  {loadingMore ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <ChevronDown className="w-3.5 h-3.5" />
                  )}
                  Load more
                </button>
              </div>
            )}
          </>
        )}
      </div>

      {/* Execution Detail Drawer */}
      {selectedEntry && (
        <ExecutionDrawer
          entry={selectedEntry}
          onClose={() => setSelectedEntry(null)}
          projectId={projectId}
        />
      )}
    </div>
  );
}
