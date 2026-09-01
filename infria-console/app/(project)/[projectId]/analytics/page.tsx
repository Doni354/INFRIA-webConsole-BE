"use client";

import React from "react";
import { useParams } from "next/navigation";
import { Activity, ArrowUpRight, ArrowDownRight, Clock, Box, Zap, ZapOff } from "lucide-react";

export default function AnalyticsPage() {
  const { projectId } = useParams<{ projectId: string }>();

  // Mock Data
  const metrics = [
    { title: "Total Requests", value: "32,492", change: "+12.5%", isUp: true, icon: <Activity className="w-4 h-4 text-accent" /> },
    { title: "Avg Latency", value: "480ms", change: "-15ms", isUp: true, icon: <Clock className="w-4 h-4 text-status-success" /> },
    { title: "Knowledge Retrieval", value: "88%", change: "+2.1%", isUp: true, icon: <Box className="w-4 h-4 text-status-info" /> },
    { title: "Fallback Rate", value: "4.2%", change: "+0.8%", isUp: false, icon: <ZapOff className="w-4 h-4 text-status-warning" /> },
  ];

  const recentLogs = [
    { id: "req_102", intent: "Check Order Status", latency: "520ms", tokens: "412", status: "success", time: "2 mins ago" },
    { id: "req_101", intent: "Return Policy Query", latency: "810ms", tokens: "849", status: "success", time: "15 mins ago" },
    { id: "req_100", intent: "Unknown Product", latency: "310ms", tokens: "120", status: "fallback", time: "1 hour ago" },
    { id: "req_099", intent: "Cancel Order", latency: "1250ms", tokens: "931", status: "success", time: "2 hours ago" },
    { id: "req_098", intent: "Schedule Meeting", latency: "405ms", tokens: "299", status: "success", time: "5 hours ago" },
  ];

  return (
    <div className="flex flex-col gap-6 w-full pb-10">
      <div className="flex items-center justify-between mb-2">
        <div>
          <h1 className="text-2xl font-bold text-text-primary mb-1">Analytics & Logs</h1>
          <p className="text-text-secondary text-sm">Monitor agent performance and analyze conversation logs.</p>
        </div>
        <div className="bg-bg-surface border border-border-strong rounded-lg flex text-sm overflow-hidden">
           <button className="px-4 py-1.5 bg-bg-elevated font-medium">24h</button>
           <button className="px-4 py-1.5 hover:bg-bg-hover text-text-secondary">7d</button>
           <button className="px-4 py-1.5 hover:bg-bg-hover text-text-secondary">30d</button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {metrics.map((m, i) => (
          <div key={i} className="bg-bg-surface border border-border-default rounded-xl p-5 shadow-sm">
            <div className="flex justify-between items-start mb-3">
               <p className="text-sm font-semibold text-text-secondary">{m.title}</p>
               <div className="w-8 h-8 rounded-full bg-bg-elevated border border-border-strong flex items-center justify-center">{m.icon}</div>
            </div>
            <div className="flex items-end justify-between">
              <h2 className="text-2xl font-bold text-text-primary">{m.value}</h2>
              <div className={`flex items-center gap-1 text-xs font-semibold ${m.isUp ? 'text-status-success' : 'text-status-error'}`}>
                 {m.isUp ? <ArrowUpRight className="w-3.5 h-3.5" /> : <ArrowDownRight className="w-3.5 h-3.5" />}
                 {m.change}
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 pt-4">
        <div className="lg:col-span-2 bg-bg-surface border border-border-default rounded-xl p-6 shadow-sm">
           <h3 className="font-semibold text-lg mb-6">Traffic & Latency</h3>
           {/* Dummy CSS Chart Base */}
           <div className="h-64 flex items-end justify-between gap-2 border-b border-border-strong pb-2 relative">
             {/* Y-Axis lines */}
             <div className="absolute inset-0 flex flex-col justify-between pt-2 pb-6 z-0">
               <div className="w-full border-t border-dashed border-border-subtle" />
               <div className="w-full border-t border-dashed border-border-subtle" />
               <div className="w-full border-t border-dashed border-border-subtle" />
               <div className="w-full border-t border-dashed border-border-subtle" />
             </div>
             
             {[40, 70, 55, 80, 45, 90, 60, 100, 75, 40, 50, 85].map((height, idx) => (
               <div key={idx} className="w-full relative z-10 flex flex-col items-center justify-end h-full group">
                  <div className="w-full max-w-[30px] bg-accent/80 hover:bg-accent transition-colors rounded-t-sm" style={{ height: `${height}%` }}></div>
                  <span className="text-[10px] text-text-muted mt-2 block">{idx * 2}h</span>
               </div>
             ))}
           </div>
        </div>
        
        <div className="lg:col-span-1 bg-bg-surface border border-border-default rounded-xl p-6 shadow-sm flex flex-col">
           <div className="flex justify-between items-center mb-6">
              <h3 className="font-semibold text-lg">Top Intents</h3>
              <span className="text-xs text-text-secondary">by volume</span>
           </div>
           
           <div className="space-y-5 flex-1">
              {[
                { name: "Order Tracking", val: 45, color: "bg-accent" },
                { name: "Product Info", val: 30, color: "bg-status-success" },
                { name: "Return Request", val: 15, color: "bg-status-info" },
                { name: "Account Issue", val: 10, color: "bg-status-warning" },
              ].map(item => (
                <div key={item.name}>
                  <div className="flex justify-between text-sm mb-1.5">
                    <span className="font-medium text-text-secondary">{item.name}</span>
                    <span className="font-bold text-text-primary">{item.val}%</span>
                  </div>
                  <div className="w-full bg-bg-elevated h-2 rounded-full overflow-hidden">
                     <div className={`h-full ${item.color} rounded-full`} style={{ width: `${item.val}%` }}></div>
                  </div>
                </div>
              ))}
           </div>
        </div>
      </div>

      <div className="bg-bg-surface border border-border-default rounded-xl overflow-hidden shadow-sm mt-4">
        <div className="px-6 py-5 border-b border-border-default flex justify-between items-center bg-bg-base">
           <h3 className="font-semibold text-lg">Recent Executions</h3>
           <button className="text-sm font-semibold text-accent hover:underline">View All Logs</button>
        </div>
        <table className="w-full text-left text-sm">
           <thead className="bg-bg-elevated border-b border-border-subtle text-text-secondary">
             <tr>
               <th className="px-6 py-3 font-medium">Request ID</th>
               <th className="px-6 py-3 font-medium">Identified Intent</th>
               <th className="px-6 py-3 font-medium">Latency</th>
               <th className="px-6 py-3 font-medium">Tokens</th>
               <th className="px-6 py-3 font-medium">Status</th>
               <th className="px-6 py-3 font-medium text-right">Time</th>
             </tr>
           </thead>
           <tbody className="divide-y divide-border-subtle">
             {recentLogs.map((log) => (
                <tr key={log.id} className="hover:bg-bg-hover">
                  <td className="px-6 py-4 font-mono text-text-muted text-xs">{log.id}</td>
                  <td className="px-6 py-4 font-medium text-text-primary">{log.intent}</td>
                  <td className="px-6 py-4 text-text-secondary">{log.latency}</td>
                  <td className="px-6 py-4 text-text-secondary">{log.tokens}</td>
                  <td className="px-6 py-4">
                    <span className={`px-2 py-0.5 rounded text-xs font-semibold ${log.status === 'success' ? 'bg-status-success/10 text-status-success' : 'bg-status-warning/10 text-status-warning'}`}>
                      {log.status.toUpperCase()}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right text-text-muted">{log.time}</td>
                </tr>
             ))}
           </tbody>
        </table>
      </div>
    </div>
  );
}
