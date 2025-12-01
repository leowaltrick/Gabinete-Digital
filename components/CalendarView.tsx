
import React, { useState } from 'react';
import { ChevronLeft, ChevronRight, Clock } from 'lucide-react';
import { Demand, DemandPriority, DemandStatus } from '../types';

interface CalendarViewProps {
  demands: Demand[];
  onEditDemand: (demand: Demand) => void;
}

const CalendarView: React.FC<CalendarViewProps> = ({ demands, onEditDemand }) => {
  const [currentDate, setCurrentDate] = useState(new Date());

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDayOfMonth = new Date(year, month, 1).getDay();

  const monthNames = [
    "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
    "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"
  ];

  const prevMonth = () => setCurrentDate(new Date(year, month - 1, 1));
  const nextMonth = () => setCurrentDate(new Date(year, month + 1, 1));
  const goToToday = () => setCurrentDate(new Date());

  const getDemandsForDay = (day: number) => {
    return demands.filter(d => {
      if (!d.deadline) return false;
      const date = new Date(d.deadline);
      const dDate = new Date(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate());
      return dDate.getDate() === day && dDate.getMonth() === month && dDate.getFullYear() === year;
    });
  };

  const getPriorityColor = (priority: DemandPriority) => {
    switch (priority) {
      case DemandPriority.HIGH: return 'bg-red-500/20 text-red-700 dark:text-red-300 border-red-500/30';
      case DemandPriority.MEDIUM: return 'bg-amber-500/20 text-amber-700 dark:text-amber-300 border-amber-500/30';
      case DemandPriority.LOW: return 'bg-green-500/20 text-green-700 dark:text-green-300 border-green-500/30';
    }
  };

  const renderDays = () => {
    const days = [];
    
    // Padding for empty cells before first day of month
    for (let i = 0; i < firstDayOfMonth; i++) {
      days.push(<div key={`empty-${i}`} className="h-24 md:h-28 bg-slate-50/50 dark:bg-slate-900/30 border-r border-b border-slate-200 dark:border-white/5"></div>);
    }

    // Actual days
    for (let day = 1; day <= daysInMonth; day++) {
      const dayDemands = getDemandsForDay(day);
      const isToday = 
        day === new Date().getDate() && 
        month === new Date().getMonth() && 
        year === new Date().getFullYear();

      days.push(
        <div key={day} className={`h-24 md:h-28 border-r border-b border-slate-200 dark:border-white/5 p-2 relative group hover:bg-slate-50 dark:hover:bg-white/5 transition-colors ${isToday ? 'bg-brand-500/10' : 'bg-transparent'}`}>
          <div className="flex justify-between items-start mb-1">
            <span className={`text-xs font-bold w-6 h-6 flex items-center justify-center rounded-full ${isToday ? 'bg-brand-500 text-white shadow-[0_0_10px_rgba(14,165,233,0.5)]' : 'text-slate-400 dark:text-white/50'}`}>
              {day}
            </span>
            {dayDemands.length > 0 && (
                <span className="text-[9px] bg-slate-200 dark:bg-white/10 text-slate-600 dark:text-white/70 px-1.5 py-0.5 rounded-md font-bold">
                    {dayDemands.length}
                </span>
            )}
          </div>
          
          <div className="space-y-1 overflow-y-auto max-h-[60px] scrollbar-thin scrollbar-thumb-slate-300 dark:scrollbar-thumb-white/10">
            {dayDemands.map(d => (
              <button
                key={d.id}
                onClick={() => onEditDemand(d)}
                className={`w-full text-left text-[10px] px-1.5 py-0.5 rounded border truncate font-medium transition-all hover:scale-[1.02] flex items-center gap-1 ${getPriorityColor(d.priority)}`}
                title={d.title}
              >
                 <div className={`w-1 h-1 rounded-full shrink-0 ${
                    d.status === DemandStatus.COMPLETED ? 'bg-green-500 shadow-[0_0_5px_currentColor]' : 'bg-current'
                 }`} />
                 {d.title}
              </button>
            ))}
          </div>
        </div>
      );
    }

    return days;
  };

  return (
    <div className="glass-panel rounded-2xl shadow-sm border border-slate-200 dark:border-white/10 overflow-hidden animate-in fade-in duration-500">
      {/* Calendar Header */}
      <div className="p-4 border-b border-slate-200 dark:border-white/10 flex items-center justify-between bg-slate-50/50 dark:bg-white/5">
        <div className="flex items-center gap-4">
            <h2 className="text-xl font-bold text-slate-800 dark:text-white capitalize flex items-center gap-2">
                <Clock className="w-5 h-5 text-brand-600 dark:text-brand-400" />
                {monthNames[month]} <span className="text-slate-400 dark:text-white/40 font-normal">{year}</span>
            </h2>
            <div className="flex bg-slate-200/50 dark:bg-slate-900/50 rounded-lg border border-slate-300 dark:border-white/10 shadow-sm">
                <button onClick={prevMonth} className="p-1.5 hover:bg-white/20 text-slate-600 dark:text-white/70 rounded-l-lg border-r border-slate-300 dark:border-white/10">
                    <ChevronLeft className="w-5 h-5" />
                </button>
                <button onClick={goToToday} className="px-3 text-xs font-bold text-slate-600 dark:text-white/70 hover:bg-white/20">
                    Hoje
                </button>
                <button onClick={nextMonth} className="p-1.5 hover:bg-white/20 text-slate-600 dark:text-white/70 rounded-r-lg border-l border-slate-300 dark:border-white/10">
                    <ChevronRight className="w-5 h-5" />
                </button>
            </div>
        </div>
        
        {/* Legend */}
        <div className="hidden md:flex items-center gap-3 text-xs text-slate-500 dark:text-white/60">
            <div className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-red-500"></div> Alta</div>
            <div className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-amber-500"></div> Média</div>
            <div className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-green-500"></div> Baixa</div>
        </div>
      </div>

      {/* Weekdays Header */}
      <div className="grid grid-cols-7 border-b border-slate-200 dark:border-white/10 bg-slate-100 dark:bg-slate-900/40">
        {["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"].map((day) => (
          <div key={day} className="py-2 text-center text-xs font-bold text-slate-500 dark:text-white/30 uppercase tracking-wider">
            {day.slice(0, 3)}
          </div>
        ))}
      </div>

      {/* Days Grid */}
      <div className="grid grid-cols-7 bg-transparent">
        {renderDays()}
      </div>
    </div>
  );
};

export default CalendarView;
