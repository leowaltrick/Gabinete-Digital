
import React, { useState, useEffect, useMemo } from 'react';
import { supabase, isSupabaseConfigured } from '../services/supabaseClient';
import { Search, Loader2, Users, UserPlus, ArrowRight, Download, Save, ChevronLeft, X, Filter, MapPin, BarChart3, FileText, AlignLeft, Phone, Mail, CloudOff } from 'lucide-react';
import { Pessoa, Demand, DemandStatus, Citizen, RoleConfig } from '../types';
import { formatPhone, stripNonDigits, formatCEP } from '../utils/cpfValidation';
import { downloadCSV } from '../utils/exportUtils';
import { getCoordinates } from '../utils/geocoding'; // Import helper
import Pagination from './Pagination';
import StatCard from './StatCard';
import CitizenDetailsModal from './CitizenDetailsModal';

interface PeopleManagerProps {
  isModalMode?: boolean;
  onSelectPerson?: (person: Pessoa) => void;
  initialSearchTerm?: string; 
  initialMode?: 'list' | 'details' | 'form';
  onCreateDemand?: (cpf: string) => void;
  onEditDemand?: (demand: Demand) => void;
  onUpdateStatus?: (demandId: string, newStatus: DemandStatus) => void;
  onModeChange?: (mode: 'list' | 'details' | 'form') => void;
  onInteractionUpdate?: () => void;
  onPersonUpdate?: () => void;
  onNotification?: (type: 'success' | 'error', message: string) => void;
  permissions?: RoleConfig;
  onClearSelection?: () => void;
  demands?: Demand[];
  onMapFocus?: (lat: number, lon: number, type: 'demands' | 'citizens', id?: string) => void;
}

const PeopleManager: React.FC<PeopleManagerProps> = ({ 
    isModalMode = false, 
    onSelectPerson, 
    initialSearchTerm, 
    initialMode = 'list', 
    onCreateDemand, 
    onEditDemand, 
    onUpdateStatus, 
    onModeChange, 
    onInteractionUpdate, 
    onPersonUpdate, 
    onNotification, 
    permissions, 
    onClearSelection, 
    demands = [],
    onMapFocus 
}) => {
  const [viewMode, setViewMode] = useState<'list' | 'details' | 'form'>('list');
  const [selectedPerson, setSelectedPerson] = useState<Pessoa | null>(null);
  const [peopleList, setPeopleList] = useState<Pessoa[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoadingList, setIsLoadingList] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;
  const [isEditing, setIsEditing] = useState(false);
  const [filterHasDemands, setFilterHasDemands] = useState(false);
  
  // Form States
  const [nome, setNome] = useState('');
  const [sobrenome, setSobrenome] = useState('');
  const [email, setEmail] = useState('');
  const [emailSuggestions, setEmailSuggestions] = useState<string[]>([]);
  const [telefone, setTelefone] = useState('');
  const [cep, setCep] = useState('');
  const [isLoadingCep, setIsLoadingCep] = useState(false); 
  const [logradouro, setLogradouro] = useState('');
  const [numero, setNumero] = useState('');
  const [complemento, setComplemento] = useState('');
  const [bairro, setBairro] = useState('');
  const [cidade, setCidade] = useState('');
  const [estado, setEstado] = useState('');
  const [observacoes, setObservacoes] = useState(''); // New Field
  
  const [isLoadingSearch, setIsLoadingSearch] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [existingPerson, setExistingPerson] = useState<Pessoa | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const canCreate = permissions ? permissions.canCreateCitizen : true;
  const isOnline = navigator.onLine;

  useEffect(() => { if (onModeChange) onModeChange(viewMode); }, [viewMode, onModeChange]);
  useEffect(() => { if (initialMode && initialMode !== 'list') { if (initialMode === 'form' && viewMode !== 'form') { handleSwitchToForm(); } } }, [initialMode]); 
  useEffect(() => { 
      if (initialSearchTerm) { 
          const fetchAndSelect = async () => { 
              const clean = stripNonDigits(initialSearchTerm); 
              if (isSupabaseConfigured() && supabase) { 
                  // If input is phone
                  const { data } = await supabase.from('citizens').select('*').eq('telefone', clean).maybeSingle(); 
                  if (data) { 
                      setPeopleList([data as Pessoa]); 
                      handleViewDetails(data as Pessoa);
                  } else { 
                      setSearchTerm(initialSearchTerm); 
                      setViewMode('list'); 
                  } 
              } 
          }; 
          fetchAndSelect(); 
      } else { 
          if(viewMode === 'list') fetchPeople(); 
      } 
  }, [initialSearchTerm]);
  
  useEffect(() => { if (viewMode === 'list' && !initialSearchTerm && peopleList.length === 0) { fetchPeople(); } }, [viewMode]);

  const fetchPeople = async () => { setIsLoadingList(true); try { if (isSupabaseConfigured() && supabase) { const { data, error } = await supabase.from('citizens').select('*').order('created_at', { ascending: false }).limit(1000); if (error) throw error; if (data) setPeopleList(data as Pessoa[]); } } catch (error) { console.error("Erro ao buscar pessoas:", error); } finally { setIsLoadingList(false); } };
  const clearForm = () => { setNome(''); setSobrenome(''); setEmail(''); setEmailSuggestions([]); setTelefone(''); setCep(''); setLogradouro(''); setNumero(''); setComplemento(''); setBairro(''); setCidade(''); setEstado(''); setObservacoes(''); setExistingPerson(null); setIsEditing(false); setFormError(null); };
  const handleSwitchToForm = () => { if(!canCreate) { if(onNotification) onNotification('error', 'Sem permissão para criar cidadãos.'); return; } clearForm(); setIsEditing(false); setViewMode('form'); };
  const handleBackToList = () => { clearForm(); setSelectedPerson(null); setViewMode('list'); if (onClearSelection) onClearSelection(); };
  
  const handleViewDetails = (pessoa: Pessoa) => { 
      if (isModalMode && onSelectPerson) { 
          onSelectPerson(pessoa); 
          return; 
      } 
      setSelectedPerson(pessoa); 
      setViewMode('details');
  };

  const handleEditFromDetails = () => { 
      if(!selectedPerson) return; 
      if(!canCreate) { if(onNotification) onNotification('error', 'Sem permissão para editar.'); return; } 
      setNome(selectedPerson.nome || ''); 
      setSobrenome(selectedPerson.sobrenome || ''); 
      setEmail(selectedPerson.email || ''); 
      setTelefone(formatPhone(selectedPerson.telefone || '')); 
      setCep(formatCEP(selectedPerson.cep || '')); 
      setLogradouro(selectedPerson.logradouro || ''); 
      setNumero(selectedPerson.numero || ''); 
      setComplemento(selectedPerson.complemento || ''); 
      setBairro(selectedPerson.bairro || ''); 
      setCidade(selectedPerson.cidade || ''); 
      setEstado(selectedPerson.estado || ''); 
      setObservacoes(selectedPerson.observacoes || '');
      setExistingPerson(selectedPerson); 
      setIsEditing(true); 
      setViewMode('form'); 
      setSelectedPerson(null); 
  };

  const handlePhoneBlur = async () => { if (isEditing) return; const cleanPhone = stripNonDigits(telefone); if (!cleanPhone) return; if (cleanPhone.length < 10) { setFormError('Telefone inválido'); return; } setIsLoadingSearch(true); try { if (isSupabaseConfigured() && supabase) { const { data } = await supabase.from('citizens').select('*').eq('telefone', cleanPhone).maybeSingle(); if (data) { setExistingPerson(data as Pessoa); if(onNotification) onNotification('error', 'Este telefone já possui cadastro.'); } } } catch (error) { console.error(error); } finally { setIsLoadingSearch(false); } };
  const handleCepBlur = async () => { const cleanCep = cep.replace(/\D/g, ''); if (cleanCep.length !== 8) return; setIsLoadingCep(true); try { const response = await fetch(`https://viacep.com.br/ws/${cleanCep}/json/`); const data = await response.json(); if (!data.erro) { setLogradouro(data.logradouro); setBairro(data.bairro); setCidade(data.localidade); setEstado(data.uf); } } catch (error) { console.error(error); } finally { setIsLoadingCep(false); } };
  
  const handleEmailChange = (val: string) => { setEmail(val); if (!val) { setEmailSuggestions([]); return; } const providers = ['gmail.com', 'hotmail.com', 'outlook.com', 'yahoo.com.br', 'icloud.com']; if (providers.some(p => val.endsWith('@' + p))) { setEmailSuggestions([]); return; } if (!val.includes('@')) { setEmailSuggestions(providers.map(p => `${val}@${p}`)); } else { const [user, domainPart] = val.split('@'); const matches = providers.filter(p => p.startsWith(domainPart)); if (matches.length > 0) { setEmailSuggestions(matches.map(p => `${user}@${p}`)); } else { setEmailSuggestions([]); } } };
  const selectEmailSuggestion = (suggestion: string) => { setEmail(suggestion); setEmailSuggestions([]); };

  const handleSubmit = async (e: React.FormEvent) => { 
      e.preventDefault(); 
      if (!isOnline) {
          if(onNotification) onNotification('error', 'Cadastro/Edição indisponível offline.');
          return;
      }

      const cleanPhone = telefone ? stripNonDigits(telefone) : null; 
      const cleanCep = cep ? stripNonDigits(cep) : null;

      if (!cleanPhone) { setFormError('É necessário informar o Telefone.'); if(onNotification) onNotification('error', 'Telefone obrigatório'); return; } 
      if (cleanPhone.length < 10) { setFormError('Telefone inválido'); if(onNotification) onNotification('error', 'Telefone inválido'); return; } 
      
      setIsSaving(true); 
      setFormError(null); 
      
      try { 
          if (isSupabaseConfigured() && supabase) { 
              // GEOCODING LOGIC
              const fullAddress = `${logradouro}, ${numero} - ${bairro}, ${cidade} - ${estado}`;
              let coords = { lat: 0, lon: 0 };
              
              const fetched = await getCoordinates(fullAddress);
              if (fetched) coords = fetched;

              const payload = { 
                  nome, 
                  sobrenome, 
                  email: email || null, 
                  telefone: cleanPhone, 
                  cep: cleanCep, // Stripped CEP
                  logradouro: logradouro || null, 
                  numero: numero || null, 
                  complemento: complemento || null, 
                  bairro: bairro || null, 
                  cidade: cidade || null, 
                  estado: estado || null,
                  observacoes: observacoes || null,
                  lat: coords.lat || (isEditing ? existingPerson?.lat : null), 
                  lon: coords.lon || (isEditing ? existingPerson?.lon : null)
              }; 
              
              if (isEditing && existingPerson?.id) { 
                  const { error } = await supabase.from('citizens').update(payload).eq('id', existingPerson.id); 
                  if (error) throw error; 
                  if(onNotification) onNotification('success', 'Cidadão atualizado com sucesso!'); 
              } else { 
                  // Check existing again just in case
                  const { data: exists } = await supabase.from('citizens').select('id').eq('telefone', cleanPhone).maybeSingle(); 
                  if (exists) { throw new Error('Já existe um cidadão com este telefone.'); } 
                  const { error } = await supabase.from('citizens').insert(payload); 
                  if (error) throw error; 
                  if(onNotification) onNotification('success', 'Cidadão cadastrado com sucesso!'); 
              } 
              
              await fetchPeople(); 
              if (onPersonUpdate) onPersonUpdate();
              handleBackToList(); 
          } 
      } catch (error: any) { 
          setFormError(error.message); 
          if(onNotification) onNotification('error', error.message); 
      } finally { 
          setIsSaving(false); 
      } 
  };

  const filteredPeople = peopleList.filter(p => {
      const searchLower = searchTerm.toLowerCase();
      const matchesSearch = p.nome.toLowerCase().includes(searchLower) || (p.sobrenome && p.sobrenome.toLowerCase().includes(searchLower)) || (p.telefone && p.telefone.includes(searchTerm)) || (p.email && p.email.toLowerCase().includes(searchLower));
      
      if (filterHasDemands) {
          const hasDemand = demands.some(d => d.citizenId === p.id);
          return matchesSearch && hasDemand;
      }
      return matchesSearch;
  });

  const totalPages = Math.ceil(filteredPeople.length / itemsPerPage);
  const currentPeople = filteredPeople.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  // Render Logic
  if (viewMode === 'details' && selectedPerson) {
      return (
          <CitizenDetailsModal 
              citizen={{
                  ...selectedPerson, 
                  id: selectedPerson.id || '', 
                  phone: selectedPerson.telefone || '', 
                  email: selectedPerson.email || '',
                  name: `${selectedPerson.nome} ${selectedPerson.sobrenome}`
              }}
              onClose={() => { setSelectedPerson(null); setViewMode('list'); }}
              onEdit={handleEditFromDetails}
              onCreateDemand={() => onCreateDemand && onCreateDemand(selectedPerson.id || '')}
              onNotification={onNotification}
              onSelectDemand={(d) => {
                  if (onEditDemand) onEditDemand(d);
              }}
              onMapFocus={onMapFocus}
          />
      );
  }

  if (viewMode === 'form') {
      return (
        <div className="flex flex-col h-full animate-in fade-in slide-in-from-right duration-300">
            <div className="flex items-center gap-4 mb-6 shrink-0">
                <button onClick={handleBackToList} className="p-2 rounded-xl hover:bg-slate-200 dark:hover:bg-white/10 text-slate-500 dark:text-white transition-colors">
                    <ChevronLeft className="w-6 h-6" />
                </button>
                <h2 className="text-2xl font-bold text-slate-900 dark:text-white">{isEditing ? 'Editar Cidadão' : 'Novo Cidadão'}</h2>
            </div>

            {!isOnline && (
                <div className="mb-4 p-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-100 dark:border-amber-500/20 text-amber-600 dark:text-amber-300 text-sm font-bold rounded-xl flex items-center gap-3">
                    <CloudOff className="w-5 h-5" />
                    Edição e criação indisponíveis no modo offline.
                </div>
            )}

            <div className="flex-1 overflow-y-auto custom-scrollbar p-1 pb-24 md:pb-0">
                <form onSubmit={handleSubmit} className="max-w-4xl mx-auto space-y-8 pb-20">
                    <div className="glass-panel p-6 rounded-3xl border border-slate-200 dark:border-white/10 space-y-6">
                        <div className="flex items-center gap-2 text-brand-600 dark:text-brand-400 font-bold uppercase text-xs tracking-wider border-b border-slate-100 dark:border-white/5 pb-2">
                            <Users className="w-4 h-4" /> Dados Pessoais
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-2">
                                <label className="text-xs font-bold uppercase text-slate-500 dark:text-white/50">Nome *</label>
                                <input type="text" value={nome} onChange={(e) => setNome(e.target.value)} className="w-full px-4 py-3 rounded-xl bg-slate-50 dark:bg-black/20 border border-slate-200 dark:border-white/10 outline-none focus:border-brand-500 transition-all font-medium text-slate-900 dark:text-white" placeholder="Nome" required disabled={!isOnline} />
                            </div>
                            <div className="space-y-2">
                                <label className="text-xs font-bold uppercase text-slate-500 dark:text-white/50">Sobrenome</label>
                                <input type="text" value={sobrenome} onChange={(e) => setSobrenome(e.target.value)} className="w-full px-4 py-3 rounded-xl bg-slate-50 dark:bg-black/20 border border-slate-200 dark:border-white/10 outline-none focus:border-brand-500 transition-all font-medium text-slate-900 dark:text-white" placeholder="Sobrenome" disabled={!isOnline} />
                            </div>
                            <div className="space-y-2">
                                <label className="text-xs font-bold uppercase text-slate-500 dark:text-white/50">Celular (WhatsApp) *</label>
                                <input type="tel" value={telefone} onChange={(e) => setTelefone(formatPhone(e.target.value))} onBlur={handlePhoneBlur} className={`w-full px-4 py-3 rounded-xl bg-slate-50 dark:bg-black/20 border ${formError && formError.includes('Telefone') ? 'border-red-500' : 'border-slate-200 dark:border-white/10'} outline-none focus:border-brand-500 transition-all font-medium text-slate-900 dark:text-white`} placeholder="(00) 00000-0000" required disabled={!isOnline} />
                            </div>
                            <div className="space-y-2 relative">
                                <label className="text-xs font-bold uppercase text-slate-500 dark:text-white/50">Email</label>
                                <input type="email" value={email} onChange={(e) => handleEmailChange(e.target.value)} className="w-full px-4 py-3 rounded-xl bg-slate-50 dark:bg-black/20 border border-slate-200 dark:border-white/10 outline-none focus:border-brand-500 transition-all font-medium text-slate-900 dark:text-white" placeholder="exemplo@email.com" disabled={!isOnline} />
                                {emailSuggestions.length > 0 && (
                                    <div className="absolute top-full left-0 right-0 mt-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-white/10 rounded-xl shadow-lg z-10 overflow-hidden">
                                        {emailSuggestions.map(s => (
                                            <button key={s} type="button" onClick={() => selectEmailSuggestion(s)} className="w-full text-left px-4 py-2 hover:bg-slate-50 dark:hover:bg-white/5 text-sm text-slate-700 dark:text-white transition-colors">
                                                {s}
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    <div className="glass-panel p-6 rounded-3xl border border-slate-200 dark:border-white/10 space-y-6">
                        <div className="flex items-center gap-2 text-brand-600 dark:text-brand-400 font-bold uppercase text-xs tracking-wider border-b border-slate-100 dark:border-white/5 pb-2">
                            <MapPin className="w-4 h-4" /> Endereço
                        </div>
                        
                        <div className="grid grid-cols-12 gap-4">
                            <div className="col-span-12 sm:col-span-4 space-y-2">
                                <label className="text-xs font-bold uppercase text-slate-500 dark:text-white/50">CEP</label>
                                <div className="relative">
                                    <input 
                                        type="text" 
                                        value={cep} 
                                        onChange={(e) => setCep(formatCEP(e.target.value))} 
                                        onBlur={handleCepBlur} 
                                        className="w-full pl-4 pr-10 py-3 rounded-xl bg-slate-50 dark:bg-black/20 border border-slate-200 dark:border-white/10 outline-none focus:border-brand-500 transition-all font-medium text-slate-900 dark:text-white" 
                                        placeholder="00000-000" 
                                        disabled={!isOnline}
                                    />
                                    {isLoadingCep ? <Loader2 className="absolute right-3 top-3 w-5 h-5 text-brand-500 animate-spin" /> : <Search className="absolute right-3 top-3 w-5 h-5 text-slate-400" />}
                                </div>
                            </div>
                            <div className="col-span-12 sm:col-span-8 space-y-2">
                                <label className="text-xs font-bold uppercase text-slate-500 dark:text-white/50">Cidade</label>
                                <input type="text" value={cidade} onChange={(e) => setCidade(e.target.value)} className="w-full px-4 py-3 rounded-xl bg-slate-50 dark:bg-black/20 border border-slate-200 dark:border-white/10 outline-none focus:border-brand-500 transition-all font-medium text-slate-900 dark:text-white" disabled={!isOnline} />
                            </div>
                            <div className="col-span-12 sm:col-span-9 space-y-2">
                                <label className="text-xs font-bold uppercase text-slate-500 dark:text-white/50">Logradouro</label>
                                <input type="text" value={logradouro} onChange={(e) => setLogradouro(e.target.value)} className="w-full px-4 py-3 rounded-xl bg-slate-50 dark:bg-black/20 border border-slate-200 dark:border-white/10 outline-none focus:border-brand-500 transition-all font-medium text-slate-900 dark:text-white" disabled={!isOnline} />
                            </div>
                            <div className="col-span-4 sm:col-span-3 space-y-2">
                                <label className="text-xs font-bold uppercase text-slate-500 dark:text-white/50">Número</label>
                                <input type="text" value={numero} onChange={(e) => setNumero(e.target.value)} className="w-full px-4 py-3 rounded-xl bg-slate-50 dark:bg-black/20 border border-slate-200 dark:border-white/10 outline-none focus:border-brand-500 transition-all font-medium text-slate-900 dark:text-white" disabled={!isOnline} />
                            </div>
                            <div className="col-span-8 sm:col-span-8 space-y-2">
                                <label className="text-xs font-bold uppercase text-slate-500 dark:text-white/50">Bairro</label>
                                <input type="text" value={bairro} onChange={(e) => setBairro(e.target.value)} className="w-full px-4 py-3 rounded-xl bg-slate-50 dark:bg-black/20 border border-slate-200 dark:border-white/10 outline-none focus:border-brand-500 transition-all font-medium text-slate-900 dark:text-white" disabled={!isOnline} />
                            </div>
                            <div className="col-span-4 sm:col-span-4 space-y-2">
                                <label className="text-xs font-bold uppercase text-slate-500 dark:text-white/50">UF</label>
                                <input type="text" value={estado} onChange={(e) => setEstado(e.target.value)} className="w-full px-4 py-3 rounded-xl bg-slate-50 dark:bg-black/20 border border-slate-200 dark:border-white/10 outline-none focus:border-brand-500 transition-all font-medium text-slate-900 dark:text-white uppercase" maxLength={2} disabled={!isOnline} />
                            </div>
                            <div className="col-span-12 space-y-2">
                                <label className="text-xs font-bold uppercase text-slate-500 dark:text-white/50">Complemento</label>
                                <input type="text" value={complemento} onChange={(e) => setComplemento(e.target.value)} className="w-full px-4 py-3 rounded-xl bg-slate-50 dark:bg-black/20 border border-slate-200 dark:border-white/10 outline-none focus:border-brand-500 transition-all font-medium text-slate-900 dark:text-white" disabled={!isOnline} />
                            </div>
                        </div>
                    </div>

                    <div className="glass-panel p-6 rounded-3xl border border-slate-200 dark:border-white/10 space-y-6">
                        <div className="flex items-center gap-2 text-brand-600 dark:text-brand-400 font-bold uppercase text-xs tracking-wider border-b border-slate-100 dark:border-white/5 pb-2">
                            <AlignLeft className="w-4 h-4" /> Informações Adicionais
                        </div>
                        <div className="space-y-2">
                            <label className="text-xs font-bold uppercase text-slate-500 dark:text-white/50">Observações</label>
                            <textarea 
                                value={observacoes} 
                                onChange={(e) => setObservacoes(e.target.value)} 
                                rows={4}
                                className="w-full px-4 py-3 rounded-xl bg-slate-50 dark:bg-black/20 border border-slate-200 dark:border-white/10 outline-none focus:border-brand-500 transition-all font-medium text-slate-900 dark:text-white resize-none"
                                placeholder="Anotações gerais sobre o cidadão..." 
                                disabled={!isOnline}
                            />
                        </div>
                    </div>

                    <div className="flex gap-4 pt-4">
                        <button type="button" onClick={handleBackToList} className="flex-1 py-4 rounded-xl border border-slate-200 dark:border-white/10 font-bold text-slate-600 dark:text-white hover:bg-slate-50 dark:hover:bg-white/5 transition-colors">Cancelar</button>
                        <button type="submit" disabled={isSaving || !isOnline} className="flex-[2] py-4 bg-brand-600 hover:bg-brand-500 text-white rounded-xl font-bold shadow-lg shadow-brand-500/20 flex items-center justify-center gap-2 disabled:opacity-70 transition-all">
                            {isSaving ? <Loader2 className="w-5 h-5 animate-spin" /> : isOnline ? <Save className="w-5 h-5" /> : <CloudOff className="w-5 h-5" />}
                            {isEditing ? 'Salvar Alterações' : 'Cadastrar Cidadão'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
      );
  }

  // --- LIST VIEW ---
  return (
    <div className="flex flex-col h-auto md:h-full animate-in fade-in slide-in-from-left duration-300">
        {/* Header & Filters */}
        <div className="flex flex-col gap-4 mb-4 shrink-0">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-slate-900 dark:text-white tracking-tight flex items-center gap-3">
                        <Users className="w-8 h-8 text-brand-600 dark:text-brand-400" />
                        Base de Cidadãos
                    </h1>
                </div>
                
                <div className="flex gap-3">
                    <button 
                        onClick={() => downloadCSV(peopleList.map(p => [p.nome, p.sobrenome, p.telefone, p.bairro, p.cidade]), ['Nome', 'Sobrenome', 'Telefone', 'Bairro', 'Cidade'], 'cidadaos')} 
                        className="p-3 rounded-xl bg-slate-100 dark:bg-white/5 text-slate-600 dark:text-white hover:bg-slate-200 dark:hover:bg-white/10 transition-colors border border-slate-200 dark:border-white/10" 
                        title="Exportar CSV"
                    >
                        <Download className="w-5 h-5" />
                    </button>
                    <button 
                        onClick={handleSwitchToForm} 
                        className="px-5 py-2.5 bg-brand-600 hover:bg-brand-500 text-white rounded-xl font-bold shadow-lg shadow-brand-500/20 flex items-center gap-2 active:scale-95 transition-all"
                    >
                        <UserPlus className="w-5 h-5" /> Novo Cadastro
                    </button>
                </div>
            </div>

            <div className="flex gap-2">
                <div className="relative flex-1 group">
                    <Search className="w-5 h-5 text-slate-400 absolute left-3 top-3 group-focus-within:text-brand-500 transition-colors" />
                    <input 
                        type="text" 
                        value={searchTerm} 
                        onChange={(e) => setSearchTerm(e.target.value)} 
                        placeholder="Buscar por nome, telefone ou email..." 
                        className="w-full pl-10 pr-4 py-3 bg-white/50 dark:bg-black/20 border border-slate-200 dark:border-white/10 rounded-xl outline-none focus:border-brand-500 transition-all font-medium text-slate-900 dark:text-white"
                    />
                    {isLoadingSearch && <Loader2 className="absolute right-3 top-3 w-5 h-5 text-brand-500 animate-spin" />}
                </div>
                <button 
                    onClick={() => setFilterHasDemands(!filterHasDemands)}
                    className={`px-4 py-2.5 rounded-xl border flex items-center gap-2 text-sm font-bold transition-all ${filterHasDemands ? 'bg-brand-50 border-brand-200 text-brand-700 dark:bg-brand-500/20 dark:border-brand-500/30 dark:text-brand-300' : 'bg-white/50 dark:bg-white/5 border-slate-200 dark:border-white/10 text-slate-500 dark:text-white/60'}`}
                >
                    <Filter className="w-4 h-4" /> Com Demandas
                </button>
            </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4 shrink-0">
            <StatCard title="Total Cadastros" value={peopleList.length} icon={Users} colorClass="bg-blue-500" textClass="text-blue-600 dark:text-blue-400" />
            <StatCard title="Novos Hoje" value={peopleList.filter(p => new Date(p.created_at || '').toDateString() === new Date().toDateString()).length} icon={UserPlus} colorClass="bg-green-500" textClass="text-green-600 dark:text-green-400" />
            <StatCard title="Com Demandas" value={peopleList.filter(p => demands.some(d => d.citizenId === p.id)).length} icon={FileText} colorClass="bg-purple-500" textClass="text-purple-600 dark:text-purple-400" />
            <StatCard title="Com WhatsApp" value={peopleList.filter(p => p.telefone).length} icon={FileText} colorClass="bg-green-500" textClass="text-green-600 dark:text-green-400" />
        </div>

        {/* Table / List */}
        <div className="flex-1 md:min-h-0 bg-white/50 dark:bg-slate-900/50 rounded-3xl border border-slate-200 dark:border-white/10 md:overflow-hidden flex flex-col shadow-sm h-auto">
            <div className="w-full md:flex-1 md:overflow-y-auto custom-scrollbar relative pb-24 md:pb-0">
                {isLoadingList && (
                    <div className="absolute inset-0 bg-white/60 dark:bg-slate-900/60 backdrop-blur-sm z-10 flex items-center justify-center">
                        <Loader2 className="w-8 h-8 animate-spin text-brand-500" />
                    </div>
                )}
                
                {/* Desktop Table View */}
                <table className="w-full text-left border-collapse hidden md:table">
                    <thead className="sticky top-0 bg-slate-50/90 dark:bg-slate-900/90 backdrop-blur-md z-10 shadow-sm">
                        <tr className="border-b border-slate-200 dark:border-white/10 text-xs font-bold text-slate-500 dark:text-blue-200/50 uppercase tracking-wider">
                            <th className="p-4 pl-6">Nome / Contato</th>
                            <th className="p-4 hidden md:table-cell">Endereço</th>
                            <th className="p-4 hidden lg:table-cell">Cadastro</th>
                            <th className="p-4 text-center">Demandas</th>
                            <th className="p-4 pr-6 text-right">Ação</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 dark:divide-white/5 text-sm">
                        {currentPeople.length === 0 ? (
                            <tr>
                                <td colSpan={5} className="p-8 text-center text-slate-400 dark:text-white/40 italic">
                                    Nenhum cidadão encontrado.
                                </td>
                            </tr>
                        ) : (
                            currentPeople.map(person => {
                                const hasDemand = demands.some(d => d.citizenId === person.id);
                                return (
                                    <tr key={person.id} className="hover:bg-white/60 dark:hover:bg-white/5 transition-colors group cursor-pointer" onClick={() => handleViewDetails(person)}>
                                        <td className="p-4 pl-6">
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 rounded-full bg-brand-100 dark:bg-brand-500/20 text-brand-600 dark:text-brand-400 flex items-center justify-center font-bold text-lg border border-brand-200 dark:border-brand-500/30 shrink-0">
                                                    {person.nome.charAt(0)}
                                                </div>
                                                <div>
                                                    <div className="font-bold text-slate-900 dark:text-white">{person.nome} {person.sobrenome}</div>
                                                    <div className="text-xs text-slate-500 dark:text-white/50 font-mono">{formatPhone(person.telefone || '')}</div>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="p-4 hidden md:table-cell">
                                            <div className="text-slate-700 dark:text-white/80">{person.bairro || '-'}</div>
                                            <div className="text-xs text-slate-500 dark:text-white/50">{person.cidade}</div>
                                        </td>
                                        <td className="p-4 hidden lg:table-cell text-slate-500 dark:text-white/50">
                                            {new Date(person.created_at || '').toLocaleDateString()}
                                        </td>
                                        <td className="p-4 text-center">
                                            {hasDemand ? (
                                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
                                                    Sim
                                                </span>
                                            ) : (
                                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-800 dark:bg-slate-700 dark:text-slate-300">
                                                    Não
                                                </span>
                                            )}
                                        </td>
                                        <td className="p-4 pr-6 text-right">
                                            <button className="p-2 bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl text-slate-400 hover:text-brand-600 hover:border-brand-200 dark:hover:border-brand-500/50 transition-colors">
                                                <ArrowRight className="w-4 h-4" />
                                            </button>
                                        </td>
                                    </tr>
                                );
                            })
                        )}
                    </tbody>
                </table>

                {/* Mobile Grid/Card View */}
                <div className="md:hidden space-y-3 p-3">
                    {currentPeople.length === 0 ? (
                        <div className="p-8 text-center text-slate-400 dark:text-white/40 italic">
                            Nenhum cidadão encontrado.
                        </div>
                    ) : (
                        currentPeople.map(person => {
                            const hasDemand = demands.some(d => d.citizenId === person.id);
                            return (
                                <div key={person.id} onClick={() => handleViewDetails(person)} className="glass-panel p-4 rounded-2xl border border-slate-200 dark:border-white/10 shadow-sm active:scale-[0.98] transition-all cursor-pointer relative overflow-hidden group">
                                    <div className={`absolute top-0 left-0 w-1 h-full ${hasDemand ? 'bg-blue-500' : 'bg-slate-300 dark:bg-slate-600'}`}></div>
                                    <div className="flex items-center gap-3 mb-3 pl-3">
                                        <div className="w-12 h-12 rounded-full bg-brand-100 dark:bg-brand-500/20 text-brand-600 dark:text-brand-400 flex items-center justify-center font-bold text-xl border border-brand-200 dark:border-brand-500/30 shrink-0 shadow-sm">
                                            {person.nome.charAt(0)}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="flex justify-between items-start">
                                                <h4 className="font-bold text-slate-900 dark:text-white truncate">{person.nome} {person.sobrenome}</h4>
                                                {new Date(person.created_at || '').toDateString() === new Date().toDateString() && (
                                                    <span className="text-[9px] font-bold bg-green-100 text-green-700 dark:bg-green-500/20 dark:text-green-300 px-2 py-0.5 rounded-full shrink-0">NOVO</span>
                                                )}
                                            </div>
                                            <p className="text-sm text-slate-500 dark:text-white/50 font-mono mt-0.5">{formatPhone(person.telefone || '')}</p>
                                        </div>
                                    </div>
                                    
                                    <div className="pl-3 grid grid-cols-2 gap-2 text-xs">
                                        <div className="flex items-center gap-1.5 text-slate-600 dark:text-white/70">
                                            <MapPin className="w-3.5 h-3.5 text-slate-400" />
                                            <span className="truncate">{person.bairro || 'Sem Bairro'}</span>
                                        </div>
                                        <div className="flex items-center gap-1.5 text-slate-600 dark:text-white/70 justify-end">
                                            <FileText className="w-3.5 h-3.5 text-slate-400" />
                                            <span>{hasDemand ? 'Tem Demandas' : 'Sem Demandas'}</span>
                                        </div>
                                    </div>

                                    <div className="mt-3 pt-3 border-t border-slate-100 dark:border-white/5 flex justify-between items-center pl-3">
                                        <span className="text-[10px] text-slate-400 dark:text-white/30 font-medium">
                                            Cadastro: {new Date(person.created_at || '').toLocaleDateString()}
                                        </span>
                                        <div className="text-brand-600 text-xs font-bold flex items-center gap-1">
                                            Detalhes <ArrowRight className="w-3 h-3" />
                                        </div>
                                    </div>
                                </div>
                            );
                        })
                    )}
                </div>
            </div>
            
            <div className="bg-slate-50/80 dark:bg-slate-900/80 border-t border-slate-200 dark:border-white/10 shrink-0">
                <Pagination currentPage={currentPage} totalPages={totalPages} onPageChange={setCurrentPage} totalItems={filteredPeople.length} itemsPerPage={itemsPerPage} />
            </div>
        </div>
    </div>
  );
};

export default PeopleManager;
