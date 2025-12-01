import React from 'react';
import { Filter, ChevronDown, X, Users, LayoutList } from 'lucide-react';
import { DemandStatus, DemandPriority } from '../types';
import SegmentedControl from './SegmentedControl';

interface DashboardFilterProps {
    status: string;
    setStatus: (v: string) => void;
    priority: string;
    setPriority: (v: string) => void;
    timeRange: string;
    setTimeRange: (v: string) => void;
    scope?: 'demands' | 'citizens';
    setScope?: (v: 'demands' | 'citizens') => void;
    showScope?: boolean;
    className?: string;
}

const DashboardFilter: React.FC<DashboardFilterProps> = ({ 
    status, setStatus, 
    priority, setPriority, 
    timeRange, setTimeRange,
    scope, setScope,
    showScope = true,
    className = ""
}) => (
    <div className={`glass-panel p-3 rounded-3xl flex flex-col md:flex-row gap-4 items-center border border-slate-200 dark:border-white/10 bg-white/60 dark:bg-white/5 backdrop-blur-md shadow-sm ${className}`}>
        
        <div className="flex items-center gap-2 text-slate-500 dark:text-white/50 text-xs font-bold uppercase tracking-wider shrink-0">
            <Filter className="w-4 h-4 text-brand-500" /> Filtros
        </div>

        <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto overflow-x-auto scrollbar-none items-start sm:items-center flex-1">
            
            {/* Scope Switcher */}
            {showScope && scope && setScope && (
                <>
                    <div className="min-w-[200px]">
                        <SegmentedControl 
                            value={scope}
                            onChange={setScope}
                            options={[
                                { value: 'demands', label: 'Demandas', icon: LayoutList },
                                { value: 'citizens', label: 'Cidadãos', icon: Users },
                            ]}
                        />
                    </div>
                    <div className="h-6 w-px bg-slate-200 dark:bg-white/10 hidden sm:block mx-1"></div>
                </>
            )}

            {/* Time Range Switcher */}
            <div className="min-w-[280px]">
                <SegmentedControl 
                    value={timeRange}
                    onChange={setTimeRange}
                    options={[
                        { value: '7', label: '7d' },
                        { value: '30', label: '30d' },
                        { value: '90', label: '90d' },
                        { value: '365', label: 'Ano' },
                        { value: 'all', label: 'Tudo' },
                    ]}
                />
            </div>

            {/* Demand Specific Filters (Only show if Demands selected or Scope hidden/implied) */}
            {(!showScope || scope === 'demands') && (
                <>
                    <div className="h-6 w-px bg-slate-200 dark:bg-white/10 hidden sm:block mx-1"></div>
                    
                    <div className="flex gap-2 w-full sm:w-auto">
                        <div className="relative group flex-1 sm:flex-none">
                            <select 
                                value={status} 
                                onChange={(e) => setStatus(e.target.value)} 
                                className="w-full sm:w-auto appearance-none bg-slate-100 dark:bg-black/20 border border-slate-200 dark:border-white/10 text-slate-700 dark:text-white text-xs font-bold py-3 pl-3 pr-8 rounded-xl outline-none focus:border-brand-500 transition-colors cursor-pointer hover:bg-slate-200 dark:hover:bg-white/10 h-11"
                            >
                                <option value="all">Status: Todos</option>
                                <option value={DemandStatus.PENDING}>Pendentes</option>
                                <option value={DemandStatus.IN_PROGRESS}>Em Andamento</option>
                                <option value={DemandStatus.COMPLETED}>Concluídos</option>
                            </select>
                            <ChevronDown className="w-3 h-3 text-slate-400 absolute right-2.5 top-4 pointer-events-none group-hover:text-brand-500 transition-colors" />
                        </div>

                        <div className="relative group flex-1 sm:flex-none">
                            <select 
                                value={priority} 
                                onChange={(e) => setPriority(e.target.value)} 
                                className="w-full sm:w-auto appearance-none bg-slate-100 dark:bg-black/20 border border-slate-200 dark:border-white/10 text-slate-700 dark:text-white text-xs font-bold py-3 pl-3 pr-8 rounded-xl outline-none focus:border-brand-500 transition-colors cursor-pointer hover:bg-slate-200 dark:hover:bg-white/10 h-11"
                            >
                                <option value="all">Prioridade: Todas</option>
                                <option value={DemandPriority.HIGH}>Alta</option>
                                <option value={DemandPriority.MEDIUM}>Média</option>
                                <option value={DemandPriority.LOW}>Baixa</option>
                            </select>
                            <ChevronDown className="w-3 h-3 text-slate-400 absolute right-2.5 top-4 pointer-events-none group-hover:text-brand-500 transition-colors" />
                        </div>
                    </div>
                </>
            )}
        </div>

        {(status !== 'all' || priority !== 'all' || timeRange !== '30') && (
            <button 
                onClick={() => { setStatus('all'); setPriority('all'); setTimeRange('30'); }}
                className="ml-auto p-2 hover:bg-red-50 dark:hover:bg-red-900/20 text-slate-400 hover:text-red-500 rounded-xl transition-colors flex items-center gap-1 text-[10px] font-bold uppercase"
                title="Limpar Filtros"
            >
                <X className="w-4 h-4" /> <span className="hidden md:inline">Limpar</span>
            </button>
        )}
    </div>
);

export default DashboardFilter;