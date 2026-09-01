"use client";

import React, { useEffect, useState, useMemo } from "react";
import { useParams } from "next/navigation";
import { aiService } from "@/services/ai.service";
import { AIConfig, Tone, Language } from "@/types";
import { Button } from "@/components/ui/Button";
import { Settings2, Save, CheckCircle2, Loader2, Sparkles, MessageSquareWarning, Search } from "lucide-react";

const TONES: Tone[] = ["friendly", "professional", "formal", "casual"];

export default function AiPage() {
  const { projectId } = useParams<{ projectId: string }>();
  const [config, setConfig] = useState<AIConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [langSearch, setLangSearch] = useState("");
  const [langDropdownOpen, setLangDropdownOpen] = useState(false);

  useEffect(() => {
    aiService.get(projectId).then(c => { setConfig(c); setLoading(false); });
  }, [projectId]);

  // Generate dynamic language list using Intl API
  const ALL_LANGS = useMemo(() => {
    try {
      const displayNames = new Intl.DisplayNames(['en'], { type: 'language' });
      // A more comprehensive list of common language codes
      const commonCodes = [
        'id', 'en', 'es', 'fr', 'de', 'ja', 'ko', 'zh', 'ar', 'hi', 'ru', 'pt', 'it', 'tr', 'nl', 
        'vi', 'th', 'ms', 'tl', 'sv', 'pl', 'el', 'he', 'da', 'fi', 'no', 'cs', 'ro', 'hu'
      ];
      return Array.from(new Set(commonCodes.map(code => displayNames.of(code) || code))).sort();
    } catch {
      return ["Indonesian", "English", "Spanish", "French", "German", "Japanese", "Korean", "Chinese"];
    }
  }, []);

  const filteredLangs = ALL_LANGS.filter(l => l.toLowerCase().includes(langSearch.toLowerCase()));

  function update(field: keyof AIConfig, value: unknown) {
    setConfig(prev => prev ? { ...prev, [field]: value } : prev);
  }

  async function handleSave() {
    if (!config) return;
    setSaving(true);
    await aiService.save(config);
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  if (loading) return <div className="flex justify-center py-24"><Loader2 className="w-7 h-7 animate-spin text-accent" /></div>;
  if (!config) return null;

  return (
    <div className="flex flex-col gap-6 w-full pb-10 h-full">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-text-primary mb-1">AI Configuration</h1>
          <p className="text-text-secondary text-sm">Design your assistant&apos;s personality, boundaries, and generation behavior.</p>
        </div>
        <Button variant="primary" icon={saved ? <CheckCircle2 className="w-4 h-4" /> : <Save className="w-4 h-4" />} onClick={handleSave} disabled={saving}>
          {saving ? "Saving..." : saved ? "Saved!" : "Save Configuration"}
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 flex-1 items-start">
        <div className="lg:col-span-2 flex flex-col gap-6">
          {/* Section 1: Core Identity */}
          <div className="bg-bg-surface border border-border-default rounded-xl overflow-hidden shadow-sm">
            <div className="bg-bg-elevated px-6 py-4 border-b border-border-default flex items-center gap-3">
              <Sparkles className="w-5 h-5 text-accent" />
              <h3 className="font-semibold text-text-primary">Core Identity & Output Style</h3>
            </div>
            <div className="p-6 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                 <div className="md:col-span-1">
                   <label className="block text-sm font-semibold text-text-secondary mb-1">Assistant Name</label>
                   <input value={config.assistantName} onChange={e => update("assistantName", e.target.value)} className="w-full px-4 py-2.5 bg-bg-elevated border border-border-strong rounded-lg text-text-primary focus:border-accent focus:ring-1 focus:ring-accent/30 outline-none text-sm font-semibold transition-all shadow-inner" />
                 </div>
                 
                 <div className="md:col-span-1 relative">
                   <label className="block text-sm font-semibold text-text-secondary mb-1">Primary Language</label>
                   
                   {/* Custom Searchable Dropdown */}
                   <div className="relative">
                      <div 
                        className="w-full px-4 py-2.5 bg-bg-elevated border border-border-strong rounded-lg text-sm text-text-primary cursor-pointer flex justify-between items-center shadow-inner hover:border-accent/50 transition-colors"
                        onClick={() => setLangDropdownOpen(!langDropdownOpen)}
                      >
                        <span className="truncate">{config.language}</span>
                        <Search className="w-4 h-4 text-text-muted shrink-0" />
                      </div>
                      
                      {langDropdownOpen && (
                        <div className="absolute top-full left-0 right-0 mt-2 bg-bg-surface border border-border-default rounded-lg shadow-xl z-50 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
                          <div className="p-2 border-b border-border-subtle bg-bg-elevated">
                            <div className="relative">
                              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-text-muted" />
                              <input 
                                autoFocus
                                value={langSearch} 
                                onChange={e => setLangSearch(e.target.value)} 
                                placeholder="Search languages..." 
                                className="w-full pl-8 pr-3 py-1.5 bg-bg-base border border-border-strong rounded text-xs text-text-primary outline-none focus:border-accent"
                              />
                            </div>
                          </div>
                          <div className="max-h-48 overflow-y-auto">
                            {filteredLangs.length === 0 ? (
                               <div className="px-4 py-3 text-xs text-text-muted text-center">No languages found</div>
                            ) : filteredLangs.map(l => (
                              <div 
                                key={l} 
                                className={`px-4 py-2 text-sm cursor-pointer hover:bg-bg-hover transition-colors ${config.language === l ? 'bg-accent/10 text-accent font-medium' : 'text-text-primary'}`}
                                onClick={() => { update("language", l as Language); setLangDropdownOpen(false); setLangSearch(""); }}
                              >
                                {l}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                   </div>
                   
                   {langDropdownOpen && <div className="fixed inset-0 z-40" onClick={() => setLangDropdownOpen(false)}></div>}
                 </div>

                 <div className="md:col-span-1">
                   <label className="block text-sm font-semibold text-text-secondary mb-1">Tone & Voice</label>
                   <select value={config.tone} onChange={e => update("tone", e.target.value as Tone)} className="w-full px-4 py-2.5 bg-bg-elevated border border-border-strong rounded-lg text-text-primary focus:border-accent focus:ring-1 focus:ring-accent/30 outline-none text-sm capitalize transition-all shadow-inner">
                     {TONES.map(t => <option key={t} value={t}>{t}</option>)}
                   </select>
                 </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t border-border-subtle">
                 <div>
                   <label className="block text-sm font-semibold text-text-secondary mb-1">LLM Model</label>
                   <select value={config.providerModel || "gpt-4o-mini"} onChange={e => update("providerModel", e.target.value)} className="w-full px-4 py-2.5 bg-bg-elevated border border-border-strong rounded-lg text-text-primary focus:border-accent focus:ring-1 focus:ring-accent/30 outline-none text-sm transition-all shadow-inner">
                     <option value="gpt-4o">OpenAI GPT-4o</option>
                     <option value="gpt-4o-mini">OpenAI GPT-4o-mini (Faster)</option>
                     <option value="claude-3-5-sonnet">Anthropic Claude 3.5 Sonnet</option>
                     <option value="gemini-1.5-pro">Google Gemini 1.5 Pro</option>
                   </select>
                 </div>
                 
                 <div>
                   <label className="block text-sm font-semibold text-text-secondary mb-1">Provider API Key (BYOK)</label>
                   <input type="password" value={config.providerApiKey || ""} onChange={e => update("providerApiKey", e.target.value)} placeholder="e.g. sk-proj-... (Optional)" className="w-full px-4 py-2.5 bg-bg-elevated border border-border-strong rounded-lg text-text-primary focus:border-accent focus:ring-1 focus:ring-accent/30 outline-none text-sm transition-all shadow-inner placeholder:text-text-muted" />
                 </div>
              </div>
              
              <div>
                <div className="flex items-end justify-between mb-1">
                   <label className="block text-sm font-semibold text-text-secondary">Global System Instructions</label>
                   <span className="text-[10px] uppercase text-text-muted font-bold tracking-widest hidden sm:inline-block">Base Prompt Context</span>
                </div>
                <p className="text-xs text-text-muted mb-2">Define rules, boundaries, and specific behaviors that apply to every response.</p>
                <textarea rows={6} value={config.systemInstructions} onChange={e => update("systemInstructions", e.target.value)} className="w-full px-4 py-3 bg-bg-elevated border border-border-strong rounded-lg text-text-primary focus:border-accent focus:ring-1 focus:ring-accent/30 outline-none resize-none text-sm leading-relaxed transition-all shadow-inner" />
              </div>
            </div>
          </div>

          {/* Section 2: Retrieval & Fallback */}
          <div className="bg-bg-surface border border-border-default rounded-xl overflow-hidden shadow-sm">
            <div className="bg-bg-elevated px-6 py-4 border-b border-border-default flex items-center gap-3">
              <Settings2 className="w-5 h-5 text-text-secondary" />
              <h3 className="font-semibold text-text-primary">Retrieval Engine (RAG) Setup</h3>
            </div>
            
            <div className="p-6 space-y-8">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div>
                  <div className="flex justify-between mb-2">
                    <label className="block text-sm font-semibold text-text-secondary">Chunk Threshold</label>
                    <span className="text-xs bg-bg-elevated px-2 py-0.5 rounded border border-border-strong font-mono">{Math.round(config.retrievalThreshold * 100)}% Match</span>
                  </div>
                  <input type="range" min="30" max="100" value={Math.round(config.retrievalThreshold * 100)} onChange={e => update("retrievalThreshold", parseInt(e.target.value) / 100)} className="w-full accent-accent cursor-pointer" />
                  <p className="text-[11px] text-text-muted mt-2">Only retrieve knowledge chunks that match the query intent at or above this percentage.</p>
                </div>
                <div>
                  <div className="flex justify-between mb-2">
                    <label className="block text-sm font-semibold text-text-secondary">Top-K Injection</label>
                    <span className="text-xs bg-bg-elevated px-2 py-0.5 rounded border border-border-strong font-mono">{config.retrievalTopK} Chunks</span>
                  </div>
                  <input type="range" min="1" max="10" value={config.retrievalTopK} onChange={e => update("retrievalTopK", parseInt(e.target.value))} className="w-full accent-accent cursor-pointer" />
                  <p className="text-[11px] text-text-muted mt-2">Maximum number of text chunks injected into the prompt context per request.</p>
                </div>
              </div>

              <div className="pt-4 border-t border-border-subtle">
                <div className="flex flex-col sm:flex-row items-start gap-4">
                  <div className="w-10 h-10 rounded-full bg-status-warning/10 flex items-center justify-center shrink-0 hidden sm:flex">
                    <MessageSquareWarning className="h-5 w-5 text-status-warning" />
                  </div>
                  <div className="flex-1 w-full">
                     <label className="block text-sm font-semibold text-text-secondary mb-1">Fallback Message</label>
                     <p className="text-xs text-text-muted mb-2">Played when the AI cannot answer based on knowledge base or guardrails.</p>
                     <input value={config.fallbackMessage} onChange={e => update("fallbackMessage", e.target.value)} className="w-full px-4 py-2.5 bg-status-warning/5 border border-status-warning/20 rounded-lg text-status-warning focus:border-status-warning outline-none text-sm placeholder:text-status-warning/40 shadow-inner" />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Section 3: Visualization Sidebar */}
        <div className="bg-bg-surface border border-border-default rounded-xl p-6 shadow-sm">
          <div className="mb-6 border-b border-border-subtle pb-4 text-center lg:text-left">
            <h3 className="font-semibold text-text-primary text-lg">Prompt Anatomy Preview</h3>
            <p className="text-text-muted text-xs mt-1 leading-relaxed">This is exactly how INFRIA combines your settings to construct the API payload before sending it to the LLM core.</p>
          </div>
          
          <div className="space-y-4 relative px-2">
             <div className="absolute left-[26px] -translate-x-1/2 top-6 bottom-10 w-0.5 bg-border-strong z-0"></div>

             {[
               { id: 1, name: "System Config", val: `"${config.systemInstructions.slice(0, 30)}..." + Tone: ${config.tone} + Lang: ${config.language}`, color: "accent", state: true },
               { id: 2, name: "Available Functions", val: config.functionCallingEnabled ? "JSON Schema array from Function registry" : "Disabled", color: config.functionCallingEnabled ? "status-success" : "text-muted", state: config.functionCallingEnabled },
               { id: 3, name: "Realtime Context", val: "User metadata & session environment injected via SDK", color: "text-secondary", state: true, dim: true },
               { id: 4, name: "RAG Injection", val: config.knowledgeEnabled ? `Top ${config.retrievalTopK} chunks (≥${Math.round(config.retrievalThreshold * 100)}%) pulled query dynamically` : "Disabled", color: config.knowledgeEnabled ? "status-warning" : "text-muted", state: config.knowledgeEnabled },
             ].map(step => (
                <div key={step.id} className={`relative flex gap-4 z-10 ${step.state ? 'opacity-100' : 'opacity-40 grayscale'} ${step.dim ? 'opacity-70' : ''}`}>
                  <div className={`w-9 h-9 rounded-full bg-${step.color}/10 border border-${step.color}/30 text-${step.color} flex items-center justify-center font-bold text-sm shrink-0 shadow-sm relative`}>
                     {step.id}
                     <div className="absolute -inset-1 rounded-full border border-current opacity-10"></div>
                  </div>
                  <div className={`flex-1 bg-bg-elevated border border-border-default rounded-lg p-3 ${!step.state && 'bg-bg-base border-dashed'}`}>
                     <h4 className={`text-[11px] font-bold uppercase tracking-wider mb-0.5 ${step.state ? 'text-text-primary' : 'text-text-muted'}`}>{step.name}</h4>
                     <p className="text-xs text-text-muted leading-relaxed line-clamp-2">{step.val}</p>
                  </div>
                </div>
             ))}
          </div>
          
          <div className="my-6 border-b border-border-subtle" />

          <div className="bg-bg-base p-4 rounded-xl border border-border-strong/50 flex flex-col gap-3 shadow-inner">
             <label className="flex items-center gap-3 text-sm text-text-secondary cursor-pointer hover:text-text-primary transition-colors">
               <input type="checkbox" checked={config.knowledgeEnabled} onChange={e => update("knowledgeEnabled", e.target.checked)} className="w-[18px] h-[18px] rounded accent-accent" />
               <span className="font-semibold text-text-primary">Enable RAG Engine</span>
             </label>
             <label className="flex items-center gap-3 text-sm text-text-secondary cursor-pointer hover:text-text-primary transition-colors">
               <input type="checkbox" checked={config.functionCallingEnabled} onChange={e => update("functionCallingEnabled", e.target.checked)} className="w-[18px] h-[18px] rounded accent-accent" />
               <span className="font-semibold text-text-primary">Enable Function Calling</span>
             </label>
          </div>
        </div>
      </div>
    </div>
  );
}
