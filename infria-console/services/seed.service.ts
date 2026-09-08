"use client";

import {
  collection,
  doc,
  getDocs,
  setDoc,
  addDoc,
  deleteDoc,
  writeBatch,
} from "firebase/firestore";
import { db, auth } from "@/lib/firebase";
import {
  projectDoc,
  aiConfigDoc,
  knowledgeCol,
  functionsCol,
  analyticsEventsCol,
  chatSessionsCol,
  chatSessionDoc,
  chatMessagesCol,
  now,
} from "@/lib/firestore-helpers";
import { Project, AIConfig, Knowledge, ConsoleFunction, APIKey, ActivityEntry } from "@/types";

export interface SeedUserOption {
  uid: string;
  email?: string;
  displayName?: string;
  photoURL?: string;
}

export interface SeedPresetOption {
  id: string;
  name: string;
  description: string;
  projectId: string;
  projectName: string;
}

export const SEED_PRESETS: SeedPresetOption[] = [
  {
    id: "ecommerce",
    name: "Acme E-Commerce & Retail",
    description: "Retail customer assistant with order tracking, product stock lookup, return policies, and promo discounts.",
    projectId: "acme-store-demo",
    projectName: "Acme E-Commerce AI",
  },
  {
    id: "saas",
    name: "CloudScale Platform & API",
    description: "Developer platform assistant with API documentation, rate limits, subscription tiers, and server status checks.",
    projectId: "cloudscale-api-demo",
    projectName: "CloudScale AI Platform",
  },
];

export const DEMO_PROMPTS = [
  {
    category: "Function Calling",
    prompt: "Where is my order #ORD-94821? I ordered it two days ago.",
    description: "Triggers checkOrderStatus tool with order ID parameter.",
  },
  {
    category: "Function Calling",
    prompt: "Do you have stock for SKU WHEAT-HOODIE-M in California warehouse?",
    description: "Triggers lookupProductInventory tool with SKU parameter.",
  },
  {
    category: "Knowledge Base",
    prompt: "How many days do I have to return an opened jacket?",
    description: "Retrieves Return & Refund Policy document (30-day window).",
  },
  {
    category: "Knowledge Base",
    prompt: "Do you offer free international shipping, and how long does it take?",
    description: "Retrieves Shipping Rates and Delivery Timeframes document.",
  },
  {
    category: "Knowledge Base",
    prompt: "Is there any discount coupon code for first-time buyers?",
    description: "Retrieves Acme VIP Rewards & Promo document (WELCOME10 code).",
  },
];

export const seedService = {
  /**
   * Fetch known accounts/users from Auth & LocalStorage to populate the account selector
   * Avoids querying /users directly to satisfy restrictive security rules.
   */
  async getAvailableAccounts(): Promise<SeedUserOption[]> {
    const list: SeedUserOption[] = [];
    const current = auth.currentUser;

    if (current) {
      list.push({
        uid: current.uid,
        email: current.email || "Current User",
        displayName: current.displayName || current.email?.split("@")[0] || "Logged In Account",
        photoURL: current.photoURL || undefined,
      });
    }

    try {
      if (typeof window !== "undefined") {
        const raw = localStorage.getItem("infria_known_accounts");
        if (raw) {
          const stored: SeedUserOption[] = JSON.parse(raw);
          stored.forEach((s) => {
            if (!list.some((u) => u.uid === s.uid)) {
              list.push(s);
            }
          });
        }
      }
    } catch {
      // ignore parse error
    }

    return list;
  },

  /**
   * Inject full dummy data for a target user account
   */
  async injectSeedData(targetUid: string, presetId: string = "ecommerce"): Promise<{ projectId: string; projectName: string }> {
    if (!targetUid) throw new Error("Target User ID is required");

    const currentUid = auth.currentUser?.uid;
    if (currentUid && targetUid !== currentUid) {
      // Warn about rule constraint if target is different from current auth
      console.warn(`[Seed] Target UID (${targetUid}) differs from current logged-in user (${currentUid}).`);
    }

    const preset = SEED_PRESETS.find((p) => p.id === presetId) || SEED_PRESETS[0];
    const projectId = preset.projectId;
    const pDocRef = projectDoc(targetUid, projectId);

    try {
      // 1. Project Document
      const projectData: Project = {
        id: projectId,
        name: preset.projectName,
        description: preset.description,
        platform: "flutter",
        status: "active",
        publicApiKey: "infria_pk_live_acme98234710923847",
      knowledgeCount: 4,
      functionCount: 3,
      createdAt: new Date(Date.now() - 7 * 24 * 3600 * 1000).toISOString(),
      updatedAt: now(),
    };
    await setDoc(pDocRef, projectData, { merge: true });

    // 2. AI Config
    const aiConfigData: AIConfig = {
      projectId,
      assistantName: "Acme Assistant",
      role: "Customer Support",
      language: "English",
      tone: "friendly",
      providerModel: "gpt-4o-mini",
      providerApiKey: null,
      systemInstructions:
        "You are the official Acme Store customer assistant. Help customers with their orders, returns, shipping inquiries, and store promotions. Use the available functions to check live order status and look up product stock when requested. Always be courteous, helpful, and concise.",
      fallbackMessage:
        "I apologize, but I do not have enough information to answer that question right now. Please reach out to our human support team at support@acme-store.com.",
      retrievalTopK: 4,
      retrievalThreshold: 0.75,
      knowledgeEnabled: true,
      functionCallingEnabled: true,
    };
    await setDoc(aiConfigDoc(targetUid, projectId), aiConfigData, { merge: true });

    // 3. Knowledge Base
    const knowledgeItems = [
      {
        title: "Return and Refund Policy",
        category: "Customer Support",
        content:
          "We accept returns within 30 days of delivery for a full refund or store credit. Items must be unworn, in original packaging with tags intact. Final sale items and gift cards are non-refundable. Standard return shipping is completely free using our pre-paid return label. Refunds are processed back to the original payment method within 3 to 5 business days after our warehouse inspects the returned item.",
        status: "ready" as const,
        chunkCount: 3,
      },
      {
        title: "Shipping Rates & Delivery Timeframes",
        category: "Logistics",
        content:
          "We offer Standard Shipping (3-5 business days, free on orders over $50, otherwise $5.99 flat rate), Express Shipping (1-2 business days, $14.99), and International Shipping to over 45 countries (7-14 business days, customs duties calculated at checkout). Tracking numbers are generated and emailed as soon as the package departs our fulfillment center.",
        status: "ready" as const,
        chunkCount: 4,
      },
      {
        title: "Acme VIP Rewards & Promo Codes",
        category: "Promotions",
        content:
          "Acme VIP members earn 1 point per $1 spent. 100 points can be redeemed for a $10 discount coupon. Promotional discount codes cannot be combined with existing clearance sale markdowns or flash deals unless explicitly stated. First-time shoppers can use code WELCOME10 for 10% off full-priced items.",
        status: "ready" as const,
        chunkCount: 2,
      },
      {
        title: "Account Security & 2FA Reset",
        category: "Security",
        content:
          "Two-Factor Authentication (2FA) is available in Account Settings via SMS or Authenticator App. If you forget your password, click Forgot Password on the login screen to receive a secure 6-digit one-time reset link via email valid for 15 minutes.",
        status: "ready" as const,
        chunkCount: 2,
      },
    ];

    const kCol = knowledgeCol(targetUid, projectId);
    for (const item of knowledgeItems) {
      await addDoc(kCol, {
        projectId,
        ...item,
        createdAt: new Date(Date.now() - 5 * 24 * 3600 * 1000).toISOString(),
        updatedAt: now(),
      });
    }

    // 4. Function Tools
    const functionTools = [
      {
        name: "checkOrderStatus",
        description: "Lookup live shipping and delivery status by order tracking number.",
        parameters: {
          type: "object",
          properties: {
            orderId: { type: "string", description: "The order number e.g. ORD-94821" },
            email: { type: "string", description: "Customer email associated with the order" },
          },
          required: ["orderId"],
        },
        execution: { type: "client_callback" as const },
        requiresAuth: false,
        requiresConfirmation: false,
        status: "active" as const,
      },
      {
        name: "lookupProductInventory",
        description: "Check available stock quantity and warehouse location by product SKU.",
        parameters: {
          type: "object",
          properties: {
            sku: { type: "string", description: "Product SKU code e.g. WHEAT-HOODIE-M" },
            region: { type: "string", description: "Optional shipping region or warehouse ID" },
          },
          required: ["sku"],
        },
        execution: { type: "client_callback" as const },
        requiresAuth: false,
        requiresConfirmation: false,
        status: "active" as const,
      },
      {
        name: "applyPromoCoupon",
        description: "Validate customer promotional discount coupon and calculate discounted subtotal.",
        parameters: {
          type: "object",
          properties: {
            couponCode: { type: "string", description: "The coupon code e.g. WELCOME10" },
            cartTotal: { type: "number", description: "Current cart subtotal in USD" },
          },
          required: ["couponCode", "cartTotal"],
        },
        execution: { type: "client_callback" as const },
        requiresAuth: true,
        requiresConfirmation: true,
        status: "active" as const,
      },
    ];

    const fCol = functionsCol(targetUid, projectId);
    for (const fn of functionTools) {
      await addDoc(fCol, {
        projectId,
        ...fn,
        createdAt: new Date(Date.now() - 5 * 24 * 3600 * 1000).toISOString(),
        updatedAt: now(),
      });
    }

    // 5. API Keys
    const apiKeys = [
      {
        name: "Flutter Mobile Client Key",
        prefix: "infria_pk_live_acme98••••",
        status: "active" as const,
        environment: "production",
      },
      {
        name: "Backend Server Secret Key",
        prefix: "infria_sk_live_sec881••••",
        status: "active" as const,
        environment: "production",
      },
      {
        name: "Staging & Testing Key",
        prefix: "infria_pk_test_dev991••••",
        status: "active" as const,
        environment: "development",
      },
    ];

    const keyColRef = collection(db, "users", targetUid, "projects", projectId, "api_keys");
    for (const key of apiKeys) {
      await addDoc(keyColRef, {
        projectId,
        ...key,
        createdAt: new Date(Date.now() - 6 * 24 * 3600 * 1000).toISOString(),
        lastUsed: new Date(Date.now() - 2 * 3600 * 1000).toISOString(),
      });
    }

    // 6. Connected Apps (both in Firestore & LocalStorage)
    const mockApps = [
      { id: "app-flutter-shop", name: "Acme Store Flutter App", platform: "flutter", packageInfo: "com.acme.shop.app" },
      { id: "app-web-storefront", name: "Acme Web Storefront", platform: "web", packageInfo: "https://shop.acme.com" },
      { id: "app-pos-terminal", name: "Acme POS Terminal (iPad)", platform: "ios", packageInfo: "com.acme.pos.terminal" },
    ];
    try {
      localStorage.setItem(`infria_apps_${projectId}`, JSON.stringify(mockApps));
    } catch {}

    const appColRef = collection(db, "users", targetUid, "projects", projectId, "connected_apps");
    for (const app of mockApps) {
      await setDoc(doc(appColRef, app.id), {
        ...app,
        projectId,
        createdAt: new Date(Date.now() - 6 * 24 * 3600 * 1000).toISOString(),
      });
    }

    // 7. Analytics & Activity Logs (Past 5 days realistic events)
    const eventsColRef = analyticsEventsCol(targetUid, projectId);
    const mockEvents: Array<Omit<ActivityEntry, "id" | "projectId">> = [
      {
        timestamp: new Date(Date.now() - 15 * 60 * 1000).toISOString(),
        route: "FUNCTION",
        source: "SDK",
        appName: "Acme Store Flutter App",
        status: "SUCCESS",
        latencyMs: 342,
        functionName: "checkOrderStatus",
      },
      {
        timestamp: new Date(Date.now() - 45 * 60 * 1000).toISOString(),
        route: "RAG",
        source: "SDK",
        appName: "Acme Web Storefront",
        status: "SUCCESS",
        latencyMs: 275,
        retrievalSources: 2,
      },
      {
        timestamp: new Date(Date.now() - 2 * 3600 * 1000).toISOString(),
        route: "FUNCTION",
        source: "SDK",
        appName: "Acme Store Flutter App",
        status: "SUCCESS",
        latencyMs: 395,
        functionName: "lookupProductInventory",
      },
      {
        timestamp: new Date(Date.now() - 5 * 3600 * 1000).toISOString(),
        route: "RAG",
        source: "SDK",
        appName: "Acme Store Flutter App",
        status: "SUCCESS",
        latencyMs: 290,
        retrievalSources: 1,
      },
      {
        timestamp: new Date(Date.now() - 12 * 3600 * 1000).toISOString(),
        route: "RAG",
        source: "SDK",
        appName: "Acme Web Storefront",
        status: "SUCCESS",
        latencyMs: 255,
        retrievalSources: 2,
      },
      {
        timestamp: new Date(Date.now() - 24 * 3600 * 1000).toISOString(),
        route: "RAG",
        source: "SIMULATOR",
        appName: "Console Simulator",
        status: "SUCCESS",
        latencyMs: 315,
        retrievalSources: 3,
      },
      {
        timestamp: new Date(Date.now() - 36 * 3600 * 1000).toISOString(),
        route: "DIRECT",
        source: "SDK",
        appName: "Acme Store Flutter App",
        status: "FALLBACK",
        latencyMs: 190,
      },
    ];

    for (const ev of mockEvents) {
      await addDoc(eventsColRef, {
        projectId,
        ...ev,
        createdAt: ev.timestamp,
      });
    }

    // 8. Chat Sessions & Messages in Simulator
    const session1Id = "session_order_tracking";
    await setDoc(chatSessionDoc(targetUid, projectId, session1Id), {
      id: session1Id,
      projectId,
      title: "Order #ORD-94821 Status & Delivery",
      source: "SIMULATOR",
      messageCount: 2,
      createdAt: new Date(Date.now() - 3 * 3600 * 1000).toISOString(),
      updatedAt: new Date(Date.now() - 3 * 3600 * 1000).toISOString(),
    });

    const s1MsgCol = chatMessagesCol(targetUid, projectId, session1Id);
    await addDoc(s1MsgCol, {
      role: "user",
      content: "Where is my order #ORD-94821? I ordered it two days ago.",
      timestamp: new Date(Date.now() - 3 * 3600 * 1000).toISOString(),
    });
    await addDoc(s1MsgCol, {
      role: "assistant",
      content:
        "Your order **#ORD-94821** is on its way! It was dispatched via FedEx Express (Tracking: `789210982341`) and is currently out for delivery in your local area. Estimated delivery is today by 5:00 PM.",
      timestamp: new Date(Date.now() - 3 * 3600 * 1000 + 2000).toISOString(),
      functionCall: {
        name: "checkOrderStatus",
        args: { orderId: "ORD-94821" },
        result: { status: "Out for Delivery", carrier: "FedEx Express", eta: "Today 5:00 PM" },
      },
    });

    const session2Id = "session_return_policy";
    await setDoc(chatSessionDoc(targetUid, projectId, session2Id), {
      id: session2Id,
      projectId,
      title: "Return Policy on Opened Items",
      source: "SIMULATOR",
      messageCount: 2,
      createdAt: new Date(Date.now() - 26 * 3600 * 1000).toISOString(),
      updatedAt: new Date(Date.now() - 26 * 3600 * 1000).toISOString(),
    });

    const s2MsgCol = chatMessagesCol(targetUid, projectId, session2Id);
    await addDoc(s2MsgCol, {
      role: "user",
      content: "Can I return a jacket if I already opened the package?",
      timestamp: new Date(Date.now() - 26 * 3600 * 1000).toISOString(),
    });
    await addDoc(s2MsgCol, {
      role: "assistant",
      content:
        "Yes, absolutely! Under our 30-day return policy, you can return unworn items with original tags still attached for a full refund or store credit. Return shipping is free using our pre-paid label.",
      timestamp: new Date(Date.now() - 26 * 3600 * 1000 + 1500).toISOString(),
    });

    return { projectId, projectName: preset.projectName };
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : String(err);
      if (errMsg.includes("permission") || errMsg.includes("PERMISSION_DENIED")) {
        throw new Error(
          `Permission denied: Your current Firestore Security Rules only allow writing to your own account (request.auth.uid == uid). ` +
          `Please select your own account (labeled with ★ You) or update your Firestore rules.`
        );
      }
      throw err;
    }
  },
};
