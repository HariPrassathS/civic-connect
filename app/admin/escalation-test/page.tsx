"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";

export default function EscalationTestHarness() {
  const [supabase, setSupabase] = useState<any>(null);
  const [complaints, setComplaints] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [logs, setLogs] = useState<string[]>([]);
  
  const cronSecret = "dev-secret-key"; // Matches route.ts fallback

  useEffect(() => {
    setSupabase(createClient());
  }, []);

  const fetchComplaints = async () => {
    if (!supabase) return;
    setLoading(true);
    const { data } = await supabase
      .from("complaints")
      .select("id, title, status, escalation_level, sla_deadline, updated_at")
      .in("status", ["assigned", "in_progress", "ai_processing", "received"])
      .order("created_at", { ascending: false });
    
    setComplaints(data || []);
    setLoading(false);
  };

  useEffect(() => {
    if (supabase) fetchComplaints();
  }, [supabase]);

  const addLog = (msg: string) => {
    setLogs(prev => [msg, ...prev].slice(0, 10)); // keep last 10
  };

  const fastForwardSla = async (id: string, hours: number = 1) => {
    // Set SLA deadline to `hours` in the past
    const newDeadline = new Date();
    newDeadline.setHours(newDeadline.getHours() - hours);
    
    const { error } = await supabase
      .from("complaints")
      .update({ sla_deadline: newDeadline.toISOString() })
      .eq("id", id);
      
    if (error) {
      addLog(`Failed to update SLA for ${id.slice(0, 5)}: ${error.message}`);
    } else {
      addLog(`Fast-forwarded SLA for ${id.slice(0, 5)} to ${hours}h ago`);
      fetchComplaints();
    }
  };

  const fastForwardUpdatedAt = async (id: string, hours: number) => {
    // Set updated_at to `hours` in the past to trigger reminders
    const newDate = new Date();
    newDate.setHours(newDate.getHours() - hours);
    
    const { error } = await supabase
      .from("complaints")
      .update({ updated_at: newDate.toISOString() })
      .eq("id", id);
      
    if (error) {
      addLog(`Failed to update updated_at for ${id.slice(0, 5)}: ${error.message}`);
    } else {
      addLog(`Fast-forwarded updated_at for ${id.slice(0, 5)} to ${hours}h ago`);
      fetchComplaints();
    }
  };

  const triggerEscalationCron = async () => {
    addLog("Triggering auto-escalate cron...");
    try {
      const res = await fetch(`/api/cron/escalate?secret=${cronSecret}`);
      const data = await res.json();
      addLog(`Escalation result: ${data.message || data.error}`);
      fetchComplaints();
    } catch (err: any) {
      addLog(`Escalation fetch error: ${err.message}`);
    }
  };

  const triggerReminderCron = async () => {
    addLog("Triggering reminders cron...");
    try {
      const res = await fetch(`/api/cron/reminders?secret=${cronSecret}`);
      const data = await res.json();
      addLog(`Reminder result: ${data.message || data.error}`);
    } catch (err: any) {
      addLog(`Reminder fetch error: ${err.message}`);
    }
  };

  if (!supabase) return <div className="p-8">Loading harness...</div>;

  return (
    <div className="p-8 max-w-6xl mx-auto space-y-8">
      <div>
        <h1 className="text-2xl font-bold mb-2">Escalation Engine Test Harness</h1>
        <p className="text-muted-foreground">Admin-only page to simulate time and trigger cron jobs.</p>
      </div>

      <div className="flex gap-4">
        <Button onClick={triggerEscalationCron} className="bg-red-600 hover:bg-red-700">
          Trigger Auto-Escalate API
        </Button>
        <Button onClick={triggerReminderCron} className="bg-amber-600 hover:bg-amber-700">
          Trigger Reminders API
        </Button>
      </div>

      <div className="grid grid-cols-3 gap-8">
        <div className="col-span-2 rounded-xl border bg-card p-4">
          <h2 className="font-semibold mb-4">Active Complaints</h2>
          {loading ? (
            <p>Loading...</p>
          ) : complaints.length === 0 ? (
            <p className="text-sm text-muted-foreground">No active complaints found.</p>
          ) : (
            <div className="space-y-3">
              {complaints.map(c => (
                <div key={c.id} className="p-3 border rounded-lg text-sm bg-background flex flex-col gap-2">
                  <div className="flex justify-between items-start">
                    <div>
                      <div className="font-bold">{c.title}</div>
                      <div className="text-muted-foreground text-xs mt-1">
                        Level: L{c.escalation_level} | Status: {c.status}
                      </div>
                      <div className="text-xs mt-1 text-blue-500">
                        SLA: {c.sla_deadline ? new Date(c.sla_deadline).toLocaleString() : 'None'}
                      </div>
                      <div className="text-xs text-orange-500">
                        Updated: {new Date(c.updated_at).toLocaleString()}
                      </div>
                    </div>
                    <div className="flex flex-col gap-2">
                      <Button size="sm" variant="outline" onClick={() => fastForwardSla(c.id, 24)}>
                        SLA -24h
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => fastForwardUpdatedAt(c.id, 25)}>
                        Updated -25h (Rem 1)
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => fastForwardUpdatedAt(c.id, 73)}>
                        Updated -73h (Rem 2)
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="rounded-xl border bg-card p-4 h-[500px] flex flex-col">
          <h2 className="font-semibold mb-4">Action Logs</h2>
          <div className="flex-1 overflow-y-auto space-y-2 bg-black text-green-400 p-3 rounded text-xs font-mono">
            {logs.length === 0 ? "No actions taken yet." : logs.map((log, i) => (
              <div key={i}>{log}</div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
