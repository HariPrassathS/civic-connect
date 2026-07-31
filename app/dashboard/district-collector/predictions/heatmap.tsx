"use client";

import { useEffect, useRef } from "react";
import { MapContainer, TileLayer, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import "leaflet.heat";

// HeatmapLayer component to add the heat layer to the map
function HeatmapLayer({ points }: { points: [number, number, number][] }) {
  const map = useMap();
  
  useEffect(() => {
    if (!map) return;
    
    // @ts-ignore - leaflet.heat adds heatLayer to L
    const heat = L.heatLayer(points, {
      radius: 25,
      blur: 15,
      maxZoom: 14,
      gradient: {
        0.4: 'blue',
        0.6: 'cyan',
        0.7: 'lime',
        0.8: 'yellow',
        1.0: 'red'
      }
    }).addTo(map);
    
    return () => {
      map.removeLayer(heat);
    };
  }, [map, points]);

  return null;
}

export default function Heatmap({ data }: { data: any[] }) {
  // Convert complaint lat/lng to heat points
  const points = data
    .filter(c => c.lat && c.lng)
    .map(c => [Number(c.lat), Number(c.lng), 1] as [number, number, number]);

  // Center around the average of the points, or default to a central coordinate
  const center = points.length > 0 
    ? [
        points.reduce((sum, p) => sum + p[0], 0) / points.length,
        points.reduce((sum, p) => sum + p[1], 0) / points.length
      ] as [number, number]
    : [28.6139, 77.2090] as [number, number]; // Default to New Delhi or generic coordinates

  return (
    <MapContainer 
      center={center} 
      zoom={12} 
      className="h-full w-full z-0"
      zoomControl={false}
    >
      <TileLayer
        url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
      />
      <HeatmapLayer points={points} />
    </MapContainer>
  );
}
