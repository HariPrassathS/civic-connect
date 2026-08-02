"use client";

import { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

interface ProfileMapProps {
  lat: number | null;
  lng: number | null;
  onMapClick: (lat: number, lng: number) => void;
}

// Fix for default marker icons in Leaflet + Next.js
const defaultIcon = L.icon({
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

export default function ProfileMap({ lat, lng, onMapClick }: ProfileMapProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const markerRef = useRef<L.Marker | null>(null);

  // Default center: Tamil Nadu center
  const defaultLat = lat || 11.1271;
  const defaultLng = lng || 78.6569;
  const defaultZoom = lat ? 15 : 7;

  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return;

    // Initialize map
    const map = L.map(mapContainerRef.current).setView(
      [defaultLat, defaultLng],
      defaultZoom
    );

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
    }).addTo(map);

    // Add marker if position exists
    if (lat && lng) {
      markerRef.current = L.marker([lat, lng], { icon: defaultIcon }).addTo(map);
    }

    // Handle clicks
    map.on("click", (e: L.LeafletMouseEvent) => {
      const { lat: clickLat, lng: clickLng } = e.latlng;

      // Move or create marker
      if (markerRef.current) {
        markerRef.current.setLatLng([clickLat, clickLng]);
      } else {
        markerRef.current = L.marker([clickLat, clickLng], { icon: defaultIcon }).addTo(map);
      }

      onMapClick(clickLat, clickLng);
    });

    mapRef.current = map;

    return () => {
      map.remove();
      mapRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Update marker position when lat/lng changes externally (e.g., auto-detect)
  useEffect(() => {
    if (!mapRef.current || !lat || !lng) return;

    if (markerRef.current) {
      markerRef.current.setLatLng([lat, lng]);
    } else {
      markerRef.current = L.marker([lat, lng], { icon: defaultIcon }).addTo(mapRef.current);
    }

    mapRef.current.setView([lat, lng], 15);
  }, [lat, lng]);

  return (
    <div
      ref={mapContainerRef}
      className="h-full w-full"
      style={{ minHeight: "300px" }}
    />
  );
}
