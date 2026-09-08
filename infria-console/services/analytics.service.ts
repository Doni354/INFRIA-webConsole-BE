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

    const constraints: QueryConstraint[] = [
      where("createdAt", ">=", since.toDate().toISOString()),
      orderBy("createdAt", "desc"),
      limit(500), // Safety cap — we aggregate these in browser
    ];

    if (filters.source && filters.source !== "ALL") {
      constraints.unshift(where("source", "==", filters.source));
    }

    const snap = await getDocs(query(col, ...constraints));

    const entries = snap.docs.map((d) => d.data() as ActivityEntry);

    const metrics: AnalyticsMetrics = {
      totalRequests: entries.length,
      successfulRequests: entries.filter((e) => e.status === "SUCCESS").length,
      failedRequests: entries.filter((e) => e.status === "ERROR").length,
      functionCalls: entries.filter((e) => e.route === "FUNCTION").length,
      fallbacks: entries.filter((e) => e.status === "FALLBACK").length,
      avgLatencyMs:
        entries.length > 0
          ? Math.round(
              entries.reduce((acc, e) => acc + (e.latencyMs ?? 0), 0) /
                entries.length
            )
          : 0,
    };

    return metrics;
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
