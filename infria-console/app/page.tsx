"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { projectService } from "@/services/project.service";
import { Project } from "@/types";
import { Loader2, Plus, LayoutGrid } from "lucide-react";
import { ThemeToggle } from "@/components/ui/ThemeToggle";
import Link from "next/link";
import { Badge } from "@/components/ui/Badge";

export default function ConsoleLandingPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [projects, setProjects] = useState<Project[]>([]);
  const [fetching, setFetching] = useState(true);

  useEffect(() => {
    if (!loading && !user) {
      router.replace("/login");
      return;
    }
    
    if (user) {
      projectService.list().then((projectsData) => {
        setProjects(projectsData);
        setFetching(false);
      });
    }
  }, [user, loading, router]);

  if (loading || fetching) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-bg-base">
        <Loader2 className="h-8 w-8 text-accent animate-spin" />
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className="min-h-screen bg-bg-base text-text-primary flex flex-col">
      <header className="h-14 border-b border-border-default bg-bg-surface px-6 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded bg-accent-muted border border-accent-border flex items-center justify-center">
            <LayoutGrid className="w-3.5 h-3.5 text-accent" />
          </div>
          <span className="text-sm font-semibold tracking-wide text-text-primary">INFRIA Console</span>
        </div>
        
        <div className="flex items-center gap-4">
          <ThemeToggle />
          <div className="w-7 h-7 rounded-full bg-accent-muted border border-accent-border flex items-center justify-center">
            <span className="text-accent text-xs font-semibold">
              {user.displayName ? user.displayName[0].toUpperCase() : "U"}
            </span>
          </div>
        </div>
      </header>

      <main className="flex-1 overflow-y-auto w-full max-w-6xl mx-auto px-6 py-10">
        <div className="mb-10 text-center sm:text-left">
          <h1 className="text-3xl font-bold text-text-primary mb-2">Welcome to INFRIA</h1>
          <p className="text-text-secondary text-base">Select a project or create a new one to get started.</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {/* Add Project Card */}
          <Link href="/new" className="group">
            <div className="h-[200px] flex flex-col items-center justify-center border-2 border-dashed border-border-strong rounded-xl bg-bg-base hover:bg-bg-elevated hover:border-accent transition-all cursor-pointer">
              <div className="w-10 h-10 rounded-full bg-border-subtle group-hover:bg-accent-muted text-text-muted group-hover:text-accent flex items-center justify-center transition-colors mb-3">
                <Plus className="w-5 h-5" />
              </div>
              <span className="text-sm font-medium text-text-primary group-hover:text-accent transition-colors">Add Project</span>
            </div>
          </Link>

          {/* Project List */}
          {projects.map(project => (
            <Link key={project.id} href={`/${project.id}`}>
              <div className="h-[200px] flex flex-col justify-between border border-border-default hover:border-accent hover:shadow-md hover:-translate-y-1 rounded-xl bg-bg-surface p-5 transition-all text-left">
                <div>
                   <div className="w-10 h-10 mb-4 rounded-lg bg-accent-muted border border-accent-border flex items-center justify-center text-accent font-bold text-lg">
                      {project.name.charAt(0).toUpperCase()}
                   </div>
                   <h3 className="text-lg font-semibold text-text-primary truncate">{project.name}</h3>
                   <p className="text-xs text-text-muted mt-1 font-mono truncate">{project.id}</p>
                </div>
                
                <div className="flex items-center justify-between border-t border-border-subtle pt-4 mt-auto">
                   <div className="flex flex-col gap-0.5">
                     <span className="text-xs text-text-muted">Tools</span>
                     <span className="text-sm font-medium">{project.functionCount + project.knowledgeCount}</span>
                   </div>
                   <Badge variant={project.status === "active" ? "success" : "default"}>
                      {project.status.toUpperCase()}
                   </Badge>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </main>
    </div>
  );
}
