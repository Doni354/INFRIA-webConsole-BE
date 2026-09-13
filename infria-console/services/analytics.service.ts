/**
 * Analytics Service
 *
 * Queries Firestore analyticsEvents subcollection with:
 * - Scoped to projectId (never fetches across projects)
 * - Time window filter applied at query level
 * - Source / Route / Status filters (indexed)
 * - limit() + cursor-based pagination
 * - No unbounded reads
 *
 * Analytics events are written to:
 *   users/{uid}/projects/{projectId}/analyticsEvents/{eventId}
 *
 * Firestore indexes required (firestore.indexes.json):
 *   projectId + createdAt (desc)
 *   projectId + source + createdAt (desc)
 *   projectId + route + createdAt (desc)
 *   projectId + status + createdAt (desc)
 */

"use client";

import {
  getDocs,
  query,
  where,
  orderBy,
  limit,
  startAfter,
  DocumentSnapshot,
  Timestamp,
  QueryConstraint,
  addDoc,
} from "firebase/firestore";
import { auth } from "@/lib/firebase";
import { analyticsEventsCol } from "@/lib/firestore-helpers";
import {
  AnalyticsMetrics,
  ActivityEntry,
  ExecutionSource,
  ExecutionRoute,
  ExecutionStatus,
} from "@/types";

const PAGE_SIZE = 20;

function getUid(): string {
  const uid = auth.currentUser?.uid;
  if (!uid) throw new Error("Not authenticated");
  return uid;
}

/** Returns a Date that is `hours` before now */
function hoursAgo(hours: number): Date {
  const d = new Date();
  d.setHours(d.getHours() - hours);
  return d;
}

function timeWindowHours(range: "24h" | "7d" | "30d"): number {
  switch (range) {
    case "24h":
      return 24;
    case "7d":
      return 168;
    case "30d":
      return 720;
  }
}

export interface AnalyticsFilters {
  timeRange?: "24h" | "7d" | "30d";
  source?: ExecutionSource | "ALL";
  route?: ExecutionRoute | "ALL";
  status?: ExecutionStatus | "ALL";
}

export interface PaginatedEvents {
  entries: ActivityEntry[];
  cursor: DocumentSnapshot | null;
  hasMore: boolean;
}

export const analyticsService = {
  /**
   * Get aggregate metrics for a project within a time window.
   * Reads all events in range (capped for efficiency by time filter).
   */
  async getMetrics(
    projectId: string,
    filters: AnalyticsFilters = {}
  ): Promise<AnalyticsMetrics> {
    const uid = getUid();
    const col = analyticsEventsCol(uid, projectId);
    const hours = timeWindowHours(filters.timeRange ?? "24h");
    const since = Timestamp.fromDate(hoursAgo(hours));

    let snap;
    try {
      const constraints: QueryConstraint[] = [
        where("createdAt", ">=", since.toDate().toISOString()),
        orderBy("createdAt", "desc"),
        limit(500),
      ];

      if (filters.source && filters.source !== "ALL") {
        constraints.unshift(where("source", "==", filters.source));
      }

      snap = await getDocs(query(col, ...constraints));
    } catch {
      // Fallback in case compound index is still building or missing
      const constraints: QueryConstraint[] = [
        where("createdAt", ">=", since.toDate().toISOString()),
        limit(500),
      ];
      snap = await getDocs(query(col, ...constraints));
    }

    let entries = snap.docs.map((d) => ({ id: d.id, ...d.data() } as ActivityEntry));

    // In-memory filter if source was not applied at query level
    if (filters.source && filters.source !== "ALL") {
      entries = entries.filter((e) => e.source === filters.source);
    }
    if (filters.route && filters.route !== "ALL") {
      entries = entries.filter((e) => e.route === filters.route);
    }
    if (filters.status && filters.status !== "ALL") {
      entries = entries.filter((e) => e.status === filters.status);
    }

    const totalRequests = entries.length;
    const successfulRequests = entries.filter((e) => e.status === "SUCCESS").length;
    const failedRequests = entries.filter((e) => e.status === "ERROR").length;
    const functionCalls = entries.filter((e) => e.route === "FUNCTION").length;
    const fallbacks = entries.filter((e) => e.status === "FALLBACK").length;

    const avgLatencyMs =
      totalRequests > 0
        ? Math.round(
            entries.reduce((acc, e) => acc + (e.latencyMs ?? 0), 0) /
              totalRequests
          )
        : 0;

    // ── Evidence & Grounding Breakdown ─────────────────────────
    const high = entries.filter((e) => e.evidenceLevel === "HIGH").length;
    const medium = entries.filter((e) => e.evidenceLevel === "MEDIUM").length;
    const low = entries.filter((e) => e.evidenceLevel === "LOW").length;
    const none = entries.filter((e) => !e.evidenceLevel || e.evidenceLevel === "NONE").length;

    const groundingScore =
      totalRequests > 0
        ? Math.round(((high + medium) / totalRequests) * 100)
        : 100;

    // ── Knowledge Gaps & Query Intelligence ─────────────────────
    // Helper to group by query snippet or topic
    const trueGapsMap = new Map<string, { topicCategory: string; querySnippet: string; evidenceReason?: string; count: number; lastSeen: string }>();
    const ambiguousDocsMap = new Map<string, { topicCategory: string; querySnippet: string; evidenceReason?: string; count: number; lastSeen: string }>();
    const outOfScopeMap = new Map<string, { topicCategory: string; querySnippet: string; count: number; lastSeen: string }>();

    for (const e of entries) {
      const q = (e.querySnippet || "").trim() || "Query tanpa teks";
      const topic = e.topicCategory || "General";
      const isOffTopic =
        topic.toLowerCase().includes("out of scope") ||
        topic.toLowerCase().includes("chit-chat") ||
        (!e.isKnowledgeGap && (e.evidenceLevel === "LOW" || e.evidenceLevel === "NONE"));

      if (e.isKnowledgeGap) {
        // True knowledge gap (business question without documents)
        const existing = trueGapsMap.get(q);
        if (existing) {
          existing.count += 1;
        } else {
          trueGapsMap.set(q, {
            topicCategory: topic,
            querySnippet: q,
            evidenceReason: e.evidenceReason,
            count: 1,
            lastSeen: e.timestamp,
          });
        }
      } else if (e.evidenceLevel === "MEDIUM") {
        // Ambiguous documents (data exists in KB, but needs clarification)
        const existing = ambiguousDocsMap.get(q);
        if (existing) {
          existing.count += 1;
        } else {
          ambiguousDocsMap.set(q, {
            topicCategory: topic,
            querySnippet: q,
            evidenceReason: e.evidenceReason,
            count: 1,
            lastSeen: e.timestamp,
          });
        }
      } else if (isOffTopic) {
        // Out of scope / chit-chat (nonsensical or not related to app)
        const existing = outOfScopeMap.get(q);
        if (existing) {
          existing.count += 1;
        } else {
          outOfScopeMap.set(q, {
            topicCategory: topic,
            querySnippet: q,
            count: 1,
            lastSeen: e.timestamp,
          });
        }
      }
    }

    const trueGaps = Array.from(trueGapsMap.values()).sort((a, b) => b.count - a.count);
    const ambiguousDocs = Array.from(ambiguousDocsMap.values()).sort((a, b) => b.count - a.count);
    const outOfScopeQueries = Array.from(outOfScopeMap.values()).sort((a, b) => b.count - a.count);

    // ── Top Topics Breakdown ────────────────────────────────────
    const topicCountMap = new Map<string, number>();
    for (const e of entries) {
      const t = e.topicCategory || "General Inquiry";
      topicCountMap.set(t, (topicCountMap.get(t) || 0) + 1);
    }

    const topTopics = Array.from(topicCountMap.entries())
      .map(([category, count]) => ({
        category,
        count,
        percentage: totalRequests > 0 ? Math.round((count / totalRequests) * 100) : 0,
      }))
      .sort((a, b) => b.count - a.count);

    // ── RAG Health ──────────────────────────────────────────────
    const ragEntries = entries.filter((e) => e.route === "RAG" || (e.retrievalSources != null && e.retrievalSources > 0));
    const ragWithChunks = ragEntries.filter((e) => (e.retrievalSources ?? 0) > 0).length;
    const ragHitRate =
      ragEntries.length > 0
        ? Math.round((ragWithChunks / ragEntries.length) * 100)
        : 100;

    const avgRetrievalSources =
      ragEntries.length > 0
        ? Number(
            (
              ragEntries.reduce((acc, e) => acc + (e.retrievalSources ?? 0), 0) /
              ragEntries.length
            ).toFixed(1)
          )
        : 0;

    // ── Function Calling Breakdown & Opportunities ─────────────
    const functionCountMap = new Map<string, number>();
    for (const e of entries) {
      if (e.route === "FUNCTION" && e.functionName) {
        functionCountMap.set(e.functionName, (functionCountMap.get(e.functionName) || 0) + 1);
      }
    }
    const functionBreakdown = Array.from(functionCountMap.entries()).map(([functionName, count]) => ({
      functionName,
      count,
    }));

    // Opportunity detector for questions with action intent that were not handled by a function
    const oppMap = new Map<string, { querySnippet: string; suggestedFunction: string; count: number }>();
    for (const e of entries) {
      if (e.route !== "FUNCTION" && e.querySnippet) {
        const qLower = e.querySnippet.toLowerCase();
        let suggested: string | null = null;
        if (qLower.includes("lacak") || qLower.includes("resi") || qLower.includes("posisi kurir")) {
          suggested = "track_shipment";
        } else if (qLower.includes("status pesanan") || qLower.includes("order status")) {
          suggested = "check_order_status";
        } else if (qLower.includes("batal") || qLower.includes("cancel")) {
          suggested = "cancel_order";
        } else if (qLower.includes("saldo") || qLower.includes("poin") || qLower.includes("voucher")) {
          suggested = "check_user_balance";
        } else if (qLower.includes("ubah alamat") || qLower.includes("ganti lokasi")) {
          suggested = "update_delivery_address";
        }

        if (suggested) {
          const key = `${suggested}_${e.querySnippet}`;
          const existing = oppMap.get(key);
          if (existing) {
            existing.count += 1;
          } else {
            oppMap.set(key, { querySnippet: e.querySnippet, suggestedFunction: suggested, count: 1 });
          }
        }
      }
    }
    const functionOpportunities = Array.from(oppMap.values()).sort((a, b) => b.count - a.count).slice(0, 10);

    return {
      totalRequests,
      successfulRequests,
      failedRequests,
      functionCalls,
      fallbacks,
      avgLatencyMs,
      groundingScore,
      evidenceBreakdown: { high, medium, low, none },
      trueGapsCount: trueGaps.reduce((acc, g) => acc + g.count, 0),
      ambiguousDocsCount: ambiguousDocs.reduce((acc, g) => acc + g.count, 0),
      outOfScopeCount: outOfScopeQueries.reduce((acc, g) => acc + g.count, 0),
      trueGaps,
      ambiguousDocs,
      outOfScopeQueries,
      topTopics,
      ragHitRate,
      avgRetrievalSources,
      functionBreakdown,
      functionOpportunities,
    };
  },

  /**
   * Get paginated recent executions with optional filters.
   * Uses cursor-based pagination — pass cursor from previous call for next page.
   */
  async getActivity(
    projectId: string,
    filters: AnalyticsFilters = {},
    cursor?: DocumentSnapshot | null
  ): Promise<PaginatedEvents> {
    const uid = getUid();
    const col = analyticsEventsCol(uid, projectId);
    const hours = timeWindowHours(filters.timeRange ?? "24h");
    const since = Timestamp.fromDate(hoursAgo(hours));

    const constraints: QueryConstraint[] = [
      where("createdAt", ">=", since.toDate().toISOString()),
      orderBy("createdAt", "desc"),
    ];

    if (filters.source && filters.source !== "ALL") {
      constraints.push(where("source", "==", filters.source));
    }
    if (filters.route && filters.route !== "ALL") {
      constraints.push(where("route", "==", filters.route));
    }
    if (filters.status && filters.status !== "ALL") {
      constraints.push(where("status", "==", filters.status));
    }

    if (cursor) {
      constraints.push(startAfter(cursor));
    }

    constraints.push(limit(PAGE_SIZE + 1)); // fetch one extra to detect hasMore

    const snap = await getDocs(query(col, ...constraints));

    const hasMore = snap.docs.length > PAGE_SIZE;
    const docs = hasMore ? snap.docs.slice(0, PAGE_SIZE) : snap.docs;
    const lastCursor = docs.length > 0 ? docs[docs.length - 1] : null;

    const entries = docs.map((d) => ({
      id: d.id,
      ...d.data(),
    })) as ActivityEntry[];

    return { entries, cursor: lastCursor, hasMore };
  },

  /**
   * Record an analytics event after a runtime test execution.
   * Called by runtime-test.service after a successful/failed call.
   */
  async recordEvent(
    projectId: string,
    event: Omit<ActivityEntry, "id" | "projectId">
  ): Promise<void> {
    const uid = getUid();
    const col = analyticsEventsCol(uid, projectId);
    await addDoc(col, {
      projectId,
      ...event,
      createdAt: event.timestamp ?? new Date().toISOString(),
    });
  },
};
