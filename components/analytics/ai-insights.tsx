"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Sparkles } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

export function AIInsights() {
  const [insight, setInsight] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchLatestInsight() {
      const supabase = createClient();
      const { data, error } = await supabase
        .from("ai_insights")
        .select("insight_text")
        .order("created_at", { ascending: false })
        .limit(1)
        .single();
      
      if (!error && data) {
        setInsight(data.insight_text);
      }
      setLoading(false);
    }

    fetchLatestInsight();
  }, []);

  return (
    <Card className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/20 dark:to-indigo-950/20">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-indigo-700 dark:text-indigo-400">
          <Sparkles className="h-5 w-5" />
          AI Insights
        </CardTitle>
        <CardDescription>Daily automated pattern analysis</CardDescription>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="space-y-2">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-[80%]" />
          </div>
        ) : insight ? (
          <p className="text-sm leading-relaxed">{insight}</p>
        ) : (
          <p className="text-sm text-muted-foreground italic">No recent insights available.</p>
        )}
      </CardContent>
    </Card>
  );
}
