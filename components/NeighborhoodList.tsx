
import React, { useState, useMemo } from 'react';
import { Search, ChevronDown, ChevronRight, MapPin, Layers, Users } from 'lucide-react';

interface NeighborhoodListProps {
  items: any[]; // Demands or Citizens
  type: 'demands' | 'citizens';
  onSelect: (item: any) => void;
  onFilterNeighborhood: (neighborhood: string | null) => void;
  selectedNeighborhood: string | null;
}

const NeighborhoodList: React.FC<NeighborhoodListProps> = ({ items, type, onSelect, onFilterNeighborhood, selectedNeighborhood }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedNeighborhoods, setExpandedNeighborhoods] = useState<Record<string, boolean>>({});

  // Group items by neighborhood
  const groupedItems = useMemo(() => {
    const groups: Record<string, any[]> = {};
    let totalItems = 0;

    items.forEach(item => {
      const bairro = item.bairro || 'Sem Bairro';
      
      // Basic Search Filter inside groups
      if (searchTerm) {
          const searchLower = searchTerm.toLowerCase();
          const matchTitle = item.title && item.title.toLowerCase().includes(searchLower);
          const matchName = item.name && item.name.toLowerCase().includes(searchLower);
          const matchBairro = bairro.toLowerCase().includes(searchLower);
          
          if (!matchTitle && !matchName && !matchBairro) return;
      }

      if (!groups[bairro]) groups[bairro] = [];
      groups[bairro].push(item);
      totalItems++;
    });

    // Sort neighborhoods alphabetically
    return Object.keys(groups).sort().reduce((acc, key) => {
        acc[key] = groups[key];
        return acc;
    }, {} as Record<string, any[]>);
  }, [items, searchTerm]);

  const totalCount = items.length;
  const filteredCount = Object.values(groupedItems).reduce((acc, curr) => acc + curr.length, 0);

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

  return (
    <div className="flex flex-col h-full bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border-r border-slate-200 dark:border-white/10 w-full md:w-80 shadow-xl z-30">
        {/* Header */}
        <div className="p-4 border-b border-slate-200 dark:border-white/10 shrink-0">
            <h3 className="text-sm font-bold uppercase tracking-wider text-slate-500 dark:text-white/60 mb-3 flex items-center gap-2">
                <MapPin className="w-4 h-4" /> Bairros e Locais
            </h3>
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

        {/* List */}
        <div className="flex-1 overflow-y-auto custom-scrollbar p-2 space-y-1">
            {Object.keys(groupedItems).length === 0 ? (
                <div className="p-8 text-center text-slate-400 dark:text-white/30 text-sm italic">
                    Nenhum registro encontrado nesta região.
                </div>
            ) : (
                Object.entries(groupedItems).map(([bairro, groupItems]) => {
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
                                    {groupItems.map(item => (
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
