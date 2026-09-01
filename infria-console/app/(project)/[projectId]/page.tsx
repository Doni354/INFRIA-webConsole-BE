"use client";

import React, { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { projectService } from "@/services/project.service";
import { knowledgeService } from "@/services/knowledge.service";
import { functionService } from "@/services/function.service";
import { apiKeyService } from "@/services/apiKey.service";
import { Project } from "@/types";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { CodeBlock } from "@/components/ui/CodeBlock";
import { Loader2, ArrowRight, X, Play, Code2, Globe, CheckCircle2 } from "lucide-react";
import { Playground } from "@/components/playground/Playground";

// Extracted SVGs from simpleicons or common brand assets for better visuals
const FlutterIcon = () => (
  <svg viewBox="0 0 24 24" fill="currentColor" className="w-8 h-8 text-[#02569B] group-hover:text-[#0468d7] transition-colors"><path d="M14.314 0L2.3 12 6 15.7 21.684.013h-7.357zm.014 11.072L7.757 17.63l3.669 3.664L24 8.756zM8.98 18.846l-2.6 2.584a2.766 2.766 0 0 0 .044 3.91l.016.015L8.985 24h7.322l-7.326-5.154z"/></svg>
);
const AndroidIcon = () => (
  <svg viewBox="0 0 24 24" fill="currentColor" className="w-8 h-8 text-[#3DDC84] group-hover:text-[#45f493] transition-colors"><path d="M17.523 15.3414c-.5511 0-.9993-.4486-.9993-.9997s.4483-.9993.9993-.9993c.5511 0 .9993.4482.9993.9993.0005.5511-.4482.9997-.9993.9997m-11.046 0c-.5511 0-.9993-.4486-.9993-.9997s.4482-.9993.9993-.9993c.5511 0 .9993.4482.9993.9993 0 .5511-.4482.9997-.9993.9997m11.4045-6.02L19.8 6.1362a.458.458 0 0 0-.1314-.6277.458.458 0 0 0-.6278.131l-1.9961 3.2844a11.96 11.96 0 0 0-8.8893 0L6.1594 5.6394a.454.454 0 1 0-.7591.4967L7.318 9.3214a11.9056 11.9056 0 0 0-5.176 9.4215h19.7169a11.91 11.91 0 0 0-5.176-9.4215Z"/></svg>
);
const AppleIcon = () => (
  <svg viewBox="0 0 24 24" fill="currentColor" className="w-8 h-8 text-black dark:text-white"><path d="M12.152 6.896c-.948 0-2.415-1.078-3.96-1.04-2.04.027-3.91 1.183-4.961 3.014-2.117 3.675-.546 9.103 1.519 12.09 1.013 1.454 2.208 3.09 3.792 3.039 1.52-.065 2.09-.987 3.935-.987 1.831 0 2.35.987 3.96.948 1.637-.026 2.676-1.48 3.676-2.948 1.156-1.688 1.636-3.325 1.662-3.415-.039-.013-3.182-1.221-3.22-4.857-.026-3.04 2.48-4.494 2.597-4.559-1.429-2.09-3.623-2.324-4.39-2.376-2-.156-3.675 1.09-4.61 1.09zM15.53 3.83c.843-1.012 1.4-2.427 1.245-3.83-1.207.052-2.662.805-3.532 1.818-.688.78-1.34 2.22-.169 3.611 1.35.105 2.614-.843 2.456-1.599z"/></svg>
);
const WebIcon = () => (
  <Globe className="w-8 h-8 text-[#E34F26] group-hover:text-[#ff6a42] transition-colors" />
);

// Mock registry state since App Registration isn't fully in Firestore yet for this Phase.
// In real app, this would be a subcollection.
type AppRegistry = { id: string, name: string, platform: string, packageInfo?: string };

export default function ProjectOverviewPage() {
  const { projectId } = useParams<{ projectId: string }>();
  const router = useRouter();
  const [project, setProject] = useState<Project | null>(null);
  
  // Real Readiness Data
  const [hasKnowledge, setHasKnowledge] = useState(false);
  const [hasFunctions, setHasFunctions] = useState(false);
  
  // App Config logic
  const [registeredApps, setRegisteredApps] = useState<AppRegistry[]>([]);
  const [showAddApp, setShowAddApp] = useState<string | null>(null); 
  const [appName, setAppName] = useState("");
  const [packageId, setPackageId] = useState(""); 
  const [isRegistering, setIsRegistering] = useState(false);

  useEffect(() => {
    // 1. Load basic project
    projectService.list().then((res) => {
      const target = res.find((p) => p.id === projectId);
      if (target) {
        setProject(target);
        
        // Load apps from localStorage (Mock DB table)
        try {
           const saved = localStorage.getItem(`infria_apps_${projectId}`);
           if (saved) setRegisteredApps(JSON.parse(saved));
        } catch(e) {}
      }
      else router.replace("/new");
    });

    // 2. Load readiness data from subservices dynamically
    knowledgeService.list(projectId).then(docs => setHasKnowledge(docs.some(d => d.status === "ready")));
    functionService.list(projectId).then(fns => setHasFunctions(fns.length > 0));

  }, [projectId, router]);

  async function handleRegisterApp() {
    if (!appName || !showAddApp) return;
    setIsRegistering(true);
    await new Promise(r => setTimeout(r, 600));
    setRegisteredApps(prev => {
       const newApps = [...prev, { id: `app_${Date.now()}`, name: appName, platform: showAddApp, packageInfo: packageId }];
       localStorage.setItem(`infria_apps_${projectId}`, JSON.stringify(newApps));
       return newApps;
    });
    setIsRegistering(false);
    setShowAddApp(null);
    setAppName(""); setPackageId("");
  }

  if (!project) {
    return <div className="flex w-full h-[60vh] items-center justify-center"><Loader2 className="w-8 h-8 text-accent animate-spin" /></div>;
  }

  const platforms = [
    { id: "web", name: "Web", icon: <WebIcon />, desc: "React, Next.js, Vue" },
    { id: "flutter", name: "Flutter", icon: <FlutterIcon />, desc: "iOS, Android, Web" },
    { id: "ios", name: "Apple", icon: <AppleIcon />, desc: "SwiftUI, UIKit" },
    { id: "android", name: "Android", icon: <AndroidIcon />, desc: "Kotlin, Compose" },
  ];

  // Dynamic Progress Logic
  let progress = 25; // Initialize
  if (registeredApps.length > 0) progress += 25;
  if (hasKnowledge) progress += 25;
  if (hasFunctions) progress += 25;

  return (
    <div className="flex flex-col gap-6 h-full p-1 pb-10"> 
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-text-primary mb-1">{project.name}</h1>
          <p className="text-text-secondary text-sm">Dashboard Overview</p>
        </div>
        <Badge variant={project.status === "active" ? "success" : "default"}>
          {project.status.toUpperCase()}
        </Badge>
      </div>

      {registeredApps.length === 0 ? (
        <div className="bg-bg-surface border border-border-default rounded-xl p-8 text-center flex flex-col items-center justify-center">
          <h2 className="text-xl font-bold text-text-primary mb-2">Get started by adding INFRIA to your app</h2>
          <p className="text-text-secondary text-sm mb-8 max-w-md">Choose your target platform to configure your project and SDK.</p>
          
          <div className="flex flex-wrap justify-center gap-6 md:gap-10">
            {platforms.map(p => (
              <button key={p.id} onClick={() => p.id === 'flutter' ? setShowAddApp(p.id) : alert(`${p.name} SDK is coming soon in the next release! Please select Flutter for this preview.`)} className="flex flex-col items-center group cursor-pointer hover:-translate-y-1 transition-transform">
                <div className="w-16 h-16 rounded-2xl border border-border-strong flex items-center justify-center bg-bg-elevated group-hover:border-accent group-hover:bg-accent/10 transition-colors shadow-sm">
                  {p.icon}
                </div>
                <span className="text-sm font-semibold text-text-primary mt-3">{p.name}</span>
                <span className="text-xs text-text-muted mt-1">{p.desc}</span>
              </button>
            ))}
          </div>
        </div>
      ) : (
        <div className="bg-bg-surface border border-border-default rounded-xl p-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-4">
             <div className="w-12 h-12 rounded-xl bg-status-success/10 flex items-center justify-center border border-status-success/30 shrink-0">
                <CheckCircle2 className="text-status-success w-6 h-6" />
             </div>
             <div>
               <h3 className="font-bold text-text-primary">Your apps are connected</h3>
               <p className="text-sm text-text-secondary">Ready to receive agent completions via INFRIA runtime.</p>
             </div>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            {registeredApps.map(app => {
              const PlatformIcon = platforms.find(p => p.id === app.platform)?.icon;
              return (
                <Badge key={app.id} variant="info" className="flex items-center gap-1.5 px-3 py-1.5">
                  <span className="[&>svg]:w-4 [&>svg]:h-4">{PlatformIcon}</span>
                  <span className="text-xs capitalize font-medium">{app.name}</span>
                </Badge>
              );
            })}
            <Button variant="outline" size="sm" onClick={() => setShowAddApp('CHOOSER')}>+ Add App</Button>
          </div>
        </div>
      )}

      {/* Platform Chooser Modal */}
      {showAddApp === 'CHOOSER' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="bg-bg-surface border border-border-default rounded-2xl w-full max-w-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200 shadow-2xl p-8">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold text-text-primary">Select Target Platform</h2>
              <button onClick={() => setShowAddApp(null)} className="text-text-muted hover:text-text-primary"><X className="w-5 h-5" /></button>
            </div>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              {platforms.map(p => (
                <button key={p.id} onClick={() => p.id === 'flutter' ? setShowAddApp(p.id) : alert(`${p.name} SDK is coming soon in the next release! Please select Flutter for this preview.`)} className="flex flex-col items-center group cursor-pointer border border-border-default rounded-xl p-4 hover:border-accent hover:bg-accent/5 transition-colors bg-bg-elevated relative overflow-hidden">
                  {p.id !== 'flutter' && <div className="absolute top-0 right-0 bg-status-warning/20 text-status-warning text-[9px] font-bold px-2 py-0.5 rounded-bl-lg">SOON</div>}
                  <div className="w-16 h-16 flex items-center justify-center mb-3">
                    {p.icon}
                  </div>
                  <span className="text-sm font-semibold text-text-primary">{p.name}</span>
                  <span className="text-xs text-text-muted mt-1 text-center">{p.desc}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* App Registration Modal */}
      {showAddApp && showAddApp !== 'CHOOSER' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="bg-bg-surface border border-border-default rounded-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-200 shadow-2xl">
             <div className="flex items-center justify-between p-4 border-b border-border-subtle bg-bg-base">
               <h3 className="font-semibold text-text-primary flex items-center gap-2">
                 Register {platforms.find(p => p.id === showAddApp)?.name} App
               </h3>
               <button onClick={() => setShowAddApp(null)} className="text-text-muted hover:text-text-primary transition-colors"><X className="w-4 h-4" /></button>
             </div>
             <div className="p-6 space-y-4">
               <div className="flex justify-center mb-2">
                  <div className="w-16 h-16 rounded-xl border border-border-default flex items-center justify-center bg-bg-elevated shadow-inner">
                    {platforms.find(p => p.id === showAddApp)?.icon}
                  </div>
               </div>
               <div>
                  <label className="block text-xs font-semibold text-text-secondary mb-1">App Nickname</label>
                  <input autoFocus value={appName} onChange={e => setAppName(e.target.value)} placeholder="e.g. Employee Portal App" className="w-full text-sm px-3 py-2 bg-bg-elevated border border-border-strong rounded-md text-text-primary focus:border-accent outline-none" />
               </div>
               {(showAddApp === 'ios' || showAddApp === 'android' || showAddApp === 'flutter') && (
                 <div>
                    <label className="block text-xs font-semibold text-text-secondary mb-1">Package Name / Bundle ID (Optional)</label>
                    <input value={packageId} onChange={e => setPackageId(e.target.value)} placeholder="e.g. com.company.emp_portal" className="w-full text-sm px-3 py-2 bg-bg-elevated border border-border-strong rounded-md text-text-primary focus:border-accent outline-none" />
                    <p className="text-[11px] text-text-muted mt-1 leading-relaxed">Used to secure your API calls to this specific app identifier (like Firebase App Check).</p>
                 </div>
               )}
               <Button variant="primary" className="w-full mt-4" onClick={handleRegisterApp} disabled={isRegistering || !appName}>
                 {isRegistering ? <Loader2 className="w-4 h-4 animate-spin" /> : "Register App"}
               </Button>
             </div>
          </div>
        </div>
      )}

      {/* Main Grid: Left checklist, Right playground overflow-fix */}
      {/* Container ini dibuat stretching biar kolom kanan (Playground) bisa mengisi sisa tinggi */}
      <div className="flex flex-col lg:flex-row gap-6 items-stretch flex-1 min-h-[500px]">
        <div className="flex flex-col w-full lg:w-[60%] gap-6">
          <div className="bg-bg-surface border border-border-default rounded-xl p-6">
            <h2 className="text-base font-semibold mb-4">Readiness Checklist</h2>
            
            <div className="w-full bg-bg-elevated h-2.5 rounded-full overflow-hidden mb-6">
              <div 
                className="bg-accent h-full transition-all duration-500 ease-out" 
                style={{ width: `${progress}%` }}
              />
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-6 h-6 rounded-full bg-status-success-muted border border-status-success/30 flex items-center justify-center text-status-success text-xs">✓</div>
                  <div>
                    <p className="text-sm font-medium text-text-primary">Project Initialization</p>
                    <p className="text-xs text-text-secondary">Workspace created</p>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between opacity-90">
                <div className="flex items-center gap-3">
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs ${registeredApps.length > 0 ? "bg-status-success-muted border border-status-success/30 text-status-success" : "bg-bg-elevated border border-border-strong text-text-muted"}`}>
                    {registeredApps.length > 0 ? "✓" : "○"}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-text-primary">Add an App</p>
                    <p className="text-xs text-text-secondary">Configure INFRIA project for clients</p>
                  </div>
                </div>
                {registeredApps.length > 0 && <Button size="sm" variant="ghost" onClick={() => router.push(`/${projectId}/sdk`)}>App Settings <ArrowRight className="w-3.5 h-3.5 ml-1" /></Button>}
              </div>

              <div className="flex items-center justify-between opacity-80">
                <div className="flex items-center gap-3">
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs ${hasKnowledge ? "bg-status-success-muted border border-status-success/30 text-status-success" : "bg-bg-elevated border border-border-strong text-text-muted"}`}>
                    {hasKnowledge ? "✓" : "○"}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-text-primary">Upload Knowledge Base</p>
                    <p className="text-xs text-text-secondary">Provide context for the AI</p>
                  </div>
                </div>
                {!hasKnowledge && <Button size="sm" onClick={() => router.push(`/${projectId}/knowledge`)}>Setup <ArrowRight className="w-3.5 h-3.5 ml-1" /></Button>}
              </div>

              <div className="flex items-center justify-between opacity-80">
                <div className="flex items-center gap-3">
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs ${hasFunctions ? "bg-status-success-muted border border-status-success/30 text-status-success" : "bg-bg-elevated border border-border-strong text-text-muted"}`}>
                    {hasFunctions ? "✓" : "○"}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-text-primary">Configure Functions</p>
                    <p className="text-xs text-text-secondary">Register native capabilities</p>
                  </div>
                </div>
                {!hasFunctions && <Button size="sm" onClick={() => router.push(`/${projectId}/functions`)}>Setup <ArrowRight className="w-3.5 h-3.5 ml-1" /></Button>}
              </div>
            </div>
          </div>

          <div className="bg-bg-surface border border-border-default rounded-xl p-6 h-full flex flex-col justify-center">
            <h2 className="text-base font-semibold mb-4">Project Secrets</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-text-muted uppercase mb-2 tracking-wide">Project ID</label>
                <CodeBlock code={project.id} />
              </div>
            </div>
          </div>
        </div>

        {/* Fixing the Playground container */}
        <div className="flex flex-col w-full lg:w-[40%] bg-bg-surface border border-border-default rounded-xl overflow-hidden shadow-sm lg:h-auto min-h-[400px]">
           <Playground projectId={projectId} />
        </div>
      </div>
    </div>
  );
}
