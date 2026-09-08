"use client";

import React, { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { projectService } from "@/services/project.service";
import { knowledgeService } from "@/services/knowledge.service";
import { functionService } from "@/services/function.service";
import { Project } from "@/types";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { CodeBlock } from "@/components/ui/CodeBlock";
import {
  Loader2,
  ArrowRight,
  X,
  CheckCircle2,
  AlertTriangle,
  Trash2,
  BookOpen,
  Zap,
  Code2,
  TerminalSquare,
  BarChart2,
} from "lucide-react";
import { Playground } from "@/components/playground/Playground";
import Link from "next/link";

export default function ProjectOverviewPage() {
  const { projectId } = useParams<{ projectId: string }>();
  const router = useRouter();
  const [project, setProject] = useState<Project | null>(null);
  const [hasKnowledge, setHasKnowledge] = useState(false);
  const [hasFunctions, setHasFunctions] = useState(false);

  // Delete / Archive flow
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [deleteInput, setDeleteInput] = useState("");
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  useEffect(() => {
    projectService.list().then((res) => {
      const target = res.find((p) => p.id === projectId);
      if (target) setProject(target);
      else router.replace("/");
    });

    knowledgeService
      .list(projectId)
      .then((docs) => setHasKnowledge(docs.some((d) => d.status === "ready")));
    functionService
      .list(projectId)
      .then((fns) => setHasFunctions(fns.length > 0));
  }, [projectId, router]);

  async function handleDeleteProject() {
    if (!project || deleteInput !== project.name) return;
    setDeleting(true);
    setDeleteError(null);
    try {
      await projectService.delete(projectId);
      router.replace("/");
    } catch (err: unknown) {
      const msg =
        err instanceof Error ? err.message : "Failed to delete project.";
      setDeleteError(msg);
      setDeleting(false);
    }
  }

  if (!project) {
    return (
      <div className="flex w-full h-[60vh] items-center justify-center">
        <Loader2 className="w-7 h-7 text-accent animate-spin" />
      </div>
    );
  }

  // Setup readiness steps
  const steps = [
    {
      label: "Project Created",
      done: true,
      action: null,
    },
    {
      label: "Knowledge Base",
      done: hasKnowledge,
      desc: hasKnowledge ? "Knowledge ready" : "No ready knowledge yet",
      action: !hasKnowledge
        ? { label: "Add Knowledge", href: `/${projectId}/knowledge` }
        : { label: "View", href: `/${projectId}/knowledge` },
    },
    {
      label: "Functions",
      done: hasFunctions,
      desc: hasFunctions ? "Functions registered" : "No functions yet",
      action: !hasFunctions
        ? { label: "Add Function", href: `/${projectId}/functions` }
        : { label: "View", href: `/${projectId}/functions` },
    },
  ];

  const progress = Math.round(
    (steps.filter((s) => s.done).length / steps.length) * 100
  );

  const quickLinks = [
    { icon: BookOpen, label: "Knowledge", href: `/${projectId}/knowledge` },
    { icon: Zap, label: "Functions", href: `/${projectId}/functions` },
    { icon: Code2, label: "SDK & Keys", href: `/${projectId}/sdk` },
    { icon: TerminalSquare, label: "Simulator", href: `/${projectId}/simulator` },
    { icon: BarChart2, label: "Analytics", href: `/${projectId}/analytics` },
  ];

  return (
    <div className="flex flex-col gap-6 pb-16">
      {/* Page Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">{project.name}</h1>
          <p className="text-sm text-text-muted font-mono mt-0.5">{project.id}</p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant={project.status === "active" ? "success" : "default"}>
            {project.status.toUpperCase()}
          </Badge>
        </div>
      </div>

      {/* Quick Links Row */}
      <div className="flex flex-wrap gap-2">
        {quickLinks.map((item) => (
          <Link
            key={item.label}
            href={item.href}
            className="flex items-center gap-2 px-3 py-1.5 bg-bg-surface border border-border-default rounded-lg text-sm text-text-secondary hover:border-accent hover:text-accent transition-colors"
          >
            <item.icon className="w-3.5 h-3.5" />
            {item.label}
          </Link>
        ))}
      </div>

      {/* Main Grid */}
      <div className="flex flex-col lg:flex-row gap-6 items-stretch min-h-[480px]">
        {/* Left — Readiness + Project Info */}
        <div className="flex flex-col w-full lg:w-[55%] gap-5">
          {/* Setup Readiness */}
          <div className="bg-bg-surface border border-border-default rounded-xl p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base font-semibold text-text-primary">
                Project Setup
              </h2>
              <span className="text-xs text-text-muted">{progress}% ready</span>
            </div>

            <div className="w-full bg-bg-elevated h-2 rounded-full overflow-hidden mb-5">
              <div
                className="bg-accent h-full transition-all duration-500 ease-out rounded-full"
                style={{ width: `${progress}%` }}
              />
            </div>

            <div className="space-y-3">
              {steps.map((step, i) => (
                <div
                  key={i}
                  className="flex items-center justify-between"
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-6 h-6 rounded-full flex items-center justify-center text-xs flex-shrink-0 ${
                        step.done
                          ? "bg-status-success-muted border border-status-success/30 text-status-success"
                          : "bg-bg-elevated border border-border-strong text-text-muted"
                      }`}
                    >
                      {step.done ? <CheckCircle2 className="w-3.5 h-3.5" /> : "○"}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-text-primary">
                        {step.label}
                      </p>
                      {step.desc && (
                        <p className="text-xs text-text-muted">{step.desc}</p>
                      )}
                    </div>
                  </div>
                  {step.action && (
                    <Link
                      href={step.action.href}
                      className="flex items-center gap-1 text-xs font-medium text-accent hover:underline"
                    >
                      {step.action.label}
                      <ArrowRight className="w-3 h-3" />
                    </Link>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Project Credentials */}
          <div className="bg-bg-surface border border-border-default rounded-xl p-6">
            <h2 className="text-base font-semibold text-text-primary mb-4">
              Project Credentials
            </h2>
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-text-muted uppercase tracking-wider mb-2">
                  Project ID
                </label>
                <CodeBlock code={project.id} />
              </div>
              <div>
                <label className="block text-xs font-semibold text-text-muted uppercase tracking-wider mb-1">
                  Public API Key
                </label>
                <p className="text-xs text-text-muted mb-2">
                  Full key is available in{" "}
                  <Link
                    href={`/${projectId}/sdk`}
                    className="text-accent hover:underline"
                  >
                    SDK & API Keys
                  </Link>
                  .
                </p>
                <CodeBlock
                  code={
                    project.publicApiKey?.startsWith("infria_pk_")
                      ? project.publicApiKey.slice(0, 14) +
                        "••••" +
                        project.publicApiKey.slice(-4)
                      : "infria_pk_••••••••"
                  }
                />
              </div>
            </div>
          </div>
        </div>

        {/* Right — AI Playground */}
        <div className="flex flex-col w-full lg:w-[45%] bg-bg-surface border border-border-default rounded-xl overflow-hidden min-h-[400px]">
          <Playground projectId={projectId} />
        </div>
      </div>

      {/* ── Danger Zone ────────────────────────────────────────── */}
      <div className="bg-bg-surface border border-status-error/30 rounded-xl p-6 mt-4">
        <div className="flex items-start gap-3 mb-4">
          <AlertTriangle className="w-5 h-5 text-status-error flex-shrink-0 mt-0.5" />
          <div>
            <h2 className="text-base font-semibold text-status-error">
              Danger Zone
            </h2>
            <p className="text-sm text-text-muted mt-1">
              Destructive actions. Once performed, they cannot be undone.
            </p>
          </div>
        </div>

        <div className="flex items-center justify-between bg-bg-elevated border border-border-default rounded-lg px-5 py-4">
          <div>
            <p className="text-sm font-medium text-text-primary">
              Delete this project
            </p>
            <p className="text-xs text-text-muted mt-0.5">
              Removes the project document. Subcollections may require manual
              cleanup if cascading delete is not supported.
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowDeleteDialog(true)}
            icon={<Trash2 className="w-3.5 h-3.5" />}
            className="text-status-error border-status-error/40 hover:bg-status-error/10 hover:border-status-error flex-shrink-0 ml-4"
          >
            Delete Project
          </Button>
        </div>
      </div>

      {/* Delete Confirmation Dialog */}
      {showDeleteDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="bg-bg-surface border border-border-default rounded-2xl w-full max-w-md shadow-2xl">
            <div className="flex items-center justify-between p-5 border-b border-border-subtle">
              <h3 className="font-semibold text-text-primary flex items-center gap-2">
                <Trash2 className="w-4 h-4 text-status-error" />
                Delete &quot;{project.name}&quot;?
              </h3>
              <button
                onClick={() => {
                  setShowDeleteDialog(false);
                  setDeleteInput("");
                  setDeleteError(null);
                }}
                className="text-text-muted hover:text-text-primary transition-colors"
                aria-label="Close dialog"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 space-y-4">
              <div className="bg-status-error/10 border border-status-error/20 rounded-lg px-4 py-3 text-sm text-status-error">
                This action will remove the project and its configuration
                according to the current backend lifecycle policy. This cannot
                be undone.
              </div>

              <div>
                <label className="block text-sm font-medium text-text-primary mb-2">
                  Type{" "}
                  <span className="font-mono text-text-secondary">
                    {project.name}
                  </span>{" "}
                  to confirm:
                </label>
                <input
                  autoFocus
                  value={deleteInput}
                  onChange={(e) => setDeleteInput(e.target.value)}
                  placeholder={project.name}
                  className="w-full text-sm px-3 py-2 bg-bg-elevated border border-border-strong rounded-md text-text-primary focus:border-status-error outline-none transition-colors"
                />
              </div>

              {deleteError && (
                <p className="text-xs text-status-error">{deleteError}</p>
              )}

              <div className="flex gap-3 pt-1">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => {
                    setShowDeleteDialog(false);
                    setDeleteInput("");
                    setDeleteError(null);
                  }}
                >
                  Cancel
                </Button>
                <Button
                  variant="outline"
                  className="flex-1 text-status-error border-status-error/40 hover:bg-status-error hover:text-white hover:border-status-error disabled:opacity-40"
                  disabled={deleteInput !== project.name || deleting}
                  onClick={handleDeleteProject}
                  loading={deleting}
                  icon={<Trash2 className="w-3.5 h-3.5" />}
                >
                  {deleting ? "Deleting…" : "Delete Project"}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
