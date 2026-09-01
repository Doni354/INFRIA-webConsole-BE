"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { projectService } from "@/services/project.service";
import { Button } from "@/components/ui/Button";
import { CodeBlock } from "@/components/ui/CodeBlock";
import { CheckCircle2, ChevronLeft, Loader2 } from "lucide-react";
import Link from "next/link";
import { ThemeToggle } from "@/components/ui/ThemeToggle";

export default function NewProjectPage() {
  const { user, loading } = useAuth();
  const router = useRouter();

  const [name, setName] = useState("");
  const [platform, setPlatform] = useState<"flutter">("flutter");
  const [description, setDescription] = useState("");

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successData, setSuccessData] = useState<{ id: string; apiKey: string } | null>(null);

  useEffect(() => {
    if (!loading && !user) router.replace("/login");
  }, [user, loading, router]);

  if (loading || !user) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-bg-base">
        <Loader2 className="h-8 w-8 text-accent animate-spin" />
      </div>
    );
  }

  async function handleSubmit() {
    if (!name.trim()) return;
    setIsSubmitting(true);
    try {
      const res = await projectService.create({ name });
      setSuccessData({ id: res.project.id, apiKey: res.publicApiKey }); // Accessing publicApiKey
    } catch (error) {
      console.error("Failed to create project", error);
    } finally {
      setIsSubmitting(false);
    }
  }

  if (successData) {
    return (
      <div className="min-h-screen bg-bg-base text-text-primary px-6 py-12 flex flex-col items-center">
        <div className="max-w-2xl w-full bg-bg-surface border border-border-default rounded-xl p-8 mb-8 text-center shadow-lg relative">
          <div className="w-16 h-16 bg-status-success-muted rounded-full flex items-center justify-center mx-auto mb-6 border border-status-success/20">
            <CheckCircle2 className="w-8 h-8 text-status-success" />
          </div>
          <h1 className="text-2xl font-bold mb-2">Project Created Successfully!</h1>
          <p className="text-text-secondary mb-8 max-w-md mx-auto">
            Your INFRIA project has been provisioned. <b>Copy your API key now</b> as it will only be shown once.
          </p>
          <div className="text-left space-y-6 bg-bg-elevated p-6 rounded-lg border border-border-subtle">
            <div>
              <label className="block text-xs font-bold text-text-muted uppercase tracking-wider mb-2">Project ID</label>
              <CodeBlock code={successData.id} />
            </div>
            <div>
              <label className="block text-xs font-bold text-text-muted uppercase tracking-wider mb-2">Public API Key</label>
              <CodeBlock code={successData.apiKey} />
            </div>
          </div>
          <div className="mt-8">
            <Button
              variant="primary"
              size="lg"
              className="w-full"
              onClick={() => router.push(`/${successData.id}`)}
            >
              Go to Project Dashboard
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-bg-base text-text-primary flex flex-col">
      <header className="h-14 border-b border-border-subtle bg-bg-surface px-6 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2 text-text-secondary hover:text-text-primary transition-colors">
          <ChevronLeft className="w-4 h-4" />
          <span className="text-sm font-medium">Back</span>
        </Link>
        <ThemeToggle />
      </header>

      <main className="flex-1 flex flex-col items-center py-12 px-6">
        <div className="w-full max-w-xl">
          <h1 className="text-2xl font-bold text-text-primary mb-2">Create New Project</h1>
          <p className="text-text-secondary mb-8">Setup a new INFRIA workspace for your mobile or web application.</p>

          <div className="space-y-6 bg-bg-surface p-6 rounded-lg border border-border-default shadow-sm mb-8">
            <div className="space-y-1.5">
              <label className="block text-sm font-medium text-text-secondary">Project Name <span className="text-status-error">*</span></label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. My Awesome App"
                className="w-full px-3 py-2 bg-bg-elevated border border-border-strong rounded-md focus:outline-none focus:border-accent text-text-primary placeholder:text-text-disabled"
                autoFocus
              />
              <p className="text-xs text-text-muted mt-2">
                Project ID will be generated automatically based on the name.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <Button
              variant="primary"
              size="md"
              onClick={handleSubmit}
              loading={isSubmitting}
              disabled={!name.trim()}
            >
              Create Project
            </Button>
            <Button variant="ghost" onClick={() => router.back()}>
              Cancel
            </Button>
          </div>
        </div>
      </main>
    </div>
  );
}
