"use client";

import React, { useEffect, useState, useCallback } from "react";
import { useParams } from "next/navigation";
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
}: {
  entry: ActivityEntry;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div
        className="flex-1 bg-black/40"
        onClick={onClose}
        aria-label="Close execution detail"
      />
      <div className="w-full max-w-md bg-bg-surface border-l border-border-default flex flex-col h-full shadow-2xl">
        <div className="px-5 py-4 border-b border-border-subtle flex items-center justify-between">
          <h3 className="font-semibold text-text-primary text-sm">
            Execution Detail
          </h3>
          <button
            onClick={onClose}
            className="text-text-muted hover:text-text-primary transition-colors text-xs font-medium"
            aria-label="Close"
          >
            ✕
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-5 space-y-5">
          <div className="flex flex-wrap gap-2">
            <SourceTag source={entry.source} />
            <RouteTag route={entry.route} />
            <StatusTag status={entry.status} />
          </div>

          {[
            { label: "Request ID", value: entry.requestId ?? "—", mono: true },
            { label: "Timestamp", value: entry.timestamp, mono: false },
            { label: "Latency", value: entry.latencyMs ? `${entry.latencyMs}ms` : "—", mono: false },
            { label: "Function", value: entry.functionName ?? "—", mono: true },
            { label: "Retrieval Sources", value: entry.retrievalSources != null ? String(entry.retrievalSources) : "—", mono: false },
          ].map(({ label, value, mono }) => (
            <div key={label} className="border-t border-border-subtle pt-4">
              <p className="text-[10px] font-semibold text-text-muted uppercase tracking-wider mb-1">
                {label}
              </p>
              <p
                className={`text-sm text-text-primary break-all ${mono ? "font-mono" : ""}`}
              >
                {value}
              </p>
            </div>
          ))}
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

  const metricCards = metrics
    ? [
        {
          title: "Total Requests",
          value: metrics.totalRequests.toLocaleString(),
          icon: <Activity className="w-4 h-4 text-accent" />,
          color: "accent",
        },
        {
          title: "Successful",
          value: metrics.successfulRequests.toLocaleString(),
          icon: <CheckCircle2 className="w-4 h-4 text-status-success" />,
          color: "success",
        },
        {
          title: "Failed",
          value: metrics.failedRequests.toLocaleString(),
          icon: <XCircle className="w-4 h-4 text-status-error" />,
          color: "error",
        },
        {
          title: "Function Calls",
          value: metrics.functionCalls.toLocaleString(),
          icon: <Zap className="w-4 h-4 text-yellow-400" />,
          color: "warning",
        },
        {
          title: "Fallbacks",
          value: metrics.fallbacks.toLocaleString(),
          icon: <ZapOff className="w-4 h-4 text-status-warning" />,
          color: "warning",
        },
        {
          title: "Avg Latency",
          value: metrics.avgLatencyMs > 0 ? `${metrics.avgLatencyMs}ms` : "—",
          icon: <Clock className="w-4 h-4 text-text-muted" />,
          color: "muted",
        },
      ]
    : [];

  return (
    <div className="flex flex-col gap-6 w-full pb-12">
      {/* Page Header + Filters */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">Analytics</h1>
          <p className="text-text-muted text-sm mt-0.5">
            Runtime observability for project{" "}
            <span className="font-mono text-text-secondary">{projectId}</span>
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Time Range */}
          <div className="flex items-center bg-bg-surface border border-border-default rounded-lg overflow-hidden text-sm">
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
            onClick={() => { loadMetrics(); loadEntries(true); }}
            className="p-1.5 text-text-muted hover:text-accent transition-colors"
            aria-label="Refresh analytics"
          >
            <RefreshCcw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Metric Cards */}
      {metricsError ? (
        <div className="bg-status-error/10 border border-status-error/30 rounded-xl px-5 py-4 text-sm text-status-error">
          {metricsError}
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {metricsLoading
            ? Array(6).fill(0).map((_, i) => (
                <div
                  key={i}
                  className="bg-bg-surface border border-border-default rounded-xl p-4 h-20 animate-pulse"
                />
              ))
            : metricCards.map((m) => (
                <div
                  key={m.title}
                  className="bg-bg-surface border border-border-default rounded-xl p-4"
                >
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-xs text-text-muted">{m.title}</p>
                    {m.icon}
                  </div>
                  <p className="text-xl font-bold text-text-primary">{m.value}</p>
                </div>
              ))}
        </div>
      )}

      {/* Recent Executions */}
      <div className="bg-bg-surface border border-border-default rounded-xl overflow-hidden">
        {/* Table header + row filters */}
        <div className="px-5 py-4 border-b border-border-default flex flex-col sm:flex-row gap-3 sm:items-center justify-between bg-bg-elevated">
          <h3 className="font-semibold text-text-primary">
            Recent Executions
          </h3>

          <div className="flex flex-wrap gap-2">
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
                className="appearance-none text-xs px-3 py-1.5 pr-6 bg-bg-surface border border-border-default rounded-md text-text-secondary focus:outline-none focus:border-accent cursor-pointer"
                aria-label="Filter by source"
              >
                <option value="ALL">Source: All</option>
                <option value="DASHBOARD">DASHBOARD</option>
                <option value="SIMULATOR">SIMULATOR</option>
                <option value="SDK">SDK</option>
              </select>
              <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3 h-3 text-text-muted pointer-events-none" />
            </div>

            {/* Route filter */}
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
              Run the Simulator or integrate the SDK to create your first
              runtime execution.
            </p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="border-b border-border-subtle text-text-muted text-xs">
                  <tr>
                    <th className="px-5 py-3 font-semibold uppercase tracking-wider">
                      Time
                    </th>
                    <th className="px-4 py-3 font-semibold uppercase tracking-wider hidden sm:table-cell">
                      Request ID
                    </th>
                    <th className="px-4 py-3 font-semibold uppercase tracking-wider">
                      Source
                    </th>
                    <th className="px-4 py-3 font-semibold uppercase tracking-wider">
                      Route
                    </th>
                    <th className="px-4 py-3 font-semibold uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-4 py-3 font-semibold uppercase tracking-wider hidden md:table-cell">
                      Latency
                    </th>
                    <th className="px-4 py-3 font-semibold uppercase tracking-wider hidden lg:table-cell">
                      Function
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border-subtle">
                  {entries.map((entry) => (
                    <tr
                      key={entry.id}
                      onClick={() => setSelectedEntry(entry)}
                      className="hover:bg-bg-hover transition-colors cursor-pointer"
                    >
                      <td className="px-5 py-3 text-text-muted text-xs tabular-nums whitespace-nowrap">
                        {formatTs(entry.timestamp)}
                      </td>
                      <td className="px-4 py-3 font-mono text-text-muted text-xs hidden sm:table-cell">
                        {entry.requestId
                          ? entry.requestId.slice(0, 12) + "…"
                          : "—"}
                      </td>
                      <td className="px-4 py-3">
                        <SourceTag source={entry.source} />
                      </td>
                      <td className="px-4 py-3">
                        <RouteTag route={entry.route} />
                      </td>
                      <td className="px-4 py-3">
                        <StatusTag status={entry.status} />
                      </td>
                      <td className="px-4 py-3 text-text-secondary text-xs hidden md:table-cell">
                        {entry.latencyMs ? `${entry.latencyMs}ms` : "—"}
                      </td>
                      <td className="px-4 py-3 font-mono text-text-muted text-xs hidden lg:table-cell">
                        {entry.functionName ?? "—"}
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
        />
      )}
    </div>
  );
}
