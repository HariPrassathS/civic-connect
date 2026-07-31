"use client";

import { useMemo } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";

interface TrendChartsProps {
  complaints: {
    created_at: string;
    category_id: string;
  }[];
  categories: {
    id: string;
    name: string;
  }[];
}

export function TrendCharts({ complaints, categories }: TrendChartsProps) {
  // Process data for Timeline Chart (Complaints over time - last 7 days)
  const timelineData = useMemo(() => {
    const days = 7;
    const data: Record<string, number> = {};
    const now = new Date();
    
    // Initialize last 7 days with 0
    for (let i = days - 1; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      const dateStr = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      data[dateStr] = 0;
    }

    complaints.forEach((c) => {
      const d = new Date(c.created_at);
      const dateStr = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      if (data[dateStr] !== undefined) {
        data[dateStr]++;
      }
    });

    return Object.entries(data).map(([date, count]) => ({ date, count }));
  }, [complaints]);

  // Process data for Category Bar Chart
  const categoryData = useMemo(() => {
    const data: Record<string, number> = {};
    
    // Map category ID to name
    const categoryMap = categories.reduce((acc, cat) => {
      acc[cat.id] = cat.name;
      return acc;
    }, {} as Record<string, string>);

    complaints.forEach((c) => {
      const name = categoryMap[c.category_id] || "Other";
      data[name] = (data[name] || 0) + 1;
    });

    return Object.entries(data)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5); // Top 5 categories
  }, [complaints, categories]);

  return (
    <div className="grid gap-4 md:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle>Complaints Over Time</CardTitle>
          <CardDescription>Last 7 days trend</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={timelineData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#888888" opacity={0.2} />
                <XAxis 
                  dataKey="date" 
                  tickLine={false} 
                  axisLine={false} 
                  tick={{ fontSize: 12 }} 
                  stroke="#888888" 
                />
                <YAxis 
                  tickLine={false} 
                  axisLine={false} 
                  tick={{ fontSize: 12 }} 
                  stroke="#888888" 
                  allowDecimals={false}
                />
                <Tooltip 
                  contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                />
                <Line 
                  type="monotone" 
                  dataKey="count" 
                  stroke="#2563eb" 
                  strokeWidth={2}
                  activeDot={{ r: 6 }} 
                  name="Complaints"
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Top Categories</CardTitle>
          <CardDescription>Most reported issues</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={categoryData} layout="vertical" margin={{ top: 0, right: 0, left: 20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#888888" opacity={0.2} />
                <XAxis 
                  type="number" 
                  tickLine={false} 
                  axisLine={false} 
                  tick={{ fontSize: 12 }} 
                  stroke="#888888" 
                  allowDecimals={false}
                />
                <YAxis 
                  dataKey="name" 
                  type="category" 
                  tickLine={false} 
                  axisLine={false} 
                  tick={{ fontSize: 12 }} 
                  stroke="#888888" 
                  width={100}
                />
                <Tooltip 
                  contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                />
                <Bar dataKey="count" fill="#2563eb" radius={[0, 4, 4, 0]} name="Complaints" barSize={32} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
