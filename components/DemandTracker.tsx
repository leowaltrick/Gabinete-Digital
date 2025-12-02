
import React, { useState, useEffect, useMemo } from 'react';
import { Demand, Citizen, DemandStatus, DemandPriority } from '../types';
import { CheckCircle2, Clock, Zap, ArrowRight, Search, ArrowUpDown, ArrowUp, ArrowDown, ExternalLink, ChevronDown, Calendar, MapPin, User } from 'lucide-react';
import { formatDate } from '../utils/cpfValidation';
import Pagination from './Pagination';

interface DemandTrackerProps {
  demands: Demand[];
  citizens: Citizen[];
  onUpdateStatus: (demandId: string, newStatus: DemandStatus) => void;
  onEdit: (demand: Demand) => void;
  onViewDemand: (demand: Demand) => void; // New prop to trigger parent modal
  initialSelectionId?: string | null;
  clearSelection?: () => void;
  onInteractionUpdate?: () => void;
  onNotification?: (type: 'success' | 'error', message: string) => void;
  onViewCitizen?: (citizenId: string) => void;
}

type SortField = 'createdAt' | 'deadline' | 'priority' | 'status';
type SortDirection = 'asc' | 'desc';

// Reusable Status Selector (Same as before)
const StatusSelector = React.memo(({ demand, onUpdateStatus }: { demand: Demand, onUpdateStatus: (id: string, s: DemandStatus) => void }) => {
    const handleStatusChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        onUpdateStatus(demand.id, e.target.value as DemandStatus);
    };
    const stopProp = (e: React.MouseEvent) => e.stopPropagation();
    const getStyle = (s: DemandStatus) => {
        switch(s) {
            case DemandStatus.COMPLETED: return 'bg-green-50 text-green-700 border-green-200 dark:bg-green-500/10 dark:text-green-400 dark:border-green-500/20';
            case DemandStatus.IN_PROGRESS: return 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-500/10 dark:text-amber-400 dark:border-amber-500/20';
            default: return 'bg-slate-100 text-slate-600 border-slate-200 dark:bg-white/5 dark:text-slate-400 dark:border-white/10';
        }
    };
    return (
        <div className="relative inline-block group/status" onClick={stopProp}>
            <div className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border transition-colors shadow-sm ${getStyle(demand.status)}`}>
                {demand.status === DemandStatus.COMPLETED && <CheckCircle2 className="w-3.5 h-3.5" />}
                {demand.status === DemandStatus.IN_PROGRESS && <Zap className="w-3.5 h-3.5" />}
                {demand.status === DemandStatus.PENDING && <Clock className="w-3.5 h-3.5" />}
                <span className="text-xs font-bold whitespace-nowrap">{demand.status}</span>
                <div className="ml-1 pl-1 border-l border-current/20 opacity-50"><ChevronDown className="w-3 h-3" /></div>
            </div>
            <select value={demand.status} onChange={handleStatusChange} onClick={stopProp} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer font-bold text-sm appearance-none">
                {Object.values(DemandStatus).map(s => <option key={s} value={s}>{s}</option>)}
            </select>
        </div>
    );
});

const DemandTracker: React.FC<DemandTrackerProps> = ({ demands, citizens, onUpdateStatus, onEdit, onViewDemand, initialSelectionId, clearSelection, onInteractionUpdate, onNotification, onViewCitizen }) => {
  const [sortField, setSortField] = useState<SortField>('createdAt');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  const handleSort = (field: SortField) => {
    if (sortField === field) setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
    else { setSortField(field); setSortDirection('desc'); }
  };

  const getSortIcon = (field: SortField) => {
    if (sortField !== field) return <ArrowUpDown className="w-3 h-3 text-slate-300" />;
    return sortDirection === 'asc' ? <ArrowUp className="w-3 h-3 text-brand-600" /> : <ArrowDown className="w-3 h-3 text-brand-600" />;
  };

  const sortedDemands = useMemo(() => {
    return [...demands].sort((a, b) => {
      let comparison = 0;
      switch (sortField) {
        case 'createdAt': comparison = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(); break;
        case 'deadline':
          const dateA = a.deadline ? new Date(a.deadline).getTime() : 0;
          const dateB = b.deadline ? new Date(b.deadline).getTime() : 0;
          comparison = dateA - dateB; break;
        case 'priority':
          const priorityWeight = { [DemandPriority.LOW]: 1, [DemandPriority.MEDIUM]: 2, [DemandPriority.HIGH]: 3 };
          comparison = priorityWeight[a.priority] - priorityWeight[b.priority]; break;
        case 'status':
           const statusWeight = { [DemandStatus.PENDING]: 1, [DemandStatus.IN_PROGRESS]: 2, [DemandStatus.COMPLETED]: 3 };
           comparison = statusWeight[a.status] - statusWeight[b.status]; break;
        default: comparison = 0;
      }
      return sortDirection === 'asc' ? comparison : -comparison;
    });
  }, [demands, sortField, sortDirection]);

  useEffect(() => { setCurrentPage(1); }, [demands]);
  
  // NOTE: initialSelectionId is now handled by parent (DemandsView) which sets its own state to show modal.
  // We can ignore it here or use it to highlight the row.

  const totalPages = Math.ceil(sortedDemands.length / itemsPerPage);
  const currentDemands = sortedDemands.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  const getPriorityBadge = (priority: DemandPriority) => {
    switch (priority) {
      case DemandPriority.HIGH: return <span className="px-1.5 py-0.5 rounded text-[9px] font-bold uppercase bg-red-100 text-red-600 dark:bg-red-500/10 dark:text-red-300 border border-red-200 dark:border-red-500/20">Alta</span>;
      case DemandPriority.MEDIUM: return <span className="px-1.5 py-0.5 rounded text-[9px] font-bold uppercase bg-amber-100 text-amber-600 dark:bg-amber-500/10 dark:text-amber-300 border border-amber-200 dark:border-amber-500/20">Média</span>;
      case DemandPriority.LOW: return <span className="px-1.5 py-0.5 rounded text-[9px] font-bold uppercase bg-green-100 text-green-600 dark:bg-green-500/10 dark:text-green-300 border border-green-200 dark:border-green-500/20">Baixa</span>;
    }
  };

  return (
    <div className="flex flex-col w-full gap-2 relative">
      <div className="glass-panel rounded-3xl border border-slate-200 dark:border-white/10 bg-white/50 dark:bg-slate-900/50 shadow-sm relative w-full flex flex-col min-h-0">
          {sortedDemands.length === 0 ? (
               <div className="flex flex-col items-center justify-center text-slate-400 dark:text-white/30 text-sm py-20">
                   <div className="w-16 h-16 bg-slate-100 dark:bg-white/5 rounded-full flex items-center justify-center mb-4"><Search className="w-6 h-6 opacity-30" /></div>
                   <p>Nenhuma demanda encontrada.</p>
               </div>
          ) : (
               <>
                    <div className="w-full relative">
                        {/* Desktop Table */}
                        <table className="w-full text-left border-collapse hidden md:table">
                            <thead className="bg-slate-50/90 dark:bg-slate-900/90 backdrop-blur-sm border-b border-slate-200 dark:border-white/10">
                                <tr className="text-xs font-bold text-slate-500 dark:text-blue-200/50 uppercase tracking-wider">
                                    <th className="p-4 first:pl-6 w-[35%] min-w-[200px]">Título</th>
                                    <th className="p-4 w-[20%] min-w-[150px]">Solicitante</th>
                                    <th className="p-4 cursor-pointer hover:bg-slate-100 dark:hover:bg-white/5 transition-colors select-none" onClick={() => handleSort('status')}><div className="flex items-center gap-2">Status {getSortIcon('status')}</div></th>
                                    <th className="p-4 cursor-pointer hover:bg-slate-100 dark:hover:bg-white/5 transition-colors select-none" onClick={() => handleSort('priority')}><div className="flex items-center gap-2">Prioridade {getSortIcon('priority')}</div></th>
                                    <th className="p-4 hidden lg:table-cell cursor-pointer" onClick={() => handleSort('createdAt')}><div className="flex items-center gap-2">Criação {getSortIcon('createdAt')}</div></th>
                                    <th className="p-4 hidden xl:table-cell cursor-pointer" onClick={() => handleSort('deadline')}><div className="flex items-center gap-2">Prazo {getSortIcon('deadline')}</div></th>
                                    <th className="p-4 text-right last:pr-6 w-[80px]">Ação</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-200 dark:divide-white/5 text-sm">
                                {currentDemands.map(d => {
                                    const citizen = citizens.find(c => c.id === d.citizenId);
                                    return (
                                            <tr key={d.id} onClick={() => onViewDemand(d)} className="hover:bg-white/60 dark:hover:bg-white/5 transition-colors cursor-pointer group">
                                                <td className="p-4 first:pl-6">
                                                    <div className="font-bold text-slate-900 dark:text-white truncate max-w-[250px]" title={d.title}>{d.title}</div>
                                                    <div className="text-xs text-slate-500 dark:text-white/50 truncate mt-0.5 max-w-[250px]">{d.description}</div>
                                                </td>
                                                <td className="p-4">
                                                    {citizen ? (
                                                        <div className="flex items-center gap-3 cursor-pointer group/citizen p-1 -ml-1 rounded-lg hover:bg-brand-50 dark:hover:bg-white/10 transition-colors" onClick={(e) => { e.stopPropagation(); if(onViewCitizen) onViewCitizen(citizen.id); }}>
                                                            <div className="w-8 h-8 rounded-full bg-slate-100 dark:bg-white/10 flex items-center justify-center text-slate-600 dark:text-white font-bold text-xs border border-slate-200 dark:border-white/10 shrink-0">{citizen.name.charAt(0)}</div>
                                                            <div className="min-w-0"><div className="font-medium text-slate-900 dark:text-white truncate max-w-[150px] group-hover/citizen:text-brand-600 transition-colors">{citizen.name}</div></div>
                                                        </div>
                                                    ) : <span className="text-xs text-slate-400 italic">Não vinculado</span>}
                                                </td>
                                                <td className="p-4 whitespace-nowrap"><StatusSelector demand={d} onUpdateStatus={onUpdateStatus} /></td>
                                                <td className="p-4 whitespace-nowrap">{getPriorityBadge(d.priority)}</td>
                                                <td className="p-4 hidden lg:table-cell text-slate-500 dark:text-white/50 font-mono text-xs whitespace-nowrap">{new Date(d.createdAt).toLocaleDateString()}</td>
                                                <td className="p-4 hidden xl:table-cell text-slate-500 dark:text-white/50 font-mono text-xs whitespace-nowrap">{d.deadline ? formatDate(d.deadline) : '-'}</td>
                                                <td className="p-4 text-right last:pr-6"><div className="p-2 text-slate-400 group-hover:text-brand-600 transition-colors inline-flex bg-slate-100 dark:bg-white/5 rounded-lg group-hover:bg-brand-50 dark:group-hover:bg-brand-500/10"><ArrowRight className="w-4 h-4" /></div></td>
                                            </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                        
                        {/* Mobile Cards - Instagram/Bento Style */}
                         <div className="md:hidden space-y-3 p-3">
                            {currentDemands.map(d => {
                                const citizen = citizens.find(c => c.id === d.citizenId);
                                return (
                                    <div key={d.id} onClick={() => onViewDemand(d)} className="glass-panel p-4 rounded-2xl border border-slate-200 dark:border-white/10 shadow-sm active:scale-[0.98] transition-all cursor-pointer relative overflow-hidden group">
                                        <div className={`absolute top-0 left-0 w-1 h-full ${d.priority === DemandPriority.HIGH ? 'bg-red-500' : d.priority === DemandPriority.MEDIUM ? 'bg-amber-500' : 'bg-green-500'}`}></div>
                                        <div className="flex justify-between items-start mb-2 pl-3">
                                            <div className="flex items-center gap-2">
                                                <div className="w-8 h-8 rounded-full bg-slate-100 dark:bg-white/10 flex items-center justify-center text-xs font-bold text-slate-600 dark:text-white border border-slate-200 dark:border-white/10 shrink-0">
                                                    {citizen ? citizen.name.charAt(0) : '?'}
                                                </div>
                                                <div className="min-w-0">
                                                    <p className="text-xs font-bold text-slate-900 dark:text-white truncate">{citizen ? citizen.name.split(' ')[0] : 'S/ Solicitante'}</p>
                                                    <p className="text-[10px] text-slate-500 dark:text-white/50">{new Date(d.createdAt).toLocaleDateString()}</p>
                                                </div>
                                            </div>
                                            <div className={`px-2 py-1 rounded text-[10px] font-bold uppercase border ${d.status === DemandStatus.COMPLETED ? 'bg-green-50 text-green-700 border-green-200' : 'bg-slate-50 text-slate-600 border-slate-200'}`}>
                                                {d.status}
                                            </div>
                                        </div>
                                        <div className="pl-3">
                                            <h4 className="font-bold text-sm text-slate-800 dark:text-white mb-1 leading-snug">{d.title}</h4>
                                            <p className="text-xs text-slate-500 dark:text-white/60 line-clamp-2 mb-3">{d.description}</p>
                                            <div className="flex items-center justify-between border-t border-slate-100 dark:border-white/5 pt-2">
                                                <span className="flex items-center gap-1 text-[10px] text-slate-400 font-bold uppercase"><MapPin className="w-3 h-3" /> {d.level}</span>
                                                <div className="flex items-center gap-1 text-brand-600 text-xs font-bold">Detalhes <ArrowRight className="w-3 h-3" /></div>
                                            </div>
                                        </div>
                                    </div>
                                )
                            })}
                        </div>
                    </div>
                    <div className="bg-slate-50/50 dark:bg-slate-900/50 border-t border-slate-200 dark:border-white/5 rounded-b-3xl">
                          <Pagination currentPage={currentPage} totalPages={totalPages} onPageChange={setCurrentPage} totalItems={sortedDemands.length} itemsPerPage={itemsPerPage} />
                    </div>
               </>
          )}
      </div>
    </div>
  );
};

export default DemandTracker;
