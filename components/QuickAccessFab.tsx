
import React, { useState, useRef } from 'react';
import { Plus, ArrowRight, Loader2, UserPlus, Search, FilePlus } from 'lucide-react';
import { formatPhone } from '../utils/cpfValidation';

interface QuickAccessFabProps {
  onQuickStart: (value: string) => void;
  onOpenNewPerson?: () => void;
  onOpenNewDemand?: () => void;
  isLoading: boolean;
  showNewDemand?: boolean;
  showNewPerson?: boolean;
}

const QuickAccessFab: React.FC<QuickAccessFabProps> = ({ 
  onQuickStart, 
  onOpenNewPerson, 
  onOpenNewDemand, 
  isLoading, 
  showNewDemand = true, 
  showNewPerson = true 
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [inputValue, setInputValue] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  
  if (!showNewDemand && !showNewPerson) {
      return null;
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (inputValue.length > 0) {
        onQuickStart(inputValue);
        setInputValue('');
        setIsExpanded(false);
    }
  };

  const ActionButton = ({ onClick, icon: Icon, label, colorClass, title }: any) => (
      <button
        type="button"
        onClick={onClick}
        className="flex items-center gap-3 group pointer-events-auto transition-transform active:scale-95 duration-200"
        title={title}
        aria-label={title}
      >
          <span className="lg:hidden px-3 py-1.5 bg-white/80 dark:bg-black/80 backdrop-blur-md text-slate-800 dark:text-white border border-slate-200 dark:border-white/20 text-xs font-bold rounded-xl shadow-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
              {title}
          </span>
          
          <div className={`
             w-12 h-12 lg:w-12 lg:h-12 rounded-full lg:rounded-xl 
             flex items-center justify-center 
             shadow-lg border border-white/10
             ${colorClass}
             transition-all
          `}>
              <Icon className="w-5 h-5 lg:w-6 lg:h-6" />
          </div>
          
          <span className="hidden lg:block text-xs font-bold leading-tight text-slate-600 dark:text-white text-left">
              {label}
          </span>
      </button>
  );

  return (
    <>
        <div 
            className={`fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[90] lg:hidden transition-opacity duration-300 ${isExpanded ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}
            onClick={() => setIsExpanded(false)}
        />

        <div 
            className="fixed bottom-6 right-6 z-[100] flex flex-col lg:flex-row items-end lg:items-center pointer-events-none"
            onMouseLeave={() => {
                if (window.innerWidth >= 1024 && document.activeElement !== inputRef.current) {
                    setIsExpanded(false);
                }
            }}
        >
            <div 
                onMouseEnter={() => setIsExpanded(true)}
                className={`
                hidden lg:flex pointer-events-auto
                glass-panel bg-white/60 dark:bg-slate-900/80 backdrop-blur-2xl shadow-2xl border border-slate-200 dark:border-white/10
                rounded-full transition-all duration-500 ease-[cubic-bezier(0.23,1,0.32,1)]
                items-center overflow-hidden relative
                ${isExpanded ? 'w-[480px] pr-2' : 'w-16 h-16 shadow-lg'}
            `}>
                <div className={`
                    flex items-center justify-center w-16 h-16 shrink-0 text-brand-600 dark:text-white transition-all duration-500 z-10
                    ${isExpanded ? 'bg-transparent' : 'bg-transparent'}
                `}>
                    {isLoading ? (
                        <Loader2 className={`w-6 h-6 animate-spin text-brand-500`} />
                    ) : (
                        <Plus className={`w-8 h-8 transition-transform duration-500 ${isExpanded ? 'rotate-45 opacity-50' : 'rotate-0'}`} />
                    )}
                </div>

                <div className={`flex-1 flex items-center gap-4 transition-all duration-500 pl-0 ${isExpanded ? 'opacity-100 translate-x-0' : 'opacity-0 translate-x-10 pointer-events-none'}`}>
                    {showNewDemand && (
                        <ActionButton 
                            onClick={() => { if(onOpenNewDemand) onOpenNewDemand(); setIsExpanded(false); }}
                            icon={FilePlus}
                            title="Nova Demanda"
                            label={<>Nova<br/>Demanda</>}
                            colorClass="bg-brand-50 dark:bg-brand-500/20 text-brand-600 dark:text-brand-400 hover:bg-brand-500 hover:text-white dark:hover:bg-brand-500"
                        />
                    )}
                    {showNewPerson && (
                        <ActionButton 
                            onClick={() => { if(onOpenNewPerson) onOpenNewPerson(); setIsExpanded(false); }}
                            icon={UserPlus}
                            title="Novo Cidadão"
                            label={<>Novo<br/>Cidadão</>}
                            colorClass="bg-blue-50 dark:bg-blue-500/20 text-blue-600 dark:text-blue-400 hover:bg-blue-500 hover:text-white dark:hover:bg-blue-500"
                        />
                    )}

                    <div className="w-px h-8 bg-slate-200 dark:bg-white/10 shrink-0 mx-1"></div>

                    <form onSubmit={handleSubmit} className="flex-1 flex items-center gap-2 relative">
                        <Search className="w-4 h-4 text-slate-500 dark:text-white/40 absolute left-3" />
                        <input 
                            ref={inputRef}
                            type="text" 
                            value={inputValue}
                            onChange={(e) => setInputValue(formatPhone(e.target.value))}
                            placeholder="Celular..."
                            className="w-full bg-slate-100 dark:bg-black/20 text-slate-900 dark:text-white placeholder:text-slate-500 dark:placeholder:text-white/40 text-sm pl-9 pr-2 py-2.5 rounded-xl outline-none border border-transparent focus:border-brand-500 transition-all font-mono"
                            aria-label="Buscar Celular"
                        />
                        <button 
                            type="submit"
                            disabled={isLoading || inputValue.length === 0}
                            className="p-2 bg-brand-600 text-white rounded-xl hover:bg-brand-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-sm active:scale-95"
                            aria-label="Ir"
                        >
                            <ArrowRight className="w-4 h-4" />
                        </button>
                    </form>
                </div>
            </div>

            <div className="lg:hidden flex flex-col items-end gap-4 pointer-events-none pb-safe-area">
                <div className={`flex flex-col items-end gap-4 transition-all duration-300 origin-bottom mb-2 ${isExpanded ? 'opacity-100 scale-100 translate-y-0 pointer-events-auto' : 'opacity-0 scale-50 translate-y-10 pointer-events-none'}`}>
                    
                    <form onSubmit={handleSubmit} className="flex items-center gap-2 bg-white/90 dark:bg-slate-900/90 backdrop-blur-xl p-2 rounded-2xl shadow-xl border border-slate-200 dark:border-white/10">
                        <input 
                            type="text" 
                            value={inputValue}
                            onChange={(e) => setInputValue(formatPhone(e.target.value))}
                            placeholder="Celular..."
                            className="w-40 bg-transparent text-slate-900 dark:text-white text-base px-2 outline-none font-mono placeholder:text-slate-500 dark:placeholder:text-white/50"
                            onFocus={() => setIsExpanded(true)}
                        />
                        <button type="submit" disabled={!inputValue} className="w-10 h-10 bg-brand-600 text-white rounded-xl flex items-center justify-center disabled:opacity-50 shadow-md active:scale-95 transition-transform">
                            <Search className="w-5 h-5" />
                        </button>
                    </form>

                    {showNewPerson && (
                        <div className="flex items-center gap-3">
                             <span className="px-3 py-1.5 bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl text-slate-900 dark:text-white border border-slate-200 dark:border-white/20 text-xs font-bold rounded-xl shadow-lg">Novo Cidadão</span>
                            <ActionButton 
                                onClick={() => { if(onOpenNewPerson) onOpenNewPerson(); setIsExpanded(false); }}
                                icon={UserPlus}
                                title="Novo Cidadão"
                                colorClass="bg-blue-500 text-white border-white/20"
                            />
                        </div>
                    )}
                    
                    {showNewDemand && (
                        <div className="flex items-center gap-3">
                            <span className="px-3 py-1.5 bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl text-slate-900 dark:text-white border border-slate-200 dark:border-white/20 text-xs font-bold rounded-xl shadow-lg">Nova Demanda</span>
                            <ActionButton 
                                onClick={() => { if(onOpenNewDemand) onOpenNewDemand(); setIsExpanded(false); }}
                                icon={FilePlus}
                                title="Nova Demanda"
                                colorClass="bg-brand-600 text-white border-white/20"
                            />
                        </div>
                    )}
                </div>

                <button 
                    onClick={() => setIsExpanded(!isExpanded)}
                    className={`
                        w-14 h-14 rounded-full flex items-center justify-center text-white shadow-2xl pointer-events-auto
                        bg-brand-600 border border-white/10
                        transition-transform duration-300 active:scale-95
                        ${isExpanded ? 'rotate-45 bg-slate-800' : 'rotate-0'}
                    `}
                    aria-label="Acesso Rápido"
                >
                    <Plus className="w-7 h-7" />
                </button>
            </div>
        </div>
    </>
  );
};

export default QuickAccessFab;
