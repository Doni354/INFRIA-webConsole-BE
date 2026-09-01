"use client";

import React from "react";
import Link from "next/link";
import { usePathname, useParams } from "next/navigation";
import { 
  LayoutDashboard, 
  BookOpen, 
  Zap, 
  Settings2, 
  Code2, 
  BarChart2,
  HelpCircle,
  FileText,
  TerminalSquare,
  Settings
} from "lucide-react";

export function Sidebar() {
  const pathname = usePathname();
  const { projectId } = useParams<{ projectId: string }>();

  // If we are not in a project context (e.g. at /new), we have no sidebar navigation items.
  if (!projectId) {
    return (
      <aside className="w-[60px] hover:w-[220px] transition-all duration-300 flex-shrink-0 h-full bg-bg-surface border-r border-border-subtle group overflow-hidden z-20" />
    );
  }

  const navItems = [
    { label: "Overview", icon: LayoutDashboard, href: `/${projectId}` },
    { label: "Simulator Test", icon: TerminalSquare, href: `/${projectId}/simulator` },
    { label: "Knowledge Base", icon: BookOpen, href: `/${projectId}/knowledge` },
    { label: "Functions", icon: Zap, href: `/${projectId}/functions` },
    { label: "AI Configuration", icon: Settings2, href: `/${projectId}/ai` },
    { label: "App Settings", icon: Settings, href: `/${projectId}/sdk` },
    { label: "Analytics", icon: BarChart2, href: `/${projectId}/analytics` },
  ];

  return (
    <aside className="w-[220px] flex-shrink-0 h-full bg-bg-surface border-r border-border-default flex flex-col z-20">
      
      {/* Search / Filter slot? Firebase has a little filter. We'll leave some padding. */}
      <div className="h-4 pl-4 pt-4 mb-2"></div>

      <nav className="flex-1 px-3 space-y-1 overflow-y-auto">
        <div className="text-[10px] font-bold text-text-muted uppercase tracking-wider px-3 mb-2 mt-2">
          Project Workspace
        </div>
        
        {navItems.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors ${
                isActive
                  ? "bg-bg-active text-text-primary font-medium"
                  : "text-text-secondary hover:bg-bg-hover hover:text-text-primary"
              }`}
            >
              <item.icon
                className={`w-4 h-4 flex-shrink-0 ${
                  isActive ? "text-accent" : "text-text-muted"
                }`}
              />
              <span className="truncate">{item.label}</span>
            </Link>
          );
        })}
      </nav>

      <div className="p-4 border-t border-border-subtle space-y-1">
        <Link
          href="#"
          className="flex items-center gap-3 px-3 py-2 rounded-md text-sm text-text-secondary hover:bg-bg-hover hover:text-text-primary transition-colors"
        >
          <FileText className="w-4 h-4 text-text-muted" />
          Documentation
        </Link>
        <Link
          href="#"
          className="flex items-center gap-3 px-3 py-2 rounded-md text-sm text-text-secondary hover:bg-bg-hover hover:text-text-primary transition-colors"
        >
          <HelpCircle className="w-4 h-4 text-text-muted" />
          Support
        </Link>
      </div>
    </aside>
  );
}
