"use client";

import React, { useEffect, useState, useRef } from "react";
import { useParams, useRouter, usePathname } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { projectService } from "@/services/project.service";
import { Project } from "@/types";
import { ChevronDown, Plus, LayoutGrid, Check } from "lucide-react";
import { ThemeToggle } from "@/components/ui/ThemeToggle";

export function Topbar() {
  const { user } = useAuth();
  const { projectId } = useParams<{ projectId: string }>();
  const router = useRouter();
  const pathname = usePathname();
  
  const [projects, setProjects] = useState<Project[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    projectService.list().then(setProjects);
  }, [projectId]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const currentProject = projects.find((p) => p.id === projectId);

  return (
    <header className="h-14 flex-shrink-0 bg-bg-surface border-b border-border-subtle flex items-center justify-between px-6 z-10 w-full relative">
      {/* Left Menu Area (Logo & Project Selector) */}
      <div className="flex items-center gap-2 relative" ref={dropdownRef}>
        
        {/* INFRIA Logo */}
        <button onClick={() => router.push("/")} className="text-lg font-black tracking-tight text-text-primary mr-2 pr-4 border-r border-border-default hover:opacity-80 transition-opacity">
          INFRIA
        </button>
        
        {/* Project Selector */}
        <button 
          onClick={() => setIsOpen(!isOpen)}
          className="flex items-center gap-2 px-2.5 py-1.5 -ml-2 rounded-md hover:bg-bg-hover text-text-primary transition-colors cursor-pointer"
        >
          <div className="w-6 h-6 rounded bg-accent-muted border border-accent-border flex items-center justify-center">
            {currentProject ? (
              <span className="text-accent text-xs font-bold uppercase">{currentProject.name[0]}</span>
            ) : (
              <LayoutGrid className="w-3.5 h-3.5 text-accent" />
            )}
          </div>
          <span className="text-sm font-semibold truncate max-w-[200px]">
            {currentProject ? currentProject.name : "Select Project"}
          </span>
          <ChevronDown className="w-3.5 h-3.5 text-text-muted" />
        </button>

        {/* Dropdown panel */}
        {isOpen && (
          <div className="absolute top-12 left-0 w-64 bg-bg-elevated border border-border-default rounded-md shadow-lg py-1.5 z-50 overflow-hidden">
            <div className="px-3 py-2 text-xs font-semibold text-text-muted uppercase tracking-wider mb-1">
              Your Projects
            </div>
            <div className="max-h-64 overflow-y-auto">
              {projects.map((p) => {
                const isActive = p.id === projectId;
                return (
                  <button
                    key={p.id}
                    onClick={() => {
                      setIsOpen(false);
                      // Switch to same route but inside new project context
                      const pathSuffix = pathname.replace(`/${projectId}`, "");
                      router.push(`/${p.id}${pathSuffix}`);
                    }}
                    className={`w-full flex items-center justify-between px-3 py-2 text-sm text-left hover:bg-bg-hover cursor-pointer transition-colors ${
                      isActive ? "bg-bg-active text-text-primary font-medium" : "text-text-secondary"
                    }`}
                  >
                    <span className="truncate">{p.name}</span>
                    {isActive && <Check className="w-3.5 h-3.5 text-accent flex-shrink-0" />}
                  </button>
                );
              })}
            </div>
            <div className="h-px bg-border-subtle my-1.5 mx-2" />
            <div className="px-1.5">
              <button
                onClick={() => {
                  setIsOpen(false);
                  router.push("/new");
                }}
                className="w-full flex items-center gap-2 px-2 py-2 text-sm text-text-primary hover:bg-bg-hover rounded cursor-pointer transition-colors"
              >
                <Plus className="w-3.5 h-3.5 text-text-muted" />
                Create new project
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Right User & Theme */}
      <div className="flex items-center gap-4">
        <ThemeToggle />
        <div className="flex items-center gap-2.5 pl-4 border-l border-border-subtle">
          <div className="w-7 h-7 rounded-full bg-accent-muted border border-accent-border flex items-center justify-center overflow-hidden">
            <span className="text-accent text-xs font-semibold">
              {user?.displayName ? user.displayName[0].toUpperCase() : "U"}
            </span>
          </div>
          <span className="text-sm font-medium text-text-secondary hidden sm:inline-block">
            {user?.displayName?.split(" ")[0]}
          </span>
        </div>
      </div>
    </header>
  );
}
