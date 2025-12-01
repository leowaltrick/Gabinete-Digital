import React, { useState, useEffect } from 'react';
import { User, Role, SystemConfig, ViewState, WeatherLocation, Notice, DashboardWidgetsConfig } from '../types';
import { Shield, UserPlus, Save, CheckCircle, Loader2, User as UserIcon, Mail, Settings, Users, Lock, Edit2, ChevronRight, Fingerprint, Activity, MapPin, Search, X, Power, LayoutDashboard, Globe, ChevronLeft, Trash2, Megaphone, Plus, Calendar, AlertTriangle, Info, ToggleRight, Sun, Moon, LogOut } from 'lucide-react';
import { supabase, isSupabaseConfigured } from '../services/supabaseClient';
import Pagination from './Pagination';
import UserDetailsModal from './UserDetailsModal';
import StatCard from './StatCard';
import SegmentedControl from './SegmentedControl';

interface AdminScreenProps {
  currentUser: User;
  systemConfig: SystemConfig;
  onUpdateConfig: (config: SystemConfig) => void;
  onUpdateLocation?: (locations: WeatherLocation[]) => void;
  onNotification?: (type: 'success' | 'error', message: string) => void;
  onLogout?: () => void;
  toggleTheme?: () => void;
  isDarkMode?: boolean;
}

const AdminScreen: React.FC<AdminScreenProps> = ({ 
    currentUser, 
    systemConfig, 
    onUpdateConfig, 
    onUpdateLocation, 
    onNotification,
    onLogout,
    toggleTheme,
    isDarkMode
}) => {
  const [activeTab, setActiveTab] = useState<'users' | 'permissions' | 'general'>('general');

  const [usersList, setUsersList] = useState<any[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<any[]>([]);
  const [isLoadingUsers, setIsLoadingUsers] = useState(false);
  
  // -- Filters for Users Tab --
  const [userSearchTerm, setUserSearchTerm] = useState('');
  const [userRoleFilter, setUserRoleFilter] = useState<string[]>([]);
  const [userStatusFilter, setUserStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');
  
  const [showUserModal, setShowUserModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState<any>(null);
  
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // -- Filters for Permissions Tab --
  const [selectedRoleForConfig, setSelectedRoleForConfig] = useState<Role>('assessor');
  
  // -- Filters for General Tab --
  const [citySearch, setCitySearch] = useState('');
  const [isSearchingCity, setIsSearchingCity] = useState(false);
  const [cityResults, setCityResults] = useState<any[]>([]);
  const [currentLocations, setCurrentLocations] = useState<WeatherLocation[]>([]);
  
  // Notice Board State
  const [notices, setNotices] = useState<Notice[]>([]);
  const [newNoticeTitle, setNewNoticeTitle] = useState('');
  const [newNoticeDate, setNewNoticeDate] = useState('');
  const [newNoticeType, setNewNoticeType] = useState<'general' | 'alert' | 'event'>('general');

  const isAdmin = currentUser.role === 'administrador';

  useEffect(() => {
    if (isAdmin) {
        fetchUsers();
    }
    
    const loadLocations = async () => {
        if(isSupabaseConfigured() && supabase) {
            const { data } = await supabase.from('app_config').select('value').eq('key', 'weather_locations').maybeSingle();
            if(data && data.value) setCurrentLocations(data.value);
        } else {
            const storedLocs = localStorage.getItem('geo_locations');
            if (storedLocs) setCurrentLocations(JSON.parse(storedLocs));
        }
    }
    loadLocations();
    
    const loadNotices = async () => {
        if(isSupabaseConfigured() && supabase) {
            const { data } = await supabase.from('app_config').select('value').eq('key', 'dashboard_notices').maybeSingle();
            if(data) setNotices(data.value);
        } else {
             const storedNotices = localStorage.getItem('geo_notices');
             if (storedNotices) setNotices(JSON.parse(storedNotices));
        }
    }
    loadNotices();

  }, [isAdmin]);

  useEffect(() => {
      const filtered = usersList.filter(u => {
          const matchesSearch = u.nome.toLowerCase().includes(userSearchTerm.toLowerCase()) ||
                                u.email.toLowerCase().includes(userSearchTerm.toLowerCase());
          
          const matchesRole = userRoleFilter.length === 0 || userRoleFilter.includes(u.perfil);
          
          const matchesStatus = userStatusFilter === 'all' 
              ? true 
              : userStatusFilter === 'active' ? u.ativo : !u.ativo;

          return matchesSearch && matchesRole && matchesStatus;
      });
      setFilteredUsers(filtered);
      setCurrentPage(1);
  }, [userSearchTerm, userRoleFilter, userStatusFilter, usersList]);

  const fetchUsers = async () => {
    if (!isSupabaseConfigured() || !supabase) return;
    setIsLoadingUsers(true);
    try {
        const { data, error } = await supabase.from('system_users').select('*').order('nome');
        if (error) throw error;
        setUsersList(data || []);
    } catch (err) {
        console.error(err);
    } finally {
        setIsLoadingUsers(false);
    }
  };

  const hashPassword = async (message: string) => {
    const msgBuffer = new TextEncoder().encode(message);
    const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  };

  const handleSaveUser = async (userId: string, data: { nome: string, email: string, perfil: Role }) => {
    try {
      if (!isSupabaseConfigured() || !supabase) throw new Error("Supabase não conectado.");

      if (userId) {
           const { error } = await supabase.from('system_users').update({ nome: data.nome, email: data.email, perfil: data.perfil }).eq('id', userId);
           if (error) throw error;
           if(onNotification) onNotification('success', 'Dados atualizados com sucesso!');
      } else {
          const defaultHash = await hashPassword("Senha4321");
          const { data: existingUser } = await supabase.from('system_users').select('*').eq('email', data.email).maybeSingle();

          if (existingUser) {
              if (existingUser.ativo) {
                  throw new Error("Este email já está em uso por um usuário ativo.");
              } else {
                  const confirmReactivate = window.confirm("Este email pertence a um usuário desativado. Deseja reativar o acesso com os novos dados?");
                  if (!confirmReactivate) return;
                  const { error } = await supabase.from('system_users').update({
                      nome: data.nome, perfil: data.perfil, ativo: true, senha_hash: defaultHash, last_login: null
                  }).eq('id', existingUser.id);
                  if (error) throw error;
                  if(onNotification) onNotification('success', 'Usuário reativado com sucesso! Senha: Senha4321');
              }
          } else {
              const payload = { nome: data.nome, email: data.email, perfil: data.perfil, ativo: true, senha_hash: defaultHash, last_login: null };
              const { error } = await supabase.from('system_users').insert(payload);
              if (error) throw error;
              if(onNotification) onNotification('success', 'Usuário criado! Senha padrão: Senha4321');
          }
      }
      fetchUsers();
      setShowUserModal(false);
    } catch (err: any) {
      if(onNotification) onNotification('error', err.message || "Erro ao salvar.");
    }
  };

  const handleOpenUserModal = (user: any = null) => {
      setSelectedUser(user || { nome: '', email: '', perfil: 'assessor', ativo: true });
      setShowUserModal(true);
  };

  const handleToggleActive = async (user: any) => {
      if (user.email === 'admin@admin') { if(onNotification) onNotification('error', 'Admin principal não pode ser alterado.'); return; }
      if (user.id === currentUser.id) { if(onNotification) onNotification('error', 'Você não pode desativar seu próprio usuário.'); return; }

      const newStatus = !user.ativo;
      const action = newStatus ? 'ativar' : 'desativar';
      const confirmAction = window.confirm(`Tem certeza que deseja ${action} o acesso de "${user.nome}"?`);
      if (!confirmAction) return;

      if (!isSupabaseConfigured() || !supabase) return;
      try {
          const { error } = await supabase.from('system_users').update({ ativo: newStatus }).eq('id', user.id);
          if (error) throw error;
          setUsersList(prev => prev.map(u => u.id === user.id ? { ...u, ativo: newStatus } : u));
          if(onNotification) onNotification('success', `Usuário ${newStatus ? 'ativado' : 'desativado'} com sucesso.`);
          if (showUserModal && selectedUser?.id === user.id) setShowUserModal(false);
      } catch (err: any) {
          console.error("Erro ao alterar status:", err);
          if(onNotification) onNotification('error', 'Erro: ' + err.message);
      }
  };

  const handleResetPassword = async (user: any) => {
      const confirm = window.confirm(`Resetar a senha de ${user.nome} para "Senha4321"?`);
      if(!confirm) return;
      if (!isSupabaseConfigured() || !supabase) return;
      try {
          const defaultHash = await hashPassword("Senha4321");
          const { error } = await supabase.from('system_users').update({ senha_hash: defaultHash, last_login: null }).eq('id', user.id);
          if (error) throw error;
          if(onNotification) onNotification('success', 'Senha resetada para "Senha4321".');
      } catch(err: any) {
          if(onNotification) onNotification('error', 'Erro: ' + err.message);
      }
  };

  const formatRole = (role: string) => role.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');

  const toggleViewPermission = (view: ViewState) => {
      if (selectedRoleForConfig === 'administrador') return;
      
      const currentConfig = systemConfig[selectedRoleForConfig];
      const views = currentConfig.allowedViews;
      const newViews = views.includes(view) ? views.filter(v => v !== view) : [...views, view];
      
      const newConfig = {
          ...systemConfig,
          [selectedRoleForConfig]: { ...currentConfig, allowedViews: newViews }
      };
      onUpdateConfig(newConfig);
      if(onNotification) onNotification('success', 'Permissões atualizadas.');
  };

  const toggleWidgetPermission = (widget: keyof DashboardWidgetsConfig) => {
      if (selectedRoleForConfig === 'administrador') return;
      
      const currentConfig = systemConfig[selectedRoleForConfig];
      const widgets = currentConfig.dashboardWidgets;
      
      const newConfig = {
          ...systemConfig,
          [selectedRoleForConfig]: { 
              ...currentConfig, 
              dashboardWidgets: { ...widgets, [widget]: !widgets[widget] } 
            }
      };
      onUpdateConfig(newConfig);
      if(onNotification) onNotification('success', 'Layout do dashboard atualizado.');
  };

  const toggleCreatePermission = (permission: 'canCreateDemand' | 'canCreateCitizen') => {
      if (selectedRoleForConfig === 'administrador') return;
      
      const currentConfig = systemConfig[selectedRoleForConfig];
      const newConfig = {
          ...systemConfig,
          [selectedRoleForConfig]: { 
              ...currentConfig, 
              [permission]: !currentConfig[permission]
            }
      };
      onUpdateConfig(newConfig);
      if(onNotification) onNotification('success', 'Permissão de criação atualizada.');
  };

  const handleSearchCity = async (e: React.FormEvent) => {
      e.preventDefault();
      if (!citySearch.trim()) return;
      setIsSearchingCity(true);
      setCityResults([]);
      try {
          const response = await fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(citySearch)}&count=5&language=pt&format=json`);
          const data = await response.json();
          if (data.results) setCityResults(data.results);
          else if(onNotification) onNotification('error', 'Nenhuma cidade encontrada.');
      } catch (err) {
          console.error(err);
          if(onNotification) onNotification('error', 'Erro ao buscar cidade.');
      } finally {
          setIsSearchingCity(false);
      }
  };

  const handleSelectCity = async (result: any) => {
      const location: WeatherLocation = { id: crypto.randomUUID(), name: result.name, lat: result.latitude, lon: result.longitude };
      const newLocations = [location]; 
      
      setCurrentLocations(newLocations);
      setCityResults([]);
      setCitySearch('');
      
      if (onUpdateLocation) onUpdateLocation(newLocations);
      await updateLocationsGlobal(newLocations);
      
      if(onNotification) onNotification('success', 'Localização padrão atualizada.');
  };

  const handleRemoveCity = async () => {
      setCurrentLocations([]);
      if (onUpdateLocation) onUpdateLocation([]);
      await updateLocationsGlobal([]);
      if(onNotification) onNotification('success', 'Localização padrão removida.');
  };

  const updateLocationsGlobal = async (locs: WeatherLocation[]) => {
      if (isSupabaseConfigured() && supabase) {
          try { 
              const { error } = await supabase.from('app_config').upsert({ key: 'weather_locations', value: locs });
              if (error) throw error;
          } catch(e: any) { 
              console.error("Erro ao salvar configuração de localização:", e);
              if(onNotification) onNotification('error', 'Erro ao salvar no banco de dados.');
          }
      } else {
          localStorage.setItem('geo_locations', JSON.stringify(locs));
      }
  };

  const handleAddNotice = async () => {
      if (!newNoticeTitle.trim() || !newNoticeDate) {
          if(onNotification) onNotification('error', 'Preencha título e data.');
          return;
      }

      const newNotice: Notice = {
          id: crypto.randomUUID(),
          title: newNoticeTitle,
          content: '',
          date: newNoticeDate,
          type: newNoticeType,
          createdAt: new Date().toISOString()
      };

      const updatedNotices = [newNotice, ...notices];
      setNotices(updatedNotices);
      
      if (isSupabaseConfigured() && supabase) {
          try { await supabase.from('app_config').upsert({ key: 'dashboard_notices', value: updatedNotices }); } catch(e) { console.error(e); }
      } else {
          localStorage.setItem('geo_notices', JSON.stringify(updatedNotices));
      }

      setNewNoticeTitle('');
      setNewNoticeDate('');
      if(onNotification) onNotification('success', 'Aviso adicionado ao mural e calendário.');
      setTimeout(() => window.location.reload(), 500);
  };

  const handleRemoveNotice = async (id: string) => {
      const updatedNotices = notices.filter(n => n.id !== id);
      setNotices(updatedNotices);
      
      if (isSupabaseConfigured() && supabase) {
          try { await supabase.from('app_config').upsert({ key: 'dashboard_notices', value: updatedNotices }); } catch(e) { console.error(e); }
      } else {
          localStorage.setItem('geo_notices', JSON.stringify(updatedNotices));
      }
       setTimeout(() => window.location.reload(), 500);
  };

  const IOSSwitch = ({ checked, onChange, disabled }: { checked: boolean, onChange: () => void, disabled?: boolean }) => (
      <button onClick={onChange} disabled={disabled} className={`w-11 h-6 rounded-full transition-colors duration-300 relative focus:outline-none shadow-md ${checked ? 'bg-brand-500' : 'bg-slate-300 dark:bg-white/20'} ${disabled ? 'opacity-70 cursor-not-allowed' : ''}`}>
          <div className={`w-5 h-5 bg-white rounded-full shadow-md absolute top-0.5 transition-transform duration-300 ${checked ? 'left-[22px]' : 'left-0.5'}`} />
      </button>
  );

  const isConfigLocked = selectedRoleForConfig === 'administrador';
  const totalPages = Math.ceil(filteredUsers.length / itemsPerPage);
  const currentUsers = filteredUsers.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  const getNoticeIcon = (type: string) => {
      switch(type) {
          case 'alert': return <AlertTriangle className="w-4 h-4 text-red-500" />;
          case 'event': return <Calendar className="w-4 h-4 text-blue-500" />;
          default: return <Info className="w-4 h-4 text-slate-500" />;
      }
  };

  if (!isAdmin) {
      return (
          <div className="h-full flex flex-col items-center p-6 animate-in fade-in slide-in-from-right duration-500">
              <div className="w-full max-w-md space-y-8">
                  <div className="text-center">
                      <h1 className="text-3xl font-bold text-slate-900 dark:text-white tracking-tight flex items-center justify-center gap-3">
                          <Settings className="w-10 h-10 text-brand-600 dark:text-brand-400" />
                          Configurações
                      </h1>
                      <p className="text-slate-500 dark:text-blue-200/50 mt-2 font-medium">Preferências e Conta.</p>
                  </div>

                  <div className="glass-panel p-6 rounded-3xl border border-slate-200 dark:border-white/10 space-y-4 shadow-lg">
                        <button onClick={toggleTheme} className="w-full flex items-center justify-between p-4 rounded-2xl bg-slate-50 dark:bg-white/5 hover:bg-slate-100 dark:hover:bg-white/10 transition-colors border border-slate-100 dark:border-white/5 group">
                            <div className="flex items-center gap-4"><div className="w-10 h-10 rounded-full bg-indigo-100 dark:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 flex items-center justify-center group-hover:scale-110 transition-transform">{isDarkMode ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}</div><span className="font-bold text-slate-700 dark:text-white">Aparência</span></div>
                            <span className="text-sm font-medium text-slate-500 dark:text-white/50">{isDarkMode ? 'Modo Escuro' : 'Modo Claro'}</span>
                        </button>
                        <button onClick={onLogout} className="w-full flex items-center justify-between p-4 rounded-2xl bg-red-50 dark:bg-red-500/10 hover:bg-red-100 dark:hover:bg-red-500/20 transition-colors border border-red-100 dark:border-red-500/10 group">
                            <div className="flex items-center gap-4"><div className="w-10 h-10 rounded-full bg-red-100 dark:bg-red-500/20 text-red-600 dark:text-red-400 flex items-center justify-center group-hover:scale-110 transition-transform"><LogOut className="w-5 h-5" /></div><span className="font-bold text-red-700 dark:text-red-400">Sair do Sistema</span></div>
                        </button>
                  </div>
              </div>
          </div>
      );
  }

  return (
    <div className="h-full flex flex-col gap-4 animate-in slide-in-from-right duration-500 relative w-full">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 shrink-0">
        <div className="flex items-center gap-2">
            <div>
                <h1 className="text-3xl font-bold text-slate-900 dark:text-white tracking-tight flex items-center gap-3">
                    <Settings className="w-8 h-8 text-brand-600 dark:text-brand-400" />
                    Configurações
                </h1>
                <p className="text-slate-500 dark:text-blue-200/50 mt-1 font-medium">Controle de acesso, usuários e customização.</p>
            </div>
        </div>
        <div className="w-full md:w-[400px]">
            <SegmentedControl value={activeTab} onChange={(val) => setActiveTab(val as any)} options={[{ value: 'general', label: 'Geral', icon: Globe }, { value: 'users', label: 'Usuários', icon: Users }, { value: 'permissions', label: 'Permissões', icon: Lock }]} />
        </div>
      </div>

      <div className="flex-1 flex flex-col min-h-0 w-full overflow-hidden relative">
          {activeTab === 'users' && (
              <div className="h-full flex flex-col gap-4 w-full">
                    {/* Filters Bar (Moved Above Stats) */}
                    <div className="shrink-0 glass-panel p-2 md:p-3 rounded-2xl shadow-sm border border-slate-200 dark:border-white/10 flex flex-col md:flex-row gap-3 items-center relative z-20 bg-white/80 dark:bg-[#020617]/80 backdrop-blur-xl">
                        <div className="flex-1 w-full relative group">
                            <input type="text" value={userSearchTerm} onChange={(e) => setUserSearchTerm(e.target.value)} placeholder="Buscar por nome ou email..." className="w-full pl-11 pr-4 py-3 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl outline-none focus:border-brand-500 focus:bg-white dark:focus:bg-black/20 transition-all font-medium text-slate-700 dark:text-white placeholder:text-slate-400 h-11 text-sm"/>
                            <Search className="w-5 h-5 text-slate-400 absolute left-3.5 top-3 group-focus-within:text-brand-500 transition-colors" />
                            {userSearchTerm && <button onClick={() => setUserSearchTerm('')} className="absolute right-3 top-3 text-slate-400 hover:text-slate-600 dark:hover:text-white"><X className="w-5 h-5" /></button>}
                        </div>
                        <div className="flex gap-2 w-full md:w-auto overflow-x-auto pb-1 md:pb-0">
                                <div className="min-w-[140px]">
                                <select value={userStatusFilter} onChange={(e) => setUserStatusFilter(e.target.value as any)} className="w-full px-3 py-2.5 glass-input border border-slate-300 dark:border-white/10 rounded-xl outline-none focus:border-brand-500 font-bold text-slate-700 dark:text-white cursor-pointer bg-transparent text-sm h-11">
                                    <option value="all">Todos Status</option><option value="active">Ativos</option><option value="inactive">Inativos</option>
                                </select>
                                </div>
                                <button onClick={() => handleOpenUserModal()} className="px-4 py-2.5 bg-brand-600 hover:bg-brand-500 text-white rounded-xl font-bold shadow-lg shadow-brand-500/20 transition-all flex items-center justify-center gap-2 whitespace-nowrap active:scale-95 h-11"><UserPlus className="w-5 h-5" /> <span className="hidden sm:inline">Novo Usuário</span></button>
                        </div>
                    </div>

                    {/* Stats */}
                    <div className="shrink-0 grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
                        <StatCard title="Total Usuários" value={usersList.length} icon={Users} colorClass="bg-blue-500" textClass="text-blue-600 dark:text-blue-400" />
                        <StatCard title="Ativos" value={usersList.filter(u => u.ativo).length} icon={CheckCircle} colorClass="bg-green-500" textClass="text-green-600 dark:text-green-400" />
                        <StatCard title="Bloqueados" value={usersList.filter(u => !u.ativo).length} icon={Shield} colorClass="bg-red-500" textClass="text-red-600 dark:text-red-400" />
                        <StatCard title="Admin" value={usersList.filter(u => u.perfil === 'administrador').length} icon={Lock} colorClass="bg-purple-500" textClass="text-purple-600 dark:text-purple-400" />
                    </div>

                    {/* Users List */}
                    <div className="flex-1 flex flex-col min-h-0 glass-panel rounded-3xl border border-slate-200 dark:border-white/10 bg-white/50 dark:bg-slate-900/50 overflow-hidden shadow-sm relative w-full">
                        <div className="flex-1 overflow-y-auto custom-scrollbar w-full">
                            {/* Desktop Table */}
                            <table className="w-full text-left border-collapse hidden md:table">
                                <thead className="sticky top-0 bg-slate-50/90 dark:bg-slate-900/90 backdrop-blur-sm z-10 shadow-sm">
                                    <tr className="border-b border-slate-200 dark:border-white/10 text-xs font-bold text-slate-500 dark:text-blue-200/50 uppercase tracking-wider">
                                        <th className="p-4 first:pl-6 w-[40%]">Usuário</th>
                                        <th className="p-4 w-[25%]">Perfil</th>
                                        <th className="p-4 w-[25%]">Status</th>
                                        <th className="p-4 text-right last:pr-6 w-[10%]">Ação</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-200 dark:divide-white/5 text-sm">
                                    {currentUsers.map(user => {
                                        const isInactive = !user.ativo;
                                        return (
                                            <tr key={user.id} onClick={() => handleOpenUserModal(user)} className={`hover:bg-white/60 dark:hover:bg-white/5 transition-colors cursor-pointer group ${isInactive ? 'opacity-60 bg-slate-50 dark:bg-white/5' : ''}`}>
                                                <td className="p-4 first:pl-6">
                                                    <div className="flex items-center gap-3">
                                                        <div className={`w-9 h-9 rounded-full flex items-center justify-center font-bold text-xs border border-slate-200 dark:border-white/10 ${isInactive ? 'bg-slate-200 text-slate-400' : 'bg-slate-100 dark:bg-white/10 text-slate-600 dark:text-white'}`}>{user.nome.charAt(0)}</div>
                                                        <div><div className={`font-bold ${isInactive ? 'line-through text-slate-500' : 'text-slate-900 dark:text-white'}`}>{user.nome}</div><div className="text-xs text-slate-500 dark:text-white/50">{user.email}</div></div>
                                                    </div>
                                                </td>
                                                <td className="p-4"><span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${user.perfil === 'administrador' ? 'bg-purple-100 text-purple-600 dark:bg-purple-500/10 dark:text-purple-300' : user.perfil === 'chefe_de_gabinete' ? 'bg-indigo-100 text-indigo-600 dark:bg-indigo-500/10 dark:text-indigo-300' : 'bg-blue-100 text-blue-600 dark:bg-blue-500/10 dark:text-blue-300'}`}>{formatRole(user.perfil)}</span></td>
                                                <td className="p-4">{user.ativo ? <span className="flex items-center gap-1.5 text-green-600 dark:text-green-400 text-xs font-bold"><CheckCircle className="w-3.5 h-3.5" /> Ativo</span> : <span className="flex items-center gap-1.5 text-slate-400 text-xs font-bold"><X className="w-3.5 h-3.5" /> Inativo</span>}</td>
                                                <td className="p-4 text-right last:pr-6"><div className="p-2 text-slate-400 group-hover:text-brand-600 transition-colors inline-flex bg-slate-100 dark:bg-white/5 rounded-lg group-hover:bg-brand-50 dark:group-hover:bg-brand-500/10"><Edit2 className="w-4 h-4" /></div></td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>

                            {/* Mobile Card View */}
                            <div className="md:hidden space-y-3 p-3">
                                {currentUsers.map(user => {
                                    const isInactive = !user.ativo;
                                    return (
                                        <div key={user.id} onClick={() => handleOpenUserModal(user)} className={`glass-panel p-4 rounded-2xl border border-slate-200 dark:border-white/10 shadow-sm active:scale-[0.98] transition-all cursor-pointer flex flex-col gap-3 ${isInactive ? 'opacity-60 bg-slate-50 dark:bg-white/5' : ''}`}>
                                            <div className="flex items-center gap-3">
                                                <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-lg border border-slate-200 dark:border-white/10 ${isInactive ? 'bg-slate-200 text-slate-400' : 'bg-brand-100 dark:bg-brand-500/20 text-brand-600 dark:text-brand-400'}`}>{user.nome.charAt(0)}</div>
                                                <div className="flex-1 min-w-0">
                                                    <div className="font-bold text-slate-900 dark:text-white truncate">{user.nome}</div>
                                                    <div className="text-xs text-slate-500 dark:text-white/50 truncate">{user.email}</div>
                                                </div>
                                                <div className="p-2 text-slate-400 bg-slate-100 dark:bg-white/5 rounded-lg"><Edit2 className="w-4 h-4" /></div>
                                            </div>
                                            <div className="flex items-center justify-between border-t border-slate-100 dark:border-white/5 pt-3">
                                                <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${user.perfil === 'administrador' ? 'bg-purple-100 text-purple-600 dark:bg-purple-500/10 dark:text-purple-300' : user.perfil === 'chefe_de_gabinete' ? 'bg-indigo-100 text-indigo-600 dark:bg-indigo-500/10 dark:text-indigo-300' : 'bg-blue-100 text-blue-600 dark:bg-blue-500/10 dark:text-blue-300'}`}>{formatRole(user.perfil)}</span>
                                                {user.ativo ? <span className="flex items-center gap-1.5 text-green-600 dark:text-green-400 text-xs font-bold"><CheckCircle className="w-3.5 h-3.5" /> Ativo</span> : <span className="flex items-center gap-1.5 text-slate-400 text-xs font-bold"><X className="w-3.5 h-3.5" /> Inativo</span>}
                                            </div>
                                        </div>
                                    )
                                })}
                            </div>
                        </div>
                        <div className="shrink-0 bg-slate-50/50 dark:bg-slate-900/50 border-t border-slate-200 dark:border-white/5 z-20">
                            <Pagination currentPage={currentPage} totalPages={totalPages} onPageChange={setCurrentPage} totalItems={filteredUsers.length} itemsPerPage={itemsPerPage} />
                        </div>
                    </div>
              </div>
          )}
          
          {activeTab === 'permissions' && (
              <div className="flex flex-col lg:flex-row h-full glass-panel rounded-3xl overflow-hidden border border-slate-200 dark:border-white/10">
                  {/* Mobile Horizontal Role Selector */}
                  <div className="lg:hidden flex overflow-x-auto gap-2 p-3 border-b border-slate-200 dark:border-white/10 bg-slate-50/50 dark:bg-white/5 shrink-0 scrollbar-none">
                      {['administrador', 'chefe_de_gabinete', 'assessor'].map((role) => (
                          <button key={role} onClick={() => setSelectedRoleForConfig(role as Role)} className={`whitespace-nowrap px-4 py-2 rounded-xl text-xs font-bold transition-all border ${selectedRoleForConfig === role ? 'bg-brand-600 text-white border-brand-500 shadow-md' : 'bg-white dark:bg-white/5 text-slate-600 dark:text-white border-slate-200 dark:border-white/10'}`}>
                              {formatRole(role)}
                          </button>
                      ))}
                  </div>

                  {/* Desktop Vertical Sidebar */}
                  <div className="hidden lg:block lg:w-1/4 border-r border-slate-200 dark:border-white/10 p-4 space-y-2 bg-slate-50/50 dark:bg-white/5 shrink-0">
                      <h3 className="text-sm font-bold text-slate-500 dark:text-white/50 uppercase tracking-wider mb-4 px-2">Perfis de Acesso</h3>
                      {['administrador', 'chefe_de_gabinete', 'assessor'].map((role) => (
                          <button key={role} onClick={() => setSelectedRoleForConfig(role as Role)} className={`w-full p-4 rounded-xl text-left border transition-all relative overflow-hidden group flex items-center justify-between ${selectedRoleForConfig === role ? 'bg-brand-600 text-white border-brand-500 shadow-md' : 'bg-white dark:bg-white/5 text-slate-600 dark:text-white border-transparent hover:bg-slate-50 dark:hover:bg-white/10'}`}>
                              <div className="flex items-center gap-3"><div className={`p-2 rounded-lg ${selectedRoleForConfig === role ? 'bg-white/20' : 'bg-slate-100 dark:bg-white/10'}`}><Fingerprint className="w-4 h-4" /></div><span className="font-bold">{formatRole(role)}</span></div>
                              {selectedRoleForConfig === role && <ChevronRight className="w-5 h-5 opacity-80" />}
                          </button>
                      ))}
                  </div>

                  <div className="flex-1 flex flex-col min-h-0 bg-white dark:bg-transparent">
                      <div className="flex-1 p-4 md:p-6 lg:p-8 space-y-8 overflow-y-auto custom-scrollbar">
                          {isConfigLocked && (<div className="bg-amber-50 dark:bg-amber-900/10 border border-amber-200 dark:border-amber-900/30 text-amber-800 dark:text-amber-200 p-4 rounded-2xl flex items-center gap-3 animate-in fade-in"><Lock className="w-5 h-5" /><span className="text-sm font-bold">O perfil de Administrador possui acesso total.</span></div>)}
                          
                          {/* Creation Permissions */}
                          <div>
                              <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-4 flex items-center gap-2"><ToggleRight className="w-5 h-5 text-brand-600" /> Ações de Criação</h3>
                              <div className="divide-y divide-slate-100 dark:divide-white/5 border border-slate-100 dark:border-white/5 rounded-xl bg-slate-50/30 dark:bg-white/5 px-4">
                                  {[{id: 'canCreateCitizen', label: 'Cadastrar Cidadãos', desc: 'Permite adicionar novos perfis à base'}, {id: 'canCreateDemand', label: 'Criar Demandas', desc: 'Permite abrir novas solicitações'}].map((perm) => {
                                      // @ts-ignore
                                      const isAllowed = systemConfig[selectedRoleForConfig][perm.id];
                                      return (
                                        <div key={perm.id} className="py-4 flex items-center justify-between">
                                            <div className="flex items-center gap-4"><div className={`p-2.5 rounded-xl ${isAllowed ? 'bg-green-100 text-green-600 dark:bg-green-500/20 dark:text-green-300' : 'bg-slate-100 text-slate-400 dark:bg-white/5 dark:text-white/30'}`}><Plus className="w-5 h-5" /></div><div><p className={`font-bold text-sm ${isAllowed ? 'text-slate-900 dark:text-white' : 'text-slate-500 dark:text-white/50'}`}>{perm.label}</p><p className="text-xs text-slate-400 dark:text-white/40">{perm.desc}</p></div></div>
                                            <div className="flex items-center gap-2">{isConfigLocked && <Lock className="w-3 h-3 text-slate-400" />}<IOSSwitch checked={isAllowed} onChange={() => toggleCreatePermission(perm.id as any)} disabled={isConfigLocked} /></div>
                                        </div>
                                      )
                                  })}
                              </div>
                          </div>

                          {/* Views Configuration */}
                          <div>
                              <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-4 flex items-center gap-2"><LayoutDashboard className="w-5 h-5 text-brand-600" /> Telas Visíveis</h3>
                              <div className="divide-y divide-slate-100 dark:divide-white/5 border border-slate-100 dark:border-white/5 rounded-xl bg-slate-50/30 dark:bg-white/5 px-4">
                                  {[{ id: 'dashboard', label: 'Dashboard Principal', desc: 'Visão geral e KPIs', icon: Activity }, { id: 'demands', label: 'Gestão de Demandas', desc: 'Listagem e quadros', icon: LayoutDashboard }, { id: 'people', label: 'Gestão de Cidadãos', desc: 'Base de contatos', icon: Users }, { id: 'map', label: 'Mapa', desc: 'Visualização geoespacial', icon: MapPin }, { id: 'new-demand', label: 'Criação de Demandas', desc: 'Formulários de entrada', icon: Edit2 }, { id: 'admin_panel', label: 'Painel Admin', desc: 'Configurações do sistema', icon: Settings }].map((view) => {
                                      const isAllowed = systemConfig[selectedRoleForConfig].allowedViews.includes(view.id as ViewState);
                                      const Icon = view.icon;
                                      return (
                                          <div key={view.id} className="py-4 flex items-center justify-between">
                                              <div className="flex items-center gap-4"><div className={`p-2.5 rounded-xl ${isAllowed ? 'bg-blue-100 text-blue-600 dark:bg-blue-500/20 dark:text-blue-300' : 'bg-slate-100 text-slate-400 dark:bg-white/5 dark:text-white/30'}`}><Icon className="w-5 h-5" /></div><div><p className={`font-bold text-sm ${isAllowed ? 'text-slate-900 dark:text-white' : 'text-slate-500 dark:text-white/50'}`}>{view.label}</p><p className="text-xs text-slate-400 dark:text-white/40">{view.desc}</p></div></div>
                                              <div className="flex items-center gap-2">{isConfigLocked && <Lock className="w-3 h-3 text-slate-400" />}<IOSSwitch checked={isAllowed} onChange={() => toggleViewPermission(view.id as ViewState)} disabled={isConfigLocked} /></div>
                                          </div>
                                      );
                                  })}
                              </div>
                          </div>

                          {/* Dashboard Widgets Configuration */}
                          <div>
                              <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-4 flex items-center gap-2"><Activity className="w-5 h-5 text-brand-600" /> Widgets do Dashboard</h3>
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                  <div className="space-y-3">
                                    <h4 className="text-xs font-bold uppercase text-slate-500 dark:text-white/50 pl-1">Blocos de Totais</h4>
                                    <div className="divide-y divide-slate-100 dark:divide-white/5 border border-slate-100 dark:border-white/5 rounded-xl bg-slate-50/30 dark:bg-white/5 px-4">
                                        {[{id: 'showTotal', label: 'Total Demandas'},{id: 'showCitizens', label: 'Total Cidadãos'},{id: 'showPending', label: 'Pendentes'},{id: 'showInProgress', label: 'Em Andamento'},{id: 'showCompleted', label: 'Concluídas'},{id: 'showHighPriority', label: 'Alta Prioridade'}].map((w) => {
                                            const isEnabled = systemConfig[selectedRoleForConfig].dashboardWidgets[w.id as keyof DashboardWidgetsConfig];
                                            return (
                                                <div key={w.id} className="py-3 flex items-center justify-between"><span className={`text-sm font-medium ${isEnabled ? 'text-slate-700 dark:text-white' : 'text-slate-400'}`}>{w.label}</span><IOSSwitch checked={isEnabled as boolean} onChange={() => toggleWidgetPermission(w.id as keyof DashboardWidgetsConfig)} disabled={isConfigLocked} /></div>
                                            )
                                        })}
                                    </div>
                                  </div>
                                  <div className="space-y-3">
                                    <h4 className="text-xs font-bold uppercase text-slate-500 dark:text-white/50 pl-1">Seções Principais</h4>
                                    <div className="divide-y divide-slate-100 dark:divide-white/5 border border-slate-100 dark:border-white/5 rounded-xl bg-slate-50/30 dark:bg-white/5 px-4">
                                        {[{id: 'showAnalytics', label: 'Gráficos e Indicadores'},{id: 'showTags', label: 'Gráfico de Tags'},{id: 'showRecentActivity', label: 'Atividades Recentes'},{id: 'showUpcomingActivities', label: 'Próximos Prazos'},{id: 'showQuickAccess', label: 'Botão Acesso Rápido (FAB)'}].map((w) => {
                                            const isEnabled = systemConfig[selectedRoleForConfig].dashboardWidgets[w.id as keyof DashboardWidgetsConfig];
                                            return (
                                                <div key={w.id} className="py-3 flex items-center justify-between"><span className={`text-sm font-medium ${isEnabled ? 'text-slate-700 dark:text-white' : 'text-slate-400'}`}>{w.label}</span><IOSSwitch checked={isEnabled as boolean} onChange={() => toggleWidgetPermission(w.id as keyof DashboardWidgetsConfig)} disabled={isConfigLocked} /></div>
                                            )
                                        })}
                                    </div>
                                  </div>
                              </div>
                          </div>
                      </div>
                  </div>
              </div>
          )}
          
          {activeTab === 'general' && (
              <div className="glass-panel rounded-3xl border border-slate-200 dark:border-white/10 h-full p-4 md:p-8 flex justify-center items-start w-full overflow-y-auto custom-scrollbar">
                   <div className="w-full max-w-4xl space-y-8">
                       <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8">
                           {/* City Configuration */}
                           <div className="bg-slate-50/50 dark:bg-white/5 p-4 md:p-6 rounded-3xl border border-slate-100 dark:border-white/5">
                                <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-6 flex items-center gap-2"><MapPin className="w-5 h-5 text-brand-600" /> Localização Padrão</h3>
                                <form onSubmit={handleSearchCity} className="relative group mb-6">
                                        <input type="text" value={citySearch} onChange={(e) => setCitySearch(e.target.value)} placeholder="Buscar cidade..." className="w-full pl-10 pr-10 py-3 bg-white dark:bg-black/20 border border-slate-300 dark:border-white/10 rounded-xl outline-none focus:border-brand-500 transition-all text-sm font-medium text-slate-900 dark:text-white placeholder:text-slate-400"/>
                                        <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3.5 group-focus-within:text-brand-500 transition-colors" />
                                        <button type="submit" disabled={isSearchingCity || !citySearch.trim()} className="absolute right-2 top-2 p-1.5 bg-brand-600 hover:bg-brand-500 text-white rounded-lg disabled:opacity-50 transition-colors">{isSearchingCity ? <Loader2 className="w-4 h-4 animate-spin" /> : <ChevronRight className="w-4 h-4" />}</button>
                                </form>
                                {cityResults.length > 0 && (
                                    <div className="border border-slate-200 dark:border-white/10 rounded-xl overflow-hidden divide-y divide-slate-100 dark:divide-white/5 bg-white dark:bg-slate-800 mb-6 animate-in slide-in-from-top-2 shadow-lg">
                                        {cityResults.map((result: any) => (
                                            <button key={result.id} onClick={() => handleSelectCity(result)} className="w-full text-left p-3 hover:bg-slate-50 dark:hover:bg-white/5 transition-colors flex items-center justify-between group"><div className="flex items-center gap-3"><MapPin className="w-4 h-4 text-slate-400 group-hover:text-brand-500" /><div><p className="font-bold text-slate-800 dark:text-white text-sm">{result.name}</p><p className="text-xs text-slate-500 dark:text-white/50">{result.admin1 ? `${result.admin1}, ` : ''}{result.country}</p></div></div><span className="text-xs font-bold text-brand-600 opacity-0 group-hover:opacity-100">Definir Padrão</span></button>
                                        ))}
                                    </div>
                                )}
                                <div className="space-y-2">
                                    <h4 className="text-xs font-bold uppercase text-slate-400 dark:text-white/40 mb-3">Cidade Atual</h4>
                                    {currentLocations.length > 0 ? (
                                        <div className="flex items-center justify-between p-4 bg-white dark:bg-white/5 border border-brand-200 dark:border-brand-500/30 rounded-2xl shadow-sm relative overflow-hidden">
                                            <div className="absolute left-0 top-0 bottom-0 w-1 bg-brand-500"></div>
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 rounded-xl bg-brand-100 dark:bg-brand-500/20 flex items-center justify-center text-brand-600 dark:text-brand-400"><MapPin className="w-5 h-5" /></div>
                                                <div><span className="font-bold text-slate-800 dark:text-white text-base block">{currentLocations[0].name}</span><span className="text-xs text-slate-500 dark:text-white/50">Latitude: {currentLocations[0].lat.toFixed(4)}, Longitude: {currentLocations[0].lon.toFixed(4)}</span></div>
                                            </div>
                                            <button onClick={handleRemoveCity} className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-xl transition-colors" title="Remover"><Trash2 className="w-5 h-5" /></button>
                                        </div>
                                    ) : (
                                        <div className="p-6 border-2 border-dashed border-slate-200 dark:border-white/10 rounded-2xl flex flex-col items-center justify-center text-slate-400 dark:text-white/30 text-center"><MapPin className="w-8 h-8 mb-2 opacity-50" /><p className="text-sm">Nenhuma cidade configurada.</p><p className="text-xs mt-1">Busque acima para definir o local padrão.</p></div>
                                    )}
                                </div>
                           </div>

                           {/* Notice Board Configuration */}
                           <div className="bg-slate-50/50 dark:bg-white/5 p-4 md:p-6 rounded-3xl border border-slate-100 dark:border-white/5">
                                <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-6 flex items-center gap-2"><Megaphone className="w-5 h-5 text-amber-500" /> Mural de Avisos</h3>
                                <div className="space-y-4 mb-6">
                                    <div className="flex flex-col sm:flex-row gap-2">
                                        <input type="text" value={newNoticeTitle} onChange={(e) => setNewNoticeTitle(e.target.value)} placeholder="Novo aviso..." className="flex-1 px-3 py-3 rounded-xl border border-slate-300 dark:border-white/10 glass-input outline-none focus:border-brand-500 text-sm"/>
                                        <input type="date" value={newNoticeDate} onChange={(e) => setNewNoticeDate(e.target.value)} className="w-full sm:w-32 px-3 py-3 rounded-xl border border-slate-300 dark:border-white/10 glass-input outline-none focus:border-brand-500 text-sm"/>
                                    </div>
                                    <div className="flex gap-2">
                                        <div className="flex-1 bg-white dark:bg-white/5 rounded-xl border border-slate-200 dark:border-white/10 p-1 flex">
                                             {['general', 'alert', 'event'].map(type => (
                                                 <button key={type} onClick={() => setNewNoticeType(type as any)} className={`flex-1 py-2 text-[10px] font-bold uppercase rounded-lg transition-all ${newNoticeType === type ? 'bg-slate-100 dark:bg-white/10 text-slate-900 dark:text-white shadow-sm' : 'text-slate-400 hover:bg-slate-50 dark:hover:bg-white/5'}`}>{type === 'alert' ? 'Alerta' : type === 'event' ? 'Evento' : 'Geral'}</button>
                                             ))}
                                        </div>
                                        <button onClick={handleAddNotice} disabled={!newNoticeTitle.trim() || !newNoticeDate} className="px-4 bg-brand-600 hover:bg-brand-500 text-white rounded-xl font-bold shadow-md active:scale-95 transition-all text-xs flex items-center gap-1 disabled:opacity-50"><Plus className="w-4 h-4" /> Adicionar</button>
                                    </div>
                                </div>
                                <div className="space-y-2 max-h-[300px] overflow-y-auto custom-scrollbar pr-1">
                                    {notices.length === 0 ? <p className="text-xs text-slate-400 italic text-center">Nenhum aviso no mural.</p> : notices.map(notice => (
                                            <div key={notice.id} className="p-3 bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl flex items-start justify-between group">
                                                <div className="flex items-start gap-3">
                                                     <div className={`mt-0.5 p-1.5 rounded-lg ${notice.type === 'alert' ? 'bg-red-100 text-red-600' : notice.type === 'event' ? 'bg-blue-100 text-blue-600' : 'bg-slate-100 text-slate-600'} dark:bg-white/10`}>{getNoticeIcon(notice.type)}</div>
                                                     <div><p className="font-bold text-slate-800 dark:text-white text-sm">{notice.title}</p><p className="text-xs text-slate-500 dark:text-white/50">{new Date(notice.date).toLocaleDateString()}</p></div>
                                                </div>
                                                <button onClick={() => handleRemoveNotice(notice.id)} className="p-1.5 text-slate-300 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors opacity-0 group-hover:opacity-100"><Trash2 className="w-4 h-4" /></button>
                                            </div>
                                    ))}
                                </div>
                           </div>
                       </div>

                       {/* Integrated Profile Controls for Admin */}
                       <div className="pt-6 border-t border-slate-200 dark:border-white/10 grid grid-cols-1 md:grid-cols-2 gap-4">
                            <button onClick={toggleTheme} className="w-full flex items-center justify-between p-4 rounded-3xl bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 hover:bg-slate-50 dark:hover:bg-white/10 transition-colors group">
                                <div className="flex items-center gap-3"><div className="w-10 h-10 rounded-full bg-indigo-100 dark:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 flex items-center justify-center group-hover:scale-110 transition-transform">{isDarkMode ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}</div><span className="font-bold text-slate-700 dark:text-white">Aparência</span></div>
                                <span className="text-xs font-bold bg-slate-100 dark:bg-white/10 px-2 py-1 rounded-lg text-slate-500 dark:text-white/50">{isDarkMode ? 'Escuro' : 'Claro'}</span>
                            </button>
                            <button onClick={onLogout} className="w-full flex items-center justify-between p-4 rounded-3xl bg-red-50 dark:bg-red-500/10 border border-red-100 dark:border-red-500/20 hover:bg-red-100 dark:hover:bg-red-500/20 transition-colors group">
                                <div className="flex items-center gap-3"><div className="w-10 h-10 rounded-full bg-red-100 dark:bg-red-500/20 text-red-600 dark:text-red-400 flex items-center justify-center group-hover:scale-110 transition-transform"><LogOut className="w-5 h-5" /></div><span className="font-bold text-red-700 dark:text-red-400">Sair do Sistema</span></div>
                            </button>
                       </div>
                   </div>
              </div>
          )}
      </div>

      {showUserModal && (
        <UserDetailsModal 
            user={selectedUser}
            currentUser={currentUser}
            onClose={() => setShowUserModal(false)}
            onSave={handleSaveUser}
            onToggleStatus={handleToggleActive}
            onResetPassword={handleResetPassword}
        />
      )}
    </div>
  );
};

export default AdminScreen;