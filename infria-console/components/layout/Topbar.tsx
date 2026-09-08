"use client";

import React, { useEffect, useState, useRef } from "react";
import { useParams, useRouter, usePathname } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { projectService } from "@/services/project.service";
import { Project } from "@/types";
import {
  ChevronDown,
  Plus,
  LayoutGrid,
  Check,
  LogOut,
  User,
  Layers,
} from "lucide-react";
import { ThemeToggle } from "@/components/ui/ThemeToggle";

export function Topbar() {
  const { user, signOut } = useAuth();
  const { projectId } = useParams<{ projectId: string }>();
  const router = useRouter();
  const pathname = usePathname();

  const [projects, setProjects] = useState<Project[]>([]);
  const [projectOpen, setProjectOpen] = useState(false);
  const [accountOpen, setAccountOpen] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const projectDropRef = useRef<HTMLDivElement>(null);
  const accountDropRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    projectService.list().then(setProjects);
  }, [projectId]);

  // Close dropdowns on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (
        projectDropRef.current &&
        !projectDropRef.current.contains(e.target as Node)
      ) {
        setProjectOpen(false);
      }
      if (
        accountDropRef.current &&
        !accountDropRef.current.contains(e.target as Node)
      ) {
        setAccountOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const currentProject = projects.find((p) => p.id === projectId);

  async function handleSignOut() {
    setSigningOut(true);
    try {
      await signOut();
      router.replace("/login");
    } catch {
      setSigningOut(false);
    }
  }

  const userInitial = user?.displayName
    ? user.displayName[0].toUpperCase()
    : user?.email
    ? user.email[0].toUpperCase()
    : "U";

  return (
    <header className="h-14 flex-shrink-0 bg-bg-surface border-b border-border-subtle flex items-center justify-between px-6 z-10 w-full relative">
      {/* Left — Logo + Project Selector */}
      <div className="flex items-center gap-2 relative" ref={projectDropRef}>

        {/* INFRIA Logo slot — swap for SVG when asset arrives */}
        <button
          onClick={() => router.push("/")}
          className="flex items-center gap-2 mr-3 pr-4 border-r border-border-default hover:opacity-80 transition-opacity"
          aria-label="INFRIA Console home"
        >
          {/* Logo placeholder — replace with <Image src="/infria-logo.svg" .../> when ready */}
          <div className="w-6 h-6 rounded-md bg-accent flex items-center justify-center">
            <span className="text-white text-xs font-black tracking-tight">IN</span>
          </div>
          <span className="text-sm font-bold tracking-tight text-text-primary hidden sm:block">
            INFRIA
          </span>
        </button>

        {/* Project Selector */}
        <button
          onClick={() => setProjectOpen(!projectOpen)}
          className="flex items-center gap-2 px-2.5 py-1.5 rounded-md hover:bg-bg-hover text-text-primary transition-colors cursor-pointer"
          aria-haspopup="listbox"
          aria-expanded={projectOpen}
        >
          <div className="w-5 h-5 rounded bg-accent-muted border border-accent-border flex items-center justify-center">
            {currentProject ? (
              <span className="text-accent text-[10px] font-bold uppercase">
                {currentProject.name[0]}
              </span>
            ) : (
              <LayoutGrid className="w-3 h-3 text-accent" />
            )}
          </div>
          <span className="text-sm font-medium truncate max-w-[180px]">
            {currentProject ? currentProject.name : "Select Project"}
          </span>
          <ChevronDown className="w-3.5 h-3.5 text-text-muted" />
        </button>

        {/* Project Dropdown */}
        {projectOpen && (
          <div className="absolute top-12 left-0 w-64 bg-bg-elevated border border-border-default rounded-lg shadow-xl py-1.5 z-50">
            <div className="px-3 py-1.5 text-[11px] font-semibold text-text-muted uppercase tracking-widest">
              Your Projects
            </div>
            <div className="max-h-60 overflow-y-auto">
              {projects.length === 0 && (
                <p className="px-3 py-2 text-sm text-text-muted italic">
                  No projects yet
                </p>
              )}
              {projects.map((p) => {
                const isActive = p.id === projectId;
                return (
                  <button
                    key={p.id}
                    onClick={() => {
                      setProjectOpen(false);
                      const pathSuffix = pathname.replace(`/${projectId}`, "");
                      router.push(`/${p.id}${pathSuffix}`);
                    }}
                    className={`w-full flex items-center justify-between px-3 py-2 text-sm text-left hover:bg-bg-hover transition-colors ${
                      isActive
                        ? "bg-accent-muted text-accent font-semibold"
                        : "text-text-secondary"
                    }`}
                  >
                    <span className="truncate">{p.name}</span>
                    {isActive && (
                      <Check className="w-3.5 h-3.5 text-accent flex-shrink-0" />
                    )}
                  </button>
                );
              })}
            </div>
            <div className="h-px bg-border-subtle my-1.5 mx-2" />
            <div className="px-1.5">
              <button
                onClick={() => {
                  setProjectOpen(false);
                  router.push("/new");
                }}
                className="w-full flex items-center gap-2 px-2 py-2 text-sm text-text-primary hover:bg-bg-hover rounded transition-colors"
              >
                <Plus className="w-3.5 h-3.5 text-text-muted" />
                Create new project
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Right — Theme + Account */}
      <div className="flex items-center gap-3">
        <ThemeToggle />

        {/* Account Menu */}
        <div className="relative" ref={accountDropRef}>
          <button
            onClick={() => setAccountOpen(!accountOpen)}
            className="flex items-center gap-2 pl-3 border-l border-border-subtle hover:opacity-80 transition-opacity"
            aria-haspopup="menu"
            aria-expanded={accountOpen}
          >
            {user?.photoURL ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={user.photoURL}
                alt={user.displayName ?? "User avatar"}
                className="w-7 h-7 rounded-full border border-border-default"
              />
            ) : (
              <div className="w-7 h-7 rounded-full bg-accent-muted border border-accent-border flex items-center justify-center">
                <span className="text-accent text-xs font-semibold">
                  {userInitial}
                </span>
              </div>
            )}
            <span className="text-sm font-medium text-text-secondary hidden md:inline-block max-w-[120px] truncate">
              {user?.displayName?.split(" ")[0] ?? "Account"}
            </span>
            <ChevronDown className="w-3.5 h-3.5 text-text-muted hidden md:block" />
          </button>

          {accountOpen && (
            <div className="absolute top-11 right-0 w-56 bg-bg-elevated border border-border-default rounded-lg shadow-xl py-1.5 z-50">
              {/* User info */}
              <div className="px-4 py-2.5 border-b border-border-subtle">
                <p className="text-sm font-semibold text-text-primary truncate">
                  {user?.displayName ?? "Developer"}
                </p>
                <p className="text-xs text-text-muted truncate mt-0.5">
                  {user?.email}
                </p>
              </div>

              <div className="py-1">
                <button
                  onClick={() => {
                    setAccountOpen(false);
                    router.push("/");
                  }}
                  className="w-full flex items-center gap-3 px-4 py-2 text-sm text-text-secondary hover:bg-bg-hover transition-colors text-left"
                >
                  <Layers className="w-4 h-4 text-text-muted" />
                  Personal Workspace
                </button>
                <button
                  onClick={() => {
                    setAccountOpen(false);
                  }}
                  className="w-full flex items-center gap-3 px-4 py-2 text-sm text-text-secondary hover:bg-bg-hover transition-colors text-left"
                >
                  <User className="w-4 h-4 text-text-muted" />
                  Google Account
                </button>
              </div>

              <div className="h-px bg-border-subtle my-1 mx-2" />

              <div className="py-1">
                <button
                  onClick={handleSignOut}
                  disabled={signingOut}
                  className="w-full flex items-center gap-3 px-4 py-2 text-sm text-status-error hover:bg-status-error/10 transition-colors text-left disabled:opacity-50"
                  aria-label="Sign out of INFRIA Console"
                >
                  <LogOut className="w-4 h-4" />
                  {signingOut ? "Signing out…" : "Sign Out"}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
