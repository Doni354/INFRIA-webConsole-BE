"use client";

import React, { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { apiKeyService } from "@/services/apiKey.service";
import { projectService } from "@/services/project.service";
import { APIKey, Project } from "@/types";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/EmptyState";
import { Key, Plus, Trash2, Copy, CheckCircle2, Eye, EyeOff, Loader2, Search, ArrowUpDown } from "lucide-react";
import { CodeBlock } from "@/components/ui/CodeBlock";

export default function AppSettingsPage() {
  const { projectId } = useParams<{ projectId: string }>();
  
  const [project, setProject] = useState<Project | null>(null);
  const [keys, setKeys] = useState<APIKey[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState("");
  
  // Table Controls
  const [searchQuery, setSearchQuery] = useState("");
  const [sortField, setSortField] = useState<"name" | "createdAt">("createdAt");
  const [sortAsc, setSortAsc] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 5;

  // View state
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [newlyGeneratedKey, setNewlyGeneratedKey] = useState<string | null>(null);

  // Load apps from localStorage (sync logic with Overview)
  const [registeredApps, setRegisteredApps] = useState<{ id: string, name: string, platform: string, packageInfo?: string }[]>([]);

  useEffect(() => {
    projectService.list().then(res => setProject(res.find(p => p.id === projectId) || null));
    loadKeys();
    
    // Load registered apps
    try {
      const saved = localStorage.getItem(`infria_apps_${projectId}`);
      if (saved) setTimeout(() => setRegisteredApps(JSON.parse(saved)), 0);
    } catch(e) {}
  }, [projectId]);

  function handleRemoveApp(id: string) {
    if (!confirm("Are you sure you want to disconnect this app? SDK calls using this App Name might fail.")) return;
    const newApps = registeredApps.filter(a => a.id !== id);
    setRegisteredApps(newApps);
    localStorage.setItem(`infria_apps_${projectId}`, JSON.stringify(newApps));
  }

  async function loadKeys() {
    setLoading(true);
    const res = await apiKeyService.list(projectId);
    setKeys(res);
    setLoading(false);
  }

  async function handleCreate() {
    if (!newName) return;
    setCreating(true);
    const { rawKey } = await apiKeyService.generate(projectId, newName);
    setNewName("");
    setCreating(false);
    setNewlyGeneratedKey(rawKey);
    loadKeys();
  }

  async function revokeKey(id: string) {
    if (!confirm("Revoke this key? It will instantly stop working.")) return;
    await apiKeyService.revoke(projectId, id);
    loadKeys();
  }

  function handleCopy(key: string, id: string) {
    navigator.clipboard.writeText(key);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  }

  // Filter & Sort Logic
  const filteredData = keys.filter(k => 
    k.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
    k.prefix.toLowerCase().includes(searchQuery.toLowerCase())
  ).sort((a, b) => {
    let cmp = 0;
    if (sortField === "name") cmp = a.name.localeCompare(b.name);
    else cmp = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
    return sortAsc ? cmp : -cmp;
  });

  // Paging Logic
  const totalPages = Math.ceil(filteredData.length / itemsPerPage);
  const paginatedData = filteredData.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  function toggleSort(field: "name" | "createdAt") {
    if (sortField === field) setSortAsc(!sortAsc);
    else { setSortField(field); setSortAsc(true); }
    setCurrentPage(1);
  }


  if (!project) return null;

  return (
    <div className="flex flex-col gap-6 w-full pb-10 h-full max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-text-primary mb-1">App Settings & API Keys</h1>
          <p className="text-text-secondary text-sm">Manage client apps and secure backend API tokens.</p>
        </div>
      </div>

      <div className="flex gap-4 border-b border-border-default">
         <button className="px-4 py-2 border-b-2 border-accent text-accent font-semibold text-sm">General Settings</button>
      </div>

      <div className="flex flex-col gap-4">
         <div className="flex flex-col gap-1">
            <h2 className="text-lg font-bold text-text-primary">Connected Apps</h2>
            <p className="text-xs text-text-secondary leading-relaxed">Applications that have been initialized to run the INFRIA SDK logic. Go to Project Overview to add new ones.</p>
         </div>
         
         <div className="w-full">
            <div className="bg-bg-surface border border-border-default rounded-xl overflow-hidden shadow-sm">
               {registeredApps.length === 0 ? (
                 <div className="p-8 text-center text-sm text-text-muted">No apps connected yet. Please register one in the Dashboard.</div>
               ) : (
                 <div className="divide-y divide-border-subtle">
                   {registeredApps.map(app => (
                     <div key={app.id} className="p-5 hover:bg-bg-elevated transition-colors">
                        <div className="flex items-center justify-between mb-3">
                           <div>
                             <h4 className="font-bold text-text-primary text-base">{app.name}</h4>
                             <p className="text-xs text-text-muted mt-0.5 font-mono">{app.packageInfo || "No Package ID set"}</p>
                           </div>
                           <div className="flex items-center gap-3">
                              <Badge variant="info" className="uppercase tracking-wider">{app.platform}</Badge>
                              <button onClick={() => handleRemoveApp(app.id)} className="text-text-muted hover:text-status-error transition-colors p-1" title="Disconnect App">
                                 <Trash2 className="w-4 h-4" />
                              </button>
                           </div>
                        </div>
                        {/* Config Code block depending on platform for mockup */}
                        <div className="mt-4 bg-bg-base border border-border-strong rounded-lg p-3">
                           <div className="text-[10px] font-bold uppercase tracking-widest text-text-muted mb-2">Init Configuration</div>
                           <CodeBlock 
                             language={app.platform === 'flutter' ? 'dart' : app.platform === 'web' ? 'javascript' : 'swift'}
                             code={
app.platform === 'flutter' ? 
`import 'package:infria/infria.dart';

void main() async {
  await Infria.initializeApp(
     projectId: '${projectId}',
     appName: '${app.name}'
  );
}` : app.platform === 'web' ? 
`import { initializeApp } from 'infria/app';

const app = initializeApp({
  projectId: '${projectId}',
  appName: '${app.name}'
});` : `// Initialize matching ${app.platform} client with standard options\nInfriaApp.configure("${projectId}");`
                             } 
                           />
                        </div>
                     </div>
                   ))}
                 </div>
               )}
            </div>
         </div>
      </div>
      
      <div className="border-b border-border-subtle my-2" />

      {/* Secrets & API Keys API Section aligned to new standards */}
      <div className="flex flex-col gap-4">
         <div className="flex flex-col gap-1">
            <h2 className="text-lg font-bold text-text-primary">Backend API Keys</h2>
            <p className="text-xs text-text-secondary leading-relaxed">Use these secret keys to securely access INFRIA services directly from your own backend (Node.js, Go, Python, etc) without going through the Client SDKs.</p>
         </div>
         
         <div className="w-full">
           <div className="bg-bg-surface border border-border-default rounded-xl overflow-hidden shadow-sm flex flex-col">
              
              {/* Toolbar */}
              <div className="border-b border-border-subtle p-4 flex flex-col sm:flex-row sm:items-center gap-4 bg-bg-elevated">
                 <div className="relative flex-1">
                   <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
                   <input
                     value={searchQuery}
                     onChange={e => { setSearchQuery(e.target.value); setCurrentPage(1); }}
                     placeholder="Search API keys..."
                     className="w-full pl-9 pr-3 py-2 bg-bg-base border border-border-strong rounded-md text-sm text-text-primary focus:border-accent outline-none"
                   />
                 </div>
                 <div className="flex items-center gap-2">
                   <input
                     value={newName}
                     onChange={e => setNewName(e.target.value)}
                     placeholder="New Key Name (e.g. Prod Server)"
                     className="w-[180px] px-3 py-2 bg-bg-base border border-border-strong rounded-md text-sm text-text-primary focus:border-accent outline-none"
                   />
                   <Button variant="primary" onClick={handleCreate} disabled={!newName || creating}>
                     {creating ? <Loader2 className="w-4 h-4 animate-spin" /> : "Generate"}
                   </Button>
                 </div>
              </div>

              {/* Table */}
              <div className="overflow-auto">
                 <table className="w-full text-left text-sm whitespace-nowrap">
                   <thead className="bg-bg-surface border-b border-border-default text-text-secondary sticky top-0 z-10">
                     <tr>
                       <th className="px-6 py-3 font-medium cursor-pointer hover:bg-bg-hover transition-colors" onClick={() => toggleSort("name")}>
                         <div className="flex items-center gap-1">Key Name <ArrowUpDown className="w-3.5 h-3.5 text-text-muted opacity-50" /></div>
                       </th>
                       <th className="px-6 py-3 font-medium">Key Prefix</th>
                       <th className="px-6 py-3 font-medium">Status</th>
                       <th className="px-6 py-3 font-medium cursor-pointer hover:bg-bg-hover transition-colors" onClick={() => toggleSort("createdAt")}>
                         <div className="flex items-center gap-1">Created <ArrowUpDown className="w-3.5 h-3.5 text-text-muted opacity-50" /></div>
                       </th>
                       <th className="px-6 py-3 font-medium text-right">Actions</th>
                     </tr>
                   </thead>
                   <tbody className="divide-y divide-border-subtle bg-bg-surface">
                     {loading ? (
                       <tr><td colSpan={5} className="py-10 text-center"><Loader2 className="w-6 h-6 animate-spin text-accent mx-auto" /></td></tr>
                     ) : paginatedData.length === 0 ? (
                       <tr><td colSpan={5} className="py-10 text-center text-text-muted"><EmptyState title="No Keys" description="No keys found." icon={<Key className="w-6 h-6"/>} /></td></tr>
                     ) : (
                       paginatedData.map(key => (
                         <tr key={key.id} className="hover:bg-bg-hover transition-colors">
                           <td className="px-6 py-4 font-semibold text-text-primary whitespace-normal break-words min-w-[200px] lg:max-w-md">{key.name}</td>
                           <td className="px-6 py-4 font-mono text-xs max-w-[200px] truncate">
                              <span className="flex items-center gap-2 bg-bg-elevated px-2 py-1 rounded inline-flex border border-border-strong">
                                {key.prefix}
                              </span>
                           </td>
                           <td className="px-6 py-4">
                             <Badge variant={key.status === "active" ? "success" : "error"}>{key.status}</Badge>
                           </td>
                           <td className="px-6 py-4 text-xs text-text-muted">{new Date(key.createdAt).toLocaleDateString()}</td>
                           <td className="px-6 py-4">
                             <div className="flex items-center justify-end gap-3">
                               {key.status === "active" && (
                                 <button
                                   onClick={() => revokeKey(key.id)}
                                   className="text-text-muted hover:text-status-error transition-colors"
                                   title="Revoke Key"
                                 >
                                   <Trash2 className="w-4 h-4" />
                                 </button>
                               )}
                             </div>
                           </td>
                         </tr>
                       ))
                     )}
                   </tbody>
                 </table>
              </div>
              
              {/* Pagination */}
              {!loading && totalPages > 1 && (
                 <div className="border-t border-border-subtle bg-bg-elevated p-3 px-6 flex items-center justify-between text-sm">
                    <span className="text-text-muted font-medium">Showing {((currentPage - 1) * itemsPerPage) + 1} to {Math.min(currentPage * itemsPerPage, filteredData.length)} of {filteredData.length} keys</span>
                    <div className="flex gap-2">
                       <button onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))} disabled={currentPage === 1} className="px-4 py-1.5 rounded-md bg-bg-base border border-border-strong text-text-secondary disabled:opacity-50 hover:bg-bg-hover hover:text-text-primary transition-colors font-semibold shadow-sm">Prev</button>
                       <button onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))} disabled={currentPage === totalPages} className="px-4 py-1.5 rounded-md bg-bg-base border border-border-strong text-text-secondary disabled:opacity-50 hover:bg-bg-hover hover:text-text-primary transition-colors font-semibold shadow-sm">Next</button>
                    </div>
                 </div>
              )}
           </div>
         </div>
      </div>

      {newlyGeneratedKey && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="bg-bg-surface border border-border-default rounded-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-200 shadow-2xl p-8">
            <h2 className="text-xl font-bold text-text-primary mb-2 flex items-center gap-2">
              <Key className="w-5 h-5 text-accent" />
              API Key Generated
            </h2>
            <p className="text-sm text-text-secondary mb-6 leading-relaxed">
              Please copy this key and store it securely. For your security, <strong className="text-text-primary font-bold">it will not be shown again</strong>.
            </p>
            <div className="relative mb-6">
              <input readOnly value={newlyGeneratedKey} className="w-full pl-3 pr-12 py-3 bg-bg-elevated border border-border-strong rounded-lg text-text-primary font-mono text-sm outline-none shadow-inner" />
              <button 
                onClick={() => {
                  navigator.clipboard.writeText(newlyGeneratedKey);
                  setCopiedId('modal');
                  setTimeout(() => setCopiedId(null), 2000);
                }}
                className="absolute right-2 top-1/2 -translate-y-1/2 p-2 rounded-md hover:bg-bg-hover text-text-secondary hover:text-text-primary transition-colors"
                title="Copy full access key"
              >
                {copiedId === 'modal' ? <CheckCircle2 className="w-4 h-4 text-status-success" /> : <Copy className="w-4 h-4" />}
              </button>
            </div>
            <Button variant="primary" className="w-full py-2.5" onClick={() => setNewlyGeneratedKey(null)}>
              I&apos;ve copied it securely
            </Button>
          </div>
        </div>
      )}

    </div>
  );
}
