
import React, { useEffect, useState, useMemo, useRef, useCallback } from 'react';
import { MapContainer, TileLayer, Marker, Popup, CircleMarker, useMap } from 'react-leaflet';
import * as L from 'leaflet';
import { Demand, Citizen, DemandStatus, DemandPriority } from '../types';
import { Plus, Minus, Loader2 } from 'lucide-react';

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
  mapFocus?: { lat: number; lon: number } | null;
}

// Icon Cache
const iconCache: Record<string, L.Icon> = {};

const getMarkerColor = (type: 'citizen' | 'demand', status?: DemandStatus, priority?: DemandPriority): string => {
    if (type === 'citizen') return 'blue'; 
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

// --- MAP LIFECYCLE COMPONENT ---
// Fixes the issue where map doesn't render pins correctly on first load due to container size
const MapLifecycle = ({ markers }: { markers: any[] }) => {
    const map = useMap();

    useEffect(() => {
        // Force map to recalculate size when it mounts or markers change significantly
        // This fixes the "gray tiles" or "missing pins" issue on navigation
        const timer = setTimeout(() => {
            map.invalidateSize();
        }, 100);
        return () => clearTimeout(timer);
    }, [map]);

    return null;
};

// --- DOT DENSITY LAYER (For Citizens) ---
const DotDensityLayer = ({ markers }: { markers: any[] }) => {
    const map = useMap();
    const [visibleDots, setVisibleDots] = useState<any[]>([]);
    
    const updateVisible = useCallback(() => {
        if (!map) return;
        
        map.whenReady(() => {
            const bounds = map.getBounds();
            const paddedBounds = bounds.pad(0.1); 
            
            // Filter only what is visible
            const inView = markers.filter(m => paddedBounds.contains(L.latLng(m.lat, m.lon)));
            setVisibleDots(inView.slice(0, 1000)); // Cap for performance
        });
    }, [map, markers]);

    // Update when markers prop changes or map moves
    useEffect(() => {
        // Immediate update on data change
        updateVisible(); 

        const handler = () => {
             requestAnimationFrame(updateVisible);
        };
        
        map.on('moveend', handler);
        map.on('zoomend', handler);
        return () => {
            map.off('moveend', handler);
            map.off('zoomend', handler);
        };
    }, [map, updateVisible, markers]); // Added markers to dependency to trigger on load

    return (
        <>
            {visibleDots.map((m) => (
                <CircleMarker
                    key={`dot-${m.id}`}
                    center={[m.lat, m.lon]}
                    radius={5}
                    pathOptions={{
                        fillColor: '#0ea5e9', // Brand-500
                        fillOpacity: 0.6,
                        color: '#0284c7',
                        weight: 1,
                        opacity: 0.5
                    }}
                    eventHandlers={{
                        click: () => {
                            const event = new CustomEvent('navigate-to-map', { 
                                detail: { citizenId: m.id } 
                            });
                            window.dispatchEvent(event);
                        }
                    }}
                >
                     <Popup>
                        <div className="p-1 min-w-[150px]">
                            <h3 className="font-bold text-sm text-slate-900">{m.name}</h3>
                            <p className="text-xs text-slate-500">{m.bairro || 'Sem Bairro'}</p>
                        </div>
                    </Popup>
                </CircleMarker>
            ))}
        </>
    );
};

// --- MARKER LAYER (For Demands) ---
interface MarkerLayerProps {
    markers: any[];
    onViewDemand?: (id: string) => void;
}

const MarkerLayer: React.FC<MarkerLayerProps> = ({ markers, onViewDemand }) => {
    const map = useMap();
    const [visibleMarkers, setVisibleMarkers] = useState<any[]>([]);
    
    const updateVisible = useCallback(() => {
        if (!map) return;

        map.whenReady(() => {
            const bounds = map.getBounds();
            const paddedBounds = bounds.pad(0.2);
            
            const inView = markers.filter(m => paddedBounds.contains(L.latLng(m.lat, m.lon)));
            setVisibleMarkers(inView.slice(0, 200)); // Cap at 200 markers for DOM performance
        });
    }, [map, markers]);

    // Update when markers prop changes or map moves
    useEffect(() => {
        // Immediate update on data change
        updateVisible();

        const handler = () => {
            requestAnimationFrame(updateVisible);
        };
        
        map.on('moveend', handler);
        map.on('zoomend', handler);
        return () => {
            map.off('moveend', handler);
            map.off('zoomend', handler);
        };
    }, [map, updateVisible, markers]); // Added markers to dependency

    return (
        <>
            {visibleMarkers.map((m) => (
                <Marker 
                    key={`m-${m.type}-${m.id}`} 
                    position={[m.lat, m.lon]}
                    icon={getCachedIcon(m.type, m.status, m.priority)}
                    eventHandlers={{
                        click: () => { 
                            if (window.innerWidth < 768) {
                                map.flyTo([m.lat, m.lon], 16, { duration: 0.5 });
                            }
                        }
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
        <button onClick={zoomIn} className="w-12 h-12 md:w-10 md:h-10 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 flex items-center justify-center text-slate-700 dark:text-white transition-colors border-b border-slate-100 dark:border-white/10 active:bg-slate-100"><Plus className="w-6 h-6 md:w-5 md:h-5" /></button>
        <button onClick={zoomOut} className="w-12 h-12 md:w-10 md:h-10 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 flex items-center justify-center text-slate-700 dark:text-white transition-colors active:bg-slate-100"><Minus className="w-6 h-6 md:w-5 md:h-5" /></button>
    </div>
);

// Map Controller to handle focus updates and auto-zoom
const MapController = ({ focus, markers }: { focus: { lat: number, lon: number } | null, markers: any[] }) => {
    const map = useMap();
    
    useEffect(() => {
        if (focus) {
            map.flyTo([focus.lat, focus.lon], 18, { duration: 1.5 });
        }
    }, [focus, map]);

    // Auto-focus on single result (e.g. from ID Search)
    useEffect(() => {
        if (markers.length === 1) {
            const m = markers[0];
            map.flyTo([m.lat, m.lon], 18, { duration: 1.5 });
        }
    }, [markers, map]);

    return null;
}

const MapVisualizer: React.FC<MapVisualizerProps> = ({ defaultCenter, onViewDemand, preloadedMarkers, currentViewMode, onChangeViewMode, mapFocus }) => {
  const mapRef = useRef<L.Map | null>(null);
  const [isUpdating, setIsUpdating] = useState(false);
  const activeCenter: [number, number] = defaultCenter ? [defaultCenter.lat, defaultCenter.lon] : [-23.5505, -46.6333];

  const activeMarkers = useMemo(() => {
      if (preloadedMarkers) {
          return preloadedMarkers.filter(m => m.type === (currentViewMode === 'demands' ? 'demand' : 'citizen'));
      }
      return [];
  }, [currentViewMode, preloadedMarkers]);

  // Handle Loading Notification
  useEffect(() => {
      // Start loading immediately when dependencies change
      setIsUpdating(true);
      
      // Stop loading only after a brief delay to ensure UI has painted
      const timer = setTimeout(() => {
          setIsUpdating(false);
      }, 500); 
      
      return () => clearTimeout(timer);
  }, [activeMarkers, currentViewMode, preloadedMarkers]);

  const handleZoomIn = () => mapRef.current?.zoomIn();
  const handleZoomOut = () => mapRef.current?.zoomOut();

  return (
    <div className={`transition-all duration-300 ease-in-out border-slate-200 dark:border-white/10 shadow-sm bg-slate-100 dark:bg-slate-900 overflow-hidden h-full w-full relative`}>
        
        {/* Loading Indicator */}
        {isUpdating && (
            <div className="absolute top-20 md:top-4 left-1/2 -translate-x-1/2 z-[1000] animate-in fade-in zoom-in-95 duration-200 pointer-events-none">
                <div className="bg-white/90 dark:bg-slate-800/90 backdrop-blur-md px-4 py-2 rounded-full shadow-xl border border-brand-100 dark:border-white/10 flex items-center gap-2">
                    <Loader2 className="w-4 h-4 animate-spin text-brand-600" />
                    <span className="text-xs font-bold text-slate-700 dark:text-white">Atualizando mapa...</span>
                </div>
            </div>
        )}

        {/* Floating Controls - Positioned higher on mobile to avoid bottom nav overlap */}
        <div className="absolute right-4 bottom-24 md:bottom-8 z-[400] flex flex-col gap-3 pointer-events-none">
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
            preferCanvas={true} // Performance boost
        >
            <MapLifecycle markers={activeMarkers} />
            
            {/* CartoDB Positron Tile Layer - Clean Look */}
            <TileLayer url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png" attribution='&copy; <a href="https://carto.com/attributions">CARTO</a>' />
            
            {/* Layer Switching */}
            {currentViewMode === 'citizens' ? (
                <DotDensityLayer markers={activeMarkers} />
            ) : (
                <MarkerLayer markers={activeMarkers} onViewDemand={onViewDemand} />
            )}

            <MapController focus={mapFocus || null} markers={activeMarkers} />
        </MapContainer>
    </div>
  );
};

export default MapVisualizer;
