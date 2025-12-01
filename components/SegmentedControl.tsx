import React from 'react';

interface SegmentedControlProps {
  options: { value: string; label: string; icon?: any }[];
  value: string;
  onChange: (value: any) => void;
  size?: 'sm' | 'md';
}

const SegmentedControl: React.FC<SegmentedControlProps> = ({ options, value, onChange, size = 'md' }) => {
  const activeIndex = options.findIndex((o) => o.value === value);

  return (
    <div className={`bg-slate-100 dark:bg-black/20 p-1 rounded-xl flex relative border border-slate-200 dark:border-white/5 shadow-inner min-w-max ${size === 'sm' ? 'h-9' : 'h-11'}`}>
      <div
        className="absolute top-1 bottom-1 rounded-lg bg-white dark:bg-slate-600 shadow-sm transition-all duration-300 ease-out z-0"
        style={{
          width: `calc(${100 / options.length}% - 0.35rem)`,
          left: `calc(${activeIndex * (100 / options.length)}% + 0.18rem)`,
        }}
      />
      {options.map((opt) => {
        const isActive = value === opt.value;
        const Icon = opt.icon;
        return (
          <button
            key={opt.value}
            onClick={() => onChange(opt.value)}
            className={`
                flex-1 px-3 text-xs font-bold rounded-lg transition-all duration-300 relative z-10 flex items-center justify-center gap-1.5 whitespace-nowrap
                ${isActive ? 'text-brand-600 dark:text-white' : 'text-slate-500 dark:text-white/40 hover:text-slate-700'}
            `}
          >
            {Icon && <Icon className={size === 'sm' ? "w-3 h-3" : "w-4 h-4"} />}
            {opt.label}
          </button>
        );
      })}
    </div>
  );
};

export default SegmentedControl;