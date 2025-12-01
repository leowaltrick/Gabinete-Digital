
import React, { useState, useRef, useEffect, useMemo } from 'react';
import { ChevronDown, X, Check, Search } from 'lucide-react';

interface Option {
  value: string;
  label: string;
}

interface MultiSelectProps {
  options: Option[];
  selectedValues: string[];
  onChange: (values: string[]) => void;
  placeholder: string;
  label?: string;
}

const MultiSelect: React.FC<MultiSelectProps> = ({ options, selectedValues, onChange, placeholder, label }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);

  // Close on click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setSearchTerm('');
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const filteredOptions = useMemo(() => {
    return options.filter(opt => 
      opt.label.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [options, searchTerm]);

  const toggleOption = (value: string) => {
    if (selectedValues.includes(value)) {
      onChange(selectedValues.filter(v => v !== value));
    } else {
      onChange([...selectedValues, value]);
    }
  };

  const removeValue = (value: string, e: React.MouseEvent) => {
    e.stopPropagation();
    onChange(selectedValues.filter(v => v !== value));
  };

  return (
    <div className="relative min-w-[200px]" ref={containerRef}>
      {label && <label className="block text-xs font-bold text-slate-500 dark:text-white/50 uppercase mb-1.5 ml-1">{label}</label>}
      
      <div 
        onClick={() => setIsOpen(!isOpen)}
        className={`
            w-full min-h-[46px] px-3 py-2 glass-input border border-slate-300 dark:border-white/10 rounded-2xl 
            focus:border-brand-500 outline-none font-bold text-slate-700 dark:text-white cursor-pointer shadow-sm
            flex items-center justify-between transition-all hover:bg-slate-50 dark:hover:bg-white/5
            ${isOpen ? 'ring-2 ring-brand-500/20 border-brand-500' : ''}
        `}
      >
        <div className="flex flex-wrap gap-1.5">
          {selectedValues.length === 0 ? (
            <span className="text-slate-400 dark:text-white/40 text-sm font-medium py-1">{placeholder}</span>
          ) : (
            selectedValues.map(val => {
                const opt = options.find(o => o.value === val);
                return (
                    <span key={val} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-brand-100 dark:bg-brand-500/20 text-brand-700 dark:text-brand-300 text-xs font-bold border border-brand-200 dark:border-brand-500/30">
                        {opt?.label || val}
                        <div onClick={(e) => removeValue(val, e)} className="hover:bg-brand-200 dark:hover:bg-brand-500/40 rounded-full p-0.5 cursor-pointer">
                            <X className="w-3 h-3" />
                        </div>
                    </span>
                );
            })
          )}
        </div>
        <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`} />
      </div>

      {isOpen && (
        <div className="absolute top-full left-0 w-full mt-2 glass-panel bg-white dark:bg-slate-900 rounded-2xl shadow-xl border border-slate-200 dark:border-white/10 overflow-hidden z-50 animate-in fade-in zoom-in-95 duration-200">
            {/* Search Input */}
            <div className="p-2 border-b border-slate-100 dark:border-white/5">
                <div className="relative">
                    <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                    <input 
                        type="text" 
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        placeholder="Filtrar opções..." 
                        className="w-full pl-9 pr-3 py-2 text-sm bg-slate-50 dark:bg-white/5 rounded-lg border-none outline-none text-slate-900 dark:text-white placeholder:text-slate-400"
                        autoFocus
                        onClick={(e) => e.stopPropagation()}
                    />
                </div>
            </div>

            <div className="max-h-60 overflow-y-auto p-1 scrollbar-thin scrollbar-thumb-slate-300 dark:scrollbar-thumb-white/20">
                {filteredOptions.length === 0 ? (
                    <div className="p-4 text-center text-sm text-slate-400 dark:text-white/40 italic">
                        Nenhuma opção encontrada.
                    </div>
                ) : (
                    filteredOptions.map(opt => {
                        const isSelected = selectedValues.includes(opt.value);
                        return (
                            <div 
                                key={opt.value}
                                onClick={() => toggleOption(opt.value)}
                                className={`
                                    flex items-center justify-between px-3 py-2.5 rounded-lg cursor-pointer text-sm font-medium transition-colors
                                    ${isSelected 
                                        ? 'bg-brand-50 dark:bg-brand-500/10 text-brand-700 dark:text-brand-300' 
                                        : 'text-slate-700 dark:text-white hover:bg-slate-50 dark:hover:bg-white/5'}
                                `}
                            >
                                <span>{opt.label}</span>
                                {isSelected && <Check className="w-4 h-4 text-brand-500" />}
                            </div>
                        )
                    })
                )}
            </div>
            
            <div className="p-2 border-t border-slate-100 dark:border-white/5 bg-slate-50/50 dark:bg-white/5 flex justify-between">
                <button 
                    onClick={() => onChange([])}
                    className="text-xs text-slate-500 hover:text-red-500 px-2 py-1 transition-colors"
                >
                    Limpar
                </button>
                <button 
                    onClick={() => setIsOpen(false)}
                    className="text-xs font-bold text-brand-600 dark:text-brand-400 px-2 py-1 hover:bg-brand-50 dark:hover:bg-white/5 rounded transition-colors"
                >
                    Pronto
                </button>
            </div>
        </div>
      )}
    </div>
  );
};

export default MultiSelect;
