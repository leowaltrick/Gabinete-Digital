import React, { useState } from 'react';
import { Landmark, LogOut, User as UserIcon, Pin, PinOff, Settings, Moon, Sun, LayoutList, Users, Map as MapIcon, Home } from 'lucide-react';
import { ViewState, User, SystemConfig } from '../types';

interface SidebarProps {
  currentView: ViewState;
  setView: (view: ViewState) => void;
  user: User | null;
  onLogout: () => void;
  toggleTheme: () => void;
  isDarkMode: boolean;
  systemConfig: SystemConfig;
  showMobileDock?: boolean;
}

const Sidebar: React.FC<SidebarProps> = React.memo(({ currentView, setView, user, onLogout, toggleTheme, isDarkMode, systemConfig, showMobileDock = true }) => {
  const [isPinned, setIsPinned] = useState(true);
  const [isHovered, setIsHovered] = useState(false);

  // Desktop: Hover or Pin triggers expansion
  const isExpanded = isPinned || isHovered;

  const currentRoleConfig = user && systemConfig[user.role] 
    ? systemConfig[user.role] 
    : { allowedViews: [] };

  const navItems = [
    { id: 'dashboard', label: 'Home', icon: Home },
    { id: 'demands', label: 'Demandas', icon: LayoutList },
    { id: 'people', label: 'Cidadãos', icon: Users },
    { id: 'map', label: 'Mapa', icon: MapIcon },
  ] as const;

  const visibleItems = navItems.filter(item => 
    currentRoleConfig.allowedViews.includes(item.id as ViewState)
  );

  const formatRole = (role: string) => {
    return role.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
  };

  const handleNavigation = (view: ViewState) => {
      setView(view);
  };

  return (
    <>
      {/* DESKTOP SIDEBAR */}
      <aside 
        className={`
          hidden lg:flex
          transition-all duration-500 ease-[cubic-bezier(0.23,1,0.32,1)]
          flex-col will-change-transform group z-40 overflow-hidden
          static h-auto
          my-4 ml-4 mr-0
          rounded-[2.5rem] border border-white/60 dark:border-white/5
          bg-white/80 dark:bg-[#020617]/80 backdrop-blur-2xl
          shadow-xl shadow-slate-200/50 dark:shadow-black/20
          ${isExpanded ? 'w-72' : 'w-24'}
        `}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        {/* Header */}
        <div className={`p-6 flex items-center ${isExpanded ? 'justify-between' : 'justify-center'} border-b border-slate-100 dark:border-white/5 h-28 shrink-0 relative`}>
          <div className="flex items-center gap-3 overflow-hidden whitespace-nowrap">
            <div className={`w-12 h-12 min-w-[3rem] bg-gradient-to-br from-brand-500 to-brand-600 rounded-2xl flex items-center justify-center shadow-lg shadow-brand-500/30 ring-1 ring-white/20 transition-transform duration-300 ${!isExpanded && !isPinned ? 'scale-110' : ''}`}>
              <Landmark className="w-6 h-6 text-white" />
            </div>
            <div className={`transition-all duration-300 origin-left ${isExpanded ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-4 w-0 hidden'}`}>
              <h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white leading-none">
                Gabinete
              </h1>
              <span className="text-[10px] text-brand-600 dark:text-brand-400 font-bold tracking-[0.2em] uppercase">Digital</span>
            </div>
          </div>
          
          <button 
            onClick={() => setIsPinned(!isPinned)} 
            className={`
                flex absolute right-6 top-1/2 -translate-y-1/2 text-slate-400 dark:text-white/30 hover:text-brand-600 dark:hover:text-white transition-all duration-300
                ${isExpanded ? 'opacity-0 group-hover:opacity-100 delay-100' : 'opacity-0 pointer-events-none'}
            `}
            title={isPinned ? "Desafixar menu" : "Fixar menu"}
          >
            {isPinned ? <PinOff className="w-4 h-4" /> : <Pin className="w-4 h-4" />}
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-4 py-6 space-y-2 overflow-x-hidden overflow-y-auto custom-scrollbar flex flex-col">
          {visibleItems.map((item) => {
            const Icon = item.icon;
            const isActive = currentView === item.id;
            return (
              <button
                key={item.id}
                onClick={() => handleNavigation(item.id as ViewState)}
                disabled={!user}
                className={`
                  w-full flex items-center gap-4 px-4 py-3.5 rounded-2xl text-sm font-bold transition-all duration-300 relative group/item
                  ${!user ? 'opacity-30 cursor-not-allowed' : ''}
                  ${isActive 
                    ? 'bg-brand-500/10 dark:bg-white/10 text-brand-700 dark:text-white shadow-sm ring-1 ring-brand-500/20 dark:ring-white/10' 
                    : 'text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-white/5 hover:text-slate-900 dark:hover:text-white'}
                  ${!isExpanded ? 'justify-center' : ''}
                `}
              >
                <Icon className={`w-6 h-6 min-w-[1.5rem] transition-transform duration-300 ${isActive ? 'scale-110' : 'group-hover/item:scale-110'}`} />
                <span className={`whitespace-nowrap transition-all duration-300 ${isExpanded ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-4 w-0 hidden'}`}>
                  {item.label}
                </span>
                {isActive && isExpanded && (
                    <div className="absolute right-4 w-1.5 h-1.5 rounded-full bg-brand-500 shadow-[0_0_8px_currentColor]" />
                )}
              </button>
            );
          })}
        </nav>

        {/* Footer Actions */}
        <div className={`p-4 border-t border-slate-100 dark:border-white/5 shrink-0 space-y-2`}>
             {/* Theme Toggle - Hidden on Desktop (lg:hidden) as requested */}
             <button
                onClick={toggleTheme}
                className={`
                  lg:hidden w-full flex items-center gap-4 px-4 py-3 rounded-2xl text-sm font-medium transition-all
                  text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-white/5
                  ${!isExpanded ? 'justify-center' : ''}
                `}
              >
                {isDarkMode ? <Sun className="w-5 h-5 min-w-[1.25rem] text-amber-400" /> : <Moon className="w-5 h-5 min-w-[1.25rem] text-slate-600" />}
                <span className={`whitespace-nowrap transition-all duration-300 ${isExpanded ? 'opacity-100' : 'opacity-0 w-0 hidden'}`}>
                  {isDarkMode ? 'Modo Claro' : 'Modo Escuro'}
                </span>
              </button>

            {/* Config Link for Desktop - Available for everyone */}
            {user && (
              <button
                onClick={() => handleNavigation('admin_panel')}
                className={`
                  w-full flex items-center gap-4 px-4 py-3 rounded-2xl text-sm font-medium transition-all
                  ${currentView === 'admin_panel' ? 'bg-slate-100 dark:bg-white/10 text-brand-700 dark:text-brand-300' : 'text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-white/5'}
                  ${!isExpanded ? 'justify-center' : ''}
                `}
              >
                <Settings className="w-5 h-5 min-w-[1.25rem]" />
                <span className={`whitespace-nowrap transition-all duration-300 ${isExpanded ? 'opacity-100' : 'opacity-0 w-0 hidden'}`}>
                  Configurações
                </span>
              </button>
            )}

            <button 
                onClick={onLogout}
                disabled={!user}
                className={`
                w-full flex items-center gap-4 px-4 py-3 rounded-2xl text-sm font-medium text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors
                ${!isExpanded ? 'justify-center' : ''}
                `}
            >
                <LogOut className="w-5 h-5 min-w-[1.25rem]" />
                <span className={`whitespace-nowrap transition-all duration-300 ${isExpanded ? 'opacity-100' : 'opacity-0 w-0 hidden'}`}>
                    Sair
                </span>
            </button>

            <div className={`mt-2 flex items-center gap-3 p-2 rounded-2xl border transition-all duration-300 
                ${isExpanded 
                    ? 'bg-slate-50/50 dark:bg-white/5 border-slate-100 dark:border-white/5' 
                    : 'bg-transparent border-transparent justify-center'}
            `}>
                <div className="w-9 h-9 min-w-[2.25rem] rounded-full bg-slate-200 dark:bg-slate-800 flex items-center justify-center overflow-hidden border border-white dark:border-white/10 shadow-sm">
                {user?.avatar ? (
                    <img src={user.avatar} alt="Avatar" className="w-full h-full object-cover" />
                ) : (
                    <UserIcon className="w-4 h-4 text-slate-500 dark:text-slate-400" />
                )}
                </div>
                
                <div className={`flex-1 min-w-0 overflow-hidden transition-all duration-300 ${isExpanded ? 'opacity-100' : 'opacity-0 w-0 hidden'}`}>
                    <p className="text-xs font-bold truncate text-slate-800 dark:text-white">
                        {user ? user.name.split(' ')[0] : '...'}
                    </p>
                    <p className="text-[9px] text-brand-600 dark:text-brand-400 font-bold uppercase truncate tracking-wider">
                        {user ? formatRole(user.role) : ''}
                    </p>
                </div>
            </div>
        </div>
      </aside>

      {/* MOBILE BOTTOM NAVIGATION */}
      <nav 
        className={`
            lg:hidden fixed bottom-0 left-0 right-0 z-[900] 
            bg-white/95 dark:bg-[#0f172a]/95 backdrop-blur-xl 
            border-t border-slate-200 dark:border-white/10 
            pb-safe-area shadow-[0_-4px_20px_rgba(0,0,0,0.05)]
            transition-transform duration-300 ease-in-out
            ${showMobileDock ? 'translate-y-0' : 'translate-y-full'}
        `}
      >
        <div className="flex items-center justify-around h-[76px] px-2 pb-2">
            {visibleItems.map((item) => {
            const isActive = currentView === item.id;
            const Icon = item.icon;
            
            return (
                <button
                key={item.id}
                onClick={() => handleNavigation(item.id as ViewState)}
                className={`
                    flex flex-col items-center justify-center gap-1.5 w-full h-full transition-all duration-200 active:scale-95
                    ${isActive ? 'text-brand-600 dark:text-brand-400' : 'text-slate-400 dark:text-slate-500'}
                `}
                >
                <div className={`
                    relative p-2 rounded-2xl transition-all duration-300
                    ${isActive ? 'bg-brand-50 dark:bg-brand-500/20 -translate-y-1' : ''}
                `}>
                    <Icon 
                    className={`w-6 h-6 transition-all ${isActive ? 'stroke-[2.5px] scale-110' : 'stroke-2'}`} 
                    />
                </div>
                <span className={`text-[10px] font-bold tracking-wide transition-opacity ${isActive ? 'opacity-100' : 'opacity-60'}`}>
                    {item.label}
                </span>
                </button>
            )
            })}
            
            {/* Mobile Settings Link - Available for everyone */}
            <button
                onClick={() => handleNavigation('admin_panel')}
                className={`
                flex flex-col items-center justify-center gap-1.5 w-full h-full transition-all duration-200 active:scale-95
                ${currentView === 'admin_panel' ? 'text-brand-600 dark:text-brand-400' : 'text-slate-400 dark:text-slate-500'}
                `}
            >
                <div className={`relative p-2 rounded-2xl transition-all duration-300 ${currentView === 'admin_panel' ? 'bg-brand-50 dark:bg-brand-500/20 -translate-y-1' : ''}`}>
                <Settings className={`w-6 h-6 ${currentView === 'admin_panel' ? 'stroke-[2.5px]' : 'stroke-2'}`} />
                </div>
                <span className={`text-[10px] font-bold tracking-wide ${currentView === 'admin_panel' ? 'opacity-100' : 'opacity-60'}`}>
                Configurações
                </span>
            </button>
        </div>
      </nav>
    </>
  );
});

export default Sidebar;