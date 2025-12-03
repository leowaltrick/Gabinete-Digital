import React, { useState, useRef, useEffect, useMemo } from 'react';
import { Search, X, Calendar, ChevronLeft, ChevronRight, Download, Filter, User, SlidersHorizontal, RotateCcw, Clock, Zap, AlertCircle, Users, LayoutList } from 'lucide-react';
import { DemandLevel, DemandStatus, DemandPriority, FilterState } from '../types';
import MultiSelect from './MultiSelect';
import SegmentedControl from './SegmentedControl';

interface FilterBarProps {
  filters: FilterState;
  setFilters: React.Dispatch<React.SetStateAction<FilterState>>;
  onExport?: () => void;
  users?: any[];
  availableTags?: string[];
  isMapMode?: boolean;
  mapViewMode?: 'demands' | 'citizens'; 
  onMapViewModeChange?: (mode: 'demands' | 'citizens') => void;
  hideAdvanced?: boolean;
}

const FilterChip: React.FC<{ label: React.ReactNode; onRemove: () => void }> = ({ label, onRemove }) => (
    <div className="flex items-center gap-1 pl-3 pr-1 py-1 bg-brand-50 dark:bg-brand-500/20 text-brand-700 dark:text-brand-300 border border-brand-100 dark:border-brand-500/30 rounded-lg text-xs font-bold animate-in zoom-in-95 shadow-sm whitespace-nowrap">
        <span>{label}</span>
        <button onClick={(e) => { e.stopPropagation(); onRemove(); }} className="p-0.5 hover:bg-brand-200 dark:hover:bg-brand-500/40 rounded-md transition-colors text-brand-600 dark:text-brand-400">
            <X className="w-3 h-3" />
        </button>
    </div>
);

const FilterBar: React.FC<FilterBarProps> = ({ filters, setFilters, onExport, users = [], availableTags = [], isMapMode = false, mapViewMode, onMapViewModeChange, hideAdvanced = false }) => {
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [pickerDate, setPickerDate] = useState(new Date());
  const datePickerRef = useRef<HTMLDivElement>(null);
  const advancedPanelRef = useRef<HTMLDivElement>(null);

  const handleChange = (key: keyof FilterState, value: any) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  const clearFilters = () => {
    setFilters({
      search: filters.search,
      level: [],
      priority: [],
      status: [],
      startDate: '',
      endDate: '',
      dateType: 'createdAt',
      responsibleId: undefined,
      tags: []
    });
  };

  const removeFilter = (key: keyof FilterState, value?: string) => {
      if (Array.isArray(filters[key]) && value) {
           setFilters(prev => ({
               ...prev,
               [key]: (prev[key] as string[]).filter(v => v !== value)
           }));
      } else {
           if (key === 'startDate' || key === 'endDate') {
               setFilters(prev => ({ ...prev, startDate: '', endDate: '' }));
           } else {
               setFilters(prev => ({ ...prev, [key]: undefined }));
           }
      }
  };

  const getUserName = (id: string) => {
      const user = users.find(u => u.id === id);
      return user ? user.nome : 'Usuário';
  };

  const formatRole = (role: string) => {
      if (!role) return '';
      return role.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
  };

  // Date Picker Logic
  const monthNames = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];
  const getDaysInMonth = (year: number, month: number) => new Date(year, month + 1, 0).getDate();
  const getFirstDayOfMonth = (year: number, month: number) => new Date(year, month, 1).getDay();

  const handleDateClick = (day: number) => {
    const clickedDate = new Date(pickerDate.getFullYear(), pickerDate.getMonth(), day);
    const dateStr = clickedDate.toLocaleDateString('en-CA'); 

    if (!filters.startDate || (filters.startDate && filters.endDate)) {
        setFilters(prev => ({ ...prev, startDate: dateStr, endDate: '' }));
    } else {
        if (dateStr < filters.startDate) {
            setFilters(prev => ({ ...prev, startDate: dateStr, endDate: filters.startDate }));
        } else {
            setFilters(prev => ({ ...prev, endDate: dateStr }));
            setTimeout(() => setShowDatePicker(false), 300);
        }
    }
  };

  const selectionStart = filters.startDate ? new Date(filters.startDate + 'T00:00:00').getTime() : null;
  const selectionEnd = filters.endDate ? new Date(filters.endDate + 'T00:00:00').getTime() : null;

  const isSelected = (day: number) => {
    if (!selectionStart) return false;
    const current = new Date(pickerDate.getFullYear(), pickerDate.getMonth(), day).getTime();
    if (current === selectionStart) return 'start';
    if (selectionEnd && current === selectionEnd) return 'end';
    if (selectionEnd && current > selectionStart && current < selectionEnd) return 'range';
    return false;
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
        if (datePickerRef.current && !datePickerRef.current.contains(event.target as Node)) {
            setShowDatePicker(false);
        }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const activeFiltersCount = 
      filters.level.length +
      filters.status.length +
      filters.priority.length +
      (filters.tags?.length || 0) +
      (filters.startDate ? 1 : 0) +
      (filters.responsibleId ? 1 : 0);
  
  const formattedRange = filters.startDate 
    ? `${new Date(filters.startDate + 'T00:00').toLocaleDateString('pt-BR', {day: '2-digit', month: '2-digit'})} ${filters.endDate ? ' - ' + new Date(filters.endDate + 'T00:00').toLocaleDateString('pt-BR', {day: '2-digit', month: '2-digit'}) : ''}`
    : 'Selecionar Período';

  const dateLabelMap: Record<string, string> = {
    createdAt: 'Criação',
    updatedAt: 'Atualização',
    deadline: 'Prazo'
  };

  const levelOptions = Object.values(DemandLevel).map(v => ({ value: v, label: v }));
  const statusOptions = Object.values(DemandStatus).map(v => ({ value: v, label: v }));
  const priorityOptions = Object.values(DemandPriority).map(v => ({ value: v, label: v }));
  const tagOptions = availableTags.map(t => ({ value: t, label: t }));

  const showAllFilters = !isMapMode || mapViewMode === 'demands';

  return (
    <div className="flex flex-col relative z-30 space-y-3">
      
      {/* Search & Buttons */}
      <div className={`
          flex flex-col md:flex-row gap-3 items-center relative z-20 
          ${isMapMode 
            ? 'bg-transparent' 
            : 'glass-panel p-2 md:p-3 rounded-2xl shadow-sm border border-slate-200 dark:border-white/10 bg-white/60 dark:bg-white/5 backdrop-blur-md'}
      `}>
         
         <div className={`flex-1 w-full relative group ${isMapMode ? 'shadow-lg rounded-2xl' : ''}`}>
            <input
                type="text"
                value={filters.search}
                onChange={(e) => handleChange('search', e.target.value)}
                placeholder={isMapMode ? "Buscar locais ou demandas..." : "Buscar por título, nome ou celular..."}
                className={`
                    w-full pl-11 pr-4 py-3 outline-none transition-all font-medium text-slate-700 dark:text-white placeholder:text-slate-400
                    ${isMapMode 
                        ? 'bg-white/95 dark:bg-[#1e293b]/95 border-0 rounded-2xl shadow-md focus:ring-2 ring-brand-500/50' 
                        : 'bg-slate-50 dark:bg-black/20 border border-slate-200 dark:border-white/10 rounded-xl focus:border-brand-500 focus:bg-white dark:focus:bg-black/20'}
                `}
            />
            <Search className="w-5 h-5 text-slate-400 absolute left-3.5 top-3.5 group-focus-within:text-brand-500 transition-colors" />
            {filters.search && (
                <button onClick={() => handleChange('search', '')} className="absolute right-3 top-3.5 text-slate-400 hover:text-slate-600 dark:hover:text-white">
                    <X className="w-5 h-5" />
                </button>
            )}
         </div>

         {/* Map Mode Toggle Switch */}
         {isMapMode && onMapViewModeChange && mapViewMode && (
             <div className="w-full md:w-auto min-w-[200px] shadow-lg rounded-xl">
                 <SegmentedControl
                    value={mapViewMode}
                    onChange={(val) => onMapViewModeChange(val as any)}
                    options={[
                        { value: 'demands', label: 'Demandas', icon: LayoutList },
                        { value: 'citizens', label: 'Cidadãos', icon: Users },
                    ]}
                 />
             </div>
         )}

         {!isMapMode && (
             <div className="flex w-full md:w-auto gap-2">
                 <button 
                    onClick={() => setShowAdvanced(!showAdvanced)}
                    className={`flex-1 md:flex-none flex items-center justify-center gap-2 px-5 py-3 rounded-xl font-bold transition-all border ${
                        showAdvanced || activeFiltersCount > 0
                        ? 'bg-brand-500 text-white border-brand-500 shadow-lg shadow-brand-500/20' 
                        : 'bg-white dark:bg-white/5 text-slate-600 dark:text-white/70 border-slate-200 dark:border-white/10 hover:bg-slate-50 dark:hover:bg-white/10'
                    }`}
                 >
                    <SlidersHorizontal className="w-4 h-4" />
                    <span className="whitespace-nowrap">Filtros</span>
                    {activeFiltersCount > 0 && (
                        <span className="bg-white text-brand-600 text-[10px] w-5 h-5 flex items-center justify-center rounded-full ml-1 shadow-sm">
                            {activeFiltersCount}
                        </span>
                    )}
                 </button>

                 {onExport && (
                    <button onClick={onExport} className="w-[46px] h-[46px] bg-slate-100 dark:bg-white/5 hover:bg-slate-200 dark:hover:bg-white/10 text-slate-600 dark:text-white border border-slate-200 dark:border-white/10 rounded-xl flex items-center justify-center shrink-0 transition-all" title="Exportar Dados">
                        <Download className="w-5 h-5" />
                    </button>
                 )}
             </div>
         )}
         
         {/* Simple Advanced Button for Desktop Map Mode if NOT hidden */}
         {isMapMode && !hideAdvanced && (
             <div className="hidden md:flex">
                 <button 
                    onClick={() => setShowAdvanced(!showAdvanced)}
                    className="w-12 h-12 bg-white dark:bg-slate-800 text-slate-600 dark:text-white rounded-2xl shadow-lg flex items-center justify-center hover:bg-slate-50 transition-transform active:scale-95"
                 >
                    <SlidersHorizontal className="w-5 h-5" />
                 </button>
             </div>
         )}
      </div>

      {/* Active Filters Area (Standard View) */}
      {(!isMapMode || (isMapMode && window.innerWidth >= 768)) && activeFiltersCount > 0 && !hideAdvanced && (
         <div className="flex flex-wrap gap-2 items-center px-1">
             <span className="text-[10px] font-bold uppercase text-slate-400 dark:text-white/40 mr-1 flex items-center gap-1"><Filter className="w-3 h-3" /> Ativos:</span>
             
             {showAllFilters && filters.status.map(s => (<FilterChip key={`status-${s}`} label={`Status: ${s}`} onRemove={() => removeFilter('status', s)} />))}
             {showAllFilters && filters.priority.map(p => (<FilterChip key={`prio-${p}`} label={`Prioridade: ${p}`} onRemove={() => removeFilter('priority', p)} />))}
             {showAllFilters && filters.level.map(l => (<FilterChip key={`lvl-${l}`} label={`Esfera: ${l}`} onRemove={() => removeFilter('level', l)} />))}
             {showAllFilters && filters.tags?.map(t => (<FilterChip key={`tag-${t}`} label={`Tag: ${t}`} onRemove={() => removeFilter('tags', t)} />))}
             {showAllFilters && filters.responsibleId && (<FilterChip label={`Resp: ${getUserName(filters.responsibleId)}`} onRemove={() => removeFilter('responsibleId')} />)}
             
             {filters.startDate && (<FilterChip label={`${dateLabelMap[filters.dateType]}: ${formattedRange}`} onRemove={() => removeFilter('startDate')} />)}

             <button onClick={clearFilters} className="text-[10px] font-bold text-red-500 hover:text-red-600 ml-auto hover:bg-red-50 dark:hover:bg-red-900/20 px-2 py-1 rounded transition-colors flex items-center gap-1"><RotateCcw className="w-3 h-3" /> Limpar</button>
         </div>
      )}

      {/* Advanced Filters Deck */}
      {showAdvanced && (
          <>
            <div className="fixed inset-0 z-10 bg-slate-900/30 backdrop-blur-sm transition-opacity" onClick={() => setShowAdvanced(false)} /> 
            
            <div 
                ref={advancedPanelRef} 
                className={`
                    absolute z-[60] glass-panel rounded-3xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#0f172a] shadow-2xl animate-in slide-in-from-top-2 duration-200 overflow-hidden
                    w-full md:w-[800px] md:right-0 md:left-auto
                    ${isMapMode ? 'top-[70px]' : 'top-[calc(100%+12px)]'}
                `}
            >
             <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-white/10 bg-slate-50/50 dark:bg-white/5">
                 <h3 className="font-bold text-slate-800 dark:text-white flex items-center gap-2 text-sm"><Filter className="w-4 h-4 text-brand-500" /> Filtros Avançados</h3>
                 <button onClick={() => setShowAdvanced(false)} className="p-1.5 hover:bg-slate-200 dark:hover:bg-white/10 rounded-full transition-colors"><X className="w-4 h-4 text-slate-500 dark:text-white/60" /></button>
             </div>

             <div className={`p-6 grid gap-8 max-h-[70vh] overflow-y-auto custom-scrollbar ${showAllFilters ? 'grid-cols-1 md:grid-cols-3' : 'grid-cols-1'}`}>
                 
                 {/* Column 1: Period */}
                 <div className="space-y-4">
                     <label className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-white/40 border-b border-slate-100 dark:border-white/5 pb-2 block">Período</label>
                     <div className="space-y-3">
                        <SegmentedControl 
                            options={['createdAt', 'updatedAt', 'deadline'].map(t => ({ value: t, label: dateLabelMap[t] }))}
                            value={filters.dateType}
                            onChange={(val) => handleChange('dateType', val)}
                            size="sm"
                        />
                        <div className="relative" ref={datePickerRef}>
                            <button onClick={() => setShowDatePicker(!showDatePicker)} className={`w-full flex items-center justify-between px-4 py-3 rounded-xl text-sm font-bold transition-all border ${filters.startDate ? 'bg-brand-50 border-brand-200 text-brand-700 dark:bg-brand-900/20 dark:border-brand-500/30 dark:text-brand-300' : 'bg-slate-50 dark:bg-white/5 border-slate-200 dark:border-white/10 text-slate-600 dark:text-white/70 hover:bg-slate-100'}`}>
                                <span className="flex items-center gap-2"><Calendar className="w-4 h-4 opacity-70" /> {formattedRange}</span>
                            </button>
                            {showDatePicker && (
                                <div className="absolute top-full mt-2 left-0 w-72 bg-white dark:bg-slate-900 rounded-2xl shadow-xl border border-slate-200 dark:border-white/10 p-4 z-50 animate-in fade-in zoom-in-95">
                                    <div className="flex items-center justify-between mb-4">
                                        <button onClick={() => setPickerDate(new Date(pickerDate.getFullYear(), pickerDate.getMonth() - 1, 1))} className="p-1 hover:bg-slate-100 dark:hover:bg-white/10 rounded"><ChevronLeft className="w-4 h-4" /></button>
                                        <span className="font-bold text-sm">{monthNames[pickerDate.getMonth()]} {pickerDate.getFullYear()}</span>
                                        <button onClick={() => setPickerDate(new Date(pickerDate.getFullYear(), pickerDate.getMonth() + 1, 1))} className="p-1 hover:bg-slate-100 dark:hover:bg-white/10 rounded"><ChevronRight className="w-4 h-4" /></button>
                                    </div>
                                    <div className="grid grid-cols-7 gap-1 text-center mb-2">
                                        {['D','S','T','Q','Q','S','S'].map(d => <span key={d} className="text-[10px] font-bold text-slate-400">{d}</span>)}
                                    </div>
                                    <div className="grid grid-cols-7 gap-1">
                                        {Array.from({ length: getFirstDayOfMonth(pickerDate.getFullYear(), pickerDate.getMonth()) }).map((_, i) => <div key={`empty-${i}`} />)}
                                        {Array.from({ length: getDaysInMonth(pickerDate.getFullYear(), pickerDate.getMonth()) }).map((_, i) => {
                                            const day = i + 1;
                                            const status = isSelected(day);
                                            return (
                                                <button key={day} onClick={() => handleDateClick(day)} className={`h-8 w-8 rounded-full text-xs font-medium transition-all ${status === 'start' || status === 'end' ? 'bg-brand-500 text-white shadow-lg' : status === 'range' ? 'bg-brand-100 dark:bg-brand-500/20 text-brand-700 dark:text-brand-300 rounded-none' : 'hover:bg-slate-100 dark:hover:bg-white/10'}`}>{day}</button>
                                            );
                                        })}
                                    </div>
                                </div>
                            )}
                        </div>
                     </div>
                 </div>

                 {/* Columns 2 & 3: Only for Demands */}
                 {showAllFilters && (
                     <>
                        <div className="space-y-4">
                            <label className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-white/40 border-b border-slate-100 dark:border-white/5 pb-2 block">Classificação</label>
                            <div className="space-y-3">
                                <MultiSelect options={statusOptions} selectedValues={filters.status} onChange={(vals) => handleChange('status', vals)} placeholder="Todos Status" label="Status" />
                                <MultiSelect options={priorityOptions} selectedValues={filters.priority} onChange={(vals) => handleChange('priority', vals)} placeholder="Todas Prioridades" label="Prioridade" />
                                <MultiSelect options={levelOptions} selectedValues={filters.level} onChange={(vals) => handleChange('level', vals)} placeholder="Todas Esferas" label="Esfera" />
                            </div>
                        </div>

                        <div className="space-y-4">
                            <label className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-white/40 border-b border-slate-100 dark:border-white/5 pb-2 block">Contexto</label>
                            <div className="space-y-3">
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 dark:text-white/50 uppercase mb-1.5 ml-1">Responsável</label>
                                    <div className="relative">
                                        <User className="w-4 h-4 text-slate-400 absolute left-3 top-3 pointer-events-none" />
                                        <select value={filters.responsibleId || ''} onChange={(e) => handleChange('responsibleId', e.target.value || undefined)} className="w-full pl-9 pr-8 py-2.5 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl text-sm outline-none focus:border-brand-500 font-bold text-slate-700 dark:text-white appearance-none cursor-pointer">
                                            <option value="">Todos os Responsáveis</option>
                                            {users.map((u: any) => <option key={u.id} value={u.id}>{u.nome} ({formatRole(u.perfil)})</option>)}
                                        </select>
                                        <div className="absolute right-3 top-3 pointer-events-none text-slate-400 text-xs">▼</div>
                                    </div>
                                </div>
                                <MultiSelect options={tagOptions} selectedValues={filters.tags || []} onChange={(vals) => handleChange('tags', vals)} placeholder="Filtrar por Tags" label="Etiquetas (Tags)"/>
                            </div>
                        </div>
                     </>
                 )}
             </div>
             
             <div className="px-6 py-4 border-t border-slate-100 dark:border-white/10 bg-slate-50/50 dark:bg-white/5 flex justify-end gap-3">
                <button onClick={clearFilters} className="px-4 py-2 text-xs font-bold text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-xl transition-colors">Limpar Tudo</button>
                <button onClick={() => setShowAdvanced(false)} className="px-6 py-2.5 bg-brand-600 hover:bg-brand-500 text-white rounded-xl font-bold text-sm shadow-lg shadow-brand-500/20 transition-all active:scale-95">Aplicar Filtros</button>
             </div>
          </div>
          </>
      )}
    </div>
  );
};

export default FilterBar;