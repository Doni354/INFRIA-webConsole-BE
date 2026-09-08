"use client";

import React from "react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import { LoadingSpinner } from "@/components/ui/Loading";

const features = [
  "RAG-powered knowledge base",
  "Dynamic function calling",
  "Real-time SDK integration",
  "Runtime analytics & observability",
];

export default function LoginPage() {
  const { user, loading, signInWithGoogle } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && user) {
      router.replace("/");
    }
  }, [user, loading, router]);

  async function handleSignIn() {
    try {
      await signInWithGoogle();
    } catch (err) {
      console.error(err);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-bg-base flex items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-bg-base flex">
      {/* Left — brand panel */}
      <div className="hidden lg:flex flex-col justify-between w-[440px] flex-shrink-0 bg-bg-surface border-r border-border-subtle p-10">
        {/* Logo slot */}
        <div className="flex items-center gap-2.5">
          {/* Placeholder — swap with <Image src="/infria-logo.svg" /> when ready */}
          <div className="w-8 h-8 rounded-lg bg-accent flex items-center justify-center">
            <span className="text-white text-sm font-black tracking-tight">IN</span>
          </div>
          <span className="font-bold text-base text-text-primary tracking-tight">
            INFRIA
          </span>
        </div>

        {/* Center copy */}
        <div className="space-y-6">
          <div className="space-y-3">
            <h1 className="text-2xl font-bold text-text-primary leading-tight">
              AI Infrastructure
              <br />
              for Mobile Applications
            </h1>
            <p className="text-sm text-text-secondary leading-relaxed">
              Build AI-powered experiences into your Flutter application —
              grounded, callable, and observable.
            </p>
          </div>

          <div className="space-y-2.5">
            {features.map((f) => (
              <div key={f} className="flex items-center gap-2.5 text-sm text-text-secondary">
                <div className="w-1.5 h-1.5 rounded-full bg-accent flex-shrink-0" />
                {f}
              </div>
            ))}
          </div>

          {/* Subtle wave decoration — brand philosophy */}
          <div className="mt-8 space-y-1 opacity-40">
            {[80, 60, 40].map((w, i) => (
              <div
                key={i}
                className="h-1 rounded-full bg-accent"
                style={{ width: `${w}%` }}
              />
            ))}
          </div>
        </div>

        <p className="text-xs text-text-muted">
          © {new Date().getFullYear()} INFRIA. Developer preview.
        </p>
      </div>

      {/* Right — sign in */}
      <div className="flex-1 flex items-center justify-center px-6">
        <div className="w-full max-w-sm space-y-6">
          {/* Mobile logo */}
          <div className="lg:hidden flex items-center gap-2 mb-4">
            <div className="w-7 h-7 rounded-lg bg-accent flex items-center justify-center">
              <span className="text-white text-xs font-black">IN</span>
            </div>
            <span className="font-bold text-base text-text-primary">INFRIA</span>
          </div>

          <div className="space-y-1">
            <h2 className="text-xl font-bold text-text-primary">
              Sign in to Console
            </h2>
            <p className="text-sm text-text-muted">Developer access only.</p>
          </div>

          <button
            onClick={handleSignIn}
            id="google-signin-btn"
            className="w-full flex items-center justify-center gap-3 h-10 bg-white hover:bg-gray-50
              text-gray-800 font-medium rounded-lg border border-gray-200 text-sm transition-all
              shadow-sm cursor-pointer"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24">
              <path
                fill="#4285F4"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="#34A853"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="#FBBC05"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
              />
              <path
                fill="#EA4335"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
              />
            </svg>
            Continue with Google
          </button>

          <p className="text-xs text-text-muted text-center leading-relaxed">
            By continuing, you agree to the INFRIA Console Terms of Service.
          </p>
        </div>
      </div>
    </div>
  );
}
