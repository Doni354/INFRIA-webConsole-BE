"use client";

import React, { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { functionService } from "@/services/function.service";
import { ConsoleFunction, CreateFunctionInput, FunctionParameter } from "@/types";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/EmptyState";
import { Zap, Plus, Trash2, Loader2, ChevronDown, ChevronUp, X, Search, ArrowUpDown } from "lucide-react";

type Param = { key: string; type: string; description: string };

const TYPE_OPTIONS = ["string", "number", "boolean", "object", "array"];

export default function FunctionsPage() {
  const { projectId } = useParams<{ projectId: string }>();
  const [fns, setFns] = useState<ConsoleFunction[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAdding, setIsAdding] = useState(false);
  const [saving, setSaving] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  // Table Controls
  const [searchQuery, setSearchQuery] = useState("");
  const [sortField, setSortField] = useState<"name" | "status">("name");
  const [sortAsc, setSortAsc] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 5;

  // Form state
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [requiresAuth, setRequiresAuth] = useState(false);
  const [requiresConfirmation, setRequiresConfirmation] = useState(false);
  const [params, setParams] = useState<Param[]>([{ key: "", type: "string", description: "" }]);

  useEffect(() => {
    loadData();
  }, [projectId]);

  async function loadData() {
    setLoading(true);
    const res = await functionService.list(projectId);
    setFns(res);
    setLoading(false);
  }

  function addParam() {
    setParams(prev => [...prev, { key: "", type: "string", description: "" }]);
  }
  function removeParam(i: number) {
    setParams(prev => prev.filter((_, idx) => idx !== i));
  }
  function updateParam(i: number, field: keyof Param, value: string) {
    setParams(prev => prev.map((p, idx) => idx === i ? { ...p, [field]: value } : p));
  }

  async function handleCreate() {
    const validName = name.trim().toLowerCase().replace(/\s+/g, "_");
    if (!validName || !description.trim()) return;
    setSaving(true);

    const validParams = params.filter(p => p.key.trim());
    const properties: FunctionParameter["properties"] = Object.fromEntries(
      validParams.map(p => [p.key, { type: p.type, description: p.description || undefined }])
    );

    const input: CreateFunctionInput = {
      projectId,
      name: validName,
      description: description.trim(),
      parameters: {
        type: "object",
        properties,
        required: validParams.map(p => p.key),
      },
      requiresAuth,
      requiresConfirmation,
    };
    await functionService.create(input);
    setIsAdding(false);
    setName(""); setDescription(""); setRequiresAuth(false); setRequiresConfirmation(false);
    setParams([{ key: "", type: "string", description: "" }]);
    loadData();
    setSaving(false);
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this function? The AI will no longer be able to call it.")) return;
    await functionService.delete(projectId, id);
    loadData();
  }

  function formatSchema(fn: ConsoleFunction): string {
    return JSON.stringify(fn.parameters, null, 2);
  }

  function getParamCount(fn: ConsoleFunction) {
    return Object.keys(fn.parameters?.properties || {}).length;
  }

  function toggleSort(field: "name" | "status") {
    if (sortField === field) setSortAsc(!sortAsc);
    else { setSortField(field); setSortAsc(true); }
    setCurrentPage(1);
  }

  // Filter & Sort Logic
  const filteredData = fns.filter(f => 
    f.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
    f.description.toLowerCase().includes(searchQuery.toLowerCase())
  ).sort((a, b) => {
    let cmp = 0;
    if (sortField === "name") cmp = a.name.localeCompare(b.name);
    else cmp = a.status.localeCompare(b.status);
    return sortAsc ? cmp : -cmp;
  });

  // Paging Logic
  const totalPages = Math.ceil(filteredData.length / itemsPerPage);
  const paginatedData = filteredData.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  return (
    <div className="flex flex-col gap-6 w-full pb-10 h-full flex-1">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-text-primary mb-1">Functions / Tools</h1>
          <p className="text-text-secondary text-sm">Register native app capabilities as callable AI tools.</p>
        </div>
        <Button variant="primary" icon={<Plus className="w-4 h-4" />} onClick={() => setIsAdding(!isAdding)}>
          Add Function
        </Button>
      </div>

      {/* Basic Stats Banner instead of knowledge conflict */}
      <div className="bg-accent/10 border border-accent/20 rounded-xl p-4 flex gap-4">
        <div className="w-8 h-8 rounded-full bg-accent/20 flex items-center justify-center shrink-0"><Zap className="w-4 h-4 text-accent" /></div>
        <div className="text-sm">
          <h3 className="font-semibold text-accent mb-1">How Function Calling Works</h3>
          <p className="text-text-secondary leading-relaxed">
            Functions defined here are compiled into <strong>JSON Schema</strong> and injected into the LLM logic. 
            When triggered, the INFRIA SDK pauses generation and emits a <code className="bg-bg-elevated px-1 rounded">tool_call</code> event back to your mobile/web app.
          </p>
        </div>
      </div>

      {/* Add Function Form */}
      {isAdding && (
        <div className="bg-bg-surface border border-border-default rounded-xl p-6 space-y-6 shadow-sm">
          <div className="flex justify-between items-center">
            <h2 className="font-semibold text-text-primary">Define New Function</h2>
            <button onClick={() => setIsAdding(false)}><X className="w-4 h-4 text-text-muted hover:text-text-primary transition-colors" /></button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-text-secondary mb-1 uppercase tracking-wide">Function Name</label>
              <input value={name} onChange={e => setName(e.target.value)} placeholder="e.g. cancel_order (snake_case)" className="w-full px-3 py-2 bg-bg-elevated border border-border-strong rounded-md text-text-primary focus:border-accent outline-none text-sm" />
              <p className="text-xs text-text-muted mt-1">Will be auto-converted to snake_case</p>
            </div>
            <div>
              <label className="block text-xs font-semibold text-text-secondary mb-1 uppercase tracking-wide">Description</label>
              <input value={description} onChange={e => setDescription(e.target.value)} placeholder="Describe what this function does (AI uses this to decide when to call it)" className="w-full px-3 py-2 bg-bg-elevated border border-border-strong rounded-md text-text-primary focus:border-accent outline-none text-sm" />
              <p className="text-xs text-text-muted mt-1">Be specific — the AI uses this to decide when to call</p>
            </div>
          </div>

          {/* Parameter Builder */}
          <div>
            <div className="flex justify-between items-center mb-3">
              <label className="text-xs font-semibold text-text-secondary uppercase tracking-wide">Parameters</label>
              <button onClick={addParam} className="text-xs text-accent hover:underline flex items-center gap-1"><Plus className="w-3 h-3" /> Add Parameter</button>
            </div>
            {params.length === 0 ? (
              <p className="text-xs text-text-muted italic">No parameters — this function takes no input from the AI.</p>
            ) : (
              <div className="space-y-3">
                <div className="grid grid-cols-12 gap-2 text-xs text-text-muted font-semibold uppercase tracking-wide px-1">
                  <span className="col-span-4">Key Name</span>
                  <span className="col-span-3">Type</span>
                  <span className="col-span-4">Description (optional)</span>
                  <span className="col-span-1"></span>
                </div>
                {params.map((p, i) => (
                  <div key={i} className="grid grid-cols-12 gap-2 items-center">
                    <input value={p.key} onChange={e => updateParam(i, "key", e.target.value)} placeholder="e.g. order_id" className="col-span-4 px-3 py-1.5 bg-bg-elevated border border-border-strong rounded-md text-sm font-mono text-text-primary focus:border-accent outline-none" />
                    <select value={p.type} onChange={e => updateParam(i, "type", e.target.value)} className="col-span-3 px-2 py-1.5 bg-bg-elevated border border-border-strong rounded-md text-sm text-text-primary focus:border-accent outline-none">
                      {TYPE_OPTIONS.map(t => <option key={t}>{t}</option>)}
                    </select>
                    <input value={p.description} onChange={e => updateParam(i, "description", e.target.value)} placeholder="What is this param?" className="col-span-4 px-3 py-1.5 bg-bg-elevated border border-border-strong rounded-md text-sm text-text-primary focus:border-accent outline-none" />
                    <button onClick={() => removeParam(i)} className="col-span-1 flex justify-center"><X className="w-3.5 h-3.5 text-text-muted hover:text-status-error" /></button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Options */}
          <div className="flex gap-6 pt-2 border-t border-border-subtle">
            <label className="flex items-center gap-2 text-sm text-text-secondary cursor-pointer hover:text-text-primary">
              <input type="checkbox" checked={requiresAuth} onChange={e => setRequiresAuth(e.target.checked)} className="w-4 h-4 rounded accent-accent" />
              Requires User Auth
            </label>
            <label className="flex items-center gap-2 text-sm text-text-secondary cursor-pointer hover:text-text-primary">
              <input type="checkbox" checked={requiresConfirmation} onChange={e => setRequiresConfirmation(e.target.checked)} className="w-4 h-4 rounded accent-accent" />
              Requires Confirmation Dialog
            </label>
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <Button variant="ghost" onClick={() => setIsAdding(false)}>Cancel</Button>
            <Button variant="primary" onClick={handleCreate} disabled={saving || !name || !description}>
              {saving ? <><Loader2 className="w-4 h-4 animate-spin mr-1" /> Saving...</> : "Save Function"}
            </Button>
          </div>
        </div>
      )}

      {/* Table Section */}
      {loading ? (
        <div className="flex justify-center py-16"><Loader2 className="w-7 h-7 animate-spin text-accent" /></div>
      ) : fns.length === 0 ? (
        <EmptyState
          title="No functions registered"
          description="Add your first function to let the AI take actions in your app."
          icon={<Zap className="w-8 h-8" />}
        />
      ) : (
        <div className="bg-bg-surface border border-border-default rounded-xl overflow-hidden shadow-sm flex flex-col flex-1 min-h-[400px]">
          {/* Controls: Search */}
          <div className="border-b border-border-subtle bg-bg-elevated p-3 pl-4 flex gap-4">
             <div className="relative w-full sm:w-64">
               <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
               <input
                 value={searchQuery}
                 onChange={e => { setSearchQuery(e.target.value); setCurrentPage(1); }}
                 placeholder="Search functions..."
                 className="w-full pl-9 pr-3 py-2 bg-bg-base border border-border-strong rounded-md text-sm text-text-primary focus:border-accent outline-none"
               />
             </div>
             <div className="flex items-center text-text-muted text-xs font-semibold px-2">{filteredData.length} functions found</div>
          </div>

          <div className="flex-1 overflow-auto">
            <table className="w-full text-left text-sm whitespace-nowrap">
              <thead className="bg-bg-surface border-b border-border-default text-text-secondary sticky top-0 z-10">
                <tr>
                  <th className="px-6 py-3 font-medium cursor-pointer hover:bg-bg-hover transition-colors" onClick={() => toggleSort("name")}>
                     <div className="flex items-center gap-1">Function Name <ArrowUpDown className="w-3.5 h-3.5 text-text-muted opacity-50" /></div>
                  </th>
                  <th className="px-6 py-3 font-medium">Description</th>
                  <th className="px-6 py-3 font-medium">Params</th>
                  <th className="px-6 py-3 font-medium">Flags</th>
                  <th className="px-6 py-3 font-medium cursor-pointer hover:bg-bg-hover transition-colors" onClick={() => toggleSort("status")}>
                     <div className="flex items-center gap-1">Status <ArrowUpDown className="w-3.5 h-3.5 text-text-muted opacity-50" /></div>
                  </th>
                  <th className="px-6 py-3 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border-subtle bg-bg-surface">
                {paginatedData.map(fn => (
                  <React.Fragment key={fn.id}>
                    <tr className="hover:bg-bg-hover cursor-pointer" onClick={() => setExpandedId(expandedId === fn.id ? null : fn.id)}>
                      <td className="px-6 py-4 font-mono text-sm font-semibold text-text-primary">{fn.name}</td>
                      <td className="px-6 py-4 text-text-secondary max-w-[200px]">
                        <p className="truncate block pr-4">{fn.description}</p>
                      </td>
                      <td className="px-6 py-4 text-text-secondary">
                        {getParamCount(fn) > 0 ? <span className="font-medium bg-bg-elevated px-2 py-1 rounded border border-border-default text-xs">{getParamCount(fn)} param{getParamCount(fn) > 1 ? "s" : ""}</span> : <span className="text-text-muted italic text-xs">none</span>}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex gap-1">
                          {fn.requiresAuth && <span className="text-xs bg-accent/10 text-accent border border-accent/20 px-1.5 py-0.5 rounded font-medium">auth</span>}
                          {fn.requiresConfirmation && <span className="text-xs bg-status-warning/10 text-status-warning border border-status-warning/20 px-1.5 py-0.5 rounded font-medium">confirm</span>}
                          {!fn.requiresAuth && !fn.requiresConfirmation && <span className="text-xs text-text-muted">—</span>}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <Badge variant={fn.status === "active" ? "success" : "default"}>{fn.status}</Badge>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center justify-end gap-3">
                          <button onClick={e => { e.stopPropagation(); handleDelete(fn.id); }} className="text-text-muted hover:text-status-error transition-colors p-1">
                            <Trash2 className="w-4 h-4" />
                          </button>
                          {expandedId === fn.id ? <ChevronUp className="w-5 h-5 text-text-muted" /> : <ChevronDown className="w-5 h-5 text-text-muted" />}
                        </div>
                      </td>
                    </tr>
                    {expandedId === fn.id && (
                      <tr key={`${fn.id}-exp`}>
                        <td colSpan={6} className="bg-bg-base px-6 py-5 border-b border-border-subtle shadow-inner">
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div>
                              <p className="text-xs font-semibold text-text-secondary mb-2 uppercase tracking-wider flex items-center justify-between">
                                JSON Schema 
                                <span className="text-[10px] normal-case tracking-normal px-2 py-0.5 bg-bg-surface border border-border-strong rounded text-text-muted">Injected to LLM</span>
                              </p>
                              <pre className="font-mono text-xs bg-bg-elevated p-4 rounded-lg text-text-secondary overflow-x-auto border border-border-default shadow-sm">{formatSchema(fn)}</pre>
                            </div>
                            <div>
                              <p className="text-xs font-semibold text-text-secondary mb-2 uppercase tracking-wider flex items-center justify-between">
                                Flutter Implementation 
                                <span className="text-[10px] normal-case tracking-normal px-2 py-0.5 bg-bg-surface border border-border-strong rounded text-text-muted">Client Side Code</span>
                              </p>
                              <pre className="font-mono text-[11px] bg-[#1E1E1E] p-4 rounded-lg text-[#D4D4D4] overflow-x-auto border border-[#333333] shadow-sm leading-relaxed">{functionService.generateFlutterSnippet(fn)}</pre>
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                ))}
                {paginatedData.length === 0 && (
                  <tr><td colSpan={6} className="text-center py-10 text-text-muted text-sm border-t border-border-default">No functions match your search.</td></tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination Footer */}
          {totalPages > 1 && (
             <div className="border-t border-border-subtle bg-bg-elevated p-3 px-6 flex items-center justify-between text-sm">
                <span className="text-text-muted font-medium">Showing {((currentPage - 1) * itemsPerPage) + 1} to {Math.min(currentPage * itemsPerPage, filteredData.length)} of {filteredData.length} functions</span>
                <div className="flex gap-2">
                   <button onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))} disabled={currentPage === 1} className="px-4 py-1.5 rounded-md bg-bg-base border border-border-strong text-text-secondary disabled:opacity-50 hover:bg-bg-hover hover:text-text-primary transition-colors font-semibold shadow-sm">Prev</button>
                   <button onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))} disabled={currentPage === totalPages} className="px-4 py-1.5 rounded-md bg-bg-base border border-border-strong text-text-secondary disabled:opacity-50 hover:bg-bg-hover hover:text-text-primary transition-colors font-semibold shadow-sm">Next</button>
                </div>
             </div>
          )}
        </div>
      )}
    </div>
  );
}
