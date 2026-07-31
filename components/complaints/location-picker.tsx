"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { MapPin, Crosshair, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";

interface LocationPickerProps {
  onLocationChange: (lat: number, lng: number) => void;
  initialLat?: number;
  initialLng?: number;
}

export function LocationPicker({
  onLocationChange,
  initialLat,
  initialLng,
}: LocationPickerProps) {
  const mapRef = useRef<any>(null);
  const markerRef = useRef<any>(null);
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const [lat, setLat] = useState(initialLat ?? 0);
  const [lng, setLng] = useState(initialLng ?? 0);
  const [address, setAddress] = useState<string>("");
  const [gpsLoading, setGpsLoading] = useState(false);
  const [mapReady, setMapReady] = useState(false);

  const updateMarker = useCallback(
    (newLat: number, newLng: number) => {
      setLat(newLat);
      setLng(newLng);
      onLocationChange(newLat, newLng);

      if (mapRef.current && markerRef.current) {
        markerRef.current.setLatLng([newLat, newLng]);
        mapRef.current.setView([newLat, newLng], mapRef.current.getZoom());
      }

      // Reverse geocode
      fetch(
        `https://nominatim.openstreetmap.org/reverse?lat=${newLat}&lon=${newLng}&format=json`
      )
        .then((r) => r.json())
        .then((data) => {
          if (data.display_name) {
            setAddress(data.display_name.split(",").slice(0, 3).join(","));
          }
        })
        .catch(() => {});
    },
    [onLocationChange]
  );

  // Initialize map with dynamic import to avoid SSR issues
  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return;

    let cancelled = false;

    async function init() {
      const L = (await import("leaflet")).default;

      if (cancelled || !mapContainerRef.current) return;

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

      const defaultLat = initialLat || 13.0827; // Chennai
      const defaultLng = initialLng || 80.2707;

      const map = L.map(mapContainerRef.current!).setView(
        [defaultLat, defaultLng],
        initialLat ? 15 : 12
      );

      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: "© OpenStreetMap contributors",
        maxZoom: 19,
      }).addTo(map);

      const marker = L.marker([defaultLat, defaultLng], {
        icon: defaultIcon,
        draggable: true,
      }).addTo(map);

      marker.on("dragend", () => {
        const pos = marker.getLatLng();
        updateMarker(pos.lat, pos.lng);
      });

      map.on("click", (e: any) => {
        updateMarker(e.latlng.lat, e.latlng.lng);
      });

      mapRef.current = map;
      markerRef.current = marker;
      setMapReady(true);
    }

    init();

    return () => {
      cancelled = true;
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
        markerRef.current = null;
      }
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Auto-GPS on mount
  useEffect(() => {
    if (!mapReady || initialLat) return;
    captureGPS();
  }, [mapReady]); // eslint-disable-line react-hooks/exhaustive-deps

  function captureGPS() {
    if (!navigator.geolocation) return;
    setGpsLoading(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        updateMarker(pos.coords.latitude, pos.coords.longitude);
        mapRef.current?.setView(
          [pos.coords.latitude, pos.coords.longitude],
          16
        );
        setGpsLoading(false);
      },
      () => {
        setGpsLoading(false);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <label className="flex items-center gap-2 text-sm font-medium">
          <MapPin className="h-4 w-4 text-blue-500" />
          Location
        </label>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={captureGPS}
          disabled={gpsLoading}
          className="gap-1.5 text-xs"
        >
          {gpsLoading ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <Crosshair className="h-3.5 w-3.5" />
          )}
          Use my location
        </Button>
      </div>

      <div
        ref={mapContainerRef}
        className="h-48 w-full overflow-hidden rounded-xl border border-border sm:h-64"
      />

      {address && (
        <p className="text-xs text-muted-foreground">📍 {address}</p>
      )}
      <p className="text-xs text-muted-foreground">
        Tap the map or drag the pin to adjust location
      </p>

      {/* Hidden inputs for form submission */}
      <input type="hidden" name="lat" value={lat} />
      <input type="hidden" name="lng" value={lng} />
    </div>
  );
}
