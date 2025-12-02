
import React, { useState, useEffect, useMemo } from 'react';
import { supabase, isSupabaseConfigured } from '../services/supabaseClient';
import { Search, Loader2, Users, UserPlus, ArrowRight, Edit3, Phone, Mail, MapPin, Download, Save, ChevronLeft, X, BarChart3, PlusCircle, Filter, Maximize2 } from 'lucide-react';
import { Pessoa, Demand, DemandStatus, Citizen, RoleConfig } from '../types';
import { formatPhone, stripNonDigits } from '../utils/cpfValidation';
import { downloadCSV } from '../utils/exportUtils';
import DemandDetailsModal from './DemandDetailsModal';
import Pagination from './Pagination';
import StatCard from './StatCard';
import DemandMiniMap from './DemandMiniMap';

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
  demands?: Demand[]; // Added to support filtering
}

const PeopleManager: React.FC<PeopleManagerProps> = ({ isModalMode = false, onSelectPerson, initialSearchTerm, initialMode = 'list', onCreateDemand, onEditDemand, onUpdateStatus, onModeChange, onInteractionUpdate, onPersonUpdate, onNotification, permissions, onClearSelection, demands = [] }) => {
  const [viewMode, setViewMode] = useState<'list' | 'details' | 'form'>('list');
  const [selectedPerson, setSelectedPerson] = useState<Pessoa | null>(null);
  const [peopleList, setPeopleList] = useState<Pessoa[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoadingList, setIsLoadingList] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;
  const [personDemands, setPersonDemands] = useState<Demand[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const [viewingHistoryDemand, setViewingHistoryDemand] = useState<Demand | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [filterHasDemands, setFilterHasDemands] = useState(false); // New Filter State
  
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
  const [isLoadingSearch, setIsLoadingSearch] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [existingPerson, setExistingPerson] = useState<Pessoa | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const canCreate = permissions ? permissions.canCreateCitizen : true;

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
                      setSelectedPerson(data as Pessoa); 
                      setViewMode('details'); 
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
  useEffect(() => { if (viewMode === 'details' && selectedPerson) { fetchPersonHistory(selectedPerson.id || ''); } }, [viewMode, selectedPerson]);

  const fetchPeople = async () => { setIsLoadingList(true); try { if (isSupabaseConfigured() && supabase) { const { data, error } = await supabase.from('citizens').select('*').order('created_at', { ascending: false }).limit(1000); if (error) throw error; if (data) setPeopleList(data as Pessoa[]); } } catch (error) { console.error("Erro ao buscar pessoas:", error); } finally { setIsLoadingList(false); } };
  const fetchPersonHistory = async (personId: string) => { setIsLoadingHistory(true); try { if (isSupabaseConfigured() && supabase) { let query = supabase.from('demands').select('*').eq('citizen_id', personId); const { data, error } = await query.order('created_at', { ascending: false }); if (error) throw error; if (data) { const mappedDemands = data.map((d: any) => ({ id: d.id, title: d.title, description: d.description, level: d.level, status: d.status, priority: d.priority, type: d.type, deadline: d.deadline, citizenId: d.citizen_id, createdAt: d.created_at, tags: d.tags })); setPersonDemands(mappedDemands); } } } catch (err) { console.error("Erro ao buscar histórico:", err); } finally { setIsLoadingHistory(false); } };
  const clearForm = () => { setNome(''); setSobrenome(''); setEmail(''); setEmailSuggestions([]); setTelefone(''); setCep(''); setLogradouro(''); setNumero(''); setComplemento(''); setBairro(''); setCidade(''); setEstado(''); setExistingPerson(null); setIsEditing(false); setFormError(null); };
  const handleSwitchToForm = () => { if(!canCreate) { if(onNotification) onNotification('error', 'Sem permissão para criar cidadãos.'); return; } clearForm(); setIsEditing(false); setViewMode('form'); };
  const handleBackToList = () => { clearForm(); setSelectedPerson(null); setViewMode('list'); if (onClearSelection) onClearSelection(); };
  const handleViewDetails = (pessoa: Pessoa) => { if (isModalMode && onSelectPerson) { onSelectPerson(pessoa); return; } setSelectedPerson(pessoa); setViewMode('details'); };
  const handleEditFromDetails = () => { if(!selectedPerson) return; if(!canCreate) { if(onNotification) onNotification('error', 'Sem permissão para editar.'); return; } setNome(selectedPerson.nome || ''); setSobrenome(selectedPerson.sobrenome || ''); setEmail(selectedPerson.email || ''); setTelefone(formatPhone(selectedPerson.telefone || '')); setCep(selectedPerson.cep || ''); setLogradouro(selectedPerson.logradouro || ''); setNumero(selectedPerson.numero || ''); setComplemento(selectedPerson.complemento || ''); setBairro(selectedPerson.bairro || ''); setCidade(selectedPerson.cidade || ''); setEstado(selectedPerson.estado || ''); setExistingPerson(selectedPerson); setIsEditing(true); setViewMode('form'); };
  const handlePhoneBlur = async () => { if (isEditing) return; const cleanPhone = stripNonDigits(telefone); if (!cleanPhone) return; if (cleanPhone.length < 10) { setFormError('Telefone inválido'); return; } setIsLoadingSearch(true); try { if (isSupabaseConfigured() && supabase) { const { data } = await supabase.from('citizens').select('*').eq('telefone', cleanPhone).maybeSingle(); if (data) { setExistingPerson(data as Pessoa); if(onNotification) onNotification('error', 'Este telefone já possui cadastro.'); } } } catch (error) { console.error(error); } finally { setIsLoadingSearch(false); } };
  const handleCepBlur = async () => { const cleanCep = cep.replace(/\D/g, ''); if (cleanCep.length !== 8) return; setIsLoadingCep(true); try { const response = await fetch(`https://viacep.com.br/ws/${cleanCep}/json/`); const data = await response.json(); if (!data.erro) { setLogradouro(data.logradouro); setBairro(data.bairro); setCidade(data.localidade); setEstado(data.uf); } } catch (error) { console.error(error); } finally { setIsLoadingCep(false); } };
  
  // Email Autocomplete Logic
  const handleEmailChange = (val: string) => {
      setEmail(val);
      if (!val) {
          setEmailSuggestions([]);
          return;
      }
      const providers = ['gmail.com', 'hotmail.com', 'outlook.com', 'yahoo.com.br', 'icloud.com'];
      if (providers.some(p => val.endsWith('@' + p))) {
          setEmailSuggestions([]);
          return;
      }
      if (!val.includes('@')) {
          setEmailSuggestions(providers.map(p => `${val}@${p}`));
      } else {
          const [user, domainPart] = val.split('@');
          const matches = providers.filter(p => p.startsWith(domainPart));
          if (matches.length > 0) {
              setEmailSuggestions(matches.map(p => `${user}@${p}`));
          } else {
              setEmailSuggestions([]);
          }
      }
  };

  const selectEmailSuggestion = (suggestion: string) => {
      setEmail(suggestion);
      setEmailSuggestions([]);
  };

  const handleSubmit = async (e: React.FormEvent) => { e.preventDefault(); const cleanPhone = telefone ? stripNonDigits(telefone) : null; if (!cleanPhone) { setFormError('É necessário informar o Telefone.'); if(onNotification) onNotification('error', 'Informe o Telefone.'); return; } setIsSaving(true); const pessoaData: any = { nome, sobrenome, email: email || null, telefone: cleanPhone, cep: cep.replace(/\D/g, ''), logradouro, numero, complemento: complemento || null, bairro, cidade, estado: estado.substring(0, 2).toUpperCase() }; try { if (isSupabaseConfigured() && supabase) { let resultData: Pessoa; if (isEditing && existingPerson?.id) { const { data, error } = await supabase.from('citizens').update(pessoaData).eq('id', existingPerson.id).select().single(); if (error) throw error; resultData = data; if(onNotification) onNotification('success', 'Dados atualizados!'); } else { const { data, error } = await supabase.from('citizens').insert(pessoaData).select().single(); if (error) throw error; resultData = data; if(onNotification) onNotification('success', 'Cidadão cadastrado!'); } if (onPersonUpdate) onPersonUpdate(); const updatedList = isEditing ? peopleList.map(p => p.id === resultData.id ? resultData : p) : [resultData, ...peopleList]; setPeopleList(updatedList); if (isModalMode && onSelectPerson) { onSelectPerson(resultData); } else { setTimeout(() => { setSelectedPerson(resultData); setViewMode('details'); setIsEditing(false); }, 1500); } } else { if(onNotification) onNotification('error', 'Erro de conexão.'); } } catch (error: any) { if(onNotification) onNotification('error', `Erro: ${error.message}`); } finally { setIsSaving(false); } };
  
  const filteredPeople = useMemo(() => { 
      return peopleList.filter(p => { 
          const searchLower = searchTerm.toLowerCase(); 
          const fullName = `${p.nome} ${p.sobrenome}`.toLowerCase(); 
          const phoneClean = p.telefone ? p.telefone.replace(/\D/g, '') : ''; 
          const searchClean = searchTerm.replace(/\D/g, ''); 
          
          const matchesSearch = fullName.includes(searchLower) || (searchClean.length > 3 && phoneClean.includes(searchClean)) || (p.email && p.email.toLowerCase().includes(searchLower)); 
          
          let matchesFilter = true;
          if (filterHasDemands) {
              matchesFilter = demands.some(d => d.citizenId === p.id);
          }

          return matchesSearch && matchesFilter;
      }); 
  }, [peopleList, searchTerm, filterHasDemands, demands]);

  const stats = useMemo(() => { const total = peopleList.length; const today = new Date().toDateString(); const newToday = peopleList.filter(p => p.created_at && new Date(p.created_at).toDateString() === today).length; const bairroCounts: Record<string, number> = {}; peopleList.forEach(p => { if(p.bairro) bairroCounts[p.bairro] = (bairroCounts[p.bairro] || 0) + 1; }); const topBairro = Object.entries(bairroCounts).sort((a,b) => b[1] - a[1])[0]; return { total, newToday, topBairro: topBairro ? topBairro[0] : 'N/A', topBairroCount: topBairro ? topBairro[1] : 0 }; }, [peopleList]);
  useEffect(() => { setCurrentPage(1); }, [searchTerm, filterHasDemands]);
  const totalPages = Math.ceil(filteredPeople.length / itemsPerPage);
  const currentPeople = filteredPeople.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);
  const handleExport = () => { const headers = ['Nome', 'Sobrenome', 'Telefone', 'Email', 'Logradouro', 'Número', 'Bairro', 'Cidade', 'UF', 'CEP', 'Data Cadastro']; const rows = filteredPeople.map(p => [`"${p.nome}"`, `"${p.sobrenome}"`, p.telefone || '', p.email || '', `"${p.logradouro}"`, p.numero, `"${p.bairro}"`, `"${p.cidade}"`, p.estado, p.cep, p.created_at ? new Date(p.created_at).toLocaleDateString() : '']); downloadCSV(rows, headers, 'Cidadaos'); };
  const mapPessoaToCitizen = (p: Pessoa): Citizen => ({ id: p.id || 'temp', cpf: p.cpf, name: `${p.nome} ${p.sobrenome}`, email: p.email || '', phone: p.telefone || '', createdAt: p.created_at, logradouro: p.logradouro, numero: p.numero, complemento: p.complemento || undefined, bairro: p.bairro, cep: p.cep, cidade: p.cidade, estado: p.estado });

  const handleMapClick = (person: Pessoa) => {
      // Force navigation to map view with this citizen selected
      if (!person.lat || !person.lon) {
          if (onNotification) onNotification('error', 'Localização não definida. Aguarde a busca ou insira um endereço válido.');
          return;
      }
      const event = new CustomEvent('navigate-to-map', { 
          detail: { 
              citizenId: person.id,
              lat: person.lat,
              lon: person.lon
          } 
      });
      window.dispatchEvent(event);
  };

  const handleLocationUpdate = (lat: number, lon: number) => {
      if (selectedPerson) {
          const updated = { ...selectedPerson, lat, lon };
          setSelectedPerson(updated);
          // Also update the list so if we go back, it's there
          setPeopleList(prev => prev.map(p => p.id === updated.id ? updated : p));
      }
      if (onPersonUpdate) onPersonUpdate(); // Trigger global refresh
  };

  const getFullAddress = (p: Pessoa) => {
      const parts = [
          p.logradouro,
          p.numero ? `Nº ${p.numero}` : null,
          p.bairro,
          p.cidade && p.estado ? `${p.cidade} - ${p.estado}` : p.cidade
      ].filter(Boolean);
      return parts.join(', ');
  };

  return (
    <div className={`flex flex-col gap-4 animate-in slide-in-from-right duration-500 ${isModalMode ? 'p-0' : ''} relative w-full min-w-0 pb-20 md:pb-0`}>
      <div className="shrink-0 flex flex-col gap-4"> 
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4"> 
              <div className="flex items-center gap-2"> 
                  {viewMode !== 'list' && !isModalMode && ( <button onClick={handleBackToList} className="p-2 rounded-full hover:bg-slate-100 dark:hover:bg-white/10 transition-colors mr-1"> <ChevronLeft className="w-6 h-6 text-slate-600 dark:text-white" /> </button> )} 
                  {!isModalMode && ( 
                      <div> 
                          <h1 className="text-3xl font-bold text-slate-900 dark:text-white tracking-tight flex items-center gap-3"> 
                              <Users className="w-8 h-8 text-brand-600 dark:text-brand-400" /> 
                              {viewMode === 'details' ? `${selectedPerson?.nome} ${selectedPerson?.sobrenome?.split(' ')[0]}` : 'Gestão de Cidadãos'} 
                          </h1> 
                          <p className="text-slate-500 dark:text-blue-200/50 mt-1 font-medium hidden sm:block"> 
                              {viewMode === 'list' && 'Base de contatos unificada.'} 
                          </p> 
                      </div> 
                  )} 
              </div> 
              
              <div className="flex flex-col sm:flex-row items-center gap-3 w-full md:w-auto"> 
                  {viewMode === 'list' && !isModalMode && (
                      <div className="flex items-center gap-2 w-full sm:w-auto">
                          <div className="relative w-full md:w-[280px] group">
                              <input 
                                type="text" 
                                value={searchTerm} 
                                onChange={(e) => setSearchTerm(e.target.value)} 
                                placeholder="Buscar por nome ou telefone..." 
                                className="w-full pl-11 pr-10 py-3 bg-slate-50 dark:bg-black/20 border border-slate-200 dark:border-white/10 rounded-xl outline-none focus:border-brand-500 focus:bg-white dark:focus:bg-black/20 transition-all font-medium text-slate-700 dark:text-white placeholder:text-slate-400 h-11 text-sm" 
                              />
                              <Search className="w-5 h-5 text-slate-400 absolute left-3.5 top-3 group-focus-within:text-brand-500 transition-colors" />
                              {searchTerm && (
                                <button onClick={() => setSearchTerm('')} className="absolute right-3 top-3 text-slate-400 hover:text-slate-600 dark:hover:text-white">
                                    <X className="w-5 h-5" />
                                </button>
                              )}
                          </div>
                      </div>
                  )}

                  <div className="flex items-center gap-3 w-full sm:w-auto">
                        {viewMode === 'list' && !isModalMode && (
                            <button 
                                onClick={() => setFilterHasDemands(!filterHasDemands)}
                                className={`w-auto px-4 py-2.5 rounded-xl font-bold border transition-all flex items-center justify-center gap-2 h-11 text-sm ${filterHasDemands ? 'bg-brand-50 border-brand-200 text-brand-700 dark:bg-brand-500/20 dark:border-brand-500/30 dark:text-brand-300' : 'bg-white dark:bg-white/5 text-slate-600 dark:text-white/70 border-slate-200 dark:border-white/10 hover:bg-slate-50 dark:hover:bg-white/10'}`}
                                title="Apenas com Demandas"
                            >
                                <Filter className="w-4 h-4" /> <span className="hidden sm:inline">Com Demandas</span>
                            </button>
                        )}

                        {viewMode === 'list' && !isModalMode && (
                            <button onClick={handleExport} className="w-auto px-4 py-2.5 rounded-xl font-bold bg-white dark:bg-white/5 text-slate-600 dark:text-white/70 border border-slate-200 dark:border-white/10 hover:bg-slate-50 dark:hover:bg-white/10 transition-all flex items-center justify-center gap-2 h-11" title="Exportar CSV">
                                <Download className="w-5 h-5" />
                            </button>
                        )}

                        {viewMode === 'list' && canCreate && ( 
                            <button onClick={handleSwitchToForm} className="w-full sm:w-auto px-5 py-2.5 bg-brand-600 hover:bg-brand-500 text-white rounded-xl font-bold shadow-lg shadow-brand-500/20 transition-all flex items-center justify-center gap-2 active:scale-95 duration-200 h-11"> 
                                <UserPlus className="w-5 h-5" /> <span className="whitespace-nowrap">Novo Cidadão</span> 
                            </button> 
                        )} 
                        
                        {viewMode === 'details' && selectedPerson && !isModalMode && ( 
                            <div className="flex gap-2"> 
                                {canCreate && ( 
                                    <button onClick={handleEditFromDetails} className="px-4 py-2.5 bg-slate-100 dark:bg-white/10 text-slate-700 dark:text-white rounded-xl font-bold border border-slate-200 dark:border-white/5 flex items-center gap-2 hover:bg-slate-200 transition-colors active:scale-95 duration-200 h-11"> 
                                        <Edit3 className="w-4 h-4" /> <span className="hidden sm:inline">Editar</span> 
                                    </button> 
                                )} 
                                {onCreateDemand && ( 
                                    <button onClick={() => onCreateDemand(selectedPerson.id || '')} className="px-4 py-2.5 bg-brand-600 hover:bg-brand-500 text-white rounded-xl font-bold shadow-lg transition-all flex items-center gap-2 active:scale-95 duration-200 h-11"> 
                                        <PlusCircle className="w-4 h-4" /> <span className="hidden sm:inline">Nova Demanda</span> 
                                    </button> 
                                )} 
                            </div> 
                        )} 
                  </div>
              </div> 
          </div> 
      </div>

      <div className="flex flex-col min-h-0 w-full relative">
          {viewMode === 'list' && (
              <div className="flex flex-col gap-4 w-full">
                  {!isModalMode && ( <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4 shrink-0"> <StatCard title="Total Cidadãos" value={stats.total} icon={Users} colorClass="bg-blue-500" textClass="text-blue-600 dark:text-blue-400" /> <StatCard title="Novos Hoje" value={stats.newToday} icon={UserPlus} colorClass="bg-green-500" textClass="text-green-600 dark:text-green-400" /> <StatCard title="Top Bairro" value={stats.topBairro} icon={MapPin} colorClass="bg-brand-500" textClass="text-brand-600 dark:text-brand-400" /> <StatCard title="Cadastros (Bairro)" value={stats.topBairroCount} icon={BarChart3} colorClass="bg-purple-500" textClass="text-purple-600 dark:text-purple-400" /> </div> )}
                  
                  <div className="flex flex-col min-h-0 glass-panel rounded-3xl border border-slate-200 dark:border-white/10 bg-white/50 dark:bg-slate-900/50 shadow-sm relative w-full">
                      {isLoadingList ? ( <div className="flex-1 flex flex-col items-center justify-center text-slate-400 dark:text-white/40 py-20"><Loader2 className="w-8 h-8 animate-spin mb-2 text-brand-500" /><p>Carregando...</p></div> ) : filteredPeople.length === 0 ? ( <div className="flex-1 flex flex-col items-center justify-center text-slate-400 dark:text-white/40 py-20"><Users className="w-12 h-12 mb-2 opacity-20" /><p>Nenhum cidadão encontrado.</p></div> ) : ( <> 
                      <div className="w-full relative"> 
                        {/* Desktop Table */}
                        <table className="w-full text-left border-collapse hidden md:table"> 
                            <thead className="bg-slate-50/90 dark:bg-slate-900/90 backdrop-blur-sm border-b border-slate-200 dark:border-white/10"> <tr className="text-xs font-bold text-slate-500 dark:text-blue-200/50 uppercase tracking-wider"> <th className="p-4 first:pl-6 w-[45%] min-w-[200px]">Cidadão</th> <th className="p-4 w-[20%] whitespace-nowrap">Contato</th> <th className="p-4 w-[25%] min-w-[150px]">Localização</th> <th className="p-4 text-right last:pr-6 w-[10%]">Ação</th> </tr> </thead> 
                            <tbody className="divide-y divide-slate-200 dark:divide-white/5 text-sm"> {currentPeople.map((pessoa, index) => ( <tr key={pessoa.id || index} onClick={() => handleViewDetails(pessoa)} className="hover:bg-white/60 dark:hover:bg-white/5 transition-colors cursor-pointer group"> <td className="p-4 first:pl-6"> <div className="flex items-center gap-3"> <div className="w-9 h-9 rounded-full bg-slate-100 dark:bg-white/10 flex items-center justify-center text-slate-600 dark:text-white font-bold text-xs border border-slate-200 dark:border-white/10 shrink-0">{pessoa.nome.charAt(0)}</div> <div className="min-w-0"><div className="font-bold text-slate-900 dark:text-white truncate">{pessoa.nome} {pessoa.sobrenome}</div><div className="text-xs text-slate-500 dark:text-white/50 truncate">{pessoa.email || ''}</div></div> </div> </td> <td className="p-4 text-slate-600 dark:text-white/80 whitespace-nowrap">{pessoa.telefone ? formatPhone(pessoa.telefone) : '-'}</td> <td className="p-4 text-slate-600 dark:text-white/80">{pessoa.bairro ? <span className="flex flex-col"><span className="truncate">{pessoa.bairro}</span><span className="text-[10px] text-slate-400 truncate">{pessoa.cidade}/{pessoa.estado}</span></span> : '-'}</td> <td className="p-4 text-right last:pr-6"><div className="p-2 text-slate-400 group-hover:text-brand-600 transition-colors inline-flex bg-slate-100 dark:bg-white/5 rounded-lg group-hover:bg-brand-50 dark:group-hover:bg-brand-500/10">{isModalMode ? <span className="px-3 py-1 bg-brand-500 text-white text-xs font-bold rounded-lg shadow-sm">Selecionar</span> : <ArrowRight className="w-4 h-4" />}</div></td> </tr> ))} </tbody> 
                        </table> 
                        
                        {/* Mobile Cards (Glass Style) */}
                        <div className="md:hidden space-y-3 p-3"> 
                            {currentPeople.map((pessoa, index) => ( 
                                <div key={pessoa.id || index} onClick={() => handleViewDetails(pessoa)} className="glass-panel p-4 rounded-2xl border border-slate-200 dark:border-white/10 shadow-sm active:scale-[0.98] transition-all cursor-pointer flex items-center justify-between min-w-0"> 
                                    <div className="flex items-center gap-3 min-w-0"> 
                                        <div className="w-12 h-12 rounded-full bg-slate-100 dark:bg-white/10 flex items-center justify-center font-bold text-lg text-slate-600 dark:text-white border border-slate-200 dark:border-white/10 shrink-0">{pessoa.nome.charAt(0)}</div> 
                                        <div className="min-w-0 flex-1"> 
                                            <p className="font-bold text-slate-900 dark:text-white truncate text-base">{pessoa.nome} {pessoa.sobrenome}</p> 
                                            <div className="flex flex-col gap-0.5 text-xs text-slate-500 dark:text-white/50 mt-0.5"> 
                                                <span className="font-mono">{pessoa.telefone ? formatPhone(pessoa.telefone) : 'Sem Telefone'}</span> 
                                                {pessoa.bairro && <span className="truncate flex items-center gap-1"><MapPin className="w-3 h-3" /> {pessoa.bairro}</span>} 
                                            </div> 
                                        </div> 
                                    </div> 
                                    <div className="text-slate-400 group-hover:text-brand-600 transition-colors shrink-0 ml-2"> {isModalMode ? <span className="px-3 py-1 bg-brand-500 text-white text-xs font-bold rounded-lg shadow-sm">OK</span> : <ArrowRight className="w-5 h-5" />} </div> 
                                </div> 
                            ))} 
                        </div> 
                      </div> 
                      <div className="shrink-0 bg-slate-50/50 dark:bg-slate-900/50 border-t border-slate-200 dark:border-white/5 z-20"> <Pagination currentPage={currentPage} totalPages={totalPages} onPageChange={setCurrentPage} totalItems={filteredPeople.length} itemsPerPage={itemsPerPage} /> </div> </> )}
                  </div>
              </div>
          )}
          {viewMode === 'details' && selectedPerson && !isModalMode && (
              <div className="w-full">
                  <div className="space-y-6 md:space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-10">
                    <div className="glass-panel p-6 rounded-3xl border border-slate-200 dark:border-white/10 relative overflow-hidden"> 
                        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-brand-400 to-blue-600"></div> 
                        <div className="flex flex-col md:flex-row gap-6 items-center md:items-start text-center md:text-left"> 
                            <div className="w-20 h-20 md:w-24 md:h-24 rounded-full bg-white dark:bg-slate-800 border-4 border-slate-100 dark:border-white/5 shadow-xl flex items-center justify-center shrink-0"> 
                                <span className="text-3xl md:text-4xl font-bold text-brand-600 dark:text-brand-400">{selectedPerson.nome.charAt(0)}</span> 
                            </div> 
                            <div className="flex-1"> 
                                <h2 className="text-2xl md:text-3xl font-bold text-slate-900 dark:text-white">{selectedPerson.nome} {selectedPerson.sobrenome}</h2> 
                                <div className="flex flex-wrap gap-3 mt-4 justify-center md:justify-start"> 
                                    {selectedPerson.telefone && <div className="px-3 py-1.5 rounded-lg bg-green-50 dark:bg-green-500/10 text-green-700 dark:text-green-300 text-sm font-medium flex items-center gap-2 border border-green-200 dark:border-green-500/20"><Phone className="w-3.5 h-3.5" /> {formatPhone(selectedPerson.telefone)}</div>} 
                                    {selectedPerson.email && <div className="px-3 py-1.5 rounded-lg bg-blue-50 dark:bg-blue-500/10 text-blue-700 dark:text-blue-300 text-sm font-medium flex items-center gap-2 border border-blue-200 dark:border-blue-500/20"><Mail className="w-3.5 h-3.5" /> {selectedPerson.email}</div>} 
                                </div> 
                            </div> 
                        </div> 
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* Address and Map Section */}
                        <div className="glass-panel p-6 rounded-3xl border border-slate-200 dark:border-white/10">
                            <h3 className="flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-slate-500 dark:text-white/60 mb-4">
                                <MapPin className="w-4 h-4" /> Endereço & Localização
                            </h3>
                            
                            <div className="space-y-4">
                                <div className="flex flex-col gap-1.5 p-4 bg-slate-50 dark:bg-white/5 rounded-2xl border border-slate-100 dark:border-white/5">
                                    {selectedPerson.logradouro ? (
                                        <>
                                            <p className="font-bold text-slate-800 dark:text-white">{selectedPerson.logradouro}, {selectedPerson.numero}</p>
                                            {selectedPerson.complemento && <p className="text-xs text-slate-500 dark:text-white/50">{selectedPerson.complemento}</p>}
                                            <p className="text-sm text-slate-600 dark:text-white/70">{selectedPerson.bairro}</p>
                                            <p className="text-xs text-slate-400 dark:text-white/40">{selectedPerson.cidade} - {selectedPerson.estado} • {selectedPerson.cep}</p>
                                        </>
                                    ) : (
                                        <p className="text-slate-400 dark:text-white/30 italic text-sm text-center">Endereço não cadastrado.</p>
                                    )}
                                </div>

                                <DemandMiniMap
                                    entityId={selectedPerson.id}
                                    tableName="citizens"
                                    lat={selectedPerson.lat}
                                    lon={selectedPerson.lon}
                                    address={getFullAddress(selectedPerson)}
                                    onClick={() => handleMapClick(selectedPerson)}
                                    onLocationUpdate={(lat, lon) => handleLocationUpdate(lat, lon)}
                                />
                            </div>
                        </div>

                        {/* Recent History Placeholder or Demands List */}
                        <div className="glass-panel p-6 rounded-3xl border border-slate-200 dark:border-white/10 flex flex-col">
                             <h3 className="flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-slate-500 dark:text-white/60 mb-4">
                                <BarChart3 className="w-4 h-4" /> Histórico Recente
                            </h3>
                            <div className="flex-1 overflow-y-auto max-h-[300px] custom-scrollbar">
                                {personDemands.length > 0 ? (
                                    <div className="space-y-3">
                                        {personDemands.slice(0, 5).map(d => (
                                            <div key={d.id} className="p-3 bg-slate-50 dark:bg-white/5 rounded-xl border border-slate-100 dark:border-white/5 flex items-start justify-between cursor-pointer hover:bg-slate-100 dark:hover:bg-white/10 transition-colors" onClick={() => setViewingHistoryDemand(d)}>
                                                <div>
                                                    <p className="font-bold text-slate-800 dark:text-white text-sm line-clamp-1">{d.title}</p>
                                                    <p className="text-xs text-slate-500 dark:text-white/50">{new Date(d.createdAt).toLocaleDateString()}</p>
                                                </div>
                                                <span className={`text-[10px] px-2 py-1 rounded-md font-bold uppercase ${d.status === 'Concluído' ? 'bg-green-100 text-green-700' : 'bg-slate-200 text-slate-600'}`}>{d.status}</span>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="flex flex-col items-center justify-center h-full text-slate-400 dark:text-white/30 py-8">
                                        <p className="text-sm italic">Nenhuma demanda registrada.</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                  </div>
              </div>
          )}
          {viewMode === 'form' && (
              <div className="w-full">
                  <div className="glass-panel p-4 md:p-8 rounded-3xl border border-slate-200 dark:border-white/10 max-w-3xl mx-auto w-full animate-in fade-in slide-in-from-bottom-4 mb-20 md:mb-0">
                      <div className="text-center mb-8"> <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">{isEditing ? 'Editar Cadastro' : 'Novo Cidadão'}</h2> <p className="text-slate-500 dark:text-white/50">Preencha os dados do munícipe.</p> </div>
                      <form onSubmit={handleSubmit} className="space-y-6">
                           <div className="space-y-4"> 
                                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-white/40 border-b border-slate-200 dark:border-white/10 pb-2 mb-4">Identificação</h3> 
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4"> 
                                    <div><label className="block text-xs font-bold uppercase text-slate-500 dark:text-white/50 mb-1">Nome</label><input type="text" value={nome} onChange={e => setNome(e.target.value)} className="w-full p-3 rounded-xl border border-slate-300 dark:border-white/10 glass-input outline-none focus:border-brand-500" required /></div> 
                                    <div><label className="block text-xs font-bold uppercase text-slate-500 dark:text-white/50 mb-1">Sobrenome</label><input type="text" value={sobrenome} onChange={e => setSobrenome(e.target.value)} className="w-full p-3 rounded-xl border border-slate-300 dark:border-white/10 glass-input outline-none focus:border-brand-500" required /></div> 
                                    <div><label className="block text-xs font-bold uppercase text-slate-500 dark:text-white/50 mb-1">Telefone (Obrigatório)</label><input type="text" value={telefone} onChange={e => setTelefone(formatPhone(e.target.value))} onBlur={handlePhoneBlur} className={`w-full p-3 rounded-xl border ${formError ? 'border-red-500' : 'border-slate-300 dark:border-white/10'} glass-input outline-none focus:border-brand-500`} placeholder="(00) 00000-0000" />{formError && <p className="text-xs text-red-500 mt-1">{formError}</p>}</div> 
                                    <div className="relative">
                                        <label className="block text-xs font-bold uppercase text-slate-500 dark:text-white/50 mb-1">Email (Opcional)</label>
                                        <input 
                                            type="email" 
                                            value={email} 
                                            onChange={e => handleEmailChange(e.target.value)} 
                                            className="w-full p-3 rounded-xl border border-slate-300 dark:border-white/10 glass-input outline-none focus:border-brand-500" 
                                            placeholder="exemplo@email.com" 
                                            autoComplete="off"
                                        />
                                        {/* Suggestions Dropdown */}
                                        {emailSuggestions.length > 0 && (
                                            <div className="absolute top-full left-0 right-0 mt-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 rounded-xl shadow-lg z-50 overflow-hidden animate-in fade-in zoom-in-95">
                                                {emailSuggestions.map(suggestion => (
                                                    <button 
                                                        key={suggestion} 
                                                        type="button"
                                                        onClick={() => selectEmailSuggestion(suggestion)}
                                                        className="w-full text-left px-4 py-2 text-sm text-slate-700 dark:text-white hover:bg-slate-50 dark:hover:bg-white/10 transition-colors"
                                                    >
                                                        {suggestion}
                                                    </button>
                                                ))}
                                            </div>
                                        )}
                                    </div> 
                                </div> 
                           </div> 

                           {/* Address Section */}
                           <div className="space-y-4 pt-4 border-t border-slate-100 dark:border-white/5">
                                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-white/40 border-b border-slate-200 dark:border-white/10 pb-2 mb-4">Endereço</h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="md:col-span-1">
                                        <label className="block text-xs font-bold uppercase text-slate-500 dark:text-white/50 mb-1">CEP</label>
                                        <div className="relative">
                                            <input type="text" value={cep} onChange={(e) => setCep(e.target.value)} onBlur={handleCepBlur} className="w-full p-3 rounded-xl border border-slate-300 dark:border-white/10 glass-input outline-none focus:border-brand-500" placeholder="00000-000" />
                                            {isLoadingCep && <Loader2 className="absolute right-3 top-3 w-5 h-5 text-brand-500 animate-spin" />}
                                        </div>
                                    </div>
                                    <div className="md:col-span-2">
                                        <label className="block text-xs font-bold uppercase text-slate-500 dark:text-white/50 mb-1">Logradouro</label>
                                        <input type="text" value={logradouro} onChange={(e) => setLogradouro(e.target.value)} className="w-full p-3 rounded-xl border border-slate-300 dark:border-white/10 glass-input outline-none focus:border-brand-500" />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold uppercase text-slate-500 dark:text-white/50 mb-1">Número</label>
                                        <input type="text" value={numero} onChange={(e) => setNumero(e.target.value)} className="w-full p-3 rounded-xl border border-slate-300 dark:border-white/10 glass-input outline-none focus:border-brand-500" />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold uppercase text-slate-500 dark:text-white/50 mb-1">Complemento</label>
                                        <input type="text" value={complemento} onChange={(e) => setComplemento(e.target.value)} className="w-full p-3 rounded-xl border border-slate-300 dark:border-white/10 glass-input outline-none focus:border-brand-500" />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold uppercase text-slate-500 dark:text-white/50 mb-1">Bairro</label>
                                        <input type="text" value={bairro} onChange={(e) => setBairro(e.target.value)} className="w-full p-3 rounded-xl border border-slate-300 dark:border-white/10 glass-input outline-none focus:border-brand-500" />
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-xs font-bold uppercase text-slate-500 dark:text-white/50 mb-1">Cidade</label>
                                            <input type="text" value={cidade} onChange={(e) => setCidade(e.target.value)} className="w-full p-3 rounded-xl border border-slate-300 dark:border-white/10 glass-input outline-none focus:border-brand-500" />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-bold uppercase text-slate-500 dark:text-white/50 mb-1">UF</label>
                                            <input type="text" value={estado} onChange={(e) => setEstado(e.target.value)} className="w-full p-3 rounded-xl border border-slate-300 dark:border-white/10 glass-input outline-none focus:border-brand-500 uppercase" maxLength={2} />
                                        </div>
                                    </div>
                                </div>
                           </div>

                           {/* MOBILE STICKY ACTIONS */}
                           <div className="fixed bottom-0 left-0 right-0 p-4 bg-white/95 dark:bg-[#0b1121]/95 backdrop-blur-md border-t border-slate-200 dark:border-white/10 z-30 flex gap-3 md:static md:bg-transparent md:p-0 md:border-0 pb-6">
                               <button type="button" onClick={handleBackToList} className="px-6 py-3 rounded-xl border border-slate-200 dark:border-white/10 text-slate-500 dark:text-white/60 hover:bg-slate-50 dark:hover:bg-white/5 font-bold flex-1 active:scale-95 duration-200 transition-transform">Cancelar</button>
                               <button type="submit" disabled={isSaving || (!!existingPerson && !isEditing)} className="px-6 py-3 bg-brand-600 hover:bg-brand-500 text-white rounded-xl font-bold shadow-lg shadow-brand-500/20 flex-1 flex items-center justify-center gap-2 disabled:opacity-50 active:scale-95 duration-200 transition-transform">{isSaving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />} Salvar</button>
                           </div>
                      </form>
                  </div>
              </div>
          )}
      </div>
      {viewingHistoryDemand && ( <DemandDetailsModal demand={viewingHistoryDemand} citizen={selectedPerson ? mapPessoaToCitizen(selectedPerson) : null} onClose={() => setViewingHistoryDemand(null)} onEdit={(d) => { setViewingHistoryDemand(null); if(onEditDemand) onEditDemand(d); }} onUpdateStatus={(id, status) => { if(onUpdateStatus) onUpdateStatus(id, status); setPersonDemands(prev => prev.map(p => p.id === id ? { ...p, status } : p)); setViewingHistoryDemand(prev => prev ? { ...prev, status } : null); }} onInteractionUpdate={onInteractionUpdate} onNotification={onNotification} /> )}
    </div>
  );
};

export default PeopleManager;
