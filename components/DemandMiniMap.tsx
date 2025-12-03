
import React, { useEffect, useState } from 'react';
import { MapPin, Maximize2, Loader2, ExternalLink } from 'lucide-react';
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

  // Dynamic Icon Logic (Only for Demands now)
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
    // If coords are provided, use them immediately
    if (lat && lon) {
        setCoords({ lat, lon });
        return;
    }

    // If no coords, but we have an address, attempt geocoding
    if (address && (!lat || !lon)) {
        setIsLoading(true);
        
        const fetchCoords = async () => {
            try {
                // Using OpenStreetMap Nominatim API
                const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(address)}&limit=1`;
                
                const response = await fetch(url, {
                    headers: {
                        'User-Agent': 'GabineteDigitalApp/1.0' // Required by OSM policy
                    }
                });

                if (!response.ok) throw new Error('Falha na requisição de geocodificação');
                
                const data = await response.json();
                
                if (data && data.length > 0) {
                    const newLat = parseFloat(data[0].lat);
                    const newLon = parseFloat(data[0].lon);
                    
                    setCoords({ lat: newLat, lon: newLon });

                    // SAVE TO DB so it appears on main map
                    if (isSupabaseConfigured() && supabase && activeId) {
                        const { error } = await supabase
                            .from(tableName)
                            .update({ lat: newLat, lon: newLon })
                            .eq('id', activeId);
                        
                        if (!error && onLocationUpdate) {
                            onLocationUpdate(newLat, newLon);
                        }
                    }
                }
            } catch (error) {
                console.error("Geocoding error:", error);
            } finally {
                setIsLoading(false);
            }
        };

        // Debounce to avoid spamming API if component re-renders quickly
        const timer = setTimeout(fetchCoords, 1500); 
        return () => clearTimeout(timer);
    }
  }, [lat, lon, address, activeId, tableName]); 

  // Static placeholder if no coords
  if (!coords && !isLoading) {
      return (
        <div className="w-full h-48 rounded-xl bg-slate-100 dark:bg-white/5 flex flex-col items-center justify-center text-slate-400 border border-slate-200 dark:border-white/10">
            <MapPin className="w-8 h-8 mb-2 opacity-50" />
            <span className="text-xs font-bold">Localização não definida</span>
            <span className="text-[10px] opacity-70 mt-1">Aguardando endereço...</span>
        </div>
      );
  }

  return (
    <div 
        className="relative w-full h-48 rounded-xl overflow-hidden border border-slate-200 dark:border-white/10 group bg-slate-50 dark:bg-white/5"
    >
      
      {/* 1. Map Layer - Static Visualization */}
      {coords && (
        <div className="h-full w-full z-0 pointer-events-none">
            {/* @ts-ignore: Suppress strict type check for MapContainer props */}
            <MapContainer 
                key={`${coords.lat}-${coords.lon}-${tableName}`} 
                center={[coords.lat, coords.lon]} 
                zoom={15} 
                scrollWheelZoom={false} 
                zoomControl={false}
                dragging={false} // Disabled
                touchZoom={false} // Disabled
                doubleClickZoom={false} // Disabled
                boxZoom={false} // Disabled
                keyboard={false} // Disabled
                attributionControl={false}
                style={{ width: '100%', height: '100%' }}
            >
                {/* CartoDB Positron - Cleaner look for MiniMap */}
                {/* @ts-ignore: Suppress strict type check for attribution prop */}
                <TileLayer
                    url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
                    attribution='&copy; <a href="https://carto.com/attributions">CARTO</a>'
                />
                
                {tableName === 'citizens' ? (
                    <CircleMarker 
                        center={[coords.lat, coords.lon]} 
                        radius={8}
                        pathOptions={{
                            fillColor: '#3b82f6', // blue-500
                            fillOpacity: 1,
                            color: '#ffffff',
                            weight: 2,
                        }}
                    />
                ) : (
                    /* @ts-ignore: Suppress strict type check for icon prop */
                    <Marker position={[coords.lat, coords.lon]} icon={icon} />
                )}
            </MapContainer>
        </div>
      )}

      {/* 2. Loading Indicator */}
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-white/50 dark:bg-black/50 z-[10] pointer-events-none">
            <Loader2 className="w-5 h-5 animate-spin text-brand-600" />
        </div>
      )}
      
      {/* 3. Explicit Expand Button - Visual Cue - ONLY CLICKABLE ELEMENT */}
      {!isLoading && coords && (
        <button 
            type="button"
            onClick={(e) => {
                e.stopPropagation();
                // Pass current coords to handler to avoid stale parent state issues
                onClick(coords.lat, coords.lon);
            }}
            className="absolute top-3 right-3 z-[400] flex items-center gap-2 bg-white/90 dark:bg-slate-900/90 backdrop-blur-sm border border-slate-200 dark:border-white/10 px-3 py-1.5 rounded-lg shadow-md group-hover:scale-105 transition-transform cursor-pointer pointer-events-auto hover:bg-slate-100 dark:hover:bg-slate-800"
        >
            <span className="text-[10px] font-bold text-slate-600 dark:text-slate-300 uppercase tracking-wider text-brand-600 dark:text-brand-400">Expandir</span>
            <Maximize2 className="w-3.5 h-3.5 text-brand-600 dark:text-brand-400" />
        </button>
      )}
    </div>
  );
};

export default DemandMiniMap;
