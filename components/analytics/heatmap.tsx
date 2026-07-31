"use client";

import { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import "leaflet.heat";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

interface HeatmapProps {
  points: {
    lat: number;
    lng: number;
    intensity?: number; // 0.1 to 1.0
  }[];
  center?: [number, number];
  zoom?: number;
}

export function Heatmap({ points, center = [28.6139, 77.2090], zoom = 12 }: HeatmapProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstance = useRef<L.Map | null>(null);

  useEffect(() => {
    if (typeof window === "undefined" || !mapRef.current) return;

    if (!mapInstance.current) {
      mapInstance.current = L.map(mapRef.current).setView(center, zoom);

      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: '&copy; OpenStreetMap contributors',
      }).addTo(mapInstance.current);
    } else {
      mapInstance.current.setView(center, zoom);
    }

    // Prepare data for heatlayer: [lat, lng, intensity]
    const heatData = points
      .filter((p) => p.lat && p.lng)
      .map((p) => [p.lat, p.lng, p.intensity || 0.5] as L.HeatLatLngTuple);

    // Remove existing heat layer if any
    mapInstance.current.eachLayer((layer: any) => {
      if (layer._heat) {
        mapInstance.current?.removeLayer(layer);
      }
    });

    if (heatData.length > 0) {
      // @ts-ignore - leaflet.heat adds this to L
      const heatLayer = L.heatLayer(heatData, {
        radius: 25,
        blur: 15,
        maxZoom: 15,
      }).addTo(mapInstance.current);
    }

    return () => {
      // Cleanup happens when component unmounts
      if (mapInstance.current) {
        mapInstance.current.remove();
        mapInstance.current = null;
      }
    };
  }, [points, center, zoom]);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Complaint Density Map</CardTitle>
        <CardDescription>Heatmap of reported issues</CardDescription>
      </CardHeader>
      <CardContent>
        <div ref={mapRef} className="h-[400px] w-full rounded-md z-0" />
      </CardContent>
    </Card>
  );
}
