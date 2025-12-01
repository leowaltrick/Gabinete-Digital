import React, { useState, useEffect } from 'react';
import { Demand, DemandLevel, DemandStatus, DemandPriority, Pessoa, DemandType } from '../types';
import { supabase, isSupabaseConfigured } from '../services/supabaseClient';
import { Save, ArrowLeft, User, MapPin, Calendar, Clock, AlertCircle, CheckCircle, Loader2, Phone, Mail, FileText, Activity, X } from 'lucide-react';
import { formatPhone } from '../utils/cpfValidation';

interface DemandEditProps {
  demand: Demand;
  onSuccess: (id?: string) => void;
  onCancel: () => void;
  onNotification?: (type: 'success' | 'error', message: string) => void;
}

const DemandEdit: React.FC<DemandEditProps> = ({ demand, onSuccess, onCancel, onNotification }) => {
  const [title, setTitle] = useState(demand.title);
  const [description, setDescription] = useState(demand.description);
  const [level, setLevel] = useState<DemandLevel>(demand.level);
  const [status, setStatus] = useState<DemandStatus>(demand.status);
  const [priority, setPriority] = useState<DemandPriority>(demand.priority);
  const [demandType, setDemandType] = useState<DemandType>(demand.type || DemandType.SOLICITACAO);
  const [deadline, setDeadline] = useState(demand.deadline ? demand.deadline.split('T')[0] : '');
  
  const [citizen, setCitizen] = useState<Pessoa | null>(null);
  const [isLoadingCitizen, setIsLoadingCitizen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    const fetchCitizen = async () => {
      if (!demand.citizenId || !isSupabaseConfigured() || !supabase) return;
      setIsLoadingCitizen(true);
      try {
        const { data, error } = await supabase
          .from('citizens')
          .select('*')
          .eq('id', demand.citizenId)
          .maybeSingle();
        
        if (data) {
             setCitizen(data as Pessoa);
        } else {
             const { data: altData } = await supabase
                .from('citizens')
                .select('*')
                .eq('cpf', demand.citizenId)
                .maybeSingle();
             if (altData) setCitizen(altData as Pessoa);
        }
      } catch (err: any) {
        console.error("Error fetching citizen details:", err.message || err);
      } finally {
        setIsLoadingCitizen(false);
      }
    };
    fetchCitizen();
  }, [demand.citizenId]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      if (!isSupabaseConfigured() || !supabase) throw new Error("Supabase não configurado.");
      const { error } = await supabase
        .from('demands')
        .update({ title, description, level, status, priority, type: demandType, deadline: deadline || null })
        .eq('id', demand.id);
      if (error) throw error;
      if(onNotification) onNotification('success', 'Alterações salvas com sucesso!');
      setTimeout(() => onSuccess(demand.id), 1000);
    } catch (err: any) {
      if(onNotification) onNotification('error', err.message || "Erro ao atualizar demanda.");
      setIsSaving(false);
    }
  };

  const getPriorityColor = (p: DemandPriority) => {
    switch (p) {
      case DemandPriority.HIGH: return 'text-red-600 dark:text-red-400 bg-red-100 dark:bg-red-500/10 border-red-200 dark:border-red-500/20';
      case DemandPriority.MEDIUM: return 'text-amber-600 dark:text-amber-400 bg-amber-100 dark:bg-amber-500/10 border-amber-200 dark:border-amber-500/20';
      case DemandPriority.LOW: return 'text-green-600 dark:text-green-400 bg-green-100 dark:bg-green-500/10 border-green-200 dark:border-green-500/20';
    }
  };

  return (
    <div className="max-w-7xl mx-auto pb-24 md:pb-0 animate-in fade-in slide-in-from-right duration-500 relative">
      <div className="flex items-center justify-between mb-6 sticky top-0 bg-slate-50/95 dark:bg-[#020617]/95 backdrop-blur-sm z-20 py-2 md:static md:bg-transparent md:py-0">
        <div className="flex items-center gap-4">
            <button onClick={onCancel} className="p-2 rounded-xl hover:bg-slate-200 dark:hover:bg-white/10 text-slate-500 dark:text-white transition-colors"> <ArrowLeft className="w-6 h-6" /> </button>
            <div> <h1 className="text-xl md:text-2xl font-bold text-slate-900 dark:text-white tracking-tight flex flex-col md:flex-row md:items-center gap-1 md:gap-2"> Edição de Demanda <span className="text-xs md:text-sm font-normal text-slate-400 dark:text-white/40 border border-slate-200 dark:border-white/10 px-2 py-0.5 rounded-md font-mono w-fit">#{demand.id.slice(0, 8)}</span> </h1> </div>
        </div>
        <div className="hidden md:flex gap-3">
             <button onClick={onCancel} className="px-6 py-2.5 rounded-xl font-bold text-slate-500 dark:text-white/60 hover:bg-slate-100 dark:hover:bg-white/5 hover:text-slate-900 dark:hover:text-white transition-colors border border-transparent"> Cancelar </button>
             <button onClick={handleSave} disabled={isSaving} className="px-6 py-2.5 bg-brand-600 hover:bg-brand-500 text-white rounded-xl font-bold shadow-[0_0_20px_rgba(14,165,233,0.3)] transition-all flex items-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed"> {isSaving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />} {isSaving ? 'Salvando...' : 'Salvar Alterações'} </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-6">
        <div className="lg:col-span-2 space-y-4 md:space-y-6">
            <div className="glass-panel p-4 md:p-6 rounded-3xl border border-slate-200 dark:border-white/10 relative overflow-hidden group">
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-brand-500 via-blue-500 to-brand-500"></div>
                <div className="flex items-center gap-2 mb-4 text-xs font-bold uppercase tracking-wider text-brand-600 dark:text-brand-400"> <User className="w-4 h-4" /> Solicitante Vinculado </div>
                {isLoadingCitizen ? ( <div className="flex items-center gap-4 animate-pulse"> <div className="w-12 h-12 md:w-16 md:h-16 bg-slate-200 dark:bg-white/10 rounded-full"></div> <div className="space-y-2 flex-1"> <div className="h-4 bg-slate-200 dark:bg-white/10 rounded w-1/3"></div> <div className="h-3 bg-slate-200 dark:bg-white/10 rounded w-1/4"></div> </div> </div> ) : citizen ? ( <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 md:gap-6"> <div className="flex items-center gap-4 md:gap-5"> <div className="w-12 h-12 md:w-16 md:h-16 bg-slate-100 dark:bg-slate-900 rounded-full border-2 border-slate-200 dark:border-white/10 flex items-center justify-center shrink-0 shadow-inner"> <span className="text-xl md:text-2xl font-bold text-brand-600 dark:text-brand-400">{citizen.nome.charAt(0)}</span> </div> <div> <h2 className="text-lg md:text-xl font-bold text-slate-900 dark:text-white">{citizen.nome} {citizen.sobrenome}</h2> {citizen.telefone && ( <p className="text-slate-500 dark:text-white/50 font-mono text-xs md:text-sm mt-1 flex items-center gap-2"> <Phone className="w-3 h-3" /> {formatPhone(citizen.telefone)} </p> )} </div> </div> <div className="flex flex-wrap gap-2 md:gap-4 text-xs md:text-sm"> <div className="flex items-center gap-2 text-slate-700 dark:text-white/80 bg-slate-50 dark:bg-white/5 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-white/5"> <MapPin className="w-4 h-4 text-brand-500" /> {citizen.cidade} - {citizen.estado} </div> </div> </div> ) : ( <div className="text-slate-500 dark:text-white/50 italic text-sm">Cidadão não encontrado.</div> )}
            </div>

            <div className="glass-panel p-4 md:p-8 rounded-3xl border border-slate-200 dark:border-white/10 space-y-4 md:space-y-6">
                 <div className="flex items-center gap-2 mb-2 text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-white/40"> <FileText className="w-4 h-4" /> Detalhes da Solicitação </div>
                 <div> <label className="block text-sm font-bold text-slate-700 dark:text-white/80 mb-2">Tipo de Demanda</label> <div className="relative"> <select value={demandType} onChange={e => setDemandType(e.target.value as DemandType)} className="w-full pl-4 pr-10 py-3 appearance-none glass-input border border-slate-300 dark:border-white/10 rounded-xl outline-none focus:border-brand-500 text-slate-900 dark:text-white font-medium [&>option]:bg-white dark:[&>option]:bg-slate-900"> {Object.values(DemandType).map(t => <option key={t} value={t}>{t}</option>)} </select> </div> </div>
                 <div> <label className="block text-sm font-bold text-slate-700 dark:text-white/80 mb-2">Título da Ocorrência</label> <input type="text" value={title} onChange={e => setTitle(e.target.value)} className="w-full px-4 py-3 glass-input border border-slate-300 dark:border-white/10 rounded-xl outline-none focus:border-brand-500 text-base md:text-lg font-bold text-slate-900 dark:text-white" /> </div>
                 <div> <label className="block text-sm font-bold text-slate-700 dark:text-white/80 mb-2">Descrição Detalhada</label> <textarea value={description} onChange={e => setDescription(e.target.value)} rows={8} className="w-full px-4 py-3 glass-input border border-slate-300 dark:border-white/10 rounded-xl outline-none focus:border-brand-500 text-sm text-slate-900 dark:text-white leading-relaxed resize-none" /> </div>
                 <div className="p-4 bg-slate-50 dark:bg-white/5 rounded-xl border border-slate-200 dark:border-white/5"> <label className="block text-xs font-bold text-slate-500 dark:text-white/40 uppercase mb-2">Localização Registrada</label> <div className="flex items-center gap-3 text-slate-700 dark:text-white"> <MapPin className="w-5 h-5 text-red-500 shrink-0" /> <span className="font-medium text-sm"> {citizen?.logradouro}, {citizen?.numero} - {citizen?.bairro}, {citizen?.cidade}/{citizen?.estado} </span> </div> </div>
            </div>
        </div>

        <div className="lg:col-span-1 space-y-6">
            <div className="glass-panel p-4 md:p-6 rounded-3xl border border-slate-200 dark:border-white/10 lg:sticky lg:top-6">
                <div className="flex items-center gap-2 mb-6 text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-white/40"> <Activity className="w-4 h-4" /> Controle de Gestão </div>
                <div className="space-y-6">
                    <div> <label className="block text-sm font-bold text-slate-700 dark:text-white/80 mb-2">Status Atual</label> <div className="relative"> <select value={status} onChange={e => setStatus(e.target.value as DemandStatus)} className="w-full pl-4 pr-10 py-3 appearance-none glass-input border border-slate-300 dark:border-white/10 rounded-xl outline-none focus:border-brand-500 text-slate-900 dark:text-white font-medium [&>option]:bg-white dark:[&>option]:bg-slate-900"> {Object.values(DemandStatus).map(s => <option key={s} value={s}>{s}</option>)} </select> <div className="absolute right-3 top-3.5 pointer-events-none text-slate-500 dark:text-white/50">▼</div> </div> </div>
                    <div> <label className="block text-sm font-bold text-slate-700 dark:text-white/80 mb-2">Prioridade</label> <div className="grid grid-cols-1 gap-2"> {Object.values(DemandPriority).map(p => ( <label key={p} className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-all ${priority === p ? getPriorityColor(p) : 'border-slate-200 dark:border-white/10 text-slate-500 dark:text-white/50 hover:bg-slate-50 dark:hover:bg-white/5'}`}> <input type="radio" name="priority" value={p} checked={priority === p} onChange={() => setPriority(p)} className="accent-current" /> <span className="font-bold text-sm uppercase">{p}</span> </label> ))} </div> </div>
                    <div> <label className="block text-sm font-bold text-slate-700 dark:text-white/80 mb-2">Nível de Governo</label> <div className="relative"> <select value={level} onChange={e => setLevel(e.target.value as DemandLevel)} className="w-full pl-4 pr-10 py-3 appearance-none glass-input border border-slate-300 dark:border-white/10 rounded-xl outline-none focus:border-brand-500 text-slate-900 dark:text-white font-medium [&>option]:bg-white dark:[&>option]:bg-slate-900"> {Object.values(DemandLevel).map(l => <option key={l} value={l}>{l}</option>)} </select> <div className="absolute right-3 top-3.5 pointer-events-none text-slate-500 dark:text-white/50">▼</div> </div> </div>
                    <div> <label className="block text-sm font-bold text-slate-700 dark:text-white/80 mb-2">Prazo Limite</label> <div className="relative"> <input type="date" value={deadline} onChange={e => setDeadline(e.target.value)} className="w-full pl-10 pr-4 py-3 glass-input border border-slate-300 dark:border-white/10 rounded-xl outline-none focus:border-brand-500 text-slate-900 dark:text-white font-medium" /> <Calendar className="w-5 h-5 text-slate-400 dark:text-white/40 absolute left-3 top-3.5" /> </div> </div>
                </div>
            </div>
        </div>
      </div>

      {/* MOBILE STICKY ACTION BAR */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 p-4 bg-white/95 dark:bg-[#0b1121]/95 backdrop-blur-md border-t border-slate-200 dark:border-white/10 z-30 flex gap-3 pb-6">
            <button onClick={onCancel} className="flex-1 py-3 rounded-xl font-bold text-slate-500 dark:text-white/60 bg-slate-100 dark:bg-white/5 hover:bg-slate-200 active:scale-95 transition-all"> Cancelar </button>
            <button onClick={handleSave} disabled={isSaving} className="flex-1 py-3 bg-brand-600 hover:bg-brand-500 text-white rounded-xl font-bold shadow-lg flex items-center justify-center gap-2 disabled:opacity-70 active:scale-95 transition-all"> {isSaving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />} {isSaving ? 'Salvando...' : 'Salvar'} </button>
      </div>
    </div>
  );
};

export default DemandEdit;