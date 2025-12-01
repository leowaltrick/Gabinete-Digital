
import React, { useEffect, useState } from 'react';
import { MapPin, Maximize2, Loader2 } from 'lucide-react';
import { MapContainer, TileLayer, Marker } from 'react-leaflet';
import * as L from 'leaflet';
import { supabase, isSupabaseConfigured } from '../services/supabaseClient';

// Fix Leaflet marker icon
const icon = L.icon({
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
});

interface DemandMiniMapProps {
  demandId: string; // Needed to save coords
  lat?: number;
  lon?: number;
  address?: string;
  onClick: () => void;
  onLocationUpdate?: () => void; // Callback to refresh parent data
}

const DemandMiniMap: React.FC<DemandMiniMapProps> = ({ demandId, lat, lon, address, onClick, onLocationUpdate }) => {
  const [coords, setCoords] = useState<{lat: number, lon: number} | null>(null);
  const [isLoading, setIsLoading] = useState(false);

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
                    if (isSupabaseConfigured() && supabase && demandId) {
                        const { error } = await supabase
                            .from('demands')
                            .update({ lat: newLat, lon: newLon })
                            .eq('id', demandId);
                        
                        if (!error && onLocationUpdate) {
                            onLocationUpdate();
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
  }, [lat, lon, address, demandId]); // Dependency on onLocationUpdate removed to avoid loops

  // Don't render map if no coords found and not loading
  if (!coords && !isLoading) {
      return (
        <div className="w-full h-full bg-slate-100 dark:bg-white/5 flex flex-col items-center justify-center text-slate-400">
            <MapPin className="w-8 h-8 mb-2 opacity-50" />
            <span className="text-xs">Sem localização GPS</span>
        </div>
      );
  }

  return (
    <div className="relative w-full h-48 rounded-xl overflow-hidden border border-slate-200 dark:border-white/10 group cursor-pointer" onClick={onClick}>
      {isLoading ? (
          <div className="w-full h-full bg-slate-50 dark:bg-white/5 flex flex-col items-center justify-center text-slate-400">
              <Loader2 className="w-6 h-6 animate-spin mb-2 text-brand-500" />
              <span className="text-xs">Buscando endereço...</span>
          </div>
      ) : coords ? (
        <MapContainer 
            key={`${coords.lat}-${coords.lon}`} 
            center={[coords.lat, coords.lon]} 
            zoom={15} 
            scrollWheelZoom={false} 
            zoomControl={false}
            dragging={false}
            doubleClickZoom={false}
            attributionControl={false}
            style={{ width: '100%', height: '100%' }}
        >
            <TileLayer
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            <Marker position={[coords.lat, coords.lon]} icon={icon} />
        </MapContainer>
      ) : null}
      
      {/* Hover Overlay */}
      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors z-[400] flex items-center justify-center pointer-events-none">
          <div className="bg-white/90 dark:bg-black/80 backdrop-blur-sm px-3 py-1.5 rounded-full text-xs font-bold text-slate-900 dark:text-white opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-2 transform translate-y-2 group-hover:translate-y-0 duration-200">
              <Maximize2 className="w-3 h-3" /> Expandir Mapa
          </div>
      </div>
    </div>
  );
};

export default DemandMiniMap;
