import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  totalItems: number;
  itemsPerPage: number;
}

const Pagination: React.FC<PaginationProps> = ({ 
  currentPage, 
  totalPages, 
  onPageChange, 
  totalItems,
  itemsPerPage
}) => {
  if (totalPages <= 1) return null;

  const startItem = (currentPage - 1) * itemsPerPage + 1;
  const endItem = Math.min(currentPage * itemsPerPage, totalItems);

  return (
    <div className="flex flex-col sm:flex-row items-center justify-between gap-4 py-4 px-2 border-t border-slate-200 dark:border-white/10 mt-auto">
      <div className="text-xs text-slate-500 dark:text-white/50 font-medium order-2 sm:order-1">
        Mostrando <span className="font-bold text-slate-700 dark:text-white">{startItem}</span> a <span className="font-bold text-slate-700 dark:text-white">{endItem}</span> de <span className="font-bold text-slate-700 dark:text-white">{totalItems}</span> registros
      </div>

      <div className="flex items-center gap-2 order-1 sm:order-2">
        <button
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage === 1}
          className="p-2 rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-white/5 text-slate-600 dark:text-white hover:bg-slate-50 dark:hover:bg-white/10 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          aria-label="Página anterior"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>

        <div className="flex items-center gap-1 px-2">
            <span className="text-sm font-bold text-slate-700 dark:text-white">{currentPage}</span>
            <span className="text-sm text-slate-400 dark:text-white/40">/</span>
            <span className="text-sm text-slate-500 dark:text-white/50 font-medium">{totalPages}</span>
        </div>

        <button
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage === totalPages}
          className="p-2 rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-white/5 text-slate-600 dark:text-white hover:bg-slate-50 dark:hover:bg-white/10 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          aria-label="Próxima página"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};

export default Pagination;