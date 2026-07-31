"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Loader2, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";

export default function NearbyIssuesPage() {
  const mapRef = useRef<any>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [loading, setLoading] = useState(true);
  const [count, setCount] = useState(0);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    let cancelled = false;

    async function init() {
      // Dynamic import to avoid SSR window error
      const L = (await import("leaflet")).default;

      if (cancelled || !containerRef.current) return;

      // Import leaflet CSS
      const link = document.createElement("link");
      link.rel = "stylesheet";
      link.href = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css";
      document.head.appendChild(link);

      const defaultIcon = L.icon({
        iconUrl:
          "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
        iconRetinaUrl:
          "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
        shadowUrl:
          "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
        iconSize: [25, 41],
        iconAnchor: [12, 41],
        popupAnchor: [1, -34],
        shadowSize: [41, 41],
      });

      const map = L.map(containerRef.current!).setView([13.0827, 80.2707], 12);

      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: "© OpenStreetMap contributors",
        maxZoom: 19,
      }).addTo(map);

      mapRef.current = map;

      // Get user's location
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          (pos) => {
            if (cancelled || !mapRef.current) return;
            const { latitude, longitude } = pos.coords;
            mapRef.current.setView([latitude, longitude], 14);

            L.circleMarker([latitude, longitude], {
              radius: 10,
              color: "#3b82f6",
              fillColor: "#3b82f6",
              fillOpacity: 0.3,
              weight: 2,
            })
              .addTo(mapRef.current)
              .bindPopup("You are here");
          },
          () => {},
          { enableHighAccuracy: true, timeout: 10000 }
        );
      }

      // Load public complaints
      const supabase = createClient();
      const { data } = await supabase
        .from("complaints")
        .select(
          "id, title, status, lat, lng, created_at, category:categories(name)"
        )
        .eq("visibility", "public")
        .not("lat", "is", null)
        .not("lng", "is", null)
        .order("created_at", { ascending: false })
        .limit(200);

      if (data) {
        setCount(data.length);
        data.forEach((c: any) => {
          if (!c.lat || !c.lng) return;

          if (cancelled || !mapRef.current) return;
          const marker = L.marker([c.lat, c.lng], {
            icon: defaultIcon,
          }).addTo(mapRef.current);

          const popupContent = `
            <div style="min-width:180px;">
              <strong style="font-size:13px;">${escapeHtml(c.title)}</strong>
              <br/>
              <span style="font-size:11px;color:#888;">
                ${c.category?.name || "Uncategorized"} · ${new Date(c.created_at).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}
              </span>
              <br/>
              <span style="display:inline-block;margin-top:4px;padding:2px 8px;border-radius:9999px;font-size:10px;font-weight:500;background:${getStatusColor(c.status)};color:white;">
                ${c.status.replace(/_/g, " ")}
              </span>
            </div>
          `;

          marker.bindPopup(popupContent);
        });
      }

      setLoading(false);
    }

    init();

    return () => {
      cancelled = true;
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, []);

  return (
    <div className="flex h-screen flex-col bg-background">
      {/* Header */}
      <header className="relative z-[1000] border-b border-border/40 bg-background/80 backdrop-blur-xl">
        <nav className="mx-auto flex h-14 items-center gap-3 px-4">
          <Link href="/">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-md bg-gradient-to-br from-blue-600 to-cyan-500">
              <Shield className="h-3.5 w-3.5 text-white" />
            </div>
            <span className="font-semibold">Nearby Issues</span>
          </div>
          <div className="ml-auto text-xs text-muted-foreground">
            {loading ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              `${count} issues on map`
            )}
          </div>
        </nav>
      </header>

      {/* Full-screen map */}
      <div ref={containerRef} className="flex-1" />
    </div>
  );
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function getStatusColor(status: string): string {
  const colors: Record<string, string> = {
    received: "#3b82f6",
    ai_processing: "#8b5cf6",
    assigned: "#06b6d4",
    in_progress: "#f59e0b",
    resolution_submitted: "#14b8a6",
    verified: "#10b981",
    closed: "#6b7280",
    escalated: "#ef4444",
  };
  return colors[status] || "#6b7280";
}
