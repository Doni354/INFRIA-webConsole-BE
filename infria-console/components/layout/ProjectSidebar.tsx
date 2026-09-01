"use client";

import React from "react";
import Link from "next/link";
import { usePathname, useParams } from "next/navigation";
import {
  LayoutGrid,
  BookOpen,
  Zap,
  Settings2,
  Key,
  BarChart2,
  ChevronLeft,
  Loader2,
} from "lucide-react";
import { useEffect, useState } from "react";
import { projectService } from "@/services/project.service";
import { Project } from "@/types";

const projectNav = [
  { segment: "", label: "Overview", icon: LayoutGrid },
  { segment: "knowledge", label: "Knowledge", icon: BookOpen },
  { segment: "functions", label: "Functions", icon: Zap },
  { segment: "ai", label: "AI Config", icon: Settings2 },
  { segment: "sdk", label: "SDK & Keys", icon: Key },
  { segment: "analytics", label: "Analytics", icon: BarChart2 },
];

export function ProjectSidebar() {
  const pathname = usePathname();
  const { projectId } = useParams<{ projectId: string }>();
  const [project, setProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (projectId) {
      projectService.get(projectId).then((p) => {
        setProject(p);
        setLoading(false);
      }).catch(() => setLoading(false));
    }
  }, [projectId]);

  return (
    <div className="flex flex-col h-full">
      {/* Back + Project name */}
      <div className="px-2 py-2 border-b border-border-subtle">
        <Link
          href="/projects"
          className="flex items-center gap-1.5 px-2 py-1.5 rounded text-xs text-text-muted hover:text-text-primary hover:bg-bg-hover transition-colors"
        >
          <ChevronLeft className="w-3.5 h-3.5" />
          All Projects
        </Link>
        <div className="px-2 pt-2 pb-1">
          {loading ? (
            <Loader2 className="w-4 h-4 animate-spin text-text-muted" />
          ) : (
            <>
              <p className="text-xs font-semibold text-text-primary truncate">
                {project?.name ?? projectId}
              </p>
              <p className="text-xs text-text-muted capitalize">{project?.platform ?? "flutter"}</p>
            </>
          )}
        </div>
      </div>

      {/* Project nav */}
      <nav className="flex-1 px-2 py-2 space-y-0.5 overflow-y-auto">
        {projectNav.map(({ segment, label, icon: Icon }) => {
          const href = `/projects/${projectId}${segment ? `/${segment}` : ""}`;
          const active = segment === ""
            ? pathname === href
            : pathname.startsWith(href);

          return (
            <Link
              key={segment}
              href={href}
              className={`flex items-center gap-2.5 px-2.5 py-2 rounded text-sm font-medium transition-all
                ${active
                  ? "bg-accent-muted text-accent border border-accent-border"
                  : "text-text-secondary hover:bg-bg-hover hover:text-text-primary border border-transparent"
                }`}
            >
              <Icon className="w-4 h-4 flex-shrink-0" />
              {label}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
