
import React, { useState, useEffect, useMemo } from 'react';
import { Demand, Citizen, DemandStatus, FilterState, DemandInteraction, Notice, DemandPriority } from '../types';
import KanbanBoard from './KanbanBoard';
import CalendarPage from './CalendarPage';
import DemandTracker from './DemandTracker';
import MapVisualizer from './MapVisualizer';
import { Kanban, CalendarRange, List, LayoutList, PlusCircle, Database, Clock, CheckCircle2, Zap, Map as MapIcon, Globe } from 'lucide-react';
import { supabase, isSupabaseConfigured } from '../services/supabaseClient';
import FilterBar from './FilterBar'; 
import DashboardFilter from './DashboardFilter';
import StatCard from './StatCard';
import SegmentedControl from './SegmentedControl';
import DemandDetailsModal from './DemandDetailsModal';
import CitizenDetailsModal from './CitizenDetailsModal';

interface DemandsViewProps {
  demands: Demand[];
  citizens: Citizen[];
  interactions?: DemandInteraction[]; 
  onViewDemand: (demand: Demand) => void;
  onEditDemand: (demand: Demand) => void;
  onCreateDemand: () => void;
  onUpdateStatus?: (demandId: string, newStatus: DemandStatus) => void;
  onInteractionUpdate?: () => void;
  initialSelectionId?: string | null;
  clearSelection?: () => void;
  initialViewMode?: 'list' | 'board' | 'calendar' | 'map';
  filters?: FilterState;
  setFilters?: React.Dispatch<React.SetStateAction<FilterState>>;
  users?: any[];
  onNotification?: (type: 'success' | 'error', message: string) => void;
  defaultLocation?: { lat: number; lon: number } | null;
  onViewCitizen?: (citizenId: string) => void;
  mapMarkers?: any[]; 
  mapFocus?: { lat: number; lon: number } | null;
  initialMapViewMode?: 'demands' | 'citizens';
}

const DemandsView: React.FC<DemandsViewProps> = ({ 
  demands, 
  citizens, 
  interactions = [],
  onViewDemand, 
  onEditDemand,
  onCreateDemand,
  onUpdateStatus,
  onInteractionUpdate,
  initialSelectionId,
  clearSelection,
  initialViewMode = 'list',
  filters,
  setFilters,
  users = [],
  onNotification,
  defaultLocation,
  onViewCitizen,
  mapMarkers,
  mapFocus,
  initialMapViewMode = 'demands'
}) => {
  const [viewMode, setViewMode] = useState<'list' | 'board' | 'calendar' | 'map'>(initialViewMode);
  // Lifted Map State for coordination between FilterBar and MapVisualizer
  const [mapViewMode, setMapViewMode] = useState<'demands' | 'citizens'>('demands');
  const [notices, setNotices] = useState<Notice[]>([]);
  const [timeRange, setTimeRange] = useState('30'); 
  const [selectedDemandId, setSelectedDemandId] = useState<string | null>(null);
  
  // Also track selected citizen for map view details
  const [selectedCitizenForMap, setSelectedCitizenForMap] = useState<Citizen | null>(null);

  const isDedicatedMapMode = viewMode === 'map'; // Changed to track current viewMode

  const kpiStats = useMemo(() => {
        const total = demands.length;
        let pending = 0;
        let completed = 0;
        let highPriority = 0;

        for (const d of demands) {
            if (d.status === DemandStatus.PENDING) pending++;
            else if (d.status === DemandStatus.COMPLETED) completed++;
            
            if (d.priority === DemandPriority.HIGH) highPriority++;
        }

        return { total, pending, completed, highPriority };
  }, [demands]);

  useEffect(() => {
    if (initialSelectionId) {
        // If coming from dashboard with a selection, ensure we are in a view that supports it
        // and set the selected ID to open the modal
        setSelectedDemandId(initialSelectionId);
    }
  }, [initialSelectionId, isDedicatedMapMode]);

  useEffect(() => {
      if (initialViewMode) {
          setViewMode(initialViewMode);
      }
  }, [initialViewMode]);

  useEffect(() => {
      if (initialMapViewMode && isDedicatedMapMode) {
          setMapViewMode(initialMapViewMode);
      }
  }, [initialMapViewMode, isDedicatedMapMode]);

  useEffect(() => {
    const loadNotices = async () => {
         if(isSupabaseConfigured() && supabase) {
            const { data } = await supabase.from('app_config').select('value').eq('key', 'dashboard_notices').maybeSingle();
            if(data) setNotices(data.value);
        } else {
             const storedNotices = localStorage.getItem('geo_notices');
             if (storedNotices) setNotices(JSON.parse(storedNotices));
        }
    }
    loadNotices();
  }, []);

  // --- Date Filter Logic ---
  const handleTimeChange = (val: string) => {
      setTimeRange(val);
      
      if (!setFilters) return;

      if (val === 'all') {
          setFilters(prev => ({ ...prev, startDate: '', endDate: '' }));
          return;
      }

      const days = parseInt(val);
      const end = new Date();
      const start = new Date();
      
      if (val === '365') {
          // "Ano" logic: Start of current year
          start.setMonth(0, 1);
          start.setHours(0,0,0,0);
      } else {
          start.setDate(end.getDate() - days);
      }

      // Format to YYYY-MM-DD using local time
      const startStr = start.toLocaleDateString('en-CA');
      const endStr = end.toLocaleDateString('en-CA');

      setFilters(prev => ({ 
          ...prev, 
          startDate: startStr, 
          endDate: endStr 
      }));
  };

  useEffect(() => {
      if (setFilters && !filters?.startDate && !isDedicatedMapMode) {
          handleTimeChange('30');
      }
  }, []);

  const handleStatusChange = (val: string) => {
      if (setFilters) {
          if (val === 'all') setFilters(prev => ({ ...prev, status: [] }));
          else setFilters(prev => ({ ...prev, status: [val] }));
      }
  };

  const handlePriorityChange = (val: string) => {
      if (setFilters) {
          if (val === 'all') setFilters(prev => ({ ...prev, priority: [] }));
          else setFilters(prev => ({ ...prev, priority: [val] }));
      }
  };

  const handleNavigate = (direction: 'prev' | 'next') => {
    if (!selectedDemandId) return;
    const currentIndex = demands.findIndex(d => d.id === selectedDemandId);
    if (currentIndex === -1) return;
    
    if (direction === 'prev' && currentIndex > 0) {
        setSelectedDemandId(demands[currentIndex - 1].id);
    } else if (direction === 'next' && currentIndex < demands.length - 1) {
        setSelectedDemandId(demands[currentIndex + 1].id);
    }
  };

  const currentSelectedIndex = selectedDemandId ? demands.findIndex(d => d.id === selectedDemandId) : -1;
  const canNavigatePrev = currentSelectedIndex > 0;
  const canNavigateNext = currentSelectedIndex !== -1 && currentSelectedIndex < demands.length - 1;

  const currentStatus = filters?.status && filters.status.length === 1 ? filters.status[0] : 'all';
  const currentPriority = filters?.priority && filters.priority.length === 1 ? filters.priority[0] : 'all';

  const renderHeader = () => (
      <div className="shrink-0 flex flex-col gap-4">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-slate-900 dark:text-white tracking-tight flex items-center gap-3">
                        {isDedicatedMapMode ? <MapIcon className="w-8 h-8 text-brand-600 dark:text-brand-400" /> : <LayoutList className="w-8 h-8 text-brand-600 dark:text-brand-400" />}
                        {isDedicatedMapMode ? 'Mapa Geral' : 'Gestão de Demandas'}
                    </h1>
                </div>

                <div className="flex flex-col sm:flex-row items-center gap-3">
                    {!isDedicatedMapMode && (
                        <div className="hidden md:flex w-[280px]">
                            <SegmentedControl 
                                value={viewMode}
                                onChange={setViewMode}
                                options={[
                                    { value: 'list', label: 'Lista', icon: List },
                                    { value: 'board', label: 'Quadro', icon: Kanban },
                                    { value: 'calendar', label: 'Data', icon: CalendarRange },
                                ]}
                            />
                        </div>
                    )}

                    {!isDedicatedMapMode && (
                        <button onClick={onCreateDemand} className="w-full sm:w-auto px-5 py-2.5 bg-brand-600 hover:bg-brand-500 text-white rounded-xl font-bold shadow-lg shadow-brand-500/20 transition-all flex items-center justify-center gap-2 active:scale-95 h-11">
                            <PlusCircle className="w-5 h-5" />
                            <span className="whitespace-nowrap">Nova Demanda</span>
                        </button>
                    )}
                </div>
            </div>
      </div>
  );

  return (
    <div className="flex flex-col h-full animate-in fade-in zoom-in-95 duration-500 relative">
      
      {/* Map Mode Layout */}
      {isDedicatedMapMode ? (
          <div className="flex flex-col h-full absolute inset-0">
                {/* Header Section for Map */}
                <div className="shrink-0 p-4 md:p-6 bg-white/90 dark:bg-[#0b1121]/90 backdrop-blur-md z-30 border-b border-slate-200 dark:border-white/10">
                    {renderHeader()}
                </div>
                
                {/* Filters Section for Map */}
                {filters && setFilters && (
                    <div className="shrink-0 px-4 md:px-6 py-3 bg-white/50 dark:bg-black/20 backdrop-blur-sm border-b border-slate-200 dark:border-white/5 z-20">
                        <FilterBar 
                            filters={filters} 
                            setFilters={setFilters} 
                            users={users} 
                            isMapMode={true}
                            mapViewMode={mapViewMode}
                        />
                    </div>
                )}

                {/* Map Area */}
                <div className="flex-1 relative w-full min-h-0">
                    <MapVisualizer 
                        defaultCenter={defaultLocation}
                        onViewDemand={(id) => setSelectedDemandId(id)}
                        preloadedMarkers={mapMarkers}
                        currentViewMode={mapViewMode}
                        onChangeViewMode={setMapViewMode}
                        mapFocus={mapFocus}
                    />
                </div>
          </div>
      ) : (
          /* Standard View Layout */
          <div className="flex flex-col gap-4 h-full">
              {renderHeader()}

              {/* Standard Filters */}
              {filters && setFilters && (
                  <div className="shrink-0">
                      <FilterBar 
                          filters={filters} 
                          setFilters={setFilters} 
                          users={users} 
                          isMapMode={false}
                      />
                  </div>
              )}

              <div className="flex flex-col min-h-0 w-full relative h-full">
                  
                  {/* KPI Cards (Hidden in Calendar) */}
                  {viewMode !== 'calendar' && (
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4 mb-4 shrink-0">
                            <StatCard title="Total" value={kpiStats.total} icon={Database} colorClass="bg-blue-500" textClass="text-blue-600 dark:text-blue-400" />
                            <StatCard title="Pendentes" value={kpiStats.pending} icon={Clock} colorClass="bg-slate-500" textClass="text-slate-600 dark:text-slate-400" />
                            <StatCard title="Concluídas" value={kpiStats.completed} icon={CheckCircle2} colorClass="bg-green-500" textClass="text-green-600 dark:text-green-400" />
                            <StatCard title="Alta Prioridade" value={kpiStats.highPriority} icon={Zap} colorClass="bg-red-500" textClass="text-red-600 dark:text-red-400" />
                        </div>
                  )}

                  {/* Views */}
                  <div className="flex-1 min-h-0 w-full relative">
                        {viewMode === 'list' && (
                            <DemandTracker 
                                demands={demands} 
                                citizens={citizens} 
                                onUpdateStatus={onUpdateStatus || (() => {})} 
                                onEdit={onEditDemand} 
                                onViewDemand={(d) => setSelectedDemandId(d.id)}
                                initialSelectionId={initialSelectionId}
                                clearSelection={clearSelection}
                                onInteractionUpdate={onInteractionUpdate}
                                onNotification={onNotification}
                                onViewCitizen={onViewCitizen}
                            />
                        )}
                        {viewMode === 'board' && (
                            <KanbanBoard 
                                demands={demands} 
                                citizens={citizens} 
                                onViewDemand={(d) => setSelectedDemandId(d.id)} 
                                onUpdateStatus={onUpdateStatus || (() => {})} 
                            />
                        )}
                        {viewMode === 'calendar' && (
                            <CalendarPage 
                                demands={demands} 
                                interactions={interactions}
                                notices={notices}
                                onEditDemand={(d) => setSelectedDemandId(d.id)} 
                            />
                        )}
                  </div>
              </div>
          </div>
      )}

      {/* Detail Modal (Shared across views) */}
      {selectedDemandId && (
          <DemandDetailsModal 
              demand={demands.find(d => d.id === selectedDemandId)!}
              citizen={citizens.find(c => c.id === demands.find(d => d.id === selectedDemandId)?.citizenId) || null}
              onClose={() => {
                  setSelectedDemandId(null);
                  if (clearSelection) clearSelection();
              }}
              onEdit={onEditDemand}
              onUpdateStatus={onUpdateStatus || (() => {})}
              onInteractionUpdate={onInteractionUpdate}
              onNavigate={handleNavigate}
              canNavigatePrev={canNavigatePrev}
              canNavigateNext={canNavigateNext}
              onNotification={onNotification}
              onViewCitizen={onViewCitizen}
          />
      )}
    </div>
  );
};

export default DemandsView;
