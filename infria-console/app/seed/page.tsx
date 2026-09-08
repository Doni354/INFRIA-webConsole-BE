"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import {
  seedService,
  SEED_PRESETS,
  DEMO_PROMPTS,
  SeedUserOption,
} from "@/services/seed.service";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { ThemeToggle } from "@/components/ui/ThemeToggle";
import {
  Sparkles,
  ArrowLeft,
  ArrowRight,
  User,
  Database,
  BookOpen,
  Code2,
  Key,
  Smartphone,
  BarChart3,
  MessageSquare,
  CheckCircle2,
  Copy,
  Loader2,
  ExternalLink,
  ShieldCheck,
} from "lucide-react";

export default function SeedPage() {
  const { user } = useAuth();
  const router = useRouter();

  const [accounts, setAccounts] = useState<SeedUserOption[]>([]);
  const [selectedUid, setSelectedUid] = useState<string>("");
  const [customUid, setCustomUid] = useState<string>("");
  const [useCustomUid, setUseCustomUid] = useState<boolean>(false);
  const [selectedPreset, setSelectedPreset] = useState<string>("ecommerce");

  const [loading, setLoading] = useState<boolean>(true);
  const [seeding, setSeeding] = useState<boolean>(false);
  const [result, setResult] = useState<{ projectId: string; projectName: string } | null>(null);
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

  useEffect(() => {
    seedService.getAvailableAccounts().then((list) => {
      setAccounts(list);
      if (user) {
        setSelectedUid(user.uid);
      } else if (list.length > 0) {
        setSelectedUid(list[0].uid);
      }
      setLoading(false);
    });
  }, [user]);

  const targetUid = useCustomUid ? customUid.trim() : selectedUid;

  async function handleInject() {
    if (!targetUid) return;
    setSeeding(true);
    try {
      const res = await seedService.injectSeedData(targetUid, selectedPreset);
      setResult(res);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to seed data";
      alert(msg);
    } finally {
      setSeeding(false);
    }
  }

  function handleCopyPrompt(text: string, index: number) {
    navigator.clipboard.writeText(text);
    setCopiedIndex(index);
    setTimeout(() => setCopiedIndex(null), 1800);
  }

  return (
    <div className="min-h-screen bg-bg-base flex flex-col">
      {/* Top Header */}
      <header className="border-b border-border-default bg-bg-surface sticky top-0 z-20">
        <div className="max-w-5xl mx-auto px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link
              href="/"
              className="flex items-center gap-1.5 text-xs font-semibold text-text-muted hover:text-text-primary transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to Dashboard
            </Link>
            <span className="text-border-strong">/</span>
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-accent animate-pulse" />
              <span className="text-xs font-bold uppercase tracking-wider text-text-primary">
                Mockup Data Generator
              </span>
            </div>
          </div>
          <ThemeToggle />
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-5xl w-full mx-auto px-6 py-10 space-y-8">
        {/* Intro Hero */}
        <div className="space-y-2">
          <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-accent/10 border border-accent-border text-accent text-xs font-semibold">
            <Sparkles className="w-3.5 h-3.5" />
            Internal Utility
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-text-primary">
            INFRIA Demo & Mockup Seeder
          </h1>
          <p className="text-sm text-text-secondary max-w-2xl leading-relaxed">
            Generate and inject rich, realistic data into your projects for client demos, marketing presentations, and end-to-end testing without cluttering production.
          </p>
        </div>

        {/* Result Banner if already injected */}
        {result && (
          <div className="p-6 bg-status-success/10 border border-status-success/30 rounded-2xl space-y-4 animate-in fade-in slide-in-from-top-2 duration-200">
            <div className="flex items-start gap-3.5">
              <div className="w-8 h-8 rounded-full bg-status-success/20 border border-status-success/40 flex items-center justify-center text-status-success shrink-0 mt-0.5">
                <CheckCircle2 className="w-5 h-5" />
              </div>
              <div className="space-y-1">
                <h3 className="text-base font-bold text-text-primary">
                  Demo Project Injected Successfully!
                </h3>
                <p className="text-xs text-text-secondary leading-relaxed">
                  Project <strong className="text-text-primary">{result.projectName}</strong> (<code className="font-mono text-accent text-[11px]">{result.projectId}</code>) has been populated with AI Config, 4 Knowledge articles, 3 Function tools, 3 API keys, 3 connected apps, and 7 analytics activity logs.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3 pt-2 flex-wrap">
              <Link
                href={`/${result.projectId}`}
                className="inline-flex items-center gap-1.5 px-4 py-2 bg-accent text-white text-xs font-semibold rounded-lg hover:bg-accent-hover transition-colors"
              >
                Project Overview
                <ExternalLink className="w-3.5 h-3.5" />
              </Link>
              <Link
                href={`/${result.projectId}/simulator`}
                className="inline-flex items-center gap-1.5 px-4 py-2 bg-bg-surface hover:bg-bg-elevated text-text-primary border border-border-default hover:border-border-strong text-xs font-semibold rounded-lg transition-colors"
              >
                Open Simulator
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
              <Link
                href={`/${result.projectId}/analytics`}
                className="inline-flex items-center gap-1.5 px-4 py-2 bg-bg-surface hover:bg-bg-elevated text-text-secondary hover:text-text-primary border border-border-default hover:border-border-strong text-xs font-semibold rounded-lg transition-colors"
              >
                View Analytics
              </Link>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
          {/* Left Column: Form Settings (2 Cols) */}
          <div className="lg:col-span-2 space-y-6">
            {/* Step 1: Account Target */}
            <div className="bg-bg-surface border border-border-default rounded-xl p-5 space-y-4 shadow-sm">
              <div className="flex items-center gap-2 pb-2 border-b border-border-subtle">
                <div className="w-6 h-6 rounded-full bg-accent/10 border border-accent-border text-accent text-xs font-bold flex items-center justify-center">
                  1
                </div>
                <h3 className="text-sm font-bold text-text-primary">
                  Target Account Selection
                </h3>
              </div>

              {!useCustomUid ? (
                <div className="space-y-2">
                  <label className="text-xs text-text-muted block">
                    Select target user UID to receive the injected project:
                  </label>
                  <select
                    value={selectedUid}
                    onChange={(e) => setSelectedUid(e.target.value)}
                    className="w-full px-3 py-2.5 bg-bg-elevated border border-border-strong rounded-lg text-sm text-text-primary focus:border-accent focus:outline-none transition-colors"
                    disabled={loading || seeding}
                  >
                    {accounts.map((acc) => (
                      <option key={acc.uid} value={acc.uid}>
                        {acc.displayName || acc.email} ({acc.uid.slice(0, 8)}…) {acc.uid === user?.uid ? "★ (You)" : ""}
                      </option>
                    ))}
                  </select>
                  <div className="flex items-center justify-between text-xs text-text-muted pt-1">
                    <span>
                      Target path: <code className="font-mono text-accent text-[11px]">users/{selectedUid ? selectedUid.slice(0, 10) + "…" : "uid"}</code>
                    </span>
                    <button
                      type="button"
                      onClick={() => setUseCustomUid(true)}
                      className="text-accent hover:underline text-xs"
                    >
                      Enter Custom UID
                    </button>
                  </div>
                </div>
              ) : (
                <div className="space-y-2">
                  <label className="text-xs text-text-muted block">
                    Enter target user UID:
                  </label>
                  <input
                    type="text"
                    value={customUid}
                    onChange={(e) => setCustomUid(e.target.value)}
                    placeholder="e.g. 5x8Yf9k0LqR2mP7s..."
                    className="w-full px-3 py-2.5 bg-bg-elevated border border-border-strong rounded-lg text-sm font-mono text-text-primary focus:border-accent focus:outline-none transition-colors"
                  />
                  <div className="flex items-center justify-between text-xs text-text-muted pt-1">
                    <span>Custom Firebase Auth User UID</span>
                    <button
                      type="button"
                      onClick={() => setUseCustomUid(false)}
                      className="text-accent hover:underline text-xs"
                    >
                      Back to account list
                    </button>
                  </div>
                </div>
              )}

              {user && targetUid && targetUid !== user.uid && (
                <div className="p-3 rounded-lg bg-status-warning/10 border border-status-warning/30 text-xs text-status-warning leading-relaxed">
                  ⚠️ Note: Target UID differs from your logged-in user (<strong>{user.email}</strong>). With standard rules (<code>request.auth.uid == uid</code>), Firestore will block writing across accounts unless rules are updated.
                </div>
              )}
            </div>

            {/* Step 2: Preset Selection */}
            <div className="bg-bg-surface border border-border-default rounded-xl p-5 space-y-4 shadow-sm">
              <div className="flex items-center gap-2 pb-2 border-b border-border-subtle">
                <div className="w-6 h-6 rounded-full bg-accent/10 border border-accent-border text-accent text-xs font-bold flex items-center justify-center">
                  2
                </div>
                <h3 className="text-sm font-bold text-text-primary">
                  Choose Mockup Template
                </h3>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                {SEED_PRESETS.map((preset) => {
                  const isSelected = selectedPreset === preset.id;
                  return (
                    <div
                      key={preset.id}
                      onClick={() => setSelectedPreset(preset.id)}
                      className={`p-4 rounded-xl border cursor-pointer transition-all ${
                        isSelected
                          ? "bg-accent/10 border-accent shadow-sm"
                          : "bg-bg-surface border-border-default hover:border-border-strong"
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-sm font-bold text-text-primary">
                          {preset.name}
                        </span>
                        {isSelected && <span className="w-2 h-2 rounded-full bg-accent" />}
                      </div>
                      <p className="text-xs text-text-secondary leading-relaxed">
                        {preset.description}
                      </p>
                      <div className="mt-3 pt-2 border-t border-border-subtle text-[11px] font-mono text-text-muted">
                        Project ID: {preset.projectId}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Step 3: Trigger Action */}
            <div className="flex items-center justify-between p-5 bg-bg-surface border border-border-default rounded-xl shadow-sm">
              <div>
                <h4 className="text-sm font-bold text-text-primary">Ready to inject</h4>
                <p className="text-xs text-text-muted">Overwrites or creates new demo collections safely.</p>
              </div>
              <Button
                variant="primary"
                onClick={handleInject}
                disabled={seeding || !targetUid}
                icon={seeding ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
              >
                {seeding ? "Injecting Data…" : "Inject Mockup Data"}
              </Button>
            </div>
          </div>

          {/* Right Column: Assets Preview & Prompt Cheatsheet (1 Col) */}
          <div className="space-y-6">
            {/* Asset checklist */}
            <div className="bg-bg-surface border border-border-default rounded-xl p-5 space-y-3.5 shadow-sm">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-text-muted flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-accent" />
                Assets Created per Injection
              </h3>
              <div className="space-y-2 text-xs text-text-secondary divide-y divide-border-subtle">
                <div className="flex items-center justify-between pt-2">
                  <span className="flex items-center gap-2">
                    <Sparkles className="w-3.5 h-3.5 text-accent" />
                    AI Config
                  </span>
                  <span className="text-text-muted font-mono text-[11px]">English Prompt</span>
                </div>
                <div className="flex items-center justify-between pt-2">
                  <span className="flex items-center gap-2">
                    <BookOpen className="w-3.5 h-3.5 text-accent" />
                    Knowledge Base
                  </span>
                  <span className="text-text-muted font-mono text-[11px]">4 Documents</span>
                </div>
                <div className="flex items-center justify-between pt-2">
                  <span className="flex items-center gap-2">
                    <Code2 className="w-3.5 h-3.5 text-accent" />
                    Function Tools
                  </span>
                  <span className="text-text-muted font-mono text-[11px]">3 Schemas</span>
                </div>
                <div className="flex items-center justify-between pt-2">
                  <span className="flex items-center gap-2">
                    <Key className="w-3.5 h-3.5 text-accent" />
                    API Keys
                  </span>
                  <span className="text-text-muted font-mono text-[11px]">3 Keys</span>
                </div>
                <div className="flex items-center justify-between pt-2">
                  <span className="flex items-center gap-2">
                    <Smartphone className="w-3.5 h-3.5 text-accent" />
                    Connected Apps
                  </span>
                  <span className="text-text-muted font-mono text-[11px]">3 Apps</span>
                </div>
                <div className="flex items-center justify-between pt-2">
                  <span className="flex items-center gap-2">
                    <BarChart3 className="w-3.5 h-3.5 text-accent" />
                    Analytics Logs
                  </span>
                  <span className="text-text-muted font-mono text-[11px]">7 Events</span>
                </div>
                <div className="flex items-center justify-between pt-2">
                  <span className="flex items-center gap-2">
                    <MessageSquare className="w-3.5 h-3.5 text-accent" />
                    Chat Sessions
                  </span>
                  <span className="text-text-muted font-mono text-[11px]">2 Sessions</span>
                </div>
              </div>
            </div>

            {/* Cheatsheet questions */}
            <div className="bg-bg-surface border border-border-default rounded-xl p-5 space-y-3 shadow-sm">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-text-muted">
                  Simulator Demo Questions
                </h3>
                <span className="text-[10px] text-text-muted">Click to copy</span>
              </div>

              <div className="space-y-2">
                {DEMO_PROMPTS.map((p, idx) => (
                  <div
                    key={idx}
                    className="p-2.5 rounded-lg bg-bg-elevated border border-border-subtle hover:border-accent/40 flex items-center justify-between gap-2 text-xs transition-colors"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5 mb-0.5">
                        <span className="text-[9px] uppercase font-mono px-1 rounded bg-accent/10 text-accent font-semibold">
                          {p.category}
                        </span>
                      </div>
                      <p className="text-text-primary text-xs font-medium truncate">
                        &ldquo;{p.prompt}&rdquo;
                      </p>
                    </div>
                    <button
                      onClick={() => handleCopyPrompt(p.prompt, idx)}
                      className="p-1.5 rounded hover:bg-accent/10 text-text-muted hover:text-accent transition-colors shrink-0"
                      title="Copy question"
                    >
                      {copiedIndex === idx ? (
                        <CheckCircle2 className="w-3.5 h-3.5 text-accent" />
                      ) : (
                        <Copy className="w-3.5 h-3.5" />
                      )}
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
