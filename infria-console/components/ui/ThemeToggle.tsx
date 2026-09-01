"use client";

import { useTheme } from "next-themes";
import { useEffect, useState } from "react";
import { Moon, Sun } from "lucide-react";

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setTimeout(() => setMounted(true), 0);
  }, []);

  if (!mounted) {
    return <div className="w-8 h-8 rounded-md bg-bg-elevated animate-pulse border border-border-default" />;
  }

  const isDark = theme === "dark";

  return (
    <button
      onClick={() => setTheme(isDark ? "light" : "dark")}
      className="flex items-center justify-center w-8 h-8 rounded-md text-text-secondary hover:text-text-primary 
        hover:bg-bg-hover transition-colors border border-transparent hover:border-border-default 
        focus:outline-none focus-visible:ring-2 focus-visible:ring-accent cursor-pointer"
      aria-label="Toggle theme"
    >
      {isDark ? (
        <Sun className="w-4 h-4 translate-y-[0px] duration-300" />
      ) : (
        <Moon className="w-4 h-4 translate-y-[0px] duration-300" />
      )}
    </button>
  );
}
