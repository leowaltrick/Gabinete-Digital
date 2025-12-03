
import React from 'react';
import { MapPin, Maximize2 } from 'lucide-react';
import { MapContainer, TileLayer, Marker, CircleMarker } from 'react-leaflet';
import * as L from 'leaflet';
import { DemandStatus, DemandPriority } from '../types';

interface DemandMiniMapProps {
  demandId?: string;
  entityId?: string;
  tableName?: 'demands' | 'citizens';
  lat?: number;
  lon?: number;
  address?: string; // Kept for interface compatibility but not used for fetching anymore
  onClick: (lat?: number, lon?: number) => void;
  onLocationUpdate?: (lat: number, lon: number) => void;
  status?: DemandStatus;
  priority?: DemandPriority;
}

const DemandMiniMap: React.FC<DemandMiniMapProps> = ({ 
    lat, 
    lon, 
    demandId,
    entityId,
    tableName = 'demands',
    onClick, 
    status,
    priority
}) => {
  // Logic removed: No more internal state or effects for fetching.
  // The component now relies solely on props passed from parent.

  const hasCoords = lat !== undefined && lon !== undefined && lat !== null && lon !== null && lat !== 0 && lon !== 0;

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

  // --- ACTIONS ---
  const handleExpandClick = (e: React.MouseEvent) => {
      e.stopPropagation();
      e.preventDefault();
      
      if (hasCoords) {
          // DISPATCH GLOBAL EVENT
          // This bypasses prop drilling and modal focus issues by notifying the root App component directly
          const event = new CustomEvent('navigate-to-map', { 
              detail: { 
                  lat, 
                  lon, 
                  type: tableName,
                  id: entityId || demandId // Pass ID to auto-filter on the map
              } 
          });
          window.dispatchEvent(event);

          // Call local onClick as fallback/complement if needed
          onClick(lat, lon);
      }
  };

  if (!hasCoords) {
      return (
        <div className="w-full h-48 rounded-xl bg-slate-100 dark:bg-white/5 flex flex-col items-center justify-center text-slate-400 border border-slate-200 dark:border-white/10">
            <MapPin className="w-8 h-8 mb-2 opacity-50" />
            <span className="text-xs font-bold">Localização não definida</span>
        </div>
      );
  }

  return (
    <div className="relative w-full h-48 rounded-xl overflow-hidden border border-slate-200 dark:border-white/10 group bg-slate-50 dark:bg-white/5">
      
      {/* Expand Button */}
      <button 
          type="button"
          onClick={handleExpandClick}
          className="absolute top-3 right-3 z-[1000] flex items-center gap-2 bg-white/90 dark:bg-slate-900/90 backdrop-blur-sm border border-slate-200 dark:border-white/10 px-3 py-1.5 rounded-lg shadow-md hover:scale-105 transition-all cursor-pointer pointer-events-auto"
      >
          <span className="text-[10px] font-bold text-brand-600 dark:text-brand-400 uppercase tracking-wider">Expandir</span>
          <Maximize2 className="w-3.5 h-3.5 text-brand-600 dark:text-brand-400" />
      </button>

      {/* Map Layer */}
      <div className="h-full w-full z-0 pointer-events-none select-none">
          <MapContainer 
              key={`${lat}-${lon}-${tableName}`} 
              center={[lat!, lon!]} 
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
                  <CircleMarker center={[lat!, lon!]} radius={8} pathOptions={{ fillColor: '#3b82f6', fillOpacity: 1, color: '#ffffff', weight: 2 }} />
              ) : (
                  <Marker position={[lat!, lon!]} icon={icon} />
              )}
          </MapContainer>
      </div>
    </div>
  );
};

export default DemandMiniMap;
