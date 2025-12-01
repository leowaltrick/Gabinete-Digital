
import React, { useState, useEffect, useRef } from 'react';
import { Search, Plus, UserPlus, FileText, ChevronRight, Phone, ArrowLeft, Loader2, Check } from 'lucide-react';
import { supabase, isSupabaseConfigured } from '../services/supabaseClient';
import { formatPhone, stripNonDigits } from '../utils/cpfValidation';
import { Citizen } from '../types';

interface MobileFastTrackProps {
  onBack: () => void;
  onSuccess: (citizenId: string) => void;
}

const MobileFastTrack: React.FC<MobileFastTrackProps> = ({ onBack, onSuccess }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [step, setStep] = useState<'search' | 'create-citizen'>('search');
  const [searchResults, setSearchResults] = useState<Citizen[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [debouncedTerm, setDebouncedTerm] = useState('');

  // New Citizen State
  const [newName, setNewName] = useState('');
  const [newBairro, setNewBairro] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedTerm(searchTerm), 500);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  useEffect(() => {
    if (!debouncedTerm || debouncedTerm.length < 3) {
      setSearchResults([]);
      return;
    }
    
    const search = async () => {
      setIsLoading(true);
      if (isSupabaseConfigured() && supabase) {
        const cleanPhone = stripNonDigits(debouncedTerm);
        // Search by phone OR name
        const { data } = await supabase
          .from('citizens')
          .select('*')
          .or(`telefone.ilike.%${cleanPhone}%,nome.ilike.%${debouncedTerm}%`)
          .limit(5);
        
        if (data) {
            setSearchResults(data.map((c: any) => ({
                id: c.id,
                name: `${c.nome} ${c.sobrenome}`,
                phone: c.telefone,
                bairro: c.bairro,
                email: c.email || '',
                createdAt: c.created_at
            })));
        }
      }
      setIsLoading(false);
    };
    search();
  }, [debouncedTerm]);

  const handleCreateCitizen = async () => {
      if (!newName || !searchTerm) return;
      setIsSaving(true);
      
      const cleanPhone = stripNonDigits(searchTerm); // Assume search term is phone if creating new
      const nameParts = newName.trim().split(' ');
      const firstName = nameParts[0];
      const lastName = nameParts.slice(1).join(' ') || '.';

      try {
          if (isSupabaseConfigured() && supabase) {
              const { data, error } = await supabase.from('citizens').insert({
                  nome: firstName,
                  sobrenome: lastName,
                  telefone: cleanPhone,
                  bairro: newBairro,
                  origem: 'fast_track_mobile'
              }).select().single();

              if (error) throw error;
              if (data) onSuccess(data.id);
          }
      } catch (e) {
          console.error(e);
          alert('Erro ao criar cidadão rápido.');
      } finally {
          setIsSaving(false);
      }
  };

  return (
    <div className="fixed inset-0 bg-slate-50 dark:bg-[#020617] z-[100] flex flex-col animate-in slide-in-from-bottom duration-300">
        {/* Header */}
        <div className="p-4 flex items-center gap-4 border-b border-slate-200 dark:border-white/10 bg-white dark:bg-[#0b1121]">
            <button onClick={onBack} className="p-2 rounded-full hover:bg-slate-100 dark:hover:bg-white/10">
                <ArrowLeft className="w-6 h-6 text-slate-600 dark:text-white" />
            </button>
            <h1 className="text-lg font-bold text-slate-900 dark:text-white">Nova Solicitação</h1>
        </div>

        {step === 'search' && (
            <div className="flex-1 p-6 flex flex-col">
                <label className="text-sm font-bold text-slate-500 dark:text-white/50 mb-2 uppercase">Quem está solicitando?</label>
                <div className="relative mb-6">
                    <input 
                        autoFocus
                        type="text" 
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)} // Don't format yet, allow name search
                        placeholder="Telefone ou Nome..."
                        className="w-full text-2xl font-bold bg-transparent border-b-2 border-slate-300 dark:border-white/20 py-2 outline-none focus:border-brand-500 text-slate-900 dark:text-white placeholder:text-slate-300"
                    />
                    {isLoading && <Loader2 className="absolute right-0 top-3 w-6 h-6 animate-spin text-brand-500" />}
                </div>

                {/* Results List */}
                <div className="flex-1 overflow-y-auto space-y-3">
                    {searchResults.map(citizen => (
                        <button 
                            key={citizen.id} 
                            onClick={() => onSuccess(citizen.id)}
                            className="w-full text-left p-4 bg-white dark:bg-white/5 rounded-2xl border border-slate-200 dark:border-white/10 shadow-sm flex items-center justify-between active:scale-95 transition-transform"
                        >
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-full bg-brand-100 dark:bg-brand-500/20 flex items-center justify-center text-brand-600 dark:text-brand-400 font-bold">
                                    {citizen.name.charAt(0)}
                                </div>
                                <div>
                                    <p className="font-bold text-slate-900 dark:text-white">{citizen.name}</p>
                                    <p className="text-xs text-slate-500 dark:text-white/50">{formatPhone(citizen.phone)}</p>
                                </div>
                            </div>
                            <div className="bg-brand-600 text-white p-2 rounded-xl">
                                <Plus className="w-5 h-5" />
                            </div>
                        </button>
                    ))}

                    {/* Not Found / Create New Option */}
                    {debouncedTerm.length > 3 && (
                        <button 
                            onClick={() => setStep('create-citizen')}
                            className="w-full p-4 mt-4 bg-slate-100 dark:bg-white/5 rounded-2xl border-2 border-dashed border-slate-300 dark:border-white/10 flex items-center justify-center gap-2 text-slate-500 dark:text-white/60 font-bold active:scale-95 transition-transform"
                        >
                            <UserPlus className="w-5 h-5" />
                            Cadastrar "{searchTerm}"
                        </button>
                    )}
                </div>
            </div>
        )}

        {step === 'create-citizen' && (
            <div className="flex-1 p-6 flex flex-col">
                <div className="bg-white dark:bg-white/5 p-6 rounded-3xl border border-slate-200 dark:border-white/10 shadow-lg space-y-6">
                    <div>
                        <label className="block text-xs font-bold uppercase text-slate-400 mb-1">Telefone</label>
                        <p className="text-xl font-mono font-bold text-slate-900 dark:text-white border-b border-slate-100 pb-2">{formatPhone(searchTerm)}</p>
                    </div>
                    
                    <div>
                        <label className="block text-xs font-bold uppercase text-slate-400 mb-1">Nome Completo</label>
                        <input 
                            autoFocus
                            type="text" 
                            value={newName}
                            onChange={(e) => setNewName(e.target.value)}
                            className="w-full text-lg font-bold bg-slate-50 dark:bg-black/20 p-3 rounded-xl outline-none focus:ring-2 ring-brand-500"
                            placeholder="Ex: João da Silva"
                        />
                    </div>

                    <div>
                        <label className="block text-xs font-bold uppercase text-slate-400 mb-1">Bairro (Opcional)</label>
                        <input 
                            type="text" 
                            value={newBairro}
                            onChange={(e) => setNewBairro(e.target.value)}
                            className="w-full text-lg font-bold bg-slate-50 dark:bg-black/20 p-3 rounded-xl outline-none focus:ring-2 ring-brand-500"
                            placeholder="Ex: Centro"
                        />
                    </div>

                    <button 
                        onClick={handleCreateCitizen}
                        disabled={isSaving || !newName}
                        className="w-full py-4 bg-brand-600 text-white rounded-xl font-bold text-lg shadow-xl shadow-brand-500/20 flex items-center justify-center gap-2 active:scale-95 transition-transform disabled:opacity-50"
                    >
                        {isSaving ? <Loader2 className="w-6 h-6 animate-spin" /> : <Check className="w-6 h-6" />}
                        Salvar e Criar Demanda
                    </button>
                </div>
            </div>
        )}
    </div>
  );
};

export default MobileFastTrack;
