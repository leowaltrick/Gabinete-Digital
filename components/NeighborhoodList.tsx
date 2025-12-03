import React, { useState, useMemo } from 'react';
import { Search, ChevronDown, ChevronRight, MapPin, Filter, CheckCircle2, Clock, Zap, AlertCircle, RotateCcw, User, Tag, Check, X } from 'lucide-react';
import { FilterState, DemandStatus, DemandPriority } from '../types';

interface NeighborhoodListProps {
  items: any[]; // Demands or Citizens
  type: 'demands' | 'citizens';
  onSelect: (item: any) => void;
  onFilterNeighborhood: (neighborhood: string | null) => void;
  selectedNeighborhood: string | null;
  filters?: FilterState;
  setFilters?: React.Dispatch<React.SetStateAction<FilterState>>;
  users?: any[];
  availableTags?: string[];
  onClose?: () => void;
}

const NeighborhoodList: React.FC<NeighborhoodListProps> = ({ 
    items, 
    type, 
    onSelect, 
    onFilterNeighborhood, 
    selectedNeighborhood,
    filters,
    setFilters,
    users = [],
    availableTags = [],
    onClose
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedNeighborhoods, setExpandedNeighborhoods] = useState<Record<string, boolean>>({});
  const [showFilters, setShowFilters] = useState(false);

  // Group items by neighborhood
  const groupedItems = useMemo(() => {
    const groups: Record<string, any[]> = {};

    items.forEach(item => {
      const bairro = item.bairro || 'Sem Bairro';
      
      // Basic Search Filter inside groups
      if (searchTerm) {
          const searchLower = searchTerm.toLowerCase();
          const matchTitle = item.title && item.title.toLowerCase().includes(searchLower);
          const matchName = item.name && item.name.toLowerCase().includes(searchLower);
          const matchBairro = bairro.toLowerCase().includes(searchLower);
          const matchId = item.id && item.id.toLowerCase().includes(searchLower);
          
          if (!matchTitle && !matchName && !matchBairro && !matchId) return;
      }

      if (!groups[bairro]) groups[bairro] = [];
      groups[bairro].push(item);
    });

    // Sort neighborhoods alphabetically
    return Object.keys(groups).sort().reduce((acc, key) => {
        acc[key] = groups[key];
        return acc;
    }, {} as Record<string, any[]>);
  }, [items, searchTerm]);

  const totalCount = items.length;
  const filteredCount = Object.values(groupedItems).reduce((acc, curr: any) => acc + curr.length, 0);

  const toggleGroup = (bairro: string) => {
    setExpandedNeighborhoods(prev => ({ ...prev, [bairro]: !prev[bairro] }));
  };

  const handleGroupClick = (bairro: string, e: React.MouseEvent) => {
      e.stopPropagation();
      if (selectedNeighborhood === bairro) {
          onFilterNeighborhood(null); // Deselect
      } else {
          onFilterNeighborhood(bairro);
          // Auto expand on select
          setExpandedNeighborhoods(prev => ({ ...prev, [bairro]: true }));
      }
  };

  // --- Sidebar Filter Handlers ---
  const handleToggleStatus = (status: DemandStatus) => {
      if (!setFilters || !filters) return;
      const current = filters.status || [];
      const updated = current.includes(status) ? current.filter(s => s !== status) : [...current, status];
      setFilters(prev => ({ ...prev, status: updated }));
  };

  const handleTogglePriority = (priority: DemandPriority) => {
      if (!setFilters || !filters) return;
      const current = filters.priority || [];
      const updated = current.includes(priority) ? current.filter(p => p !== priority) : [...current, priority];
      setFilters(prev => ({ ...prev, priority: updated }));
  };

  const handleSetPeriod = (days: number | 'all') => {
      if (!setFilters || !filters) return;
      if (days === 'all') {
          setFilters(prev => ({ ...prev, startDate: '', endDate: '' }));
      } else {
          const end = new Date();
          const start = new Date();
          start.setDate(end.getDate() - days);
          setFilters(prev => ({ 
              ...prev, 
              startDate: start.toLocaleDateString('en-CA'), 
              endDate: end.toLocaleDateString('en-CA') 
          }));
      }
  };

  const handleResponsibleChange = (id: string) => {
      if (!setFilters) return;
      setFilters(prev => ({ ...prev, responsibleId: id || undefined }));
  };

  const handleToggleTag = (tag: string) => {
      if (!setFilters || !filters) return;
      const current = filters.tags || [];
      const updated = current.includes(tag) ? current.filter(t => t !== tag) : [...current, tag];
      setFilters(prev => ({ ...prev, tags: updated }));
  };

  const clearSidebarFilters = () => {
      if (!setFilters) return;
      setFilters(prev => ({ ...prev, status: [], priority: [], startDate: '', endDate: '', responsibleId: undefined, tags: [] }));
  };

  const FilterToggle = ({ active, onClick, icon: Icon, label, colorClass }: any) => (
      <button 
        onClick={onClick}
        className={`
            flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[10px] font-bold border transition-all
            ${active 
                ? `${colorClass} shadow-sm scale-[1.02]` 
                : 'bg-white dark:bg-white/5 border-slate-200 dark:border-white/10 text-slate-500 dark:text-white/60 hover:bg-slate-50 dark:hover:bg-white/10'}
        `}
      >
          {Icon && <Icon className="w-3 h-3" />}
          {label}
          {active && <Check className="w-3 h-3 ml-0.5" />}
      </button>
  );

  const activeFiltersCount = filters ? 
      (filters.status?.length || 0) + 
      (filters.priority?.length || 0) + 
      (filters.tags?.length || 0) + 
      (filters.startDate ? 1 : 0) +
      (filters.responsibleId ? 1 : 0)
      : 0;

  return (
    <div className="flex flex-col h-full bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border-r border-slate-200 dark:border-white/10 w-full md:w-80 shadow-xl z-30">
        
        {/* Header & Local Search */}
        <div className="p-4 border-b border-slate-200 dark:border-white/10 shrink-0 space-y-3">
            <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold uppercase tracking-wider text-slate-500 dark:text-white/60 flex items-center gap-2">
                    <MapPin className="w-4 h-4 text-brand-500" /> Bairros e Locais
                </h3>
                {onClose && (
                    <button onClick={onClose} className="md:hidden p-1.5 bg-slate-100 dark:bg-white/10 rounded-full text-slate-500 dark:text-white transition-colors">
                        <X className="w-4 h-4" />
                    </button>
                )}
            </div>
            
            <div className="relative group">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3 group-focus-within:text-brand-500 transition-colors" />
                <input 
                    type="text" 
                    value={searchTerm} 
                    onChange={(e) => setSearchTerm(e.target.value)} 
                    placeholder={type === 'demands' ? "Buscar demandas..." : "Buscar cidadãos..."}
                    className="w-full pl-9 pr-4 py-2.5 bg-slate-100 dark:bg-white/5 border border-transparent focus:border-brand-500 dark:focus:border-brand-500/50 rounded-xl outline-none text-sm font-medium transition-all text-slate-900 dark:text-white placeholder:text-slate-400"
                />
            </div>
        </div>

        {/* Integrated Filter Control Center */}
        {type === 'demands' && filters && setFilters && (
            <div className="border-b border-slate-200 dark:border-white/10 shrink-0 bg-slate-50/50 dark:bg-black/20 flex flex-col max-h-[50vh]">
                <button 
                    onClick={() => setShowFilters(!showFilters)}
                    className={`w-full flex items-center justify-between px-4 py-3 text-xs font-bold transition-colors ${showFilters ? 'text-brand-600 dark:text-white bg-slate-100 dark:bg-white/5' : 'text-slate-500 dark:text-white/60 hover:text-slate-800 dark:hover:text-white'}`}
                >
                    <span className="flex items-center gap-2">
                        <Filter className="w-3.5 h-3.5" /> 
                        Filtros Avançados
                        {activeFiltersCount > 0 && <span className="bg-brand-500 text-white px-1.5 min-w-[1.25rem] text-center rounded-full text-[9px]">{activeFiltersCount}</span>}
                    </span>
                    {showFilters ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
                </button>

                {showFilters && (
                    <div className="px-4 pb-4 space-y-4 animate-in slide-in-from-top-2 overflow-y-auto custom-scrollbar">
                        {/* Period Group */}
                        <div className="space-y-1.5">
                            <div className="flex justify-between items-center">
                                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wide ml-1">Período</label>
                                {activeFiltersCount > 0 && <button onClick={clearSidebarFilters} className="text-[9px] text-red-500 hover:text-red-600 font-bold flex items-center gap-1"><RotateCcw className="w-2.5 h-2.5" /> Limpar</button>}
                            </div>
                            <div className="flex bg-white dark:bg-white/5 rounded-lg border border-slate-200 dark:border-white/10 p-0.5">
                                {[
                                    { label: '7d', val: 7 }, 
                                    { label: '30d', val: 30 }, 
                                    { label: '90d', val: 90 }, 
                                    { label: 'Tudo', val: 'all' }
                                ].map((opt) => {
                                    const isActive = opt.val === 'all' 
                                        ? !filters.startDate 
                                        : filters.startDate && new Date(filters.startDate).getDate() === new Date(new Date().setDate(new Date().getDate() - (opt.val as number))).getDate();
                                    
                                    return (
                                        <button 
                                            key={opt.label}
                                            onClick={() => handleSetPeriod(opt.val as any)}
                                            className={`flex-1 py-1 text-[10px] font-bold rounded-md transition-all ${isActive ? 'bg-brand-100 text-brand-700 dark:bg-brand-500/20 dark:text-brand-300' : 'text-slate-500 dark:text-white/50 hover:bg-slate-50 dark:hover:bg-white/5'}`}
                                        >
                                            {opt.label}
                                        </button>
                                    )
                                })}
                            </div>
                        </div>

                        {/* Status Group */}
                        <div className="space-y-1.5">
                            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wide ml-1">Status</label>
                            <div className="flex flex-wrap gap-2">
                                <FilterToggle label="Pend" icon={Clock} active={filters.status.includes(DemandStatus.PENDING)} onClick={() => handleToggleStatus(DemandStatus.PENDING)} colorClass="bg-slate-100 border-slate-300 text-slate-700 dark:bg-white/10 dark:text-white" />
                                <FilterToggle label="Andamento" icon={Zap} active={filters.status.includes(DemandStatus.IN_PROGRESS)} onClick={() => handleToggleStatus(DemandStatus.IN_PROGRESS)} colorClass="bg-amber-100 border-amber-300 text-amber-700 dark:bg-amber-500/20 dark:text-amber-300 dark:border-amber-500/30" />
                                <FilterToggle label="Fim" icon={CheckCircle2} active={filters.status.includes(DemandStatus.COMPLETED)} onClick={() => handleToggleStatus(DemandStatus.COMPLETED)} colorClass="bg-green-100 border-green-300 text-green-700 dark:bg-green-500/20 dark:text-green-300 dark:border-green-500/30" />
                            </div>
                        </div>

                        {/* Priority Group */}
                        <div className="space-y-1.5">
                            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wide ml-1">Prioridade</label>
                            <div className="flex flex-wrap gap-2">
                                <FilterToggle label="Alta" icon={AlertCircle} active={filters.priority.includes(DemandPriority.HIGH)} onClick={() => handleTogglePriority(DemandPriority.HIGH)} colorClass="bg-red-100 border-red-300 text-red-700 dark:bg-red-500/20 dark:text-red-300 dark:border-red-500/30" />
                                <FilterToggle label="Média" active={filters.priority.includes(DemandPriority.MEDIUM)} onClick={() => handleTogglePriority(DemandPriority.MEDIUM)} colorClass="bg-amber-100 border-amber-300 text-amber-700 dark:bg-amber-500/20 dark:text-amber-300 dark:border-amber-500/30" />
                                <FilterToggle label="Baixa" active={filters.priority.includes(DemandPriority.LOW)} onClick={() => handleTogglePriority(DemandPriority.LOW)} colorClass="bg-green-100 border-green-300 text-green-700 dark:bg-green-500/20 dark:text-green-300 dark:border-green-500/30" />
                            </div>
                        </div>

                        {/* Responsible Group */}
                        <div className="space-y-1.5">
                            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wide ml-1">Responsável</label>
                            <div className="relative">
                                <User className="w-3 h-3 text-slate-400 absolute left-2.5 top-2.5 pointer-events-none" />
                                <select 
                                    value={filters.responsibleId || ''} 
                                    onChange={(e) => handleResponsibleChange(e.target.value)} 
                                    className="w-full pl-7 pr-8 py-1.5 bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-lg text-xs font-bold text-slate-700 dark:text-white outline-none focus:border-brand-500 appearance-none"
                                >
                                    <option value="">Todos</option>
                                    {users.map((u: any) => <option key={u.id} value={u.id}>{u.nome}</option>)}
                                </select>
                                <ChevronDown className="w-3 h-3 text-slate-400 absolute right-2.5 top-2.5 pointer-events-none" />
                            </div>
                        </div>

                        {/* Tags Group */}
                        {availableTags.length > 0 && (
                            <div className="space-y-1.5">
                                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wide ml-1">Etiquetas</label>
                                <div className="flex flex-wrap gap-1.5 max-h-[100px] overflow-y-auto custom-scrollbar p-1">
                                    {availableTags.map(tag => {
                                        const isActive = filters.tags?.includes(tag);
                                        return (
                                            <button 
                                                key={tag} 
                                                onClick={() => handleToggleTag(tag)}
                                                className={`px-2 py-1 rounded text-[10px] font-bold border transition-all flex items-center gap-1 ${isActive ? 'bg-brand-100 border-brand-200 text-brand-700 dark:bg-brand-500/20 dark:border-brand-500/30 dark:text-brand-300' : 'bg-white border-slate-200 text-slate-500 dark:bg-white/5 dark:border-white/10 dark:text-white/50 hover:bg-slate-50'}`}
                                            >
                                                <Tag className="w-2.5 h-2.5" />
                                                {tag}
                                            </button>
                                        )
                                    })}
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </div>
        )}

        {/* List */}
        <div className="flex-1 overflow-y-auto custom-scrollbar p-2 space-y-1">
            {Object.keys(groupedItems).length === 0 ? (
                <div className="p-8 text-center text-slate-400 dark:text-white/30 text-sm italic">
                    Nenhum registro encontrado nesta região com os filtros atuais.
                </div>
            ) : (
                Object.entries(groupedItems).map(([bairro, groupItems]: [string, any]) => {
                    const isSelected = selectedNeighborhood === bairro;
                    const isExpanded = expandedNeighborhoods[bairro];

                    return (
                        <div key={bairro} className="rounded-xl overflow-hidden transition-all duration-300 border border-transparent">
                            <div 
                                onClick={(e) => handleGroupClick(bairro, e)}
                                className={`
                                    flex items-center justify-between p-3 cursor-pointer transition-colors
                                    ${isSelected ? 'bg-brand-50 dark:bg-brand-900/20 border-brand-200 dark:border-brand-500/20' : 'hover:bg-slate-50 dark:hover:bg-white/5'}
                                `}
                            >
                                <div className="flex items-center gap-3 min-w-0">
                                    <div 
                                        onClick={(e) => { e.stopPropagation(); toggleGroup(bairro); }}
                                        className="p-1 hover:bg-slate-200 dark:hover:bg-white/10 rounded transition-colors"
                                    >
                                        {isExpanded ? <ChevronDown className="w-4 h-4 text-slate-400" /> : <ChevronRight className="w-4 h-4 text-slate-400" />}
                                    </div>
                                    <span className={`text-sm font-bold truncate ${isSelected ? 'text-brand-700 dark:text-brand-300' : 'text-slate-700 dark:text-white'}`}>
                                        {bairro}
                                    </span>
                                </div>
                                <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${isSelected ? 'bg-brand-200 text-brand-800 dark:bg-brand-500/40 dark:text-white' : 'bg-slate-100 text-slate-500 dark:bg-white/10 dark:text-white/50'}`}>
                                    {groupItems.length}
                                </span>
                            </div>

                            {/* Expanded Items */}
                            {isExpanded && (
                                <div className="bg-slate-50/50 dark:bg-black/20 border-t border-slate-100 dark:border-white/5">
                                    {groupItems.map((item: any) => (
                                        <div 
                                            key={item.id} 
                                            onClick={() => onSelect(item)}
                                            className="p-3 pl-10 hover:bg-white dark:hover:bg-white/5 cursor-pointer transition-colors border-b border-slate-100 dark:border-white/5 last:border-0 group"
                                        >
                                            <p className="text-xs font-bold text-slate-700 dark:text-white truncate group-hover:text-brand-600 transition-colors">
                                                {type === 'demands' ? item.title : item.name}
                                            </p>
                                            <div className="flex items-center gap-2 mt-1">
                                                {type === 'demands' && (
                                                    <span className={`w-2 h-2 rounded-full ${item.priority === 'Alta' ? 'bg-red-500' : item.priority === 'Média' ? 'bg-amber-500' : 'bg-green-500'}`} />
                                                )}
                                                <span className="text-[10px] text-slate-400 dark:text-white/40 truncate">
                                                    {type === 'demands' ? item.status : item.phone || 'Sem telefone'}
                                                </span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    );
                })
            )}
        </div>

        {/* Footer Totals */}
        <div className="p-4 border-t border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/5 shrink-0 flex justify-between items-center text-xs font-medium text-slate-500 dark:text-white/50">
            <span>Total Visível: <strong className="text-slate-900 dark:text-white">{filteredCount}</strong></span>
            <span>Total Geral: <strong>{totalCount}</strong></span>
        </div>
    </div>
  );
};

export default NeighborhoodList;