"use client";

import React, { useState, useEffect, useRef } from "react";
import { Send, Smartphone, TerminalSquare, AlertTriangle, Code2, Database, Zap } from "lucide-react";

type Message = {
  id: string;
  role: "user" | "assistant";
  content: string;
};

type TraceLog = {
  id: string;
  type: "system" | "rag" | "function" | "llm" | "error";
  message: string;
  timestamp: string;
};

export default function SimulatorPage() {
  const [messages, setMessages] = useState<Message[]>([
    { id: "1", role: "assistant", content: "Halo! Saya INFRIA Assistant. Ada yang bisa saya bantu terkait aplikasi ini?" }
  ]);
  const [inputMsg, setInputMsg] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [logs, setLogs] = useState<TraceLog[]>([]);
  const logsEndRef = useRef<HTMLDivElement>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Auto scroll logs
  useEffect(() => {
    logsEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [logs]);

  // Auto scroll chat
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isTyping]);

  const addLog = (type: TraceLog["type"], message: string) => {
    setLogs(prev => [...prev, {
      id: Math.random().toString(36).substr(2, 9),
      type,
      message,
      timestamp: new Date().toISOString().substring(11, 23)
    }]);
  };

  const handleSend = async () => {
    if (!inputMsg.trim()) return;
    const userMsg = inputMsg.trim();
    setInputMsg("");

    // 1. Add user message
    setMessages(prev => [...prev, { id: Math.random().toString(), role: "user", content: userMsg }]);
    
    // 2. Start Processing Simulation
    setIsTyping(true);
    addLog("system", `[ROUTER] Received incoming message: "${userMsg}"`);
    
    // Fake processing delay
    await new Promise(r => setTimeout(r, 600));

    const lowercaseMsg = userMsg.toLowerCase();
    
    if (lowercaseMsg.includes("pesanan") || lowercaseMsg.includes("batal")) {
      // Simulate Function Call scenario
      addLog("system", "[ROUTER] Intent identified: ACTION_REQUIRED");
      await new Promise(r => setTimeout(r, 500));
      addLog("function", "[FUNCTION_CALL] Determining suitable tools... Found: 'cancel_order'");
      await new Promise(r => setTimeout(r, 800));
      addLog("system", '[EXECUTION] Pausing LLM stream. dispatching callback to Flutter SDK: cancel_order({"order_id": "auto-filled"})');
      await new Promise(r => setTimeout(r, 1200));
      addLog("function", "[SDK_RESPONSE] Received callback from client: { status: 'CANCELLED_SUCCESS' }");
      await new Promise(r => setTimeout(r, 600));
      addLog("llm", "[LLM] Generating natural response based on SDK callback context...");
      
      setIsTyping(false);
      setMessages(prev => [...prev, { 
        id: Math.random().toString(), 
        role: "assistant", 
        content: "Baik, pesanan Anda telah berhasil dibatalkan sesuai instruksi dari sistem kami. Ada hal lain yang bisa dibantu?" 
      }]);

    } else if (lowercaseMsg.includes("refund") || lowercaseMsg.includes("syarat") || lowercaseMsg.includes("kebijakan")) {
      // Simulate RAG scenario
      addLog("system", "[ROUTER] Intent identified: KNOWLEDGE_RETRIEVAL");
      await new Promise(r => setTimeout(r, 600));
      addLog("rag", "[VECTOR_DB] Querying chunks with similarity threshold > 0.75...");
      await new Promise(r => setTimeout(r, 800));
      addLog("rag", "[RETRIEVED] Found 3 chunks from document: 'Kebijakan Pengembalian Dana 2026'");
      await new Promise(r => setTimeout(r, 800));
      addLog("llm", "[LLM] Augmenting prompt with retrieved chunks. Generating response...");
      
      setIsTyping(false);
      setMessages(prev => [...prev, { 
        id: Math.random().toString(), 
        role: "assistant", 
        content: "Menurut kebijakan kami, proses pengembalian dana (refund) dapat diajukan maksimal 7 hari setelah barang diterima, dengan syarat tag masih utuh. Apakah Anda ingin mengajukan refund sekarang?" 
      }]);

    } else {
      // Simulate General Chit Chat
      addLog("system", "[ROUTER] Intent identified: GENERAL_CONVERSATION");
      await new Promise(r => setTimeout(r, 500));
      addLog("llm", "[LLM] Generating response direct from base model...");
      
      setIsTyping(false);
      setMessages(prev => [...prev, { 
        id: Math.random().toString(), 
        role: "assistant", 
        content: "Mohon maaf, saya adalah asisten toko Anda. Saya bisa membantu mengecek pesanan, membatalkan transaksi, atau menjelaskan peraturan toko. Silakan tanyakan hal tersebut ya." 
      }]);
    }
  };

  const getLogStyle = (type: TraceLog["type"]) => {
    switch (type) {
      case "system": return "text-text-muted";
      case "rag": return "text-yellow-400";
      case "function": return "text-emerald-400";
      case "llm": return "text-blue-400";
      case "error": return "text-red-400";
      default: return "text-text-primary";
    }
  };

  const getLogIcon = (type: TraceLog["type"]) => {
    switch (type) {
      case "system": return <TerminalSquare className="w-3 h-3 mt-0.5 shrink-0" />;
      case "rag": return <Database className="w-3 h-3 mt-0.5 shrink-0" />;
      case "function": return <Code2 className="w-3 h-3 mt-0.5 shrink-0" />;
      case "error": return <AlertTriangle className="w-3 h-3 mt-0.5 shrink-0" />;
      case "llm": return <Zap className="w-3 h-3 mt-0.5 shrink-0" />;
    }
  };

  return (
    <div className="flex flex-col h-[calc(100vh-56px)] w-full">
      <div className="px-6 py-4 flex items-center justify-between border-b border-border-default shrink-0">
        <div>
          <h1 className="text-xl font-bold text-text-primary mb-1">Simulator & Trace Debugger</h1>
          <p className="text-text-secondary text-sm">Test your RAG and Function Calling logic in real-time.</p>
        </div>
        <button onClick={() => { setMessages([{ id: "1", role: "assistant", content: "Halo! Saya INFRIA Assistant. Ada yang bisa saya bantu terkait aplikasi ini?" }]); setLogs([]); }} className="text-sm font-medium text-accent hover:underline">
          Reset Session
        </button>
      </div>

      <div className="flex-1 flex overflow-hidden">
        {/* Left Panel: Simulator Chat */}
        <div className="w-full lg:w-[450px] xl:w-[500px] border-r border-border-default bg-bg-surface flex flex-col shrink-0">
          <div className="bg-bg-elevated border-b border-border-default p-4 flex items-center justify-between">
             <div className="flex items-center gap-3">
               <div className="w-8 h-8 rounded bg-accent-muted flex items-center justify-center font-bold text-accent text-sm border border-accent-border">AI</div>
               <div>
                 <h2 className="font-bold text-sm text-text-primary">INFRIA Assistant</h2>
                 <p className="text-xs text-text-muted flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-status-success"></span> Runtime Active</p>
               </div>
             </div>
          </div>
          
          <div className="flex-1 overflow-y-auto p-6 flex flex-col gap-4 bg-bg-base">
            {messages.map((msg) => (
              <div key={msg.id} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                <div className={`max-w-[85%] rounded-lg px-4 py-3 text-sm leading-relaxed shadow-sm border ${msg.role === "user" ? "bg-accent text-white border-accent" : "bg-bg-surface text-text-primary border-border-strong"}`}>
                  {msg.content}
                </div>
              </div>
            ))}
            
            {isTyping && (
              <div className="flex justify-start">
                <div className="bg-bg-surface border border-border-strong rounded-lg px-4 py-3 shadow-sm flex gap-1.5 items-center">
                  <span className="w-2 h-2 bg-text-muted rounded-full animate-bounce" style={{ animationDelay: "0ms" }}></span>
                  <span className="w-2 h-2 bg-text-muted rounded-full animate-bounce" style={{ animationDelay: "150ms" }}></span>
                  <span className="w-2 h-2 bg-text-muted rounded-full animate-bounce" style={{ animationDelay: "300ms" }}></span>
                </div>
              </div>
            )}
            <div ref={chatEndRef} />
          </div>

          <div className="bg-bg-surface border-t border-border-default p-4 flex gap-3">
            <input 
              type="text" 
              value={inputMsg}
              onChange={(e) => setInputMsg(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSend()}
              placeholder="Send a test message..." 
              className="flex-1 bg-bg-elevated border border-border-strong text-text-primary rounded-md px-4 py-2 text-sm focus:outline-none focus:border-accent"
            />
            <button onClick={handleSend} disabled={!inputMsg.trim() || isTyping} className="h-10 px-4 rounded-md bg-accent text-white font-medium flex items-center justify-center shrink-0 disabled:opacity-50 transition-colors">
              <Send className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Right Panel: Trace Debugger */}
        <div className="flex-1 bg-[#1a1b26] flex flex-col font-mono text-sm relative overflow-hidden">
          <div className="bg-[#1f2335] text-[#a9b1d6] px-4 py-2 border-b border-[#292e42] flex justify-between items-center shrink-0 text-xs shadow-sm z-10">
            <span className="font-bold flex items-center gap-2"><TerminalSquare className="w-4 h-4 text-accent" /> BACKEND TRACE LOGS</span>
            <span className="text-[#565f89]">n8n Orchestration Pipeline</span>
          </div>
          
          <div className="flex-1 overflow-y-auto p-4 space-y-2 text-[13px] leading-relaxed">
            {logs.length === 0 ? (
              <div className="text-[#565f89] italic mt-4 text-center">Waiting for interactions... Send a message in the simulator to begin tracing logic.</div>
            ) : (
              logs.map(log => (
                <div key={log.id} className="flex items-start gap-4 hover:bg-white/5 p-1 rounded transition-colors -mx-1 px-1">
                  <div className="text-[#565f89] w-28 shrink-0">{log.timestamp}</div>
                  <div className={`flex-1 flex gap-2 ${getLogStyle(log.type)}`}>
                    {getLogIcon(log.type)}
                    <span className="break-words font-medium">{log.message}</span>
                  </div>
                </div>
              ))
            )}
            {isTyping && (
              <div className="flex items-start gap-4 p-1">
                 <div className="text-[#565f89] w-28 shrink-0">Processing</div>
                 <div className="flex-1 text-[#565f89] flex items-center gap-2"><div className="w-1.5 h-1.5 bg-[#a9b1d6] rounded-full animate-ping"></div> Awaiting LLM stream...</div>
              </div>
            )}
            <div ref={logsEndRef} />
          </div>
        </div>
      </div>
    </div>
  );
}
