import { AnalyticsMetrics, ActivityEntry, APIKey } from "@/types";
import { mockStore, generateApiKey, now } from "@/lib/mock-store";

const METRICS_KEY = (id: string) => `analytics_metrics_${id}`;
const ACTIVITY_KEY = (id: string) => `analytics_activity_${id}`;
const APIKEYS_KEY = (id: string) => `api_keys_${id}`;

function seedMetrics(projectId: string): AnalyticsMetrics {
  return {
    totalRequests: Math.floor(Math.random() * 2000) + 500,
    successfulRequests: Math.floor(Math.random() * 1800) + 400,
    failedRequests: Math.floor(Math.random() * 100) + 10,
    functionCalls: Math.floor(Math.random() * 500) + 50,
    fallbacks: Math.floor(Math.random() * 80) + 5,
    avgLatencyMs: Math.floor(Math.random() * 800) + 400,
  };
}

function seedActivity(projectId: string): ActivityEntry[] {
  const types: ActivityEntry["type"][] = ["chat", "function_call"];
  const fns = ["check_order_status", "get_appointment", "cancel_order"];
  const entries: ActivityEntry[] = [];
  for (let i = 0; i < 10; i++) {
    const type = types[Math.floor(Math.random() * types.length)];
    entries.push({
      id: `act_${i}`,
      projectId,
      timestamp: new Date(Date.now() - i * 90000).toISOString(),
      type,
      endpoint: type === "chat" ? "POST /v1/runtime/chat" : undefined,
      functionName:
        type === "function_call" ? fns[Math.floor(Math.random() * fns.length)] : undefined,
      status: Math.random() > 0.08 ? "success" : "error",
      latencyMs: Math.floor(Math.random() * 1500) + 200,
    });
  }
  return entries.sort(
    (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
  );
}

export const analyticsService = {
  async getMetrics(projectId: string): Promise<AnalyticsMetrics> {
    await delay(400);
    let metrics = mockStore.get<AnalyticsMetrics>(METRICS_KEY(projectId));
    if (!metrics) {
      metrics = seedMetrics(projectId);
      mockStore.set(METRICS_KEY(projectId), metrics);
    }
    return metrics;
  },

  async getActivity(projectId: string): Promise<ActivityEntry[]> {
    await delay(300);
    let activity = mockStore.getList<ActivityEntry>(ACTIVITY_KEY(projectId));
    if (activity.length === 0) {
      activity = seedActivity(projectId);
      mockStore.setList(ACTIVITY_KEY(projectId), activity);
    }
    return activity;
  },

  async getApiKeys(projectId: string): Promise<APIKey[]> {
    await delay(200);
    return mockStore.getList<APIKey>(APIKEYS_KEY(projectId));
  },

  async createApiKey(projectId: string, name: string): Promise<{ key: APIKey; rawKey: string }> {
    await delay(400);
    const rawKey = generateApiKey();
    const key: APIKey = {
      id: `key_${Date.now()}`,
      projectId,
      name,
      prefix: "infria_pk_",
      status: "active",
      createdAt: now(),
      lastUsed: null,
    };
    const existing = mockStore.getList<APIKey>(APIKEYS_KEY(projectId));
    existing.push(key);
    mockStore.setList(APIKEYS_KEY(projectId), existing);
    return { key, rawKey };
  },

  async revokeApiKey(projectId: string, keyId: string): Promise<void> {
    await delay(300);
    const keys = mockStore.getList<APIKey>(APIKEYS_KEY(projectId)).map((k) =>
      k.id === keyId ? { ...k, status: "revoked" as const } : k
    );
    mockStore.setList(APIKEYS_KEY(projectId), keys);
  },
};

function delay(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}
