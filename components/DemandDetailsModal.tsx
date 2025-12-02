
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Demand, Citizen, DemandStatus, DemandPriority, DemandInteraction } from '../types';
import { X, Calendar, MapPin, MessageCircle, Clock, Edit3, FileText, CheckSquare, Send, Trash2, Plus, MessageSquare, Check, ChevronLeft, ChevronRight, Tag, ExternalLink, Mail, Phone } from 'lucide-react';
import { formatDate, formatPhone } from '../utils/cpfValidation';
import { supabase, isSupabaseConfigured } from '../services/supabaseClient';
import DemandMiniMap from './DemandMiniMap';

interface DemandDetailsModalProps {
  demand: Demand;
  citizen: Citizen | null;
  onClose: () => void;
  onEdit: (demand: Demand) => void;
  onUpdateStatus: (demandId: string, newStatus: DemandStatus) => void;
  onInteractionUpdate?: () => void;
  onNavigate?: (direction: 'prev' | 'next') => void;
  canNavigatePrev?: boolean;
  canNavigateNext?: boolean;
  onNotification?: (type: 'success' | 'error', message: string) => void;
  onViewCitizen?: (citizenId: string) => void;
}

const DemandDetailsModal: React.FC<DemandDetailsModalProps> = ({ 
    demand, 
    citizen, 
    onClose, 
    onEdit, 
    onUpdateStatus, 
    onInteractionUpdate,
    onNavigate,
    canNavigatePrev,
    canNavigateNext,
    onNotification,
    onViewCitizen
}) => {
  
  // --- States for Interactions ---
  const [interactions, setInteractions] = useState<DemandInteraction[]>([]);
  const [isLoadingInteractions, setIsLoadingInteractions] = useState(false);
  const [highlightedIds, setHighlightedIds] = useState<string[]>([]);
  
  // Inputs
  const [newComment, setNewComment] = useState('');
  const [newChecklistText, setNewChecklistText] = useState('');
  const [newChecklistDate, setNewChecklistDate] = useState('');
  const [isAddingChecklist, setIsAddingChecklist] = useState(false);

  // Tags
  const [tags, setTags] = useState<string[]>(demand.tags || []);
  const [newTag, setNewTag] = useState('');
  const [isAddingTag, setIsAddingTag] = useState(false);
  const tagInputRef = useRef<HTMLInputElement>(null);

  // Custom Calendar State for Checklist
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [pickerDate, setPickerDate] = useState(new Date());
  const datePickerRef = useRef<HTMLDivElement>(null);
  
  // User info
  const currentUser = useMemo(() => {
      const savedUser = localStorage.getItem('geo_user');
      return savedUser ? JSON.parse(savedUser) : { name: 'Usuário' };
  }, []);

  // --- Effects ---
  useEffect(() => {
      fetchInteractions();
      setHighlightedIds([]); // Reset highlights on demand change
      setTags(demand.tags || []);
  }, [demand.id]);

  useEffect(() => {
      const handleClickOutside = (event: MouseEvent) => {
          if (datePickerRef.current && !datePickerRef.current.contains(event.target as Node)) {
              setShowDatePicker(false);
          }
          // Close tag input if clicked outside
          if (isAddingTag && tagInputRef.current && !tagInputRef.current.contains(event.target as Node) && (event.target as HTMLElement).tagName !== 'BUTTON') {
              setIsAddingTag(false);
          }
      };
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isAddingTag]);

  const fetchInteractions = async () => {
      setIsLoadingInteractions(true);
      try {
          if (isSupabaseConfigured() && supabase) {
              const { data, error } = await supabase
                  .from('demand_interactions')
                  .select('*')
                  .eq('demanda_id', demand.id)
                  .order('created_at', { ascending: true }); // We fetch ascending but display inverted for comments
              
              if (error) throw error;
              
              if (data) {
                  setInteractions(data.map((i: any) => ({
                      id: i.id,
                      demandId: i.demanda_id,
                      type: i.tipo,
                      text: i.texto,
                      isCompleted: i.concluido,
                      deadline: i.prazo,
                      user: i.usuario,
                      createdAt: i.created_at
                  })));
              }
          }
      } catch (err) {
          console.error("Erro ao carregar interações", err);
      } finally {
          setIsLoadingInteractions(false);
      }
  };

  const handleAddInteraction = async (type: 'comentario' | 'checklist') => {
      const text = type === 'comentario' ? newComment : newChecklistText;
      if (!text.trim()) return;

      const optimisticId = crypto.randomUUID();
      const newInteraction: DemandInteraction = {
          id: optimisticId,
          demandId: demand.id,
          type: type,
          text: text,
          isCompleted: false,
          deadline: type === 'checklist' && newChecklistDate ? newChecklistDate : undefined,
          user: currentUser.name,
          createdAt: new Date().toISOString()
      };

      // Optimistic Update
      setInteractions(prev => [...prev, newInteraction]);
      
      // Highlight new comment
      setHighlightedIds(prev => [...prev, optimisticId]);

      if (type === 'comentario') setNewComment('');
      if (type === 'checklist') {
          setNewChecklistText('');
          setNewChecklistDate('');
          setIsAddingChecklist(false);
      }

      try {
          if (isSupabaseConfigured() && supabase) {
              const payload: any = {
                  demanda_id: demand.id,
                  tipo: type,
                  texto: text,
                  usuario: currentUser.name,
              };

              if (type === 'checklist') {
                  payload.concluido = false;
                  payload.prazo = newChecklistDate || null;
              }

              const { data, error } = await supabase.from('demand_interactions').insert(payload).select().single();
              if (error) throw error;
              
              // Replace optimistic with real data
              if (data) {
                  setInteractions(prev => prev.map(i => i.id === optimisticId ? {
                      ...i,
                      id: data.id,
                      createdAt: data.created_at
                  } : i));
                  
                  // Update highlighted ID to the real one
                  setHighlightedIds(prev => [...prev.filter(id => id !== optimisticId), data.id]);
                  
                  // Remove highlight after animation
                  setTimeout(() => {
                      setHighlightedIds(prev => prev.filter(id => id !== data.id));
                  }, 3000);

                  if(onInteractionUpdate) onInteractionUpdate();
              }
          }
      } catch (err) {
          console.error("Erro ao salvar interação", err);
          if (onNotification) onNotification('error', "Erro ao salvar interação");
          // Revert optimistic update on error
          setInteractions(prev => prev.filter(i => i.id !== optimisticId));
          setHighlightedIds(prev => prev.filter(id => id !== optimisticId));
      }
  };

  const toggleChecklist = async (id: string, currentStatus: boolean) => {
      // Optimistic
      setInteractions(prev => prev.map(i => i.id === id ? { ...i, isCompleted: !currentStatus } : i));

      try {
          if (isSupabaseConfigured() && supabase) {
              await supabase
                .from('demand_interactions')
                .update({ concluido: !currentStatus })
                .eq('id', id);
              if(onInteractionUpdate) onInteractionUpdate();
          }
      } catch (err) {
          console.error("Erro ao atualizar checklist", err);
          if (onNotification) onNotification('error', "Erro ao atualizar checklist");
          setInteractions(prev => prev.map(i => i.id === id ? { ...i, isCompleted: currentStatus } : i));
      }
  };

  const deleteInteraction = async (id: string) => {
      setInteractions(prev => prev.filter(i => i.id !== id));
      try {
        if (isSupabaseConfigured() && supabase) {
            await supabase.from('demand_interactions').delete().eq('id', id);
            if(onInteractionUpdate) onInteractionUpdate();
        }
      } catch (err) { console.error(err); }
  };

  const handleAddTag = async () => {
      if(!newTag.trim()) return;
      const updatedTags = [...tags, newTag.trim()];
      setTags(updatedTags);
      setNewTag('');
      setIsAddingTag(false);
      
      try {
          if(isSupabaseConfigured() && supabase) {
              await supabase.from('demands').update({ tags: updatedTags }).eq('id', demand.id);
              if(onInteractionUpdate) onInteractionUpdate();
          }
      } catch(err) { console.error(err); }
  };

  const handleRemoveTag = async (tagToRemove: string) => {
      const updatedTags = tags.filter(t => t !== tagToRemove);
      setTags(updatedTags);

      try {
          if(isSupabaseConfigured() && supabase) {
              await supabase.from('demands').update({ tags: updatedTags }).eq('id', demand.id);
              if(onInteractionUpdate) onInteractionUpdate();
          }
      } catch(err) { console.error(err); }
  };

  // --- Date Picker Logic ---
  const monthNames = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];
  const getDaysInMonth = (year: number, month: number) => new Date(year, month + 1, 0).getDate();
  const getFirstDayOfMonth = (year: number, month: number) => new Date(year, month, 1).getDay();

  const handleDateClick = (day: number) => {
    const clickedDate = new Date(pickerDate.getFullYear(), pickerDate.getMonth(), day);
    // Format YYYY-MM-DD
    const y = clickedDate.getFullYear();
    const m = String(clickedDate.getMonth() + 1).padStart(2, '0');
    const d = String(clickedDate.getDate()).padStart(2, '0');
    setNewChecklistDate(`${y}-${m}-${d}`);
    setShowDatePicker(false);
  };

  // --- Derived Data ---
  const checklistItems = interactions.filter(i => i.type === 'checklist');
  // Reverse comments to show newest first
  const comments = interactions.filter(i => i.type === 'comentario').reverse();
  
  const checklistProgress = useMemo(() => {
      if (checklistItems.length === 0) return 0;
      const completed = checklistItems.filter(i => i.isCompleted).length;
      return Math.round((completed / checklistItems.length) * 100);
  }, [checklistItems]);

  // --- Status Logic ---
  const statusOptions = [
    { value: DemandStatus.PENDING, label: 'Pendente', icon: Clock },
    { value: DemandStatus.IN_PROGRESS, label: 'Em Andamento', icon: Clock },
    { value: DemandStatus.COMPLETED, label: 'Concluído', icon: Clock }
  ];

  const openWhatsApp = (phone: string) => {
    const cleanPhone = phone.replace(/\D/g, '');
    window.open(`https://wa.me/55${cleanPhone}`, '_blank');
  };

  const openEmail = (email: string) => {
      window.open(`mailto:${email}`, '_blank');
  };

  const handleMapClick = () => {
      // Force navigation to map view with this demand selected
      const event = new CustomEvent('navigate-to-map', { detail: { demandId: demand.id } });
      window.dispatchEvent(event);
      onClose();
  };

  // Construct full address for geocoding fallback
  const fullAddress = citizen 
    ? `${citizen.logradouro}, ${citizen.numero} - ${citizen.bairro}, ${citizen.cidade} - ${citizen.estado}` 
    : undefined;

  return (
    <div className="fixed inset-0 z-[70] flex items-end md:items-center justify-center sm:p-4">
        {/* Backdrop - Updated to darker blur style */}
        <div 
            className="absolute inset-0 bg-slate-900/60 backdrop-blur-md transition-opacity duration-300" 
            onClick={onClose}
        ></div>

        {/* Modal Container */}
        <div className="relative w-full h-full md:h-[90vh] md:max-w-6xl bg-white dark:bg-[#0b1121] md:rounded-3xl shadow-2xl overflow-hidden flex flex-col animate-in slide-in-from-bottom-10 md:zoom-in-95 duration-300 border-t md:border border-slate-200 dark:border-white/10">
            
            {/* Sticky Header */}
            <div className="px-4 py-3 md:px-8 md:py-5 border-b border-slate-200 dark:border-white/10 flex items-start justify-between bg-white/90 dark:bg-[#0b1121]/90 backdrop-blur-md z-20 shrink-0 sticky top-0">
                <div className="flex-1 min-w-0 mr-4">
                    {/* Add Back Button */}
                    <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                        <button 
                            onClick={onClose} 
                            className="mr-2 p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-white/10 text-slate-500 dark:text-white transition-colors md:hidden"
                        >
                            <ChevronLeft className="w-5 h-5" />
                        </button>
                        <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400 dark:text-white/40 font-mono">
                            #{demand.id.slice(0,8)}
                        </span>
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase border ${
                            demand.priority === DemandPriority.HIGH ? 'bg-red-50 text-red-600 border-red-100 dark:bg-red-500/10 dark:text-red-300 dark:border-red-500/20' :
                            demand.priority === DemandPriority.MEDIUM ? 'bg-amber-50 text-amber-600 border-amber-100 dark:bg-amber-500/10 dark:text-amber-300 dark:border-amber-500/20' :
                            'bg-green-50 text-green-600 border-green-100 dark:bg-green-500/10 dark:text-green-300 dark:border-green-500/20'
                        }`}>
                            {demand.priority}
                        </span>
                    </div>
                    <h2 className="text-lg md:text-2xl font-bold text-slate-900 dark:text-white leading-tight line-clamp-1">
                        {demand.title}
                    </h2>
                </div>
                
                <div className="flex items-center gap-2">
                    {/* Navigation Buttons */}
                    {onNavigate && (
                        <div className="hidden md:flex items-center bg-slate-100 dark:bg-white/5 rounded-xl border border-slate-200 dark:border-white/10 mr-2">
                            <button 
                                onClick={() => onNavigate('prev')}
                                disabled={!canNavigatePrev}
                                className="p-2.5 text-slate-500 hover:text-brand-600 disabled:opacity-30 disabled:hover:text-slate-500 transition-colors border-r border-slate-200 dark:border-white/10"
                                title="Demanda Anterior"
                            >
                                <ChevronLeft className="w-5 h-5" />
                            </button>
                            <button 
                                onClick={() => onNavigate('next')}
                                disabled={!canNavigateNext}
                                className="p-2.5 text-slate-500 hover:text-brand-600 disabled:opacity-30 disabled:hover:text-slate-500 transition-colors"
                                title="Próxima Demanda"
                            >
                                <ChevronRight className="w-5 h-5" />
                            </button>
                        </div>
                    )}

                    <button 
                        onClick={() => {
                            onEdit(demand);
                            onClose();
                        }}
                        className="p-2 md:p-2.5 text-slate-500 hover:text-brand-600 hover:bg-slate-100 rounded-xl transition-colors dark:text-white/50 dark:hover:text-white dark:hover:bg-white/10"
                        title="Editar"
                    >
                        <Edit3 className="w-5 h-5" />
                    </button>
                    <button 
                        onClick={onClose}
                        className="p-2 md:p-2.5 text-slate-400 hover:text-slate-800 hover:bg-slate-100 rounded-full transition-colors dark:text-white/40 dark:hover:text-white dark:hover:bg-white/10"
                    >
                        <X className="w-6 h-6" />
                    </button>
                </div>
            </div>

            {/* Scrollable Content */}
            <div className="flex-1 overflow-y-auto bg-slate-50/30 dark:bg-black/20 custom-scrollbar overscroll-contain flex flex-col md:flex-row">
                
                {/* LEFT COLUMN (MAIN CONTENT) */}
                <div className="flex-1 p-4 md:p-8 space-y-6 md:space-y-8 min-w-0">
                    
                    {/* Description */}
                    <div className="space-y-3">
                        <div className="flex justify-between items-center">
                             <h3 className="flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-slate-500 dark:text-white/60">
                                <FileText className="w-4 h-4" /> Descrição
                            </h3>
                            {/* Mobile Status Picker */}
                            <div className="md:hidden">
                                <span className={`px-2 py-1 rounded text-xs font-bold ${demand.status === DemandStatus.COMPLETED ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-700'}`}>{demand.status}</span>
                            </div>
                        </div>
                        <div className="bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-2xl p-5 md:p-6 shadow-sm">
                            <p className="text-sm md:text-base text-slate-700 dark:text-slate-200 leading-relaxed whitespace-pre-line">
                                {demand.description}
                            </p>
                            {/* Tags Section */}
                            <div className="mt-4 pt-4 border-t border-slate-100 dark:border-white/5 flex flex-wrap gap-2 items-center">
                                <Tag className="w-4 h-4 text-slate-400" />
                                {tags.map(tag => (
                                    <span key={tag} className="px-2 py-1 bg-slate-100 dark:bg-white/10 text-slate-600 dark:text-white text-xs font-bold rounded-lg flex items-center gap-1 group">
                                        {tag}
                                        <X onClick={() => handleRemoveTag(tag)} className="w-3 h-3 cursor-pointer text-slate-400 hover:text-red-500 hidden group-hover:block" />
                                    </span>
                                ))}
                                {isAddingTag ? (
                                    <div className="flex items-center gap-2" ref={datePickerRef}>
                                        <input 
                                            ref={tagInputRef}
                                            autoFocus
                                            type="text" 
                                            value={newTag} 
                                            onChange={e => setNewTag(e.target.value)} 
                                            className="w-24 px-2 py-1 text-xs border rounded-lg outline-none"
                                            placeholder="Nova tag..."
                                            onKeyDown={e => { if(e.key === 'Enter') handleAddTag(); if(e.key === 'Escape') setIsAddingTag(false); }}
                                        />
                                        <button onClick={handleAddTag} className="text-xs font-bold text-brand-600">OK</button>
                                    </div>
                                ) : (
                                    <button onClick={() => setIsAddingTag(true)} className="text-xs text-slate-400 hover:text-brand-600 flex items-center gap-1 px-2 py-1 hover:bg-slate-100 rounded-lg transition-colors"><Plus className="w-3 h-3" /> Adicionar</button>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* MINI MAP SECTION */}
                    <div className="space-y-3">
                        <h3 className="flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-slate-500 dark:text-white/60">
                            <MapPin className="w-4 h-4" /> Localização
                        </h3>
                        {/* Pass address for fallback geocoding and demandId for saving */}
                        <DemandMiniMap 
                            demandId={demand.id} // Pass ID to save coords
                            lat={demand.lat} 
                            lon={demand.lon} 
                            address={fullAddress}
                            onClick={handleMapClick}
                            onLocationUpdate={onInteractionUpdate} // Trigger update to parent to refresh data
                        />
                    </div>

                    {/* CHECKLIST SECTION */}
                    <div className="space-y-3">
                        <div className="flex items-center justify-between">
                            <h3 className="flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-slate-500 dark:text-white/60">
                                <CheckSquare className="w-4 h-4" /> Checklist
                            </h3>
                            {checklistItems.length > 0 && (
                                <span className="text-xs font-mono text-slate-400 dark:text-white/40">
                                    {Math.round(checklistProgress)}%
                                </span>
                            )}
                        </div>

                        {checklistItems.length > 0 && (
                            <div className="h-1.5 w-full bg-slate-200 dark:bg-white/10 rounded-full overflow-hidden">
                                <div 
                                    className="h-full bg-green-500 transition-all duration-500" 
                                    style={{ width: `${checklistProgress}%` }}
                                />
                            </div>
                        )}

                        <div className="space-y-2">
                            {checklistItems.map(item => (
                                <div key={item.id} className="flex items-start gap-3 group bg-white dark:bg-white/5 p-3 rounded-xl border border-slate-100 dark:border-white/5 hover:border-brand-200 dark:hover:border-white/10 transition-colors">
                                    <button 
                                        onClick={() => toggleChecklist(item.id, item.isCompleted || false)}
                                        className={`mt-0.5 w-5 h-5 rounded-lg border flex items-center justify-center transition-all ${
                                            item.isCompleted 
                                            ? 'bg-green-500 border-green-500 text-white' 
                                            : 'bg-white dark:bg-transparent border-slate-300 dark:border-white/20 hover:border-brand-500 text-transparent hover:text-brand-500/20'
                                        }`}
                                    >
                                        <Check className="w-3.5 h-3.5" />
                                    </button>
                                    <div className="flex-1">
                                        <p className={`text-sm transition-all font-medium ${item.isCompleted ? 'text-slate-400 line-through dark:text-white/30' : 'text-slate-800 dark:text-white'}`}>
                                            {item.text}
                                        </p>
                                        {(item.deadline || item.isCompleted) && (
                                            <div className="flex items-center gap-2 mt-1.5">
                                                {item.deadline && (
                                                    <span className={`text-[10px] px-1.5 py-0.5 rounded font-bold uppercase flex items-center gap-1 ${
                                                        item.isCompleted ? 'bg-slate-100 text-slate-400 dark:bg-white/5' : 
                                                        new Date(item.deadline) < new Date() ? 'bg-red-100 text-red-600 dark:bg-red-500/20 dark:text-red-300' : 'bg-slate-100 text-slate-500 dark:bg-white/10 dark:text-white/60'
                                                    }`}>
                                                        <Calendar className="w-3 h-3" /> {formatDate(item.deadline)}
                                                    </span>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                    <button onClick={() => deleteInteraction(item.id)} className="opacity-0 group-hover:opacity-100 p-2 text-slate-300 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-all">
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                </div>
                            ))}

                            {isAddingChecklist ? (
                                <div className="bg-white dark:bg-white/5 p-4 rounded-xl border border-brand-500/30 shadow-lg ring-1 ring-brand-500/10 animate-in fade-in zoom-in-95">
                                    <input 
                                        type="text" 
                                        autoFocus
                                        value={newChecklistText}
                                        onChange={e => setNewChecklistText(e.target.value)}
                                        placeholder="Descreva a tarefa..."
                                        className="w-full bg-transparent border-none outline-none text-sm text-slate-900 dark:text-white placeholder:text-slate-400 mb-4 font-medium"
                                        onKeyDown={e => e.key === 'Enter' && handleAddInteraction('checklist')}
                                    />
                                    <div className="flex flex-col sm:flex-row items-center justify-between gap-3 border-t border-slate-100 dark:border-white/5 pt-3">
                                        <div className="relative w-full sm:w-auto" ref={datePickerRef}>
                                            <button 
                                                onClick={() => setShowDatePicker(!showDatePicker)}
                                                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold transition-all border ${
                                                    newChecklistDate 
                                                    ? 'bg-brand-50 text-brand-700 border-brand-200 dark:bg-brand-500/20 dark:text-brand-300 dark:border-brand-500/30' 
                                                    : 'bg-slate-50 text-slate-500 border-slate-200 dark:bg-white/5 dark:text-white/50 dark:border-white/10 hover:bg-slate-100 dark:hover:bg-white/10'
                                                }`}
                                            >
                                                <Calendar className="w-3.5 h-3.5" />
                                                {newChecklistDate ? formatDate(newChecklistDate) : 'Definir Prazo'}
                                            </button>

                                            {showDatePicker && (
                                                <div className="absolute top-full mt-2 left-0 w-64 glass-panel bg-white dark:bg-slate-900 rounded-xl shadow-xl border border-slate-200 dark:border-white/10 p-3 z-50 animate-in fade-in zoom-in-95">
                                                    <div className="flex items-center justify-between mb-2">
                                                        <button onClick={() => setPickerDate(new Date(pickerDate.getFullYear(), pickerDate.getMonth() - 1, 1))} className="p-1 hover:bg-slate-100 dark:hover:bg-white/10 rounded"><ChevronLeft className="w-4 h-4 text-slate-600 dark:text-white" /></button>
                                                        <span className="font-bold text-slate-800 dark:text-white text-xs">{monthNames[pickerDate.getMonth()]} {pickerDate.getFullYear()}</span>
                                                        <button onClick={() => setPickerDate(new Date(pickerDate.getFullYear(), pickerDate.getMonth() + 1, 1))} className="p-1 hover:bg-slate-100 dark:hover:bg-white/10 rounded"><ChevronRight className="w-4 h-4 text-slate-600 dark:text-white" /></button>
                                                    </div>
                                                    <div className="grid grid-cols-7 gap-1 text-center mb-1">
                                                        {['D','S','T','Q','Q','S','S'].map(d => <span key={d} className="text-[9px] font-bold text-slate-400 dark:text-white/40">{d}</span>)}
                                                    </div>
                                                    <div className="grid grid-cols-7 gap-1">
                                                        {Array.from({ length: getFirstDayOfMonth(pickerDate.getFullYear(), pickerDate.getMonth()) }).map((_, i) => <div key={`empty-${i}`} />)}
                                                        {Array.from({ length: getDaysInMonth(pickerDate.getFullYear(), pickerDate.getMonth()) }).map((_, i) => {
                                                            const day = i + 1;
                                                            const isSelected = newChecklistDate && new Date(newChecklistDate).getDate() === day && new Date(newChecklistDate).getMonth() === pickerDate.getMonth();
                                                            return (
                                                                <button key={day} onClick={() => handleDateClick(day)} className={`h-6 w-6 rounded-full text-[10px] font-medium flex items-center justify-center transition-all ${isSelected ? 'bg-brand-500 text-white' : 'text-slate-700 dark:text-white hover:bg-slate-100 dark:hover:bg-white/10'}`}>{day}</button>
                                                            );
                                                        })}
                                                    </div>
                                                </div>
                                            )}
                                        </div>

                                        <div className="flex gap-2 w-full sm:w-auto justify-end">
                                            <button onClick={() => setIsAddingChecklist(false)} className="px-3 py-1.5 text-xs font-bold text-slate-500 hover:text-slate-700 dark:text-white/60 dark:hover:text-white">Cancelar</button>
                                            <button onClick={() => handleAddInteraction('checklist')} className="px-4 py-1.5 bg-brand-600 text-white text-xs font-bold rounded-lg hover:bg-brand-500 shadow-sm">Salvar Item</button>
                                        </div>
                                    </div>
                                </div>
                            ) : (
                                <button 
                                    onClick={() => setIsAddingChecklist(true)}
                                    className="flex items-center justify-center gap-2 text-sm text-slate-500 dark:text-white/50 hover:text-brand-600 dark:hover:text-brand-400 transition-colors px-4 py-3 rounded-xl border border-dashed border-slate-300 dark:border-white/10 hover:border-brand-300 dark:hover:border-brand-500/30 hover:bg-slate-50 dark:hover:bg-white/5 w-full group"
                                >
                                    <Plus className="w-4 h-4 group-hover:scale-110 transition-transform" /> Adicionar item ao checklist
                                </button>
                            )}
                        </div>
                    </div>

                    {/* ACTIVITY / COMMENTS SECTION */}
                    <div className="space-y-3 pt-4 border-t border-slate-200 dark:border-white/10">
                        <h3 className="flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-slate-500 dark:text-white/60">
                            <MessageSquare className="w-4 h-4" /> Comentários
                        </h3>

                        <div className="bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-2xl overflow-hidden shadow-sm">
                            {/* Input Area */}
                            <div className="p-3 md:p-4 bg-slate-50 dark:bg-white/5 border-b border-slate-200 dark:border-white/10 flex gap-3">
                                <div className="w-8 h-8 rounded-full bg-brand-100 dark:bg-brand-900/30 flex items-center justify-center text-brand-600 dark:text-brand-400 font-bold text-xs shrink-0">
                                    {currentUser.name.charAt(0)}
                                </div>
                                <div className="flex-1 relative">
                                    <input 
                                        type="text" 
                                        value={newComment}
                                        onChange={e => setNewComment(e.target.value)}
                                        placeholder="Escreva um comentário..."
                                        className="w-full bg-white dark:bg-black/20 border border-slate-200 dark:border-white/10 rounded-xl pl-4 pr-10 py-2.5 text-sm outline-none focus:border-brand-500 transition-all text-slate-900 dark:text-white shadow-sm"
                                        onKeyDown={e => e.key === 'Enter' && handleAddInteraction('comentario')}
                                    />
                                    <button 
                                        onClick={() => handleAddInteraction('comentario')}
                                        disabled={!newComment.trim()}
                                        className="absolute right-2 top-2 p-1 text-slate-400 hover:text-brand-600 disabled:opacity-30 transition-colors"
                                    >
                                        <Send className="w-4 h-4" />
                                    </button>
                                </div>
                            </div>

                            {/* List - REVERSED: Newest at Top */}
                            <div className="divide-y divide-slate-100 dark:divide-white/5 max-h-[300px] overflow-y-auto custom-scrollbar">
                                {comments.length === 0 ? (
                                    <div className="p-6 text-center text-slate-400 dark:text-white/30 text-sm italic">
                                        Nenhum comentário registrado.
                                    </div>
                                ) : (
                                    comments.map(comment => (
                                        <div 
                                            key={comment.id} 
                                            className={`p-4 flex gap-3 hover:bg-slate-50 dark:hover:bg-white/5 transition-colors group ${
                                                highlightedIds.includes(comment.id) ? 'bg-amber-50 dark:bg-amber-500/10 animate-pulse duration-1000' : ''
                                            }`}
                                        >
                                            <div className="w-8 h-8 rounded-full bg-slate-200 dark:bg-white/10 flex items-center justify-center text-slate-600 dark:text-white font-bold text-xs shrink-0 border border-slate-300 dark:border-white/10">
                                                {comment.user.charAt(0)}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center justify-between mb-1">
                                                    <span className="text-xs font-bold text-slate-900 dark:text-white">{comment.user}</span>
                                                    <span className="text-[10px] text-slate-400">{new Date(comment.createdAt).toLocaleString()}</span>
                                                </div>
                                                <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed break-words bg-slate-50 dark:bg-white/5 p-3 rounded-tr-xl rounded-br-xl rounded-bl-xl border border-slate-100 dark:border-white/5">
                                                    {comment.text}
                                                </p>
                                            </div>
                                            <button onClick={() => deleteInteraction(comment.id)} className="opacity-0 group-hover:opacity-100 self-start p-2 text-slate-300 hover:text-red-500 transition-all">
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>
                    </div>

                </div>

                {/* RIGHT COLUMN (SIDEBAR) */}
                <div className="w-full md:w-80 bg-white/50 dark:bg-black/20 border-t md:border-t-0 md:border-l border-slate-200 dark:border-white/10 p-4 md:p-6 space-y-6 md:h-auto overflow-y-auto">
                    
                    {/* Status Switcher (Desktop) */}
                    <div className="hidden md:block">
                        <label className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-white/40 mb-3 block">Status</label>
                        <div className="bg-slate-100 dark:bg-black/20 p-1 rounded-xl flex flex-col relative border border-slate-200 dark:border-white/5 gap-1">
                             {statusOptions.map((opt) => {
                                    const isActive = demand.status === opt.value;
                                    return (
                                        <button
                                            key={opt.value}
                                            onClick={() => onUpdateStatus(demand.id, opt.value)}
                                            className={`
                                                w-full py-2.5 px-3 text-sm font-bold rounded-lg transition-all duration-300 flex items-center gap-3
                                                ${isActive 
                                                    ? 'bg-white dark:bg-white/10 text-brand-600 dark:text-white shadow-sm ring-1 ring-slate-200 dark:ring-white/10' 
                                                    : 'text-slate-500 dark:text-white/40 hover:bg-slate-200 dark:hover:bg-white/5'}
                                            `}
                                        >
                                            <opt.icon className={`w-4 h-4 ${isActive ? 'text-brand-500 dark:text-brand-400' : 'opacity-50'}`} />
                                            {opt.label}
                                        </button>
                                    )
                             })}
                        </div>
                    </div>

                    {/* Dates */}
                    <div className="bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-2xl p-4 space-y-4">
                        <h4 className="text-xs font-bold uppercase text-slate-400 dark:text-white/40 mb-2">Datas</h4>
                        
                        <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-lg bg-slate-100 dark:bg-white/10 flex items-center justify-center text-slate-500 dark:text-white/50">
                                <Calendar className="w-4 h-4" />
                            </div>
                            <div>
                                <p className="text-[10px] uppercase font-bold text-slate-400">Criado em</p>
                                <p className="text-sm font-bold text-slate-800 dark:text-white">{new Date(demand.createdAt).toLocaleDateString()}</p>
                            </div>
                        </div>

                        <div className="flex items-center gap-3">
                            <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${demand.deadline ? 'bg-brand-100 dark:bg-brand-500/20 text-brand-600 dark:text-brand-400' : 'bg-slate-100 dark:bg-white/10 text-slate-500'}`}>
                                <Clock className="w-4 h-4" />
                            </div>
                            <div>
                                <p className="text-[10px] uppercase font-bold text-slate-400">Prazo Demanda</p>
                                <p className={`text-sm font-bold ${demand.deadline ? 'text-slate-800 dark:text-white' : 'text-slate-400 italic'}`}>
                                    {formatDate(demand.deadline) || 'Sem prazo'}
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Citizen Info Mini */}
                    <div className="bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-2xl p-4">
                         <div className="flex items-center justify-between mb-3">
                            <h4 className="text-xs font-bold uppercase text-slate-400 dark:text-white/40">Solicitante</h4>
                         </div>

                         {citizen ? (
                             <div className="flex flex-col gap-3">
                                 <div className="flex items-center gap-3 cursor-pointer hover:bg-slate-50 dark:hover:bg-white/5 p-2 -ml-2 rounded-xl transition-colors group" onClick={() => onViewCitizen && onViewCitizen(citizen.id)}>
                                     <div className="w-10 h-10 rounded-full bg-slate-100 dark:bg-white/10 flex items-center justify-center text-slate-600 dark:text-white font-bold text-sm shadow-inner shrink-0">
                                        {citizen.name.charAt(0)}
                                     </div>
                                     <div className="min-w-0">
                                         <p className="text-sm font-bold text-slate-900 dark:text-white truncate group-hover:text-brand-600 transition-colors flex items-center gap-1">
                                            {citizen.name}
                                            <ExternalLink className="w-3 h-3 opacity-0 group-hover:opacity-100" />
                                         </p>
                                         <p className="text-xs text-slate-500 dark:text-white/50">{formatPhone(citizen.phone)}</p>
                                     </div>
                                 </div>
                                 
                                 {/* Action Buttons Row */}
                                 <div className="flex gap-2">
                                     {citizen.phone && (
                                         <button 
                                             onClick={() => openWhatsApp(citizen.phone)}
                                             className="flex-1 py-1.5 bg-green-500 hover:bg-green-600 text-white rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition-colors shadow-sm active:scale-95"
                                             title="Conversar no WhatsApp"
                                         >
                                             <MessageCircle className="w-3.5 h-3.5" /> WhatsApp
                                         </button>
                                     )}
                                     {citizen.email && (
                                         <button 
                                             onClick={() => openEmail(citizen.email)}
                                             className="flex-1 py-1.5 bg-blue-500 hover:bg-blue-600 text-white rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition-colors shadow-sm active:scale-95"
                                             title="Enviar Email"
                                         >
                                             <Mail className="w-3.5 h-3.5" /> Email
                                         </button>
                                     )}
                                 </div>
                             </div>
                         ) : (
                             <div className="text-center py-4 text-slate-400 text-xs italic">
                                 Nenhum solicitante vinculado.
                             </div>
                         )}
                    </div>

                </div>

            </div>
        </div>
    </div>
  );
};

export default DemandDetailsModal;
