import React, { useEffect, useState, useMemo, useRef, useCallback } from 'react';
import { MapContainer, TileLayer, Marker, Popup, CircleMarker, useMap, useMapEvents } from 'react-leaflet';
import * as L from 'leaflet';
import { Demand, Citizen, DemandStatus, DemandPriority } from '../types';
import { Map as MapIcon, Users, LayoutList, Plus, Minus, Layers } from 'lucide-react';

// Fix Leaflet default marker icon globally
if (L.Icon && L.Icon.Default) {
    delete (L.Icon.Default.prototype as any)._getIconUrl;
    L.Icon.Default.mergeOptions({
      iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
      iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
      shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
    });
}

interface MapVisualizerProps {
  demands?: Demand[];
  citizens?: Citizen[];
  defaultCenter?: { lat: number; lon: number } | null;
  onViewDemand?: (demandId: string) => void;
  preloadedMarkers?: any[];
  currentViewMode: 'demands' | 'citizens'; 
  onChangeViewMode: (mode: 'demands' | 'citizens') => void;
}

// Icon Cache
const iconCache: Record<string, L.Icon> = {};

const getMarkerColor = (type: 'citizen' | 'demand', status?: DemandStatus, priority?: DemandPriority): string => {
    if (type === 'citizen') return 'blue'; // Changed to Blue for consistency
    if (status === DemandStatus.COMPLETED) return 'green';
    if (priority === DemandPriority.HIGH) return 'red';
    if (status === DemandStatus.IN_PROGRESS) return 'orange';
    if (priority === DemandPriority.MEDIUM) return 'gold';
    return 'blue';
};

const getCachedIcon = (type: 'citizen' | 'demand', status?: DemandStatus, priority?: DemandPriority) => {
    const color = getMarkerColor(type, status, priority);
    const cacheKey = `${type}-${color}`;

    if (iconCache[cacheKey]) return iconCache[cacheKey];

    const icon = new L.Icon({
        iconUrl: `https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-${color}.png`,
        shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
        iconSize: [25, 41],
        iconAnchor: [12, 41],
        popupAnchor: [1, -34],
        shadowSize: [41, 41],
        className: type === 'citizen' ? 'custom-citizen-icon' : ''
    });
    
    iconCache[cacheKey] = icon;
    return icon;
};

// --- DOT DENSITY LAYER (For Citizens) ---
// Renders small, semi-transparent circles to show density while keeping individual points clickable
const DotDensityLayer = ({ markers }: { markers: any[] }) => {
    const map = useMap();
    const [visibleDots, setVisibleDots] = useState<any[]>([]);
    const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    
    const updateVisible = useCallback(() => {
        if (!map) return;
        const bounds = map.getBounds();
        
        // Dot Density can handle many more points than Icon Markers
        let maxVisible = 2000; 

        const paddedBounds = bounds.pad(0.2); 
        const inView = markers.filter(m => paddedBounds.contains(L.latLng(m.lat, m.lon)));
        
        setVisibleDots(inView.slice(0, maxVisible));
    }, [map, markers]);

    useEffect(() => { updateVisible(); }, [markers]);

    useEffect(() => {
        if (!map) return;
        const handleMapEvent = () => {
            if (timerRef.current) clearTimeout(timerRef.current);
            timerRef.current = setTimeout(updateVisible, 200); // Fast debounce
        };
        map.on('moveend', handleMapEvent);
        map.on('zoomend', handleMapEvent);
        return () => {
            map.off('moveend', handleMapEvent);
            map.off('zoomend', handleMapEvent);
            if (timerRef.current) clearTimeout(timerRef.current);
        };
    }, [map, updateVisible]);

    return (
        <>
            {visibleDots.map((m) => (
                <CircleMarker
                    key={`dot-${m.id}`}
                    center={[m.lat, m.lon]}
                    radius={5} // Small dot
                    pathOptions={{
                        fillColor: '#0ea5e9', // Brand-500 (Blue)
                        fillOpacity: 0.6,     // Transparency creates density effect on overlap
                        color: '#0284c7',     // Brand-600 (Darker Blue Border)
                        weight: 1,
                        opacity: 0.5
                    }}
                >
                     <Popup>
                        <div className="p-1 min-w-[150px]">
                            <h3 className="font-bold text-sm text-slate-900">{m.name}</h3>
                            <p className="text-xs text-slate-500">{m.bairro}</p>
                        </div>
                    </Popup>
                </CircleMarker>
            ))}
        </>
    );
};

// --- STANDARD MARKER LAYER (For Demands) ---
interface MarkerLayerProps {
    markers: any[];
    onViewDemand?: (id: string) => void;
}

const MarkerLayer: React.FC<MarkerLayerProps> = ({ markers, onViewDemand }) => {
    const map = useMap();
    const [visibleMarkers, setVisibleMarkers] = useState<any[]>([]);
    const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const isMobile = typeof window !== 'undefined' && window.innerWidth < 768;

    const updateVisible = useCallback(() => {
        if (!map) return;
        
        const bounds = map.getBounds();
        const zoom = map.getZoom();
        
        let maxVisible = isMobile ? 40 : 150; 
        
        if (markers.length <= maxVisible) {
             if (visibleMarkers.length !== markers.length) {
                 setVisibleMarkers(markers);
             }
             return;
        }

        if (zoom < 15) maxVisible = Math.floor(maxVisible * 0.6);

        const paddedBounds = bounds.pad(isMobile ? 0.1 : 0.2); 
        const inView = markers.filter(m => paddedBounds.contains(L.latLng(m.lat, m.lon)));
        
        setVisibleMarkers(inView.slice(0, maxVisible));
    }, [map, markers, isMobile]);

    useEffect(() => { updateVisible(); }, [markers]);

    useEffect(() => {
        if (!map) return;
        const handleMapEvent = () => {
            if (timerRef.current) clearTimeout(timerRef.current);
            timerRef.current = setTimeout(updateVisible, 250);
        };
        map.on('moveend', handleMapEvent);
        map.on('zoomend', handleMapEvent);
        return () => {
            map.off('moveend', handleMapEvent);
            map.off('zoomend', handleMapEvent);
            if (timerRef.current) clearTimeout(timerRef.current);
        };
    }, [map, updateVisible]);

    return (
        <>
            {visibleMarkers.map((m) => (
                <Marker 
                    key={`m-${m.type}-${m.id}`} 
                    position={[m.lat, m.lon]}
                    icon={getCachedIcon(m.type, m.status, m.priority)}
                    eventHandlers={{
                        click: () => { if (isMobile) map.flyTo([m.lat, m.lon], 16, { duration: 0.5 }); }
                    }}
                >
                    <Popup>
                        <div className="p-1 min-w-[200px]">
                            <div className="flex flex-col gap-2">
                                <h3 className="font-bold text-sm text-slate-800 leading-tight">{m.title}</h3>
                                <div className="flex justify-between items-center text-xs">
                                    <span className={`px-2 py-0.5 rounded-full ${m.status === 'Concluído' ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-700'}`}>{m.status}</span>
                                    {m.priority === DemandPriority.HIGH && <span className="text-red-600 font-bold">ALTA</span>}
                                </div>
                                <button onClick={(e) => { e.stopPropagation(); if(onViewDemand) onViewDemand(m.id); }} className="mt-1 w-full bg-brand-600 text-white text-xs font-bold py-1.5 rounded hover:bg-brand-700 transition-colors">Ver Detalhes</button>
                            </div>
                        </div>
                    </Popup>
                </Marker>
            ))}
        </>
    );
};

const CustomControls = ({ zoomIn, zoomOut }: { zoomIn: () => void, zoomOut: () => void }) => (
    <div className="flex flex-col gap-2 pointer-events-auto shadow-lg rounded-xl overflow-hidden border border-slate-200 dark:border-white/10">
        <button onClick={zoomIn} className="w-10 h-10 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 flex items-center justify-center text-slate-700 dark:text-white transition-colors border-b border-slate-100 dark:border-white/10"><Plus className="w-5 h-5" /></button>
        <button onClick={zoomOut} className="w-10 h-10 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 flex items-center justify-center text-slate-700 dark:text-white transition-colors"><Minus className="w-5 h-5" /></button>
    </div>
);

const HybridMapLayer = ({ markers, viewMode, onViewDemand }: any) => {
    if (viewMode === 'citizens') {
        return <DotDensityLayer markers={markers} />;
    }

    return (
        <MarkerLayer 
            key={`ml-${markers.length}-${markers[0]?.id || 'empty'}`} 
            markers={markers} 
            onViewDemand={onViewDemand} 
        />
    );
};

const MapVisualizer: React.FC<MapVisualizerProps> = ({ defaultCenter, onViewDemand, preloadedMarkers, currentViewMode, onChangeViewMode }) => {
  const mapRef = useRef<L.Map | null>(null);
  const activeCenter: [number, number] = defaultCenter ? [defaultCenter.lat, defaultCenter.lon] : [-23.5505, -46.6333];

  const activeMarkers = useMemo(() => {
      if (preloadedMarkers) {
          return preloadedMarkers.filter(m => m.type === (currentViewMode === 'demands' ? 'demand' : 'citizen'));
      }
      return [];
  }, [currentViewMode, preloadedMarkers]);

  const handleZoomIn = () => mapRef.current?.zoomIn();
  const handleZoomOut = () => mapRef.current?.zoomOut();

  return (
    <div className={`transition-all duration-300 ease-in-out border-slate-200 dark:border-white/10 shadow-sm bg-slate-100 dark:bg-slate-900 overflow-hidden h-full w-full relative`}>
        
        {/* Floating Controls - Only View Toggle */}
        <div className="absolute left-4 bottom-4 md:bottom-8 z-[400] pointer-events-none flex flex-col gap-2">
            <div className="pointer-events-auto bg-white/90 dark:bg-black/80 backdrop-blur-md p-1.5 rounded-xl shadow-lg border border-slate-200 dark:border-white/10 flex gap-1">
                <button onClick={() => onChangeViewMode('demands')} className={`px-3 py-2 rounded-lg text-xs font-bold flex items-center gap-2 transition-colors ${currentViewMode === 'demands' ? 'bg-brand-600 text-white' : 'text-slate-600 dark:text-white hover:bg-slate-100 dark:hover:bg-white/10'}`}>
                    <LayoutList className="w-4 h-4" /> <span className="hidden sm:inline">Demandas</span>
                </button>
                {/* Updated Color to Blue (Brand-600) */}
                <button onClick={() => onChangeViewMode('citizens')} className={`px-3 py-2 rounded-lg text-xs font-bold flex items-center gap-2 transition-colors ${currentViewMode === 'citizens' ? 'bg-brand-600 text-white' : 'text-slate-600 dark:text-white hover:bg-slate-100 dark:hover:bg-white/10'}`}>
                    <Users className="w-4 h-4" /> <span className="hidden sm:inline">Cidadãos</span>
                </button>
            </div>
        </div>

        <div className="absolute right-4 bottom-4 md:bottom-8 z-[400] flex flex-col gap-3 pointer-events-none">
             <div className="pointer-events-auto">
                <CustomControls zoomIn={handleZoomIn} zoomOut={handleZoomOut} />
             </div>
        </div>

        <MapContainer 
            ref={mapRef}
            center={activeCenter} 
            zoom={13} 
            style={{ width: '100%', height: '100%' }} 
            zoomControl={false} 
            scrollWheelZoom={true} 
            dragging={true}
            preferCanvas={true}
        >
            {/* CartoDB Positron Tile Layer */}
            <TileLayer url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png" attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>' />
            <HybridMapLayer markers={activeMarkers} viewMode={currentViewMode} onViewDemand={onViewDemand} />
        </MapContainer>
    </div>
  );
};

export default MapVisualizer;