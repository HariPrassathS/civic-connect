"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";

export function FieldWorkerMap({ tasks }: { tasks: any[] }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<any>(null);
  const router = useRouter();

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    let cancelled = false;

    async function init() {
      const L = (await import("leaflet")).default;

      if (cancelled || !containerRef.current) return;

      const link = document.createElement("link");
      link.rel = "stylesheet";
      link.href = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css";
      document.head.appendChild(link);

      // Default icon
      const defaultIcon = L.icon({
        iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
        iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
        shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
        iconSize: [25, 41],
        iconAnchor: [12, 41],
        popupAnchor: [1, -34],
        shadowSize: [41, 41],
      });

      // Default center (e.g. Tamil Nadu or calculate from tasks)
      let center: [number, number] = [13.0827, 80.2707]; // Chennai
      if (tasks.length > 0) {
        center = [tasks[0].lat, tasks[0].lng];
      }

      const map = L.map(containerRef.current!).setView(center, 12);
      
      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: "© OpenStreetMap contributors",
        maxZoom: 19,
      }).addTo(map);

      // Fit bounds if we have tasks
      if (tasks.length > 0) {
        const bounds = L.latLngBounds(tasks.map(t => [t.lat, t.lng]));
        map.fitBounds(bounds, { padding: [50, 50] });
      }

      tasks.forEach(task => {
        const marker = L.marker([task.lat, task.lng], { icon: defaultIcon }).addTo(map);
        
        const priorityColor = 
          task.priority === 'urgent' ? 'text-red-500' :
          task.priority === 'high' ? 'text-orange-500' :
          task.priority === 'medium' ? 'text-yellow-500' : 'text-green-500';
          
        marker.bindPopup(`
          <div class="p-1 min-w-[200px]">
            <div class="flex items-center justify-between mb-1">
              <span class="text-xs font-bold uppercase tracking-wider ${priorityColor}">${task.priority}</span>
              <span class="text-[10px] bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded uppercase font-semibold text-slate-800 dark:text-slate-200">${task.status.replace('_', ' ')}</span>
            </div>
            <h3 class="font-bold text-sm leading-tight mb-1 cursor-pointer hover:text-blue-600 hover:underline" id="task-link-${task.id}">${task.title}</h3>
            <p class="text-xs text-slate-500 dark:text-slate-400">${task.category?.name || 'Issue'}</p>
          </div>
        `);

        // Add event listener to popup to navigate to task
        marker.on('popupopen', () => {
          const el = document.getElementById(`task-link-${task.id}`);
          if (el) {
            el.addEventListener('click', (e) => {
              e.preventDefault();
              router.push(`/dashboard/field-worker/complaints/${task.id}`);
            });
          }
        });
      });

      mapRef.current = map;
    }

    init();

    return () => {
      cancelled = true;
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, [tasks, router]);

  return <div ref={containerRef} className="h-full w-full z-0 relative dark:[&_.leaflet-tile-pane]:invert dark:[&_.leaflet-tile-pane]:hue-rotate-180" />;
}
