import React, { useState, useEffect, useMemo } from 'react';
import { Demand, Citizen, DemandStatus, FilterState, DemandInteraction, Notice, DemandPriority } from '../types';
import KanbanBoard from './KanbanBoard';
import CalendarPage from './CalendarPage';
import DemandTracker from './DemandTracker';
import MapVisualizer from './MapVisualizer';
import { Kanban, CalendarRange, List, LayoutList, PlusCircle, Database, Clock, CheckCircle2, Zap, Map as MapIcon } from 'lucide-react';
import { supabase, isSupabaseConfigured } from '../services/supabaseClient';
import FilterBar from './FilterBar'; 
import DashboardFilter from './DashboardFilter';
import StatCard from './StatCard';
import SegmentedControl from './SegmentedControl';

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
  mapMarkers
}) => {
  const [viewMode, setViewMode] = useState<'list' | 'board' | 'calendar' | 'map'>(initialViewMode);
  // Lifted Map State for coordination between FilterBar and MapVisualizer
  const [mapViewMode, setMapViewMode] = useState<'demands' | 'citizens'>('demands');
  const [notices, setNotices] = useState<Notice[]>([]);
  const [timeRange, setTimeRange] = useState('30'); 

  const isDedicatedMapMode = initialViewMode === 'map';

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
    if (initialSelectionId && !isDedicatedMapMode) {
        setViewMode('list');
    }
  }, [initialSelectionId, isDedicatedMapMode]);

  useEffect(() => {
      if (initialViewMode && !isDedicatedMapMode) {
          setViewMode(initialViewMode);
      }
  }, [initialViewMode, isDedicatedMapMode]);

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

  const currentStatus = filters?.status && filters.status.length === 1 ? filters.status[0] : 'all';
  const currentPriority = filters?.priority && filters.priority.length === 1 ? filters.priority[0] : 'all';

  return (
    <div className={`flex flex-col animate-in slide-in-from-right duration-500 ${isDedicatedMapMode ? 'h-full' : 'gap-4'}`}>
      
      {!isDedicatedMapMode && (
        <div className="shrink-0 flex flex-col gap-4">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-slate-900 dark:text-white tracking-tight flex items-center gap-3">
                        <LayoutList className="w-8 h-8 text-brand-600 dark:text-brand-400" />
                        Gestão de Demandas
                    </h1>
                    <p className="text-slate-500 dark:text-blue-200/50 mt-1 font-medium hidden sm:block">
                        {viewMode === 'list' ? 'Controle detalhado e histórico de ocorrências.'
                        : viewMode === 'board' ? 'Fluxo de trabalho visual por status.'
                        : 'Calendário de prazos e vencimentos.'}
                    </p>
                </div>

                <div className="flex flex-col sm:flex-row items-center gap-3">
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

                    <button onClick={onCreateDemand} className="w-full sm:w-auto px-5 py-2.5 bg-brand-600 hover:bg-brand-500 text-white rounded-xl font-bold shadow-lg shadow-brand-500/20 transition-all flex items-center justify-center gap-2 active:scale-95 h-11">
                        <PlusCircle className="w-5 h-5" /> <span className="whitespace-nowrap">Nova Demanda</span>
                    </button>
                </div>
            </div>

            <div className="md:hidden flex overflow-x-auto gap-2 pb-2 scrollbar-none snap-x -mx-4 px-4 bg-slate-50 dark:bg-[#020617] z-20 pt-2 border-b border-slate-200 dark:border-white/5">
                {[
                    { id: 'list', label: 'Lista', icon: List },
                    { id: 'board', label: 'Quadro', icon: Kanban },
                    { id: 'calendar', label: 'Calendário', icon: CalendarRange }
                ].map((tab) => {
                    const isActive = viewMode === tab.id;
                    const Icon = tab.icon;
                    return (
                        <button
                            key={tab.id}
                            onClick={() => setViewMode(tab.id as any)}
                            className={`
                                flex items-center gap-2 px-4 py-2.5 rounded-full text-xs font-bold whitespace-nowrap transition-all snap-start
                                ${isActive 
                                    ? 'bg-brand-600 text-white shadow-md shadow-brand-500/30' 
                                    : 'bg-white dark:bg-white/5 text-slate-500 dark:text-white/60 border border-slate-200 dark:border-white/10'}
                            `}
                        >
                            <Icon className="w-3.5 h-3.5" />
                            {tab.label}
                        </button>
                    )
                })}
            </div>
      </div>
      )}
      
      {filters && setFilters && !isDedicatedMapMode && (
          <div className="mb-2">
              <DashboardFilter 
                  status={currentStatus}
                  setStatus={handleStatusChange}
                  priority={currentPriority}
                  setPriority={handlePriorityChange}
                  timeRange={timeRange}
                  setTimeRange={handleTimeChange}
                  scope="demands"
                  setScope={() => {}}
                  showScope={false}
              />
          </div>
      )}

      {!isDedicatedMapMode && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4 shrink-0">
                <StatCard title="Total Filtrado" value={kpiStats.total} icon={Database} colorClass="bg-blue-500" textClass="text-blue-600 dark:text-blue-400" />
                <StatCard title="Pendentes" value={kpiStats.pending} icon={Clock} colorClass="bg-slate-500" textClass="text-slate-600 dark:text-slate-400" />
                <StatCard title="Em Andamento" value={kpiStats.total - kpiStats.pending - kpiStats.completed} icon={Zap} colorClass="bg-amber-500" textClass="text-amber-600 dark:text-amber-400" />
                <StatCard title="Concluídos" value={kpiStats.completed} icon={CheckCircle2} colorClass="bg-green-500" textClass="text-green-600 dark:text-green-400" />
          </div>
      )}

      {/* MAP MODE FILTER BAR */}
      {isDedicatedMapMode && filters && setFilters && (
          <div className="absolute top-0 left-0 right-0 p-4 pt-12 pointer-events-none z-30">
              <div className="pointer-events-auto max-w-2xl mx-auto">
                  <FilterBar 
                    filters={filters} 
                    setFilters={setFilters} 
                    users={users} 
                    isMapMode={true} 
                    mapViewMode={mapViewMode} // PASS MAP STATE
                  />
              </div>
          </div>
      )}

      <div className={`flex-1 flex flex-col min-w-0 w-full relative ${isDedicatedMapMode ? 'h-full' : ''}`}>
        {viewMode === 'list' && (
            <DemandTracker 
                demands={demands} 
                citizens={citizens} 
                onUpdateStatus={onUpdateStatus || (() => {})} 
                onEdit={onEditDemand}
                onInteractionUpdate={onInteractionUpdate}
                initialSelectionId={initialSelectionId}
                clearSelection={clearSelection}
                onNotification={onNotification}
                onViewCitizen={onViewCitizen}
            />
        )}
        {viewMode === 'board' && (
            <KanbanBoard 
                demands={demands} 
                citizens={citizens} 
                onViewDemand={(d) => {
                    onViewDemand(d);
                }}
                onUpdateStatus={onUpdateStatus || (() => {})}
            />
        )}
        {viewMode === 'calendar' && (
            <CalendarPage 
                demands={demands} 
                interactions={interactions}
                notices={notices}
                onEditDemand={onEditDemand}
            />
        )}
        {viewMode === 'map' && (
            <MapVisualizer
                demands={demands}
                citizens={citizens}
                defaultCenter={defaultLocation}
                preloadedMarkers={mapMarkers}
                onViewDemand={(id) => {
                    const demand = demands.find(d => d.id === id);
                    if (demand) onViewDemand(demand);
                }}
                // PASS AND CONTROL MAP STATE
                currentViewMode={mapViewMode}
                onChangeViewMode={setMapViewMode}
            />
        )}
      </div>
    </div>
  );
};

export default DemandsView;