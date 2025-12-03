import React, { useState } from 'react';
import { ChevronLeft, ChevronRight, Clock, Calendar as CalendarIcon, AlertCircle, CheckSquare, Megaphone, Info, AlertTriangle } from 'lucide-react';
import { Demand, DemandPriority, DemandStatus, DemandInteraction, Notice } from '../types';

interface CalendarPageProps {
  demands: Demand[];
  interactions?: DemandInteraction[];
  notices?: Notice[];
  onEditDemand: (demand: Demand) => void;
}

const CalendarPage: React.FC<CalendarPageProps> = ({ demands, interactions = [], notices = [], onEditDemand }) => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDay, setSelectedDay] = useState<number | null>(null);
  
  // Filters
  const [showDemands, setShowDemands] = useState(true);
  const [showChecklists, setShowChecklists] = useState(true);
  const [showNotices, setShowNotices] = useState(true);

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDayOfMonth = new Date(year, month, 1).getDay();

  const monthNames = [
    "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
    "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"
  ];

  const prevMonth = () => { setCurrentDate(new Date(year, month - 1, 1)); setSelectedDay(null); };
  const nextMonth = () => { setCurrentDate(new Date(year, month + 1, 1)); setSelectedDay(null); };
  const goToToday = () => { const now = new Date(); setCurrentDate(now); setSelectedDay(now.getDate()); };

  const isSameDay = (dateString: string, checkDay: number) => {
      const parts = dateString.split('T')[0].split('-').map(Number);
      return parts[2] === checkDay && (parts[1] - 1) === month && parts[0] === year;
  };

  const getEventsForDay = (day: number) => {
      const dayDemands = showDemands ? demands.filter(d => d.deadline && isSameDay(d.deadline, day)) : [];
      const dayChecklists = showChecklists ? interactions.filter(i => i.type === 'checklist' && i.deadline && !i.isCompleted && isSameDay(i.deadline, day)) : [];
      const dayNotices = showNotices ? notices.filter(n => isSameDay(n.date, day)) : [];
      
      return { demands: dayDemands, checklists: dayChecklists, notices: dayNotices };
  };

  // Merge and sort all upcoming items for the sidebar
  // Filter items greater than or equal to the start of the currently viewed month
  const startOfCurrentViewMonth = new Date(year, month, 1);
  
  const upcomingDeadlines = [
      ...(showDemands ? demands.filter(d => d.deadline && d.status !== DemandStatus.COMPLETED).map(d => ({ type: 'demand', data: d, date: new Date(d.deadline!) })) : []),
      ...(showChecklists ? interactions.filter(i => i.type === 'checklist' && i.deadline && !i.isCompleted).map(i => ({ type: 'checklist', data: i, date: new Date(i.deadline!) })) : []),
      ...(showNotices ? notices.filter(n => new Date(n.date)).map(n => ({ type: 'notice', data: n, date: new Date(n.date) })) : [])
  ]
  .filter(item => item.date >= startOfCurrentViewMonth) // Filter from current month onwards
  .sort((a, b) => a.date.getTime() - b.date.getTime())
  .slice(0, 15);

  const selectedDayEvents = selectedDay ? getEventsForDay(selectedDay) : { demands: [], checklists: [], notices: [] };

  const getPriorityColor = (priority: DemandPriority) => {
    switch (priority) {
      case DemandPriority.HIGH: return 'bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-300 border-l-2 border-red-500';
      case DemandPriority.MEDIUM: return 'bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-300 border-l-2 border-amber-500';
      case DemandPriority.LOW: return 'bg-green-100 text-green-700 dark:bg-green-500/20 dark:text-green-300 border-l-2 border-green-500';
    }
  };

  const getNoticeIcon = (type: string) => {
      switch(type) {
          case 'alert': return <AlertTriangle className="w-3 h-3 text-red-500" />;
          case 'event': return <CalendarIcon className="w-3 h-3 text-blue-500" />;
          default: return <Info className="w-3 h-3 text-slate-500" />;
      }
  };

  const renderDays = () => {
    const days = [];
    
    for (let i = 0; i < firstDayOfMonth; i++) {
      days.push(<div key={`empty-${i}`} className="min-h-[80px] bg-slate-50/30 dark:bg-slate-900/20 border-r border-b border-slate-200 dark:border-white/5"></div>);
    }

    for (let day = 1; day <= daysInMonth; day++) {
      const { demands: dayDemands, checklists: dayChecklists, notices: dayNotices } = getEventsForDay(day);
      const totalEvents = dayDemands.length + dayChecklists.length + dayNotices.length;
      
      const isToday = day === new Date().getDate() && month === new Date().getMonth() && year === new Date().getFullYear();
      const isSelected = day === selectedDay;

      days.push(
        <div 
            key={day} 
            onClick={() => setSelectedDay(day)}
            className={`
                min-h-[80px] md:min-h-[120px] h-auto flex flex-col
                border-r border-b border-slate-200 dark:border-white/5 p-1 md:p-2 relative group hover:bg-slate-50 dark:hover:bg-white/5 transition-colors cursor-pointer
                ${isSelected ? 'bg-brand-50 dark:bg-brand-900/10 shadow-[inset_0_0_0_2px_rgba(14,165,233,0.5)]' : isToday ? 'bg-brand-500/5' : 'bg-transparent'}
            `}
        >
          <div className="flex justify-between items-start mb-1">
            <span className={`text-xs md:text-sm font-bold w-6 h-6 md:w-7 md:h-7 flex items-center justify-center rounded-full transition-all
                ${isToday ? 'bg-brand-500 text-white shadow-lg shadow-brand-500/30' : isSelected ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900' : 'text-slate-500 dark:text-white/50'}
            `}>
              {day}
            </span>
            {totalEvents > 0 && (
                <span className="text-[9px] bg-slate-200 dark:bg-white/10 text-slate-600 dark:text-white/70 px-1.5 py-0.5 rounded-full font-bold">
                    {totalEvents}
                </span>
            )}
          </div>
          
          <div className="space-y-1 overflow-y-hidden flex-1">
             {/* Desktop List View */}
             <div className="hidden md:block space-y-1">
                {dayNotices.map(n => (
                        <div key={n.id} className={`w-full text-left text-[9px] px-1.5 py-0.5 rounded truncate font-medium flex items-center gap-1 border-l-2 ${n.type === 'alert' ? 'border-red-400 bg-red-50 dark:bg-red-500/10' : 'border-blue-400 bg-blue-50 dark:bg-blue-500/10'}`}>
                            {getNoticeIcon(n.type)} {n.title}
                        </div>
                ))}
                {dayDemands.slice(0, 3 - dayNotices.length).map(d => (
                    <div 
                        key={d.id} 
                        onClick={(e) => { e.stopPropagation(); onEditDemand(d); }}
                        className={`w-full text-left text-[9px] px-1.5 py-0.5 rounded truncate font-medium flex items-center gap-1 cursor-pointer hover:brightness-95 active:scale-95 transition-all ${getPriorityColor(d.priority)}`}
                    >
                        {d.title}
                    </div>
                ))}
                {dayChecklists.slice(0, Math.max(0, 3 - (dayDemands.length + dayNotices.length))).map(i => (
                    <div key={i.id} className={`w-full text-left text-[9px] px-1.5 py-0.5 rounded truncate font-medium flex items-center gap-1 border-l-2 border-l-slate-400 bg-slate-100 dark:bg-white/5 text-slate-600 dark:text-white/60`}>
                        <CheckSquare className="w-2 h-2" /> {i.text}
                    </div>
                ))}
                {(dayDemands.length + dayChecklists.length + dayNotices.length) > 3 && (
                    <div className="text-[9px] text-slate-400 pl-1">+ {totalEvents - 3} mais</div>
                )}
             </div>

             {/* Mobile Dot Indicators */}
             <div className="md:hidden flex flex-wrap justify-center content-end h-full pb-1 gap-1">
                 {dayNotices.map((_, i) => <div key={`n-${i}`} className="w-1.5 h-1.5 rounded-full bg-blue-500"></div>)}
                 {dayDemands.map((_, i) => <div key={`d-${i}`} className="w-1.5 h-1.5 rounded-full bg-brand-500"></div>)}
                 {dayChecklists.map((_, i) => <div key={`c-${i}`} className="w-1.5 h-1.5 rounded-full bg-slate-400"></div>)}
             </div>
          </div>
        </div>
      );
    }
    return days;
  };

  return (
    <div className="flex flex-col h-full animate-in fade-in zoom-in-95 duration-500 overflow-hidden pb-24 md:pb-0">
      
      {/* Filters Bar */}
      <div className="flex flex-wrap gap-2 mb-4 shrink-0">
          <button onClick={() => setShowDemands(!showDemands)} className={`px-3 py-1.5 rounded-lg text-xs font-bold border flex items-center gap-2 transition-all ${showDemands ? 'bg-brand-50 border-brand-200 text-brand-700 dark:bg-brand-500/20 dark:border-brand-500/30 dark:text-brand-300' : 'bg-white border-slate-200 text-slate-500 dark:bg-white/5 dark:border-white/10 dark:text-white/50'}`}>
              <div className={`w-2 h-2 rounded-full ${showDemands ? 'bg-brand-500' : 'bg-slate-300'}`} /> Demandas
          </button>
          <button onClick={() => setShowChecklists(!showChecklists)} className={`px-3 py-1.5 rounded-lg text-xs font-bold border flex items-center gap-2 transition-all ${showChecklists ? 'bg-slate-100 border-slate-300 text-slate-700 dark:bg-slate-700 dark:border-slate-600 dark:text-slate-200' : 'bg-white border-slate-200 text-slate-500 dark:bg-white/5 dark:border-white/10 dark:text-white/50'}`}>
              <div className={`w-2 h-2 rounded-full ${showChecklists ? 'bg-slate-500' : 'bg-slate-300'}`} /> Checklists
          </button>
          <button onClick={() => setShowNotices(!showNotices)} className={`px-3 py-1.5 rounded-lg text-xs font-bold border flex items-center gap-2 transition-all ${showNotices ? 'bg-blue-50 border-blue-200 text-blue-700 dark:bg-blue-500/20 dark:border-blue-500/30 dark:text-blue-300' : 'bg-white border-slate-200 text-slate-500 dark:bg-white/5 dark:border-white/10 dark:text-white/50'}`}>
              <div className={`w-2 h-2 rounded-full ${showNotices ? 'bg-blue-500' : 'bg-slate-300'}`} /> Avisos
          </button>
      </div>

      <div className="flex-1 flex flex-col lg:flex-row gap-6 min-h-0 overflow-hidden">
        {/* Main Calendar Area */}
        <div className="flex-1 glass-panel rounded-3xl shadow-sm border border-slate-200 dark:border-white/10 flex flex-col overflow-hidden">
            <div className="p-4 md:p-6 border-b border-slate-200 dark:border-white/10 flex items-center justify-between bg-white/50 dark:bg-white/5 backdrop-blur-sm shrink-0">
                <div className="flex items-center gap-4">
                    <h2 className="text-xl md:text-2xl font-bold text-slate-900 dark:text-white capitalize flex items-center gap-2">
                        <CalendarIcon className="w-6 h-6 text-brand-600 dark:text-brand-400" />
                        {monthNames[month]} <span className="text-slate-400 dark:text-white/40 font-normal">{year}</span>
                    </h2>
                    <div className="flex bg-white dark:bg-white/10 rounded-xl border border-slate-200 dark:border-white/10 shadow-sm">
                        <button onClick={prevMonth} className="p-2 hover:bg-slate-50 dark:hover:bg-white/10 text-slate-600 dark:text-white/70 rounded-l-xl border-r border-slate-200 dark:border-white/10">
                            <ChevronLeft className="w-5 h-5" />
                        </button>
                        <button onClick={goToToday} className="px-4 text-xs font-bold text-slate-600 dark:text-white/70 hover:bg-slate-50 dark:hover:bg-white/10">
                            Hoje
                        </button>
                        <button onClick={nextMonth} className="p-2 hover:bg-slate-50 dark:hover:bg-white/10 text-slate-600 dark:text-white/70 rounded-r-xl border-l border-slate-200 dark:border-white/10">
                            <ChevronRight className="w-5 h-5" />
                        </button>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-7 border-b border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-slate-900/40 shrink-0">
                {["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"].map((day) => (
                <div key={day} className="py-2 text-center text-[10px] md:text-xs font-bold text-slate-500 dark:text-white/30 uppercase tracking-wider">
                    {day}
                </div>
                ))}
            </div>

            <div className="flex-1 overflow-y-auto custom-scrollbar">
                <div className="grid grid-cols-7 bg-transparent min-h-full">
                    {renderDays()}
                </div>
            </div>
        </div>

        {/* Side Panel (Upcoming Deadlines) */}
        <div className="w-full lg:w-80 glass-panel rounded-3xl border border-slate-200 dark:border-white/10 flex flex-col shrink-0 overflow-hidden h-[300px] lg:h-auto">
            {selectedDay ? (
                <>
                    <div className="p-5 border-b border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-slate-900/40 flex justify-between items-center shrink-0">
                        <div>
                            <h3 className="font-bold text-lg text-slate-800 dark:text-white">
                                {selectedDay} de {monthNames[month]}
                            </h3>
                            <p className="text-sm text-slate-500 dark:text-white/50">
                                {selectedDayEvents.demands.length + selectedDayEvents.checklists.length + selectedDayEvents.notices.length} eventos
                            </p>
                        </div>
                        <button onClick={() => setSelectedDay(null)} className="text-xs text-brand-600 hover:underline">
                            Ver Geral
                        </button>
                    </div>
                    
                    <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar">
                        {/* Selected Day Items */}
                        {[...selectedDayEvents.notices, ...selectedDayEvents.demands, ...selectedDayEvents.checklists].map((item: any, idx) => (
                             <div 
                                key={idx} 
                                onClick={() => item.type === 'demand' && onEditDemand(item)}
                                className={`p-3 bg-white dark:bg-white/5 rounded-xl border border-slate-200 dark:border-white/10 ${item.type === 'demand' ? 'cursor-pointer hover:border-brand-200 hover:shadow-sm transition-all' : ''}`}
                             >
                                 <p className="text-sm font-bold text-slate-800 dark:text-white line-clamp-2">
                                     {item.title || item.text}
                                 </p>
                                 <span className="text-xs text-slate-500 dark:text-white/50 capitalize">
                                     {item.type === 'checklist' ? 'Tarefa' : item.type || 'Demanda'}
                                 </span>
                             </div>
                        ))}
                        {selectedDayEvents.demands.length === 0 && selectedDayEvents.notices.length === 0 && selectedDayEvents.checklists.length === 0 && (
                            <p className="text-center text-xs text-slate-400 mt-4">Nada para este dia.</p>
                        )}
                    </div>
                </>
            ) : (
                <>
                    <div className="p-5 border-b border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-slate-900/40 shrink-0">
                        <h3 className="font-bold text-lg text-slate-800 dark:text-white flex items-center gap-2">
                            <Clock className="w-5 h-5 text-brand-600 dark:text-brand-400" />
                            Próximos Prazos
                        </h3>
                        <p className="text-sm text-slate-500 dark:text-white/50">
                            A partir de {monthNames[month]}
                        </p>
                    </div>
                    
                    <div className="flex-1 overflow-y-auto p-4 space-y-2 custom-scrollbar">
                        {upcomingDeadlines.length === 0 ? (
                            <div className="flex flex-col items-center justify-center h-40 text-slate-400 dark:text-white/30 text-center">
                                <Clock className="w-10 h-10 mb-2 opacity-20" />
                                <p className="text-sm">Nenhum evento futuro.</p>
                            </div>
                        ) : (
                            upcomingDeadlines.map((item: any, idx) => {
                                const isToday = item.date.getDate() === new Date().getDate() && item.date.getMonth() === new Date().getMonth();
                                const colorClass = item.type === 'notice' ? 'bg-blue-50 text-blue-600 border-blue-100 dark:bg-blue-500/10 dark:text-blue-400' :
                                                   item.type === 'demand' ? 'bg-amber-50 text-amber-600 border-amber-100 dark:bg-amber-500/10 dark:text-amber-400' :
                                                   'bg-slate-50 text-slate-600 border-slate-100 dark:bg-white/5 dark:text-slate-400';
                                
                                return (
                                    <div 
                                        key={`${item.type}-${item.data.id}-${idx}`}
                                        onClick={() => item.type === 'demand' && onEditDemand(item.data)}
                                        className={`flex gap-3 p-2.5 bg-white dark:bg-white/5 rounded-xl border border-slate-100 dark:border-white/5 hover:border-brand-200 transition-all cursor-pointer group`}
                                    >
                                        <div className={`w-10 h-10 rounded-lg flex flex-col items-center justify-center font-bold shrink-0 border ${colorClass}`}>
                                            <span className="text-xs">{item.date.getDate()}</span>
                                            <span className="text-[8px] uppercase">{item.date.toLocaleString('default', { month: 'short' }).slice(0,3)}</span>
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="flex justify-between items-start">
                                                <h4 className="text-xs font-bold text-slate-800 dark:text-white truncate group-hover:text-brand-600">
                                                    {item.type === 'notice' ? item.data.title : item.type === 'demand' ? item.data.title : item.data.text}
                                                </h4>
                                                {item.type === 'demand' && (
                                                    <span className={`shrink-0 text-[9px] font-bold px-1.5 py-0.5 rounded-md ${isToday ? 'bg-red-100 text-red-600' : 'bg-slate-100 text-slate-600'} dark:bg-white/10`}>
                                                        {isToday ? 'HOJE' : item.data.status}
                                                    </span>
                                                )}
                                            </div>
                                            <p className="text-[10px] text-slate-500 mt-0.5 line-clamp-1">
                                                {item.type === 'notice' ? 'Aviso Mural' : item.type === 'demand' ? item.data.description : 'Tarefa Checklist'}
                                            </p>
                                        </div>
                                    </div>
                                )
                            })
                        )}
                    </div>
                </>
            )}
        </div>
      </div>
    </div>
  );
};

export default CalendarPage;
