
import React from 'react';
import { TrendingUp } from 'lucide-react';

interface StatCardProps {
  title: string;
  value: number | string;
  icon: any;
  colorClass: string;
  textClass: string;
  trend?: string;
  subValue?: string;
  isLoading?: boolean; // Added Loading Prop
}

const StatCard: React.FC<StatCardProps> = React.memo(({ title, value, icon: Icon, colorClass, textClass, trend, subValue, isLoading = false }) => (
    <div className="glass-panel p-3 md:p-4 rounded-2xl border border-slate-200 dark:border-white/10 shadow-sm flex flex-col justify-between hover:bg-white/60 dark:hover:bg-white/5 transition-colors group min-h-[100px] will-change-transform relative overflow-hidden">
        {isLoading ? (
            // Skeleton Loader
            <div className="animate-pulse flex flex-col justify-between h-full w-full">
                <div className="flex justify-between items-start">
                    <div className="w-8 h-8 rounded-xl bg-slate-200 dark:bg-white/10"></div>
                </div>
                <div className="mt-3 space-y-2">
                    <div className="h-6 w-16 bg-slate-200 dark:bg-white/10 rounded"></div>
                    <div className="h-3 w-24 bg-slate-200 dark:bg-white/10 rounded"></div>
                </div>
            </div>
        ) : (
            <>
                <div className="flex justify-between items-start">
                    <div className={`p-2 rounded-xl ${colorClass} bg-opacity-10 shrink-0`}>
                        <Icon className={`w-4 h-4 ${textClass}`} />
                    </div>
                    {trend && (
                        <div className="flex items-center gap-1 text-[10px] font-bold text-emerald-600 bg-emerald-100 dark:bg-emerald-500/20 px-1.5 py-0.5 rounded-full border border-emerald-200 dark:border-emerald-500/10">
                            <TrendingUp className="w-3 h-3" /> {trend}
                        </div>
                    )}
                </div>
                
                <div className="mt-3">
                    <span className="text-2xl font-bold text-slate-800 dark:text-white tracking-tight block">
                        {subValue || value}
                    </span>
                    <span className={`block text-[10px] font-bold uppercase tracking-wider opacity-70 ${textClass} mt-1`}>{title}</span>
                </div>
            </>
        )}
    </div>
));

export default StatCard;