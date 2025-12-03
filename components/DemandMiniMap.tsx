
import React, { useEffect, useState } from 'react';
import { MapPin, Maximize2, Loader2 } from 'lucide-react';
import { MapContainer, TileLayer, Marker, CircleMarker } from 'react-leaflet';
import * as L from 'leaflet';
import { supabase, isSupabaseConfigured } from '../services/supabaseClient';
import { DemandStatus, DemandPriority } from '../types';

interface DemandMiniMapProps {
  demandId?: string; // Legacy prop, can act as entityId
  entityId?: string; // New generic prop
  tableName?: 'demands' | 'citizens';
  lat?: number;
  lon?: number;
  address?: string;
  onClick: (lat?: number, lon?: number) => void;
  onLocationUpdate?: (lat: number, lon: number) => void;
  status?: DemandStatus;
  priority?: DemandPriority;
}

const DemandMiniMap: React.FC<DemandMiniMapProps> = ({ 
    demandId, 
    entityId, 
    tableName = 'demands', 
    lat, 
    lon, 
    address, 
    onClick, 
    onLocationUpdate,
    status,
    priority
}) => {
  const [coords, setCoords] = useState<{lat: number, lon: number} | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const activeId = entityId || demandId;

  // Dynamic Icon Logic
  const getMarkerColor = () => {
      if (status === DemandStatus.COMPLETED) return 'green';
      if (priority === DemandPriority.HIGH) return 'red';
      if (status === DemandStatus.IN_PROGRESS) return 'orange';
      if (priority === DemandPriority.MEDIUM) return 'gold';
      return 'blue';
  };

  const icon = new L.Icon({
      iconUrl: `https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-${getMarkerColor()}.png`,
      shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
      iconSize: [25, 41],
      iconAnchor: [12, 41],
      popupAnchor: [1, -34],
      shadowSize: [41, 41]
  });

  useEffect(() => {
    if (lat && lon) {
        setCoords({ lat, lon });
        return;
    }

    if (address && (!lat || !lon)) {
        setIsLoading(true);
        const fetchCoords = async () => {
            try {
                const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(address)}&limit=1`;
                const response = await fetch(url, { headers: { 'User-Agent': 'GabineteDigitalApp/1.0' } });
                if (!response.ok) throw new Error('Falha na requisição');
                const data = await response.json();
                
                if (data && data.length > 0) {
                    const newLat = parseFloat(data[0].lat);
                    const newLon = parseFloat(data[0].lon);
                    setCoords({ lat: newLat, lon: newLon });

                    if (isSupabaseConfigured() && supabase && activeId) {
                        const { error } = await supabase.from(tableName).update({ lat: newLat, lon: newLon }).eq('id', activeId);
                        if (!error && onLocationUpdate) onLocationUpdate(newLat, newLon);
                    }
                }
            } catch (error) {
                console.error("Geocoding error:", error);
            } finally {
                setIsLoading(false);
            }
        };
        const timer = setTimeout(fetchCoords, 1500); 
        return () => clearTimeout(timer);
    }
  }, [lat, lon, address, activeId, tableName]); 

  // --- ACTIONS ---
  const handleExpandClick = (e: React.MouseEvent) => {
      e.stopPropagation(); // Stop bubbling to parent modal click handlers
      e.preventDefault();
      if (coords) {
          onClick(coords.lat, coords.lon);
      }
  };

  if (!coords && !isLoading) {
      return (
        <div className="w-full h-48 rounded-xl bg-slate-100 dark:bg-white/5 flex flex-col items-center justify-center text-slate-400 border border-slate-200 dark:border-white/10">
            <MapPin className="w-8 h-8 mb-2 opacity-50" />
            <span className="text-xs font-bold">Localização não definida</span>
        </div>
      );
  }

  return (
    <div className="relative w-full h-48 rounded-xl overflow-hidden border border-slate-200 dark:border-white/10 group bg-slate-50 dark:bg-white/5">
      
      {/* Expand Button - Highest Z-Index - Explicit Click Handling */}
      {coords && !isLoading && (
        <button 
            type="button"
            onClick={handleExpandClick}
            className="absolute top-3 right-3 z-[1000] flex items-center gap-2 bg-white/90 dark:bg-slate-900/90 backdrop-blur-sm border border-slate-200 dark:border-white/10 px-3 py-1.5 rounded-lg shadow-md hover:scale-105 transition-all cursor-pointer pointer-events-auto"
        >
            <span className="text-[10px] font-bold text-brand-600 dark:text-brand-400 uppercase tracking-wider">Expandir</span>
            <Maximize2 className="w-3.5 h-3.5 text-brand-600 dark:text-brand-400" />
        </button>
      )}

      {/* Loading Overlay */}
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-white/50 dark:bg-black/50 z-[10] pointer-events-none">
            <Loader2 className="w-5 h-5 animate-spin text-brand-600" />
        </div>
      )}

      {/* Map Layer - Completely Static */}
      {coords && (
        <div className="h-full w-full z-0 pointer-events-none select-none">
            <MapContainer 
                key={`${coords.lat}-${coords.lon}-${tableName}`} 
                center={[coords.lat, coords.lon]} 
                zoom={15} 
                scrollWheelZoom={false} 
                zoomControl={false}
                dragging={false}
                touchZoom={false}
                doubleClickZoom={false}
                boxZoom={false}
                keyboard={false}
                attributionControl={false}
                style={{ width: '100%', height: '100%' }}
            >
                <TileLayer url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png" />
                {tableName === 'citizens' ? (
                    <CircleMarker center={[coords.lat, coords.lon]} radius={8} pathOptions={{ fillColor: '#3b82f6', fillOpacity: 1, color: '#ffffff', weight: 2 }} />
                ) : (
                    <Marker position={[coords.lat, coords.lon]} icon={icon} />
                )}
            </MapContainer>
        </div>
      )}
    </div>
  );
};

export default DemandMiniMap;
