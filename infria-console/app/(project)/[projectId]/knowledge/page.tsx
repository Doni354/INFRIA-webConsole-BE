"use client";

import React, { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { knowledgeService } from "@/services/knowledge.service";
import { Knowledge } from "@/types";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/EmptyState";
import { FileText, Plus, RefreshCw, Trash2, ChevronDown, ChevronUp, Eye, Loader2, Search, Grid2X2, ArrowUpDown } from "lucide-react";

const CATEGORIES = ["Policy & FAQ", "Internal SOP", "Product Info", "Pricing", "Technical Docs", "Other", "Custom..."];

type KnowledgeStatus = "draft" | "processing" | "ready" | "failed" | "archived";

function StatusBadge({ status }: { status: KnowledgeStatus }) {
  const map: Record<KnowledgeStatus, "success" | "default" | "info" | "error" | "warning"> = {
    ready: "success",
    processing: "info",
    draft: "default",
    failed: "error",
    archived: "warning",
  };
  return <Badge variant={map[status] || "default"}>{status}</Badge>;
}

export default function KnowledgePage() {
  const { projectId } = useParams<{ projectId: string }>();
  const [data, setData] = useState<Knowledge[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  
  // Table Controls
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("All");
  const [sortField, setSortField] = useState<"createdAt" | "title">("createdAt");
  const [sortAsc, setSortAsc] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 5;

  const [viewMode, setViewMode] = useState<"text" | "chunks">("text");

  // Form State
  const [isAdding, setIsAdding] = useState(false);
  const [saving, setSaving] = useState(false);
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState(CATEGORIES[0]);
  const [customCategory, setCustomCategory] = useState("");
  const [content, setContent] = useState("");

  const estimatedChunks = Math.ceil(content.length / 800); // More realistic chunk logic ~800 chars

  useEffect(() => { loadData(); }, [projectId]);

  async function loadData() {
    setLoading(true);
    const res = await knowledgeService.list(projectId);
    setData(res);
    setLoading(false);
  }

  async function handleAdd() {
    if (!title.trim() || !content.trim()) return;
    
    const finalCategory = category === "Custom..." ? customCategory.trim() : category;
    if (!finalCategory) return;

    setSaving(true);
    const drafted = await knowledgeService.createDraft({ projectId, title, category: finalCategory, content });
    await knowledgeService.publish(projectId, drafted.id);
    setIsAdding(false);
    setTitle(""); setCategory(CATEGORIES[0]); setCustomCategory(""); setContent("");
    setSaving(false);
    loadData();
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this knowledge entry?")) return;
    await knowledgeService.delete(projectId, id);
    loadData();
  }

  async function handleReindex(id: string) {
    await knowledgeService.reindex(projectId, id);
    loadData();
  }

  // Filtering & Sorting Logic
  const filteredData = data.filter(d => {
     const matchesSearch = d.title.toLowerCase().includes(searchQuery.toLowerCase()) || d.content.toLowerCase().includes(searchQuery.toLowerCase());
     const matchesCategory = categoryFilter === "All" || d.category === categoryFilter;
     return matchesSearch && matchesCategory;
  }).sort((a, b) => {
     let cmp = 0;
     if (sortField === "title") cmp = a.title.localeCompare(b.title);
     else cmp = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
     return sortAsc ? cmp : -cmp;
  });

  // Paging Logic
  const totalPages = Math.ceil(filteredData.length / itemsPerPage);
  const paginatedData = filteredData.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  const categoryGroups = Array.from(new Set(data.map(d => d.category)));

  // Dummy Smart Chunking Simulator for Client-side preview (Approx ~500 chars/chunk)
  function renderChunksPreview(contentString: string) {
    if (!contentString) return null;
    const chunkSize = 500;
    const chunks = [];
    for (let i = 0; i < contentString.length; i += chunkSize) {
        chunks.push(contentString.slice(i, i + chunkSize));
    }
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
        {chunks.map((chunk, idx) => (
          <div key={idx} className="bg-bg-elevated border border-border-default rounded-xl p-4 flex flex-col">
             <div className="flex items-center justify-between mb-2">
               <span className="text-xs font-semibold text-text-muted">Chunk {idx + 1}</span>
               <span className="text-[10px] bg-bg-surface px-1.5 py-0.5 rounded border border-border-subtle text-text-secondary">{chunk.length} chars</span>
             </div>
             <p className="text-xs text-text-primary leading-relaxed flex-1 line-clamp-6">{chunk}{chunk.length === chunkSize ? '...' : ''}</p>
          </div>
        ))}
      </div>
    );
  }

  function toggleSort(field: "createdAt" | "title") {
     if (sortField === field) setSortAsc(!sortAsc);
     else { setSortField(field); setSortAsc(true); }
     setCurrentPage(1);
  }

  return (
    <div className="flex flex-col gap-6 w-full pb-10 h-full">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-text-primary mb-1">Knowledge Base</h1>
          <p className="text-text-secondary text-sm">Documents used for Retrieval-Augmented Generation (RAG) context injection.</p>
        </div>
        <Button variant="primary" icon={<Plus className="w-4 h-4" />} onClick={() => setIsAdding(!isAdding)}>
          Add Knowledge
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[
          { label: "Total Documents", value: data.length },
          { label: "Ready for RAG", value: data.filter(d => d.status === "ready").length },
          { label: "Total Chunks", value: data.reduce((s, d) => s + (d.chunkCount || 0), 0) },
        ].map(stat => (
          <div key={stat.label} className="bg-bg-surface border border-border-default rounded-xl p-4">
            <p className="text-2xl font-bold text-text-primary">{stat.value}</p>
            <p className="text-xs text-text-secondary mt-1">{stat.label}</p>
          </div>
        ))}
      </div>
      
      {/* Test Retrieval omitted for brevity, keeping UI clean for Phase 7 */}

      {/* Add Form */}
      {isAdding && (
        <div className="bg-bg-surface border border-border-default rounded-xl p-6 space-y-4">
          <h2 className="text-base font-semibold text-text-primary">Add New Knowledge Entry</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-text-secondary mb-1">Title</label>
              <input value={title} onChange={e => setTitle(e.target.value)} placeholder="e.g. Return Policy 2026" className="w-full px-3 py-2 bg-bg-elevated border border-border-strong rounded-md text-text-primary focus:border-accent outline-none text-sm" />
            </div>
            <div>
              <label className="block text-sm font-medium text-text-secondary mb-1">Category</label>
              <div className="flex gap-2">
                <select value={category} onChange={e => setCategory(e.target.value)} className={`${category === 'Custom...' ? 'w-1/2' : 'w-full'} px-3 py-2 bg-bg-elevated border border-border-strong rounded-md text-text-primary focus:border-accent outline-none text-sm`}>
                  {CATEGORIES.map(c => <option key={c}>{c}</option>)}
                </select>
                {category === 'Custom...' && (
                  <input autoFocus value={customCategory} onChange={e => setCustomCategory(e.target.value)} placeholder="Custom category..." className="flex-1 px-3 py-2 bg-bg-elevated border border-border-strong rounded-md text-text-primary focus:border-accent outline-none text-sm" />
                )}
              </div>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-text-secondary mb-1">Content</label>
            <p className="text-xs text-text-muted mb-2">Paste the full document text. INFRIA will automatically chunk and vectorize it.</p>
            <textarea
              value={content}
              onChange={e => setContent(e.target.value)}
              rows={8}
              placeholder="Paste document content here. The more detailed, the better the AI's answers will be..."
              className="w-full px-3 py-2 bg-bg-elevated border border-border-strong rounded-md text-text-primary focus:border-accent outline-none resize-none text-sm font-mono"
            />
            <div className="flex items-center justify-between mt-1">
              <p className="text-xs text-text-muted">{content.length} characters</p>
              <Badge variant="info">~{content ? estimatedChunks : 0} chunks estimated</Badge>
            </div>
          </div>
          <div className="flex justify-end gap-3 pt-2 border-t border-border-subtle">
            <Button variant="ghost" onClick={() => setIsAdding(false)}>Cancel</Button>
            <Button variant="primary" onClick={handleAdd} disabled={saving || !title || !content || (category === "Custom..." && !customCategory)}>
              {saving ? <><Loader2 className="w-4 h-4 animate-spin mr-1" /> Processing...</> : "Save & Vectorize"}
            </Button>
          </div>
        </div>
      )}

      {/* Table Section */}
      {loading ? (
        <div className="flex justify-center py-20"><Loader2 className="w-7 h-7 animate-spin text-accent" /></div>
      ) : data.length === 0 ? (
        <EmptyState
          title="No knowledge entries"
          description="Start adding documents. The AI will use them to answer user questions."
          icon={<FileText className="w-8 h-8" />}
        />
      ) : (
        <div className="bg-bg-surface border border-border-default rounded-xl overflow-hidden shadow-sm flex flex-col flex-1 min-h-[400px]">
          {/* Controls: Search + Categories */}
          <div className="border-b border-border-subtle bg-bg-elevated p-3 pl-4 flex flex-col sm:flex-row sm:items-center gap-4">
             <div className="relative w-full sm:w-64 shrink-0">
               <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
               <input
                 value={searchQuery}
                 onChange={e => { setSearchQuery(e.target.value); setCurrentPage(1); }}
                 placeholder="Search documents..."
                 className="w-full pl-9 pr-3 py-2 bg-bg-base border border-border-strong rounded-md text-sm text-text-primary focus:border-accent outline-none"
               />
             </div>
             
             {/* Slideable Category Filters */}
             <div className="flex-1 min-w-0 overflow-x-auto no-scrollbar mask-edges-right flex gap-1 items-center -mb-2 pb-2 sm:mb-0 sm:pb-0">
               <button onClick={() => { setCategoryFilter("All"); setCurrentPage(1); }} className={`px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-colors ${categoryFilter === "All" ? "bg-text-primary text-bg-base" : "bg-bg-surface border border-border-strong text-text-secondary hover:bg-bg-hover"}`}>
                  All ({data.length})
               </button>
               {categoryGroups.map(cat => (
                 <button key={cat} onClick={() => { setCategoryFilter(cat); setCurrentPage(1); }} className={`px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-colors ${categoryFilter === cat ? "bg-text-primary text-bg-base" : "bg-bg-surface border border-border-strong text-text-secondary hover:bg-bg-hover"}`}>
                   {cat}
                 </button>
               ))}
             </div>
          </div>

          {/* Table */}
          <div className="flex-1 overflow-auto">
            <table className="w-full text-left text-sm whitespace-nowrap">
              <thead className="bg-bg-surface border-b border-border-default text-text-secondary sticky top-0 z-10">
                <tr>
                  <th className="px-6 py-3 font-medium cursor-pointer hover:bg-bg-hover transition-colors" onClick={() => toggleSort("title")}>
                     <div className="flex items-center gap-1">Title <ArrowUpDown className="w-3.5 h-3.5 text-text-muted opacity-50" /></div>
                  </th>
                  <th className="px-6 py-3 font-medium">Category</th>
                  <th className="px-6 py-3 font-medium">Chunks</th>
                  <th className="px-6 py-3 font-medium">Status</th>
                  <th className="px-6 py-3 font-medium cursor-pointer hover:bg-bg-hover transition-colors" onClick={() => toggleSort("createdAt")}>
                     <div className="flex items-center gap-1">Added <ArrowUpDown className="w-3.5 h-3.5 text-text-muted opacity-50" /></div>
                  </th>
                  <th className="px-6 py-3 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border-subtle bg-bg-surface">
                {paginatedData.map(item => (
                  <React.Fragment key={item.id}>
                    <tr
                      className="hover:bg-bg-hover cursor-pointer"
                      onClick={() => setExpandedId(expandedId === item.id ? null : item.id)}
                    >
                      <td className="px-6 py-4 whitespace-normal break-words min-w-[200px] lg:max-w-md xl:max-w-lg">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-accent/10 border border-accent/20 flex flex-shrink-0 items-center justify-center">
                             <FileText className="w-4 h-4 text-accent" />
                          </div>
                          <span className="font-semibold text-text-primary">{item.title}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-xs px-2.5 py-1 bg-bg-elevated border border-border-default rounded-md text-text-secondary font-medium tracking-wide">{item.category}</span>
                      </td>
                      <td className="px-6 py-4 text-text-secondary">{item.chunkCount > 0 ? `${item.chunkCount} chunks` : "—"}</td>
                      <td className="px-6 py-4"><StatusBadge status={item.status as KnowledgeStatus} /></td>
                      <td className="px-6 py-4 text-text-muted text-xs font-medium">{new Date(item.createdAt).toLocaleDateString()}</td>
                      <td className="px-6 py-4">
                        <div className="flex items-center justify-end gap-3">
                          <button title="Reindex" onClick={e => { e.stopPropagation(); handleReindex(item.id); }} className="text-text-muted hover:text-accent transition-colors">
                            <RefreshCw className="w-4 h-4" />
                          </button>
                          <button title="Delete" onClick={e => { e.stopPropagation(); handleDelete(item.id); }} className="text-text-muted hover:text-status-error transition-colors">
                            <Trash2 className="w-4 h-4" />
                          </button>
                          {expandedId === item.id ? <ChevronUp className="w-5 h-5 text-text-muted" /> : <ChevronDown className="w-5 h-5 text-text-muted" />}
                        </div>
                      </td>
                    </tr>
                    {expandedId === item.id && (
                      <tr key={`${item.id}-exp`}>
                        <td colSpan={6} className="bg-bg-base px-6 py-5 border-b border-border-subtle shadow-inner">
                          <div className="flex items-center justify-between mb-4">
                             <div className="flex gap-4 text-xs text-text-secondary">
                               <div><span className="font-semibold text-text-primary block mb-0.5">Vector Info</span>{item.chunkCount > 0 ? `${item.chunkCount} chunks ready` : "Not yet vectorized"}</div>
                             </div>
                             <div className="flex bg-bg-surface border border-border-strong rounded-md p-1 gap-1">
                               <button onClick={() => setViewMode("text")} className={`px-3 py-1 flex items-center gap-1.5 text-xs font-medium rounded ${viewMode === 'text' ? 'bg-accent text-white' : 'text-text-secondary hover:bg-bg-elevated'}`}><Eye className="w-3.5 h-3.5" /> Full Text</button>
                               <button onClick={() => setViewMode("chunks")} className={`px-3 py-1 flex items-center gap-1.5 text-xs font-medium rounded ${viewMode === 'chunks' ? 'bg-accent text-white' : 'text-text-secondary hover:bg-bg-elevated'}`}><Grid2X2 className="w-3.5 h-3.5" /> Preview Dummy Chunks</button>
                             </div>
                          </div>
                          
                          {viewMode === "text" ? (
                            <div>
                              <div className="bg-bg-elevated border border-border-default rounded-lg p-4 max-h-60 overflow-y-auto w-full">
                                <pre className="text-xs text-text-secondary leading-relaxed whitespace-pre-wrap font-sans">{item.content || "(No content stored)"}</pre>
                              </div>
                            </div>
                          ) : (
                            <div className="bg-bg-surface p-1 rounded-lg border border-border-default max-h-[300px] overflow-y-auto p-4 shadow-inner">
                              <div className="mb-4 bg-status-info/10 text-status-info border border-status-info/20 px-3 py-2 rounded-md text-xs font-medium inline-block">
                                 Note: This is a client-side mockup of text splitting. Actual embeddings are processed by the INFRIA backend RAG pipeline.
                              </div>
                              {renderChunksPreview(item.content)}
                            </div>
                          )}
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                ))}
                {paginatedData.length === 0 && (
                  <tr><td colSpan={6} className="text-center py-10 text-text-muted text-sm border-t border-border-default">No results found in this category.</td></tr>
                )}
              </tbody>
            </table>
          </div>
          
          {/* Pagination Footer */}
          {totalPages > 1 && (
             <div className="border-t border-border-subtle bg-bg-elevated p-3 px-6 flex items-center justify-between text-sm">
                <span className="text-text-muted">Showing {((currentPage - 1) * itemsPerPage) + 1} to {Math.min(currentPage * itemsPerPage, filteredData.length)} of {filteredData.length} records</span>
                <div className="flex gap-1">
                   <button onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))} disabled={currentPage === 1} className="px-3 py-1.5 rounded bg-bg-base border border-border-strong text-text-secondary disabled:opacity-50 hover:bg-bg-hover hover:text-text-primary transition-colors font-medium">Prev</button>
                   <button onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))} disabled={currentPage === totalPages} className="px-3 py-1.5 rounded bg-bg-base border border-border-strong text-text-secondary disabled:opacity-50 hover:bg-bg-hover hover:text-text-primary transition-colors font-medium">Next</button>
                </div>
             </div>
          )}
        </div>
      )}
    </div>
  );
}
