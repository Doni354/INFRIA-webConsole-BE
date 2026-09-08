"use client";

import React from "react";
import Link from "next/link";
import { usePathname, useParams, useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import {
  LayoutDashboard,
  BookOpen,
  Zap,
  Settings2,
  Code2,
  BarChart2,
  TerminalSquare,
  LogOut,
  ChevronRight,
} from "lucide-react";

export function Sidebar() {
  const pathname = usePathname();
  const { projectId } = useParams<{ projectId: string }>();
  const { signOut } = useAuth();
  const router = useRouter();

  async function handleSignOut() {
    await signOut();
    router.replace("/login");
  }

  // If we are not in a project context (e.g. at /new), render a minimal sidebar
  if (!projectId) {
    return (
      <aside className="w-[220px] flex-shrink-0 h-full bg-bg-surface border-r border-border-default flex flex-col z-20">
        <div className="flex-1" />
        <div className="p-4 border-t border-border-subtle">
          <button
            onClick={handleSignOut}
            className="w-full flex items-center gap-3 px-3 py-2 rounded-md text-sm text-status-error hover:bg-status-error/10 transition-colors"
            aria-label="Sign out"
          >
            <LogOut className="w-4 h-4" />
            Sign Out
          </button>
        </div>
      </aside>
    );
  }

  const navItems = [
    { label: "Overview", icon: LayoutDashboard, href: `/${projectId}` },
    { label: "Simulator", icon: TerminalSquare, href: `/${projectId}/simulator` },
    { label: "Knowledge", icon: BookOpen, href: `/${projectId}/knowledge` },
    { label: "Functions", icon: Zap, href: `/${projectId}/functions` },
    { label: "AI Config", icon: Settings2, href: `/${projectId}/ai` },
    { label: "SDK & API Keys", icon: Code2, href: `/${projectId}/sdk` },
    { label: "Analytics", icon: BarChart2, href: `/${projectId}/analytics` },
  ];

  return (
    <aside className="w-[220px] flex-shrink-0 h-full bg-bg-surface border-r border-border-default flex flex-col z-20">
      <div className="h-4" />

      <nav className="flex-1 px-2 space-y-0.5 overflow-y-auto">
        <div className="text-[10px] font-bold text-text-muted uppercase tracking-widest px-3 mb-2 mt-2">
          Project
        </div>

        {navItems.map((item) => {
          // Active if exact match or if current path starts with this href (for nested routes)
          const isActive =
            pathname === item.href ||
            (item.href !== `/${projectId}` && pathname.startsWith(item.href));

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`group flex items-center justify-between px-3 py-2 rounded-md text-sm transition-colors ${
                isActive
                  ? "bg-accent-muted text-accent font-semibold"
                  : "text-text-secondary hover:bg-bg-hover hover:text-text-primary"
              }`}
            >
              <div className="flex items-center gap-3">
                <item.icon
                  className={`w-4 h-4 flex-shrink-0 ${
                    isActive ? "text-accent" : "text-text-muted group-hover:text-text-secondary"
                  }`}
                />
                <span className="truncate">{item.label}</span>
              </div>
              {isActive && (
                <ChevronRight className="w-3 h-3 text-accent opacity-60" />
              )}
            </Link>
          );
        })}
      </nav>

      {/* Bottom — Sign Out */}
      <div className="p-3 border-t border-border-subtle">
        <button
          onClick={handleSignOut}
          className="w-full flex items-center gap-3 px-3 py-2 rounded-md text-sm text-text-muted hover:text-status-error hover:bg-status-error/10 transition-colors group"
          aria-label="Sign out of INFRIA Console"
        >
          <LogOut className="w-4 h-4 group-hover:text-status-error transition-colors" />
          Sign Out
        </button>
      </div>
    </aside>
  );
}
