
import React, { useState, useEffect, useMemo } from 'react';
import { Citizen, Demand, DemandStatus } from '../types';
import { X, MapPin, Phone, Mail, PlusCircle, Edit3, ChevronLeft, ChevronRight, BarChart3, User, ExternalLink, MessageCircle } from 'lucide-react';
import { formatPhone } from '../utils/cpfValidation';
import DemandMiniMap from './DemandMiniMap';
import { supabase, isSupabaseConfigured } from '../services/supabaseClient';

interface CitizenDetailsModalProps {
  citizen: Citizen;
  onClose: () => void;
  onEdit: () => void;
  onCreateDemand: () => void;
  onNotification?: (type: 'success' | 'error', message: string) => void;
}

const CitizenDetailsModal: React.FC<CitizenDetailsModalProps> = ({ 
    citizen, 
    onClose, 
    onEdit, 
    onCreateDemand,
    onNotification
}) => {
  const [history, setHistory] = useState<Demand[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);

  useEffect(() => {
      const fetchHistory = async () => {
          setIsLoadingHistory(true);
          try {
              if (isSupabaseConfigured() && supabase) {
                  const { data, error } = await supabase
                      .from('demands')
                      .select('*')
                      .eq('citizen_id', citizen.id)
                      .order('created_at', { ascending: false });
                  
                  if (data) {
                      const mappedDemands = data.map((d: any) => ({
                          id: d.id,
                          title: d.title,
                          description: d.description,
                          level: d.level,
                          status: d.status,
                          priority: d.priority,
                          type: d.type,
                          deadline: d.deadline,
                          citizenId: d.citizen_id,
                          createdAt: d.created_at,
                          tags: d.tags
                      }));
                      setHistory(mappedDemands);
                  }
              }
          } catch (err) {
              console.error(err);
          } finally {
              setIsLoadingHistory(false);
          }
      };
      fetchHistory();
  }, [citizen.id]);

  const handleMapClick = () => {
      // Force navigation to map view with this citizen selected
      if (!citizen.lat || !citizen.lon) {
          if (onNotification) onNotification('error', 'Localização não definida.');
          return;
      }
      
      // Dispatch event to App.tsx
      setTimeout(() => {
          const event = new CustomEvent('navigate-to-map', { 
              detail: { 
                  citizenId: citizen.id,
                  lat: citizen.lat,
                  lon: citizen.lon
              } 
          });
          window.dispatchEvent(event);
      }, 0);
      onClose(); // Close modal immediately
  };

  const openWhatsApp = (phone: string) => {
    const cleanPhone = phone.replace(/\D/g, '');
    window.open(`https://wa.me/55${cleanPhone}`, '_blank');
  };

  const getFullAddress = () => {
      const parts = [
          citizen.logradouro,
          citizen.numero ? `Nº ${citizen.numero}` : null,
          citizen.bairro,
          citizen.cidade && citizen.estado ? `${citizen.cidade} - ${citizen.estado}` : citizen.cidade
      ].filter(Boolean);
      return parts.join(', ') || 'Endereço não informado';
  };

  return (
    <div className="fixed inset-0 z-[70] flex items-end md:items-center justify-center sm:p-4">
        {/* Backdrop */}
        <div 
            className="absolute inset-0 bg-slate-900/60 backdrop-blur-md transition-opacity duration-300" 
            onClick={onClose}
        ></div>

        {/* Modal Container */}
        <div className="relative w-full h-full md:h-[90vh] md:max-w-5xl bg-white dark:bg-[#0b1121] md:rounded-3xl shadow-2xl overflow-hidden flex flex-col animate-in slide-in-from-bottom-10 md:zoom-in-95 duration-300 border-t md:border border-slate-200 dark:border-white/10">
            
            {/* Sticky Header */}
            <div className="px-4 py-3 md:px-8 md:py-5 border-b border-slate-200 dark:border-white/10 flex items-center justify-between bg-white/90 dark:bg-[#0b1121]/90 backdrop-blur-md z-20 shrink-0 sticky top-0">
                <div className="flex-1 min-w-0 mr-4 flex items-center gap-3">
                    <button 
                        onClick={onClose} 
                        className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-white/10 text-slate-500 dark:text-white transition-colors md:hidden"
                    >
                        <ChevronLeft className="w-6 h-6" />
                    </button>
                    <div className="w-10 h-10 rounded-full bg-brand-100 dark:bg-brand-500/20 flex items-center justify-center text-brand-600 dark:text-brand-400 font-bold text-lg border border-brand-200 dark:border-brand-500/30">
                        {citizen.name.charAt(0)}
                    </div>
                    <div className="min-w-0">
                        <h2 className="text-lg md:text-2xl font-bold text-slate-900 dark:text-white leading-tight truncate">
                            {citizen.name}
                        </h2>
                        {citizen.bairro && <p className="text-xs text-slate-500 dark:text-white/50 truncate">{citizen.bairro}</p>}
                    </div>
                </div>
                
                <div className="flex items-center gap-2">
                    <button 
                        onClick={() => { onEdit(); }}
                        className="p-2 md:p-2.5 text-slate-500 hover:text-brand-600 hover:bg-slate-100 rounded-xl transition-colors dark:text-white/50 dark:hover:text-white dark:hover:bg-white/10"
                        title="Editar"
                    >
                        <Edit3 className="w-5 h-5" />
                    </button>
                    <button 
                        onClick={onClose}
                        className="hidden md:block p-2 md:p-2.5 text-slate-400 hover:text-slate-800 hover:bg-slate-100 rounded-full transition-colors dark:text-white/40 dark:hover:text-white dark:hover:bg-white/10"
                    >
                        <X className="w-6 h-6" />
                    </button>
                </div>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto bg-slate-50/30 dark:bg-black/20 custom-scrollbar p-4 md:p-8">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 max-w-5xl mx-auto">
                    
                    {/* Left Column: Info & Map */}
                    <div className="space-y-6">
                        {/* Contact Info */}
                        <div className="bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-2xl p-5 shadow-sm space-y-4">
                            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-white/60 flex items-center gap-2">
                                <User className="w-4 h-4" /> Contato
                            </h3>
                            <div className="space-y-3">
                                {citizen.phone ? (
                                    <div className="flex items-center justify-between p-3 bg-slate-50 dark:bg-white/5 rounded-xl">
                                        <div className="flex items-center gap-3">
                                            <div className="p-2 bg-green-100 dark:bg-green-500/20 text-green-600 dark:text-green-400 rounded-lg">
                                                <Phone className="w-4 h-4" />
                                            </div>
                                            <span className="font-mono text-sm font-bold text-slate-700 dark:text-white">{formatPhone(citizen.phone)}</span>
                                        </div>
                                        <button onClick={() => openWhatsApp(citizen.phone)} className="text-xs font-bold text-green-600 hover:underline">WhatsApp</button>
                                    </div>
                                ) : (
                                    <p className="text-sm text-slate-400 italic">Sem telefone cadastrado.</p>
                                )}

                                {citizen.email && (
                                    <div className="flex items-center gap-3 p-3 bg-slate-50 dark:bg-white/5 rounded-xl">
                                        <div className="p-2 bg-blue-100 dark:bg-blue-500/20 text-blue-600 dark:text-blue-400 rounded-lg">
                                            <Mail className="w-4 h-4" />
                                        </div>
                                        <span className="text-sm font-medium text-slate-700 dark:text-white truncate">{citizen.email}</span>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Location */}
                        <div className="space-y-3">
                            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-white/60 flex items-center gap-2">
                                <MapPin className="w-4 h-4" /> Endereço & Mapa
                            </h3>
                            <div className="bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-2xl p-1 shadow-sm">
                                <div className="p-4 pb-2">
                                    <p className="text-sm font-medium text-slate-700 dark:text-white leading-relaxed">{getFullAddress()}</p>
                                </div>
                                <div className="p-1">
                                    <DemandMiniMap 
                                        entityId={citizen.id}
                                        tableName="citizens"
                                        lat={citizen.lat} 
                                        lon={citizen.lon} 
                                        address={getFullAddress()}
                                        onClick={handleMapClick}
                                    />
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Right Column: History & Actions */}
                    <div className="space-y-6">
                        {/* Quick Actions */}
                        <button 
                            onClick={onCreateDemand}
                            className="w-full py-4 bg-brand-600 hover:bg-brand-500 text-white rounded-2xl font-bold shadow-lg shadow-brand-500/20 flex items-center justify-center gap-2 active:scale-95 transition-all"
                        >
                            <PlusCircle className="w-5 h-5" /> Nova Demanda
                        </button>

                        {/* History */}
                        <div className="bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-2xl p-5 shadow-sm flex flex-col h-[400px]">
                            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-white/60 flex items-center gap-2 mb-4">
                                <BarChart3 className="w-4 h-4" /> Histórico ({history.length})
                            </h3>
                            
                            <div className="flex-1 overflow-y-auto custom-scrollbar space-y-3 pr-2">
                                {history.length > 0 ? history.map(d => (
                                    <div key={d.id} className="p-3 rounded-xl bg-slate-50 dark:bg-white/5 border border-slate-100 dark:border-white/5">
                                        <div className="flex justify-between items-start mb-1">
                                            <span className="text-[10px] font-bold text-slate-400">#{d.id.slice(0,6)}</span>
                                            <span className={`text-[10px] px-1.5 py-0.5 rounded font-bold uppercase ${d.status === 'Concluído' ? 'bg-green-100 text-green-700' : 'bg-slate-200 text-slate-600'}`}>{d.status}</span>
                                        </div>
                                        <p className="text-sm font-bold text-slate-800 dark:text-white line-clamp-1">{d.title}</p>
                                        <p className="text-xs text-slate-500 dark:text-white/50 mt-1">{new Date(d.createdAt).toLocaleDateString()}</p>
                                    </div>
                                )) : (
                                    <div className="flex flex-col items-center justify-center h-full text-slate-400">
                                        <p className="text-sm italic">Nenhuma demanda registrada.</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                </div>
            </div>
        </div>
    </div>
  );
};

export default CitizenDetailsModal;
