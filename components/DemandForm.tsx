
import React, { useState, useEffect, useRef } from 'react';
import { Citizen, DemandLevel, DemandStatus, DemandPriority, Pessoa, DemandType } from '../types';
import { Search, Save, MapPin, AlertCircle, Loader2, Phone, X, List, PlusCircle, ArrowLeft, User, FileText, Calendar, Mail, CloudOff, Check } from 'lucide-react';
import { supabase, isSupabaseConfigured } from '../services/supabaseClient';
import { formatPhone, stripNonDigits, formatCEP } from '../utils/cpfValidation';
import { getCoordinates } from '../utils/geocoding'; // Import helper
import PeopleManager from './PeopleManager';

interface DemandFormProps {
  initialSearchTerm?: string; 
  onSuccess: (newDemandId?: string) => void;
  onCancel: () => void;
  onNotification?: (type: 'success' | 'error', message: string) => void;
}

const DemandForm: React.FC<DemandFormProps> = ({ initialSearchTerm, onSuccess, onCancel, onNotification }) => {
  // Search State
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState<Citizen[]>([]);
  const [showResults, setShowResults] = useState(false);
  const [isLoadingSearch, setIsLoadingSearch] = useState(false);
  
  // Selection State
  const [foundCitizen, setFoundCitizen] = useState<Citizen | null>(null);
  const [isNewCitizen, setIsNewCitizen] = useState(false);
  const searchContainerRef = useRef<HTMLDivElement>(null);
  
  // New Citizen Form
  const [newNome, setNewNome] = useState('');
  const [newSobrenome, setNewSobrenome] = useState('');
  const [newPhone, setNewPhone] = useState(''); // Raw input
  const [newEmail, setNewEmail] = useState('');

  // Address
  const [cep, setCep] = useState('');
  const [isLoadingCep, setIsLoadingCep] = useState(false);
  const [logradouro, setLogradouro] = useState('');
  const [numero, setNumero] = useState('');
  const [bairro, setBairro] = useState('');
  const [cidade, setCidade] = useState('');
  const [estado, setEstado] = useState('');

  // Demand Data
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [level, setLevel] = useState<DemandLevel>(DemandLevel.MUNICIPAL);
  const [status, setStatus] = useState<DemandStatus>(DemandStatus.PENDING);
  const [priority, setPriority] = useState<DemandPriority>(DemandPriority.MEDIUM);
  const [demandType, setDemandType] = useState<DemandType>(DemandType.SOLICITACAO);
  const [deadline, setDeadline] = useState('');
  
  // Tags
  const [tags, setTags] = useState<string[]>([]);
  const [newTag, setNewTag] = useState('');
  const [isAddingTag, setIsAddingTag] = useState(false);
  
  const [isSaving, setIsSaving] = useState(false);

  // --- Initialization ---
  useEffect(() => {
      // Set default deadline to 7 days from now
      const date = new Date();
      date.setDate(date.getDate() + 7);
      setDeadline(date.toISOString().split('T')[0]);

      if (initialSearchTerm) {
          // If UUID passed (from FastTrack), fetch directly
          const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
          if (uuidRegex.test(initialSearchTerm)) {
              fetchPersonById(initialSearchTerm);
          } else {
              setSearchTerm(initialSearchTerm);
              handleSearch(initialSearchTerm);
          }
      }
  }, []);

  // Close search results on click outside
  useEffect(() => {
      const handleClickOutside = (event: MouseEvent) => {
          if (searchContainerRef.current && !searchContainerRef.current.contains(event.target as Node)) {
              setShowResults(false);
          }
      };
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // --- Helpers ---
  const mapPersonToCitizen = (pessoa: Pessoa): Citizen => ({
    id: pessoa.id || 'temp-id', 
    cpf: pessoa.cpf, 
    name: `${pessoa.nome} ${pessoa.sobrenome}`, 
    email: pessoa.email || '', 
    phone: pessoa.telefone || '', 
    logradouro: pessoa.logradouro, 
    numero: pessoa.numero, 
    complemento: pessoa.complemento || undefined, 
    bairro: pessoa.bairro, 
    cep: pessoa.cep, 
    cidade: pessoa.cidade, 
    estado: pessoa.estado,
    lat: pessoa.lat,
    lon: pessoa.lon
  });

  const fillAddressFromCitizen = (citizen: Citizen) => {
      if(citizen.cep) setCep(formatCEP(citizen.cep));
      if(citizen.logradouro) setLogradouro(citizen.logradouro);
      if(citizen.numero) setNumero(citizen.numero);
      if(citizen.bairro) setBairro(citizen.bairro);
      if(citizen.cidade) setCidade(citizen.cidade);
      if(citizen.estado) setEstado(citizen.estado);
  };

  // --- Search Logic ---
  const fetchPersonById = async (id: string) => {
      if (isSupabaseConfigured() && supabase) {
          const { data } = await supabase.from('citizens').select('*').eq('id', id).maybeSingle();
          if (data) {
              const c = mapPersonToCitizen(data as Pessoa);
              setFoundCitizen(c);
              setSearchTerm(c.name);
              fillAddressFromCitizen(c);
              setIsNewCitizen(false);
          }
      }
  };

  const handleSearch = async (term: string) => {
      if (!term || term.length < 2) return;
      
      setIsLoadingSearch(true);
      setShowResults(true);
      setSearchResults([]);

      try {
          if (isSupabaseConfigured() && supabase) {
              const cleanTerm = stripNonDigits(term);
              let query = supabase.from('citizens').select('*').limit(10);

              if (cleanTerm.length > 3) {
                  // Search by phone OR name
                  query = query.or(`telefone.ilike.%${cleanTerm}%,nome.ilike.%${term}%,sobrenome.ilike.%${term}%`);
              } else {
                  // Search by name only
                  query = query.or(`nome.ilike.%${term}%,sobrenome.ilike.%${term}%`);
              }

              const { data } = await query;
              if (data) {
                  setSearchResults(data.map((p: any) => mapPersonToCitizen(p)));
              }
          }
      } catch (e) {
          console.error(e);
      } finally {
          setIsLoadingSearch(false);
      }
  };

  const handleSelectResult = (citizen: Citizen) => {
      setFoundCitizen(citizen);
      setSearchTerm(citizen.name);
      setShowResults(false);
      setIsNewCitizen(false);
      fillAddressFromCitizen(citizen);
  };

  const handleCreateNew = () => {
      setFoundCitizen(null);
      setIsNewCitizen(true);
      setShowResults(false);
      
      // Auto-fill phone if input was numeric
      const cleanInput = stripNonDigits(searchTerm);
      if (cleanInput.length >= 8) {
          setNewPhone(cleanInput);
      } else {
          // Auto-fill name if input was text
          const parts = searchTerm.split(' ');
          if (parts.length > 0) setNewNome(parts[0]);
          if (parts.length > 1) setNewSobrenome(parts.slice(1).join(' '));
      }
  };

  // --- Address Logic ---
  const handleCepBlur = async () => {
    const cleanCep = cep.replace(/\D/g, '');
    if (cleanCep.length !== 8) return;
    setIsLoadingCep(true);
    try {
      const response = await fetch(`https://viacep.com.br/ws/${cleanCep}/json/`);
      const data = await response.json();
      if (!data.erro) { 
          setLogradouro(data.logradouro); 
          setBairro(data.bairro); 
          setCidade(data.localidade); 
          setEstado(data.uf); 
      }
    } catch (error) { console.error(error); } finally { setIsLoadingCep(false); }
  };

  // --- Submission ---
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !description) { if(onNotification) onNotification('error', 'Preencha título e descrição.'); return; }
    
    // Validation for New Citizen
    if (isNewCitizen && !foundCitizen) {
        if (!newNome) { if(onNotification) onNotification('error', 'Nome é obrigatório.'); return; }
        if (!newPhone) { if(onNotification) onNotification('error', 'Telefone é obrigatório.'); return; }
    }

    setIsSaving(true);

    try {
        let finalCitizenId = foundCitizen?.id;
        
        // --- GEOCODING LOGIC ---
        // Construct address from form fields
        const fullAddress = `${logradouro}, ${numero} - ${bairro}, ${cidade} - ${estado}`;
        let coords = { lat: 0, lon: 0 };
        
        // If citizen already has coords, reuse them unless address changed (simplified check: reuse if existing)
        if (foundCitizen && foundCitizen.lat && foundCitizen.lon) {
             coords = { lat: foundCitizen.lat, lon: foundCitizen.lon };
        } else {
             // Fetch new coordinates
             const fetched = await getCoordinates(fullAddress);
             if (fetched) coords = fetched;
        }

        // 1. Create Citizen if needed
        if (isNewCitizen && !finalCitizenId) {
           const cleanPhone = stripNonDigits(newPhone);
           const cleanCep = cep ? stripNonDigits(cep) : null;
           
           if (!navigator.onLine) {
               // Offline: Generate Temp ID
               finalCitizenId = crypto.randomUUID(); 
           } else if (isSupabaseConfigured() && supabase) {
               // Check if phone exists to avoid unique constraint error
               const { data: existing } = await supabase.from('citizens').select('id').eq('telefone', cleanPhone).maybeSingle();
               
               if (existing) {
                   finalCitizenId = existing.id; // Link to existing
               } else {
                   const { data, error } = await supabase.from('citizens').insert({
                       nome: newNome,
                       sobrenome: newSobrenome || '.',
                       telefone: cleanPhone,
                       email: newEmail || null,
                       cep: cleanCep, 
                       logradouro: logradouro || null,
                       numero: numero || null,
                       bairro: bairro || null,
                       cidade: cidade || null,
                       estado: estado || null,
                       lat: coords.lat || null, // Save calculated coords
                       lon: coords.lon || null
                   }).select().single();
                   
                   if (error) throw error;
                   finalCitizenId = data.id;
               }
           }
        }

        // 2. Create Demand
        const demandId = crypto.randomUUID();
        const demandPayload = { 
            id: demandId, 
            title, 
            description, 
            level, 
            status, 
            priority,
            type: demandType,
            deadline: deadline || null, 
            citizen_id: finalCitizenId,
            tags,
            created_at: new Date().toISOString(),
            lat: coords.lat || null, // Save coordinates to demand too
            lon: coords.lon || null
        };

        if (!navigator.onLine) {
            const currentQueue = localStorage.getItem('offline_demands_queue');
            const queue = currentQueue ? JSON.parse(currentQueue) : [];
            queue.push(demandPayload);
            localStorage.setItem('offline_demands_queue', JSON.stringify(queue));
            if(onNotification) onNotification('success', 'Salvo Offline! Será sincronizado quando online.');
        } else if (isSupabaseConfigured() && supabase) {
            const { error } = await supabase.from('demands').insert(demandPayload);
            if (error) throw error;
            if(onNotification) onNotification('success', 'Demanda criada com sucesso!');
        }

        setTimeout(() => onSuccess(demandId), 1000);

    } catch (error: any) {
        if(onNotification) onNotification('error', `Erro: ${error.message}`);
        setIsSaving(false);
    } 
  };

  const handleAddTag = () => {
    if(newTag.trim() && !tags.includes(newTag.trim())) {
      setTags([...tags, newTag.trim()]);
      setNewTag('');
      setIsAddingTag(false);
    }
  };

  return (
    <div className="h-full flex flex-col relative animate-in fade-in slide-in-from-right duration-500 pb-20">
      
      {/* Top Bar */}
      <div className="shrink-0 mb-6">
        <div className="flex items-center gap-4">
            <button onClick={onCancel} className="p-2 rounded-xl hover:bg-slate-200 dark:hover:bg-white/10 text-slate-500 dark:text-white transition-colors">
                <ArrowLeft className="w-6 h-6" />
            </button>
            <div>
                <h1 className="text-3xl font-bold text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
                    Nova Demanda
                </h1>
            </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto custom-scrollbar pb-6 -mr-2 pr-2">
        <div className="max-w-none mx-auto"> 
            
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                
                {/* Left Column: Citizen & Address */}
                <div className="lg:col-span-7 space-y-6">
                    
                    {/* SEARCH BOX */}
                    <div className="glass-panel p-6 rounded-3xl border border-slate-200 dark:border-white/10 relative overflow-visible z-20">
                        <div className="flex justify-between items-start mb-4">
                            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-brand-600 dark:text-brand-400"><User className="w-4 h-4" /> Solicitante</div>
                        </div>

                        <div className="relative" ref={searchContainerRef}>
                            <div className="relative">
                                <input 
                                    type="text" 
                                    value={searchTerm} 
                                    onChange={(e) => setSearchTerm(e.target.value)} 
                                    onKeyDown={(e) => e.key === 'Enter' && handleSearch(searchTerm)}
                                    placeholder="Buscar por Nome ou Telefone (Enter)" 
                                    className={`w-full pl-10 pr-10 py-3 glass-input border rounded-xl outline-none focus:border-brand-500 text-slate-900 dark:text-white font-medium transition-all ${isNewCitizen ? 'border-blue-300 dark:border-blue-500/50' : 'border-slate-300 dark:border-white/10'}`} 
                                    autoComplete="off"
                                />
                                <Search className="w-5 h-5 text-slate-400 absolute left-3 top-3.5" />
                                {isLoadingSearch && <Loader2 className="absolute right-3 top-3.5 w-5 h-5 text-brand-500 animate-spin" />}
                            </div>

                            {/* Floating Results List */}
                            {showResults && !foundCitizen && (
                                <div className="absolute top-full left-0 right-0 mt-2 bg-white dark:bg-slate-900 rounded-xl shadow-xl border border-slate-200 dark:border-white/10 overflow-hidden max-h-60 overflow-y-auto z-50">
                                    {searchResults.length > 0 ? (
                                        searchResults.map(c => (
                                            <button 
                                                key={c.id} 
                                                onClick={() => handleSelectResult(c)}
                                                className="w-full text-left p-3 hover:bg-slate-50 dark:hover:bg-white/5 border-b border-slate-100 dark:border-white/5 flex flex-col"
                                            >
                                                <span className="font-bold text-slate-800 dark:text-white text-sm">{c.name}</span>
                                                <div className="flex gap-2 text-xs text-slate-500">
                                                    {c.phone && <span>{formatPhone(c.phone)}</span>}
                                                    {c.bairro && <span>• {c.bairro}</span>}
                                                </div>
                                            </button>
                                        ))
                                    ) : (
                                        !isLoadingSearch && searchTerm.length > 2 && (
                                            <div className="p-3 text-center">
                                                <p className="text-xs text-slate-400 mb-2">Nenhum resultado.</p>
                                                <button onClick={handleCreateNew} className="text-sm font-bold text-brand-600 hover:underline">
                                                    Cadastrar Novo
                                                </button>
                                            </div>
                                        )
                                    )}
                                </div>
                            )}
                        </div>

                        {/* Selected Citizen Display */}
                        {foundCitizen && (
                            <div className="mt-4 flex items-center justify-between bg-slate-50 dark:bg-white/5 p-4 rounded-2xl border border-slate-100 dark:border-white/5 animate-in fade-in slide-in-from-top-2">
                                <div className="flex items-center gap-4">
                                    <div className="w-10 h-10 bg-white dark:bg-slate-800 rounded-full border border-slate-200 dark:border-white/10 flex items-center justify-center shrink-0 font-bold text-brand-600">
                                        {foundCitizen.name.charAt(0)}
                                    </div>
                                    <div>
                                        <h2 className="text-sm font-bold text-slate-900 dark:text-white">{foundCitizen.name}</h2>
                                        <p className="text-xs text-slate-500">{formatPhone(foundCitizen.phone)}</p>
                                    </div>
                                </div>
                                <button onClick={() => { setFoundCitizen(null); setSearchTerm(''); }} className="text-xs text-red-500 hover:underline">Trocar</button>
                            </div>
                        )}

                        {/* New Citizen Form Fields */}
                        {isNewCitizen && !foundCitizen && (
                            <div className="mt-4 p-4 bg-blue-50/50 dark:bg-blue-900/10 rounded-2xl border border-blue-100 dark:border-blue-500/20 animate-in fade-in">
                                <div className="flex items-center justify-between mb-3">
                                    <div className="flex items-center gap-2 text-blue-700 dark:text-blue-300 text-xs font-bold uppercase"><AlertCircle className="w-4 h-4" /> Novo Cadastro</div>
                                    <button onClick={() => setIsNewCitizen(false)} className="text-xs text-slate-400 hover:text-slate-600">Cancelar</button>
                                </div>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <input type="text" placeholder="Nome" value={newNome} onChange={(e) => setNewNome(e.target.value)} className="w-full px-3 py-2.5 rounded-xl border border-blue-200 dark:border-blue-500/30 glass-input text-sm outline-none focus:border-blue-500" required />
                                    <input type="text" placeholder="Sobrenome" value={newSobrenome} onChange={(e) => setNewSobrenome(e.target.value)} className="w-full px-3 py-2.5 rounded-xl border border-blue-200 dark:border-blue-500/30 glass-input text-sm outline-none focus:border-blue-500" />
                                    
                                    <input 
                                        type="tel" 
                                        placeholder="Telefone (Só números)" 
                                        value={newPhone} 
                                        onChange={(e) => setNewPhone(stripNonDigits(e.target.value))} 
                                        className="w-full px-3 py-2.5 rounded-xl border border-blue-200 dark:border-blue-500/30 glass-input text-sm outline-none focus:border-blue-500" 
                                        required 
                                    />
                                    
                                    <input 
                                        type="email" 
                                        placeholder="Email (Opcional)" 
                                        value={newEmail} 
                                        onChange={(e) => setNewEmail(e.target.value)} 
                                        className="w-full px-3 py-2.5 rounded-xl border border-blue-200 dark:border-blue-500/30 glass-input text-sm outline-none focus:border-blue-500" 
                                    />
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Address Section */}
                    <div className="glass-panel p-6 rounded-3xl border border-slate-200 dark:border-white/10 space-y-4">
                        <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-white/40"><MapPin className="w-4 h-4" /> Endereço da Ocorrência</div>
                        </div>
                        <div className="grid grid-cols-12 gap-4">
                            <div className="col-span-12 sm:col-span-4"><label className="text-[10px] font-bold text-slate-500 dark:text-white/50 uppercase mb-1 block">CEP</label><div className="relative"><input type="text" value={cep} onChange={(e) => setCep(formatCEP(e.target.value))} onBlur={handleCepBlur} className="w-full pl-9 pr-8 py-2.5 glass-input border border-slate-300 dark:border-white/10 rounded-xl outline-none focus:border-brand-500 text-sm" placeholder="00000-000" /><Search className="absolute left-3 top-3 w-4 h-4 text-slate-400" />{isLoadingCep && <Loader2 className="absolute right-3 top-3 w-4 h-4 text-brand-500 animate-spin" />}</div></div>
                            <div className="col-span-8 sm:col-span-8"><label className="text-[10px] font-bold text-slate-500 dark:text-white/50 uppercase mb-1 block">Cidade</label><input type="text" value={cidade} onChange={(e) => setCidade(e.target.value)} className="w-full px-3 py-2.5 glass-input border border-slate-300 dark:border-white/10 rounded-xl outline-none focus:border-brand-500 text-sm" /></div>
                            <div className="col-span-12 sm:col-span-9"><label className="text-[10px] font-bold text-slate-500 dark:text-white/50 uppercase mb-1 block">Logradouro</label><input type="text" value={logradouro} onChange={(e) => setLogradouro(e.target.value)} className="w-full px-3 py-2.5 glass-input border border-slate-300 dark:border-white/10 rounded-xl outline-none focus:border-brand-500 text-sm" /></div>
                            <div className="col-span-4 sm:col-span-3"><label className="text-[10px] font-bold text-slate-500 dark:text-white/50 uppercase mb-1 block">Número</label><input type="text" value={numero} onChange={(e) => setNumero(e.target.value)} className="w-full px-3 py-2.5 glass-input border border-slate-300 dark:border-white/10 rounded-xl outline-none focus:border-brand-500 text-sm" /></div>
                            <div className="col-span-8 sm:col-span-8"><label className="text-[10px] font-bold text-slate-500 dark:text-white/50 uppercase mb-1 block">Bairro</label><input type="text" value={bairro} onChange={(e) => setBairro(e.target.value)} className="w-full px-3 py-2.5 glass-input border border-slate-300 dark:border-white/10 rounded-xl outline-none focus:border-brand-500 text-sm" /></div>
                            <div className="col-span-4 sm:col-span-4"><label className="text-[10px] font-bold text-slate-500 dark:text-white/50 uppercase mb-1 block">UF</label><input type="text" value={estado} onChange={(e) => setEstado(e.target.value)} className="w-full px-3 py-2.5 glass-input border border-slate-300 dark:border-white/10 rounded-xl outline-none focus:border-brand-500 text-sm uppercase" maxLength={2} /></div>
                        </div>
                    </div>
                </div>

                {/* Right Column: Demand Details */}
                <div className="lg:col-span-5 space-y-6">
                    <div className="glass-panel p-6 rounded-3xl border border-slate-200 dark:border-white/10 h-full">
                        <div className="flex items-center gap-2 mb-6 text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-white/40"><FileText className="w-4 h-4" /> Detalhes da Solicitação</div>
                        <div className="space-y-5">
                            <div>
                                <label className="block text-sm font-bold text-slate-700 dark:text-white/80 mb-2">Tipo de Demanda</label>
                                <div className="relative">
                                    <select 
                                        value={demandType} 
                                        onChange={e => setDemandType(e.target.value as DemandType)} 
                                        className="w-full pl-4 pr-10 py-3 appearance-none glass-input border border-slate-300 dark:border-white/10 rounded-xl outline-none focus:border-brand-500 text-slate-900 dark:text-white font-medium [&>option]:bg-white dark:[&>option]:bg-slate-900"
                                    >
                                        {Object.values(DemandType).map(t => <option key={t} value={t}>{t}</option>)}
                                    </select>
                                </div>
                            </div>

                            <div><label className="block text-sm font-bold text-slate-700 dark:text-white/80 mb-2">Título</label><input type="text" value={title} onChange={e => setTitle(e.target.value)} className="w-full px-4 py-3 glass-input border border-slate-300 dark:border-white/10 rounded-xl outline-none focus:border-brand-500 text-base font-bold text-slate-900 dark:text-white" placeholder="Ex: Buraco na via" /></div>
                            <div><label className="block text-sm font-bold text-slate-700 dark:text-white/80 mb-2">Descrição</label><textarea value={description} onChange={e => setDescription(e.target.value)} rows={8} className="w-full px-4 py-3 glass-input border border-slate-300 dark:border-white/10 rounded-xl outline-none focus:border-brand-500 text-sm text-slate-900 dark:text-white leading-relaxed resize-none" placeholder="Descreva a situação em detalhes..." /></div>
                            
                            {/* Tags Input */}
                            <div>
                                <label className="block text-sm font-bold text-slate-700 dark:text-white/80 mb-2">Etiquetas (Tags)</label>
                                <div className="flex flex-wrap gap-2 mb-2">
                                    {tags.map(tag => (
                                        <span key={tag} className="px-2 py-1 bg-slate-100 dark:bg-white/10 text-slate-600 dark:text-white text-xs font-bold rounded-lg flex items-center gap-1">
                                            {tag}
                                            <X onClick={() => setTags(tags.filter(t => t !== tag))} className="w-3 h-3 cursor-pointer text-slate-400 hover:text-red-500" />
                                        </span>
                                    ))}
                                </div>
                                {isAddingTag ? (
                                    <div className="flex gap-2">
                                        <input 
                                            autoFocus
                                            type="text" 
                                            value={newTag} 
                                            onChange={e => setNewTag(e.target.value)} 
                                            className="flex-1 px-3 py-2 rounded-xl border border-slate-300 dark:border-white/10 glass-input text-sm"
                                            placeholder="Nova tag..."
                                            onKeyDown={e => { if(e.key === 'Enter') handleAddTag(); }}
                                        />
                                        <button type="button" onClick={handleAddTag} className="px-3 py-2 bg-brand-600 text-white rounded-xl text-xs font-bold">Add</button>
                                    </div>
                                ) : (
                                    <button type="button" onClick={() => setIsAddingTag(true)} className="text-xs text-brand-600 font-bold flex items-center gap-1 hover:underline"><PlusCircle className="w-3 h-3" /> Adicionar Tag</button>
                                )}
                            </div>

                            <div className="space-y-4 pt-4 border-t border-slate-100 dark:border-white/5">
                                 <div><label className="block text-sm font-bold text-slate-700 dark:text-white/80 mb-2">Status Inicial</label><div className="relative"><select value={status} onChange={e => setStatus(e.target.value as DemandStatus)} className="w-full pl-4 pr-10 py-3 appearance-none glass-input border border-slate-300 dark:border-white/10 rounded-xl outline-none focus:border-brand-500 text-slate-900 dark:text-white font-medium [&>option]:bg-white dark:[&>option]:bg-slate-900">{Object.values(DemandStatus).map(s => <option key={s} value={s}>{s}</option>)}</select></div></div>
                                 
                                 <div className="grid grid-cols-2 gap-4">
                                     <div><label className="block text-sm font-bold text-slate-700 dark:text-white/80 mb-2">Nível</label><div className="relative"><select value={level} onChange={e => setLevel(e.target.value as DemandLevel)} className="w-full pl-4 pr-10 py-3 appearance-none glass-input border border-slate-300 dark:border-white/10 rounded-xl outline-none focus:border-brand-500 text-slate-900 dark:text-white font-medium [&>option]:bg-white dark:[&>option]:bg-slate-900">{Object.values(DemandLevel).map(l => <option key={l} value={l}>{l}</option>)}</select></div></div>
                                     <div><label className="block text-sm font-bold text-slate-700 dark:text-white/80 mb-2">Prazo</label><div className="relative"><input type="date" value={deadline} onChange={e => setDeadline(e.target.value)} className="w-full pl-10 pr-4 py-3 glass-input border border-slate-300 dark:border-white/10 rounded-xl outline-none focus:border-brand-500 text-slate-900 dark:text-white font-medium" /><Calendar className="w-5 h-5 text-slate-400 dark:text-white/40 absolute left-3 top-3.5" /></div></div>
                                 </div>
        
                                 <div>
                                     <label className="block text-sm font-bold text-slate-700 dark:text-white/80 mb-2">Prioridade</label>
                                     <div className="grid grid-cols-3 gap-2">{Object.values(DemandPriority).map(p => (<label key={p} className={`flex items-center justify-center gap-2 p-3 rounded-lg border cursor-pointer transition-all ${priority === p ? (p === 'Alta' ? 'text-red-600 bg-red-100' : p === 'Média' ? 'text-amber-600 bg-amber-100' : 'text-green-600 bg-green-100') : 'border-slate-200 dark:border-white/10 text-slate-500 dark:text-white/50 hover:bg-slate-50 dark:hover:bg-white/5'}`}><input type="radio" name="priority" value={p} checked={priority === p} onChange={() => setPriority(p)} className="hidden" /><span className="font-bold text-sm uppercase">{p}</span></label>))}</div>
                                 </div>
                            </div>
                        </div>
                    </div>
                </div>

            </div>
            
        </div>
      </div>

      {/* STICKY MOBILE FOOTER Actions */}
      <div className="fixed bottom-0 left-0 right-0 p-4 bg-white/95 dark:bg-[#0b1121]/95 backdrop-blur-md border-t border-slate-200 dark:border-white/10 z-[60] flex gap-3 md:hidden">
            <button 
                onClick={onCancel} 
                className="flex-1 py-3 rounded-xl font-bold text-slate-500 dark:text-white/60 bg-slate-100 dark:bg-white/5 hover:bg-slate-200 active:scale-95 transition-all"
            >
                Cancelar
            </button>
            <button 
                onClick={handleSubmit} 
                disabled={isSaving} 
                className="flex-1 py-3 bg-brand-600 hover:bg-brand-500 text-white rounded-xl font-bold shadow-lg flex items-center justify-center gap-2 disabled:opacity-70 active:scale-95 transition-all"
            >
                {isSaving ? <Loader2 className="w-5 h-5 animate-spin" /> : (navigator.onLine ? <Save className="w-5 h-5" /> : <CloudOff className="w-5 h-5" />)}
                {isSaving ? 'Salvando...' : (navigator.onLine ? 'Criar' : 'Salvar Offline')}
            </button>
      </div>

      {/* Desktop Buttons (Hidden on Mobile) */}
      <div className="hidden md:flex fixed bottom-6 right-6 z-50 gap-3">
            <button 
                onClick={onCancel} 
                className="px-6 py-3 rounded-xl font-bold text-slate-500 bg-white shadow-lg border border-slate-200 hover:bg-slate-50 transition-all"
            >
                Cancelar
            </button>
            <button 
                onClick={handleSubmit} 
                disabled={isSaving} 
                className="px-8 py-3 bg-brand-600 hover:bg-brand-500 text-white rounded-xl font-bold shadow-xl flex items-center gap-2 disabled:opacity-70 transition-all"
            >
                {isSaving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
                {isSaving ? 'Salvando...' : 'Criar Demanda'}
            </button>
      </div>

    </div>
  );
};

export default DemandForm;
