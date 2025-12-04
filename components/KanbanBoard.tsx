import React, { useMemo, useState } from 'react';
import { Demand, Citizen, DemandStatus, DemandPriority, DemandLevel } from '../types';
import { Clock, Zap, CheckCircle2, Calendar, LayoutList, ChevronDown } from 'lucide-react';
import { formatDate } from '../utils/cpfValidation';
import SegmentedControl from './SegmentedControl';

interface KanbanBoardProps {
  demands: Demand[];
  citizens: Citizen[];
  onViewDemand: (demand: Demand) => void;
  onUpdateStatus: (demandId: string, newStatus: DemandStatus) => void;
}

const KanbanBoard: React.FC<KanbanBoardProps> = ({ demands, citizens, onViewDemand, onUpdateStatus }) => {
  const [draggedDemandId, setDraggedDemandId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<DemandStatus>(DemandStatus.PENDING);
  
  // State to manage pagination per column
  const [visibleCounts, setVisibleCounts] = useState<Record<string, number>>({
      [DemandStatus.PENDING]: 10,
      [DemandStatus.IN_PROGRESS]: 10,
      [DemandStatus.COMPLETED]: 10
  });
  
  const columns = [
    { id: DemandStatus.PENDING, label: 'Pendente', icon: Clock, color: 'text-slate-500', bg: 'bg-slate-100 dark:bg-slate-900/50', border: 'border-slate-300 dark:border-slate-700' },
    { id: DemandStatus.IN_PROGRESS, label: 'Em Andamento', icon: Zap, color: 'text-amber-500', bg: 'bg-amber-50 dark:bg-amber-900/10', border: 'border-amber-300 dark:border-amber-700' },
    { id: DemandStatus.COMPLETED, label: 'Concluído', icon: CheckCircle2, color: 'text-green-500', bg: 'bg-green-50 dark:bg-green-900/10', border: 'border-green-300 dark:border-green-700' },
  ];

  const handleDragStart = (e: React.DragEvent, demandId: string) => {
      setDraggedDemandId(demandId);
      e.dataTransfer.setData('demandId', demandId);
      e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent) => {
      e.preventDefault();
      e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = (e: React.DragEvent, status: DemandStatus) => {
      e.preventDefault();
      const demandId = e.dataTransfer.getData('demandId');
      if (demandId) {
          onUpdateStatus(demandId, status);
      }
      setDraggedDemandId(null);
  };

  const handleLoadMore = (status: string) => {
      setVisibleCounts(prev => ({
          ...prev,
          [status]: (prev[status] || 10) + 10
      }));
  };

  return (
    <div className="flex flex-col h-auto md:h-full animate-in fade-in zoom-in-95 duration-500 pb-24 md:pb-0">
        {/* Mobile Tabs (Portrait Only) */}
        <div className="md:hidden landscape:hidden px-1 pb-3 shrink-0">
            <SegmentedControl 
                value={activeTab}
                onChange={(val) => setActiveTab(val as DemandStatus)}
                options={[
                    { value: DemandStatus.PENDING, label: 'Pendente', icon: Clock },
                    { value: DemandStatus.IN_PROGRESS, label: 'Andamento', icon: Zap },
                    { value: DemandStatus.COMPLETED, label: 'Concluído', icon: CheckCircle2 },
                ]}
            />
        </div>

        <div className="flex-1 md:overflow-x-hidden md:overflow-y-auto md:overflow-visible custom-scrollbar">
            {/* 
                Layout Logic:
                - Default (Mobile Portrait): specific column visibility based on state.
                - Landscape (Mobile Horizontal): Flex Row, All columns visible.
                - Desktop (md): Flex Row, All columns visible.
            */}
            <div className="flex flex-col landscape:flex-row md:flex-row h-auto md:h-full landscape:gap-4 md:gap-6 pb-4">
                {columns.map(col => {
                    const allColDemands = demands.filter(d => d.status === col.id);
                    const limit = visibleCounts[col.id] || 10;
                    const colDemands = allColDemands.slice(0, limit);
                    const hasMore = allColDemands.length > limit;
                    
                    const Icon = col.icon;
                    
                    // Visibility Logic
                    const isVisible = activeTab === col.id;
                    const visibilityClass = isVisible ? 'flex' : 'hidden landscape:flex md:flex';

                    return (
                        <div 
                            key={col.id} 
                            className={`${visibilityClass} flex-1 flex-col min-w-0 md:min-w-[320px] landscape:min-w-[280px] md:max-w-md h-auto md:h-full transition-all duration-300`}
                            onDragOver={handleDragOver}
                            onDrop={(e) => handleDrop(e, col.id)}
                        >
                            {/* Column Header */}
                            {/* Removed 'sticky' for mobile portrait as requested, kept for desktop */}
                            <div className={`p-3 md:p-4 rounded-t-3xl border-x border-t border-slate-200 dark:border-white/10 ${col.bg} backdrop-blur-sm flex justify-between items-center relative md:sticky top-0 z-10 shrink-0`}>
                                <div className="flex items-center gap-2">
                                    <Icon className={`w-5 h-5 ${col.color}`} />
                                    <h3 className="font-bold text-slate-700 dark:text-white text-sm md:text-base">{col.label}</h3>
                                </div>
                                <span className="px-2 py-0.5 rounded-md bg-white dark:bg-white/10 text-xs font-bold text-slate-600 dark:text-white shadow-sm border border-slate-100 dark:border-white/5">
                                    {allColDemands.length}
                                </span>
                            </div>

                            {/* Column Body - Drop Zone */}
                            <div className={`md:flex-1 md:overflow-y-auto p-2 landscape:p-2 md:p-3 space-y-3 border-x border-b border-slate-200 dark:border-white/10 rounded-b-3xl bg-white/30 dark:bg-white/5 scrollbar-thin scrollbar-thumb-slate-300 dark:scrollbar-thumb-white/10 transition-colors h-auto ${draggedDemandId ? 'bg-slate-50/50 dark:bg-white/10' : ''}`}>
                                {colDemands.length === 0 ? (
                                    <div className="h-32 flex flex-col items-center justify-center text-slate-400 dark:text-white/20 border-2 border-dashed border-slate-300 dark:border-white/10 rounded-xl m-2">
                                        <p className="text-sm">Vazio</p>
                                    </div>
                                ) : (
                                    <>
                                        {colDemands.map(demand => {
                                            const citizen = citizens.find(c => c.id === demand.citizenId);
                                            return (
                                                <div 
                                                    key={demand.id}
                                                    draggable
                                                    onDragStart={(e) => handleDragStart(e, demand.id)}
                                                    onClick={() => onViewDemand(demand)}
                                                    className={`
                                                        bg-white dark:bg-[#1e293b] rounded-xl border border-slate-200 dark:border-white/5 shadow-sm 
                                                        hover:shadow-md hover:border-brand-500/50 dark:hover:border-brand-500/50 
                                                        transition-all cursor-pointer group relative overflow-hidden active:cursor-grabbing
                                                        p-3 md:p-4 landscape:p-2.5 
                                                    `}
                                                >
                                                    <div className={`absolute top-0 left-0 w-1 h-full ${
                                                        demand.priority === DemandPriority.HIGH ? 'bg-red-500' : 
                                                        demand.priority === DemandPriority.MEDIUM ? 'bg-amber-500' : 'bg-green-500'
                                                    }`}></div>

                                                    <div className="flex justify-between items-start mb-2 pl-2 landscape:mb-1">
                                                        <span className="text-[10px] text-slate-400 dark:text-white/40 font-mono">#{demand.id.slice(0,6)}</span>
                                                        <div className="flex gap-1">
                                                            {demand.level === DemandLevel.FEDERAL && <span className="w-2 h-2 rounded-full bg-blue-500" title="Federal"></span>}
                                                            {demand.level === DemandLevel.ESTADUAL && <span className="w-2 h-2 rounded-full bg-indigo-500" title="Estadual"></span>}
                                                        </div>
                                                    </div>

                                                    <h4 className="font-bold text-slate-800 dark:text-white text-sm leading-snug mb-2 pl-2 group-hover:text-brand-600 dark:group-hover:text-brand-400 transition-colors landscape:mb-1 landscape:line-clamp-2">
                                                        {demand.title}
                                                    </h4>

                                                    {/* Hidden on Landscape for simpler view */}
                                                    <div className="flex items-center gap-2 pl-2 mb-3 landscape:mb-1">
                                                        <div className="w-5 h-5 rounded-full bg-slate-100 dark:bg-white/10 flex items-center justify-center text-[10px] font-bold text-slate-600 dark:text-white border border-slate-200 dark:border-white/10 shrink-0">
                                                            {citizen?.name.charAt(0) || '?'}
                                                        </div>
                                                        <span className="text-xs text-slate-500 dark:text-white/50 truncate max-w-[120px] landscape:hidden">
                                                            {citizen?.name || 'Não identificado'}
                                                        </span>
                                                    </div>

                                                    {/* Hidden on Landscape */}
                                                    <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-white/5 pl-2 landscape:hidden">
                                                        <span className="flex items-center gap-1 text-[10px] text-slate-400 dark:text-white/40">
                                                            <Calendar className="w-3 h-3" /> {new Date(demand.createdAt).toLocaleDateString(undefined, {day: '2-digit', month: '2-digit'})}
                                                        </span>
                                                        {demand.deadline && (
                                                            <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${new Date(demand.deadline) < new Date() ? 'bg-red-100 text-red-600' : 'bg-slate-100 text-slate-500'} dark:bg-white/10 dark:text-white/60`}>
                                                                {formatDate(demand.deadline)}
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>
                                            );
                                        })}
                                        
                                        {/* Load More Button */}
                                        {hasMore && (
                                            <button 
                                                onClick={() => handleLoadMore(col.id)}
                                                className="w-full py-2.5 mt-2 bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl text-xs font-bold text-slate-500 dark:text-white/60 hover:bg-slate-50 dark:hover:bg-white/10 hover:text-brand-600 transition-all flex items-center justify-center gap-1"
                                            >
                                                Carregar mais <ChevronDown className="w-3 h-3" />
                                            </button>
                                        )}
                                    </>
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    </div>
  );
};

export default KanbanBoard;