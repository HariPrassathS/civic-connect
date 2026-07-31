"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Clock, AlertCircle, CheckCircle2, TrendingUp } from "lucide-react";

type ComplaintStatus = "received" | "ai_processing" | "assigned" | "in_progress" | "resolution_submitted" | "verified" | "closed" | "escalated";

interface StatusWidgetsProps {
  initialComplaints: {
    id: string;
    status: ComplaintStatus;
    created_at: string;
    updated_at: string;
  }[];
}

export function StatusWidgets({ initialComplaints }: StatusWidgetsProps) {
  const [complaints, setComplaints] = useState(initialComplaints);

  useEffect(() => {
    const supabase = createClient();
    
    // Subscribe to all complaints the user has access to see
    const channel = supabase
      .channel('realtime_complaints_metrics')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'complaints' },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            setComplaints((prev) => [...prev, payload.new as any]);
          } else if (payload.eventType === 'UPDATE') {
            setComplaints((prev) =>
              prev.map((c) => (c.id === payload.new.id ? (payload.new as any) : c))
            );
          } else if (payload.eventType === 'DELETE') {
            setComplaints((prev) => prev.filter((c) => c.id !== payload.old.id));
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const total = complaints.length;
  const pending = complaints.filter(c => ["received", "ai_processing", "assigned", "in_progress"].includes(c.status)).length;
  const escalated = complaints.filter(c => c.status === "escalated").length;
  const resolved = complaints.filter(c => ["resolution_submitted", "verified", "closed"].includes(c.status)).length;
  
  // Fake SLA compliance % based on resolved vs escalated for MVP
  const slaCompliance = total > 0 ? Math.round(((total - escalated) / total) * 100) : 100;

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-sm font-medium">Pending Tasks</CardTitle>
          <Clock className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{pending}</div>
          <p className="text-xs text-muted-foreground">Currently active</p>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-sm font-medium text-red-600 dark:text-red-400">Escalated</CardTitle>
          <AlertCircle className="h-4 w-4 text-red-600 dark:text-red-400" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-red-600 dark:text-red-400">{escalated}</div>
          <p className="text-xs text-muted-foreground">Missed SLA</p>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-sm font-medium">Resolved</CardTitle>
          <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{resolved}</div>
          <p className="text-xs text-muted-foreground">Successfully closed</p>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-sm font-medium">SLA Compliance</CardTitle>
          <TrendingUp className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{slaCompliance}%</div>
          <p className="text-xs text-muted-foreground">Overall health</p>
        </CardContent>
      </Card>
    </div>
  );
}
