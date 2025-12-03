
import React, { useEffect, useState } from 'react';
import { MapPin, Maximize2, Loader2 } from 'lucide-react';
import { MapContainer, TileLayer, Marker } from 'react-leaflet';
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
  onClick: () => void;
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
      if (tableName === 'citizens') return 'blue';
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

  // Simplified click handler
  const handleClick = (e: React.MouseEvent) => {
      e.stopPropagation(); // Stop bubbling but allow default
      onClick();
  };

  // Static placeholder if no coords
  if (!coords && !isLoading) {
      return (
        <div className="w-full h-48 rounded-xl bg-slate-100 dark:bg-white/5 flex flex-col items-center justify-center text-slate-400 border border-slate-200 dark:border-white/10 cursor-pointer hover:bg-slate-200 dark:hover:bg-white/10 transition-colors" onClick={handleClick}>
            <MapPin className="w-8 h-8 mb-2 opacity-50" />
            <span className="text-xs font-bold">Localização não definida</span>
            <span className="text-[10px] opacity-70 mt-1">Clique para buscar</span>
        </div>
      );
  }

  return (
    <div className="relative w-full h-48 rounded-xl overflow-hidden border border-slate-200 dark:border-white/10 group cursor-pointer bg-slate-50 dark:bg-white/5" onClick={handleClick}>
      
      {/* Loading Indicator - Simplified */}
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-white/50 dark:bg-black/50 z-[10]">
            <Loader2 className="w-5 h-5 animate-spin text-brand-600" />
        </div>
      )}

      {coords && (
        <>
            <MapContainer 
                key={`${coords.lat}-${coords.lon}-${getMarkerColor()}`} 
                center={[coords.lat, coords.lon]} 
                zoom={15} 
                scrollWheelZoom={false} 
                zoomControl={false}
                dragging={false}
                doubleClickZoom={false}
                attributionControl={false}
                style={{ width: '100%', height: '100%' }}
            >
                {/* CartoDB Positron - Cleaner look for MiniMap */}
                <TileLayer
                    url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
                    attribution='&copy; <a href="https://carto.com/attributions">CARTO</a>'
                />
                <Marker position={[coords.lat, coords.lon]} icon={icon} />
            </MapContainer>
            {/* Click Capture Layer to ensure onClick always fires */}
            <div className="absolute inset-0 z-[500] bg-transparent" onClick={handleClick} />
        </>
      )}
      
      {/* Hover Overlay - Simplified & Always ready for interaction hint */}
      {!isLoading && (
        <div className="absolute top-2 right-2 z-[400] opacity-0 group-hover:opacity-100 transition-opacity duration-200">
            <div className="bg-white/90 dark:bg-black/90 p-1.5 rounded-lg shadow-sm border border-slate-200 dark:border-white/10 text-slate-700 dark:text-white">
                <Maximize2 className="w-4 h-4" />
            </div>
        </div>
      )}
    </div>
  );
};

export default DemandMiniMap;
