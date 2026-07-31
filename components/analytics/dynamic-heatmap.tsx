"use client";

import dynamic from "next/dynamic";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

const Heatmap = dynamic(() => import("./heatmap").then((mod) => mod.Heatmap), {
  ssr: false,
  loading: () => (
    <Card>
      <CardHeader>
        <CardTitle>Complaint Density Map</CardTitle>
        <CardDescription>Loading map...</CardDescription>
      </CardHeader>
      <CardContent>
        <Skeleton className="h-[400px] w-full rounded-md" />
      </CardContent>
    </Card>
  ),
});

export function DynamicHeatmap(props: any) {
  return <Heatmap {...props} />;
}
