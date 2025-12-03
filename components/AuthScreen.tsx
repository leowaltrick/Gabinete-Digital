import React, { useState, useMemo, useEffect } from 'react';
import { User, Role } from '../types';
import { LogIn, Loader2, AlertCircle, Mail, Lock, Check, KeyRound, ArrowRight, Fingerprint, Building2, LayoutList, Users, Map as MapIcon, Calendar, BarChart3, ShieldCheck, Eye, EyeOff } from 'lucide-react';
import { supabase, isSupabaseConfigured } from '../services/supabaseClient';

interface AuthScreenProps {
  onLogin: (user: User) => void;
}

type AuthStep = 'login' | 'new_password';

// --- FAKE DASHBOARD COMPONENT (Static Visuals only - Background Layer) ---
const FakeDashboardBackground = () => (
    <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none select-none p-4 lg:p-8 flex gap-6 bg-slate-100 dark:bg-[#0f172a]">
        {/* Fake Sidebar */}
        <div className="hidden lg:flex w-72 h-full flex-col gap-8 bg-white dark:bg-[#1e293b] rounded-[2.5rem] border border-slate-200 dark:border-white/5 p-8 opacity-40 blur-[2px] shadow-sm">
            <div className="flex items-center gap-4 mb-6">
                <div className="w-12 h-12 rounded-2xl bg-slate-200 dark:bg-white/10"></div>
                <div className="h-5 w-32 bg-slate-200 dark:bg-white/10 rounded-lg"></div>
            </div>
            <div className="space-y-4">
                {[1, 2, 3, 4, 5].map(i => (
                    <div key={i} className="h-12 w-full bg-slate-100 dark:bg-white/5 rounded-2xl"></div>
                ))}
            </div>
            <div className="mt-auto h-14 w-full bg-slate-100 dark:bg-white/5 rounded-2xl"></div>
        </div>

        {/* Fake Content Area */}
        <div className="flex-1 flex flex-col gap-6 opacity-30 lg:opacity-50 blur-[3px] lg:blur-[1px]">
            {/* Fake Header */}
            <div className="h-24 w-full bg-white dark:bg-[#1e293b] rounded-[2.5rem] border border-slate-200 dark:border-white/5 flex items-center justify-between px-10 shadow-sm">
                <div className="h-8 w-64 bg-slate-200 dark:bg-white/10 rounded-xl"></div>
                <div className="flex gap-4">
                    <div className="h-12 w-12 rounded-full bg-slate-200 dark:bg-white/10"></div>
                    <div className="h-12 w-12 rounded-full bg-slate-200 dark:bg-white/10"></div>
                </div>
            </div>

            {/* Fake Stats Grid */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
                {[1, 2, 3, 4].map(i => (
                    <div key={i} className="h-40 bg-white dark:bg-[#1e293b] rounded-[2.5rem] border border-slate-200 dark:border-white/5 p-6 flex flex-col justify-between shadow-sm">
                        <div className="w-12 h-12 rounded-2xl bg-slate-100 dark:bg-white/5"></div>
                        <div className="h-5 w-24 bg-slate-200 dark:bg-white/10 rounded-lg"></div>
                    </div>
                ))}
            </div>

            {/* Fake Big Chart */}
            <div className="flex-1 bg-white dark:bg-[#1e293b] rounded-[2.5rem] border border-slate-200 dark:border-white/5 p-10 flex items-end justify-between gap-6 shadow-sm">
                 {[40, 70, 50, 90, 60, 80, 50, 75, 45, 65, 85, 55, 70, 40, 60].map((h, i) => (
                     <div key={i} className="w-full bg-slate-200 dark:bg-white/5 rounded-t-xl" style={{ height: `${h}%` }}></div>
                 ))}
            </div>
        </div>
    </div>
);

const AuthScreen: React.FC<AuthScreenProps> = ({ onLogin }) => {
  const [step, setStep] = useState<AuthStep>('login');
  const [isExiting, setIsExiting] = useState(false);
  const [animateEntrance, setAnimateEntrance] = useState(false);

  // Login State
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  
  // New Password State
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  
  const [tempUserData, setTempUserData] = useState<any>(null);

  // UI State
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
      setAnimateEntrance(true);
  }, []);

  // --- Helpers ---
  const hashPassword = useMemo(() => async (message: string) => {
    const msgBuffer = new TextEncoder().encode(message);
    const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  }, []);

  const passwordCriteria = useMemo(() => {
    const p = newPassword;
    return {
        length: p.length >= 8 && p.length <= 12,
        hasUpper: /[A-Z]/.test(p),
        isAlphanumeric: /[a-zA-Z]/.test(p) && /[0-9]/.test(p),
        match: p === confirmPassword && p.length > 0
    };
  }, [newPassword, confirmPassword]);

  const isPasswordValid = Object.values(passwordCriteria).every(Boolean);

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      if (isSupabaseConfigured() && supabase) {
        const passwordHash = await hashPassword(password);
        const { data, error: dbError } = await supabase.from('system_users').select('*').eq('email', email).maybeSingle();

        if (dbError) throw dbError;

        if (!data || data.senha_hash !== passwordHash) {
           setError("Credenciais inválidas.");
           setIsLoading(false);
           return;
        }

        if (!data.ativo) {
            setError("Conta desativada.");
            setIsLoading(false);
            return;
        }

        if (!data.last_login) {
            setTempUserData(data);
            setStep('new_password');
            setIsLoading(false);
            return;
        }

        // Existing user login
        await completeLogin(data, false, false);

      } else {
        // DEMO MODE
        await new Promise(resolve => setTimeout(resolve, 800));
        if (email === 'admin@admin' && password === 'admin') {
             const mockUser: User = { id: 'demo-admin', email: 'admin@admin', name: 'Administrador Demo', role: 'administrador', avatar: `https://ui-avatars.com/api/?name=Admin&background=0284c7&color=fff`, firstLogin: true };
             await completeLogin(mockUser, true, true);
        } else {
            setError("Credenciais inválidas.");
            setIsLoading(false);
        }
      }
    } catch (err: any) {
        setError("Erro ao processar login.");
        setIsLoading(false);
    }
  };

  const handleNewPasswordSubmit = async (e: React.FormEvent) => {
      e.preventDefault();
      if (!isPasswordValid || !tempUserData) return;
      setIsLoading(true);
      setError(null);

      if (newPassword === 'Senha4321') {
          setError('A nova senha não pode ser igual à senha padrão.');
          setIsLoading(false);
          return;
      }

      try {
          if (isSupabaseConfigured() && supabase) {
              const newHash = await hashPassword(newPassword);
              const { error: updateError } = await supabase.from('system_users').update({ senha_hash: newHash, last_login: new Date().toISOString() }).eq('id', tempUserData.id);
              if (updateError) throw updateError;
              const updatedUser = { ...tempUserData, last_login: new Date().toISOString() };
              // First time login completed
              await completeLogin(updatedUser, false, true);
          }
      } catch (err: any) {
          setError("Erro ao salvar nova senha: " + err.message);
          setIsLoading(false);
      }
  };

  const completeLogin = async (userData: any, isDemo = false, isFirstLogin = false) => {
      if (!isDemo && isSupabaseConfigured() && supabase && step === 'login') {
         // Update last_login for returning users
         await supabase.from('system_users').update({ last_login: new Date().toISOString() }).eq('id', userData.id);
      }
      
      const authenticatedUser: User = isDemo ? userData : { 
          id: userData.id, 
          email: userData.email, 
          name: userData.nome, 
          role: userData.perfil as Role, 
          avatar: `https://ui-avatars.com/api/?name=${userData.nome}&background=0284c7&color=fff`,
          firstLogin: isFirstLogin 
      };

      setIsExiting(true);
      setTimeout(() => {
          localStorage.setItem('geo_user', JSON.stringify(authenticatedUser));
          onLogin(authenticatedUser);
      }, 400); 
  };

  const ValidationItem = ({ fulfilled, label }: { fulfilled: boolean, label: string }) => (
      <div className={`flex items-center gap-2 text-xs transition-colors duration-200 ${fulfilled ? 'text-emerald-600 font-bold' : 'text-slate-400'}`}>
          <div className={`w-3.5 h-3.5 rounded-full flex items-center justify-center border ${fulfilled ? 'bg-emerald-500 border-emerald-500 text-white' : 'border-slate-300 bg-transparent'}`}>
             {fulfilled && <Check className="w-2.5 h-2.5" />}
          </div>
          <span>{label}</span>
      </div>
  );

  return (
    <div className={`fixed inset-0 z-[100] bg-slate-50 dark:bg-[#020617] transition-all duration-700 overflow-hidden ${isExiting ? 'opacity-0 scale-105 pointer-events-none' : 'opacity-100'}`}>
      
      {/* 1. LAYER: FAKE DASHBOARD (Background) */}
      <FakeDashboardBackground />

      {/* 2. LAYER: OVERLAY (Dim for focus) */}
      <div className="absolute inset-0 bg-white/40 dark:bg-black/60 backdrop-blur-[4px] z-10 transition-colors duration-700"></div>

      {/* 3. LAYER: MAIN SPLIT CONTAINER */}
      <div className="absolute inset-0 z-20 flex flex-col lg:flex-row w-full h-full">
          
          {/* LEFT COLUMN: CENTERED LOGIN CARD */}
          <div className="w-full lg:w-1/2 h-full flex items-center justify-center p-6 relative">
              
              <div className={`
                  w-full max-w-[440px]
                  bg-white/80 dark:bg-[#0f172a]/70 backdrop-blur-2xl 
                  border border-white/50 dark:border-white/10 
                  shadow-[0_8px_40px_-12px_rgba(0,0,0,0.1)] dark:shadow-black/50
                  rounded-[2.5rem] p-8 md:p-12
                  transform transition-all duration-700 ease-out flex flex-col
                  ${animateEntrance ? 'translate-y-0 opacity-100 scale-100' : 'translate-y-12 opacity-0 scale-95'}
              `}>
                  {/* Brand Header */}
                  <div className="flex items-center gap-4 mb-10">
                      <div className="w-14 h-14 bg-gradient-to-br from-brand-600 to-brand-700 rounded-2xl flex items-center justify-center shadow-lg shadow-brand-600/20 text-white ring-4 ring-white/50 dark:ring-white/5">
                          <Building2 className="w-7 h-7" />
                      </div>
                      <div>
                          <h1 className="text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight leading-none">Gabinete<br/>Digital</h1>
                      </div>
                  </div>

                  <div className="mb-8">
                      <h2 className="text-xl font-bold text-slate-900 dark:text-white">
                          {step === 'login' ? 'Acesso ao Painel' : 'Configuração Inicial'}
                      </h2>
                      <p className="text-sm text-slate-500 dark:text-slate-400 mt-1 font-medium">
                          {step === 'login' ? 'Gerencie seu mandato com eficiência.' : 'Defina sua senha de segurança.'}
                      </p>
                  </div>

                  {error && (
                    <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-500/20 text-red-600 dark:text-red-300 text-sm font-bold rounded-2xl flex items-center gap-3 animate-in slide-in-from-left-2 shadow-sm">
                        <AlertCircle className="w-5 h-5 flex-shrink-0" />
                        {error}
                    </div>
                  )}

                  {step === 'login' ? (
                      <form onSubmit={handleLoginSubmit} className="space-y-5">
                          <div className="space-y-4">
                              <div className="relative group">
                                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400 group-focus-within:text-brand-600 transition-colors">
                                      <Mail className="w-5 h-5" />
                                  </div>
                                  <input
                                      type="email"
                                      value={email}
                                      onChange={(e) => setEmail(e.target.value)}
                                      className="block w-full pl-11 pr-4 py-4 bg-white/60 dark:bg-black/20 border border-slate-200 dark:border-white/10 rounded-2xl text-slate-900 dark:text-white placeholder:text-slate-400 focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all outline-none font-bold shadow-sm"
                                      placeholder="Email"
                                      required
                                      autoComplete="email"
                                  />
                              </div>

                              <div className="relative group">
                                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400 group-focus-within:text-brand-600 transition-colors">
                                      <Lock className="w-5 h-5" />
                                  </div>
                                  <input
                                      type={showPassword ? 'text' : 'password'}
                                      value={password}
                                      onChange={(e) => setPassword(e.target.value)}
                                      className="block w-full pl-11 pr-12 py-4 bg-white/60 dark:bg-black/20 border border-slate-200 dark:border-white/10 rounded-2xl text-slate-900 dark:text-white placeholder:text-slate-400 focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all outline-none font-bold shadow-sm"
                                      placeholder="Senha"
                                      required
                                      autoComplete="current-password"
                                  />
                                  <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute inset-y-0 right-0 pr-4 flex items-center text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors cursor-pointer"
                                  >
                                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                                  </button>
                              </div>
                          </div>

                          <button
                              type="submit"
                              disabled={isLoading}
                              className="w-full py-4 bg-brand-600 hover:bg-brand-500 text-white rounded-2xl font-bold text-base transition-all transform active:scale-[0.98] shadow-lg shadow-brand-600/20 flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed group relative overflow-hidden"
                          >
                              {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <LogIn className="w-5 h-5 group-hover:translate-x-1 transition-transform" />}
                              {isLoading ? 'Conectando...' : 'Entrar'}
                          </button>
                      </form>
                  ) : (
                      <form onSubmit={handleNewPasswordSubmit} className="space-y-6 animate-in slide-in-from-right-8 duration-500">
                          <div className="space-y-4">
                              <div className="relative group">
                                  <input 
                                    type={showNewPassword ? 'text' : 'password'} 
                                    value={newPassword} 
                                    onChange={(e) => setNewPassword(e.target.value)} 
                                    className="block w-full pl-5 pr-12 py-4 bg-white/60 dark:bg-black/20 border border-slate-200 dark:border-white/10 rounded-2xl text-slate-900 dark:text-white placeholder:text-slate-400 focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all outline-none font-bold" 
                                    placeholder="Nova Senha" 
                                    maxLength={12} 
                                    autoComplete="new-password" 
                                  />
                                  <button
                                    type="button"
                                    onClick={() => setShowNewPassword(!showNewPassword)}
                                    className="absolute inset-y-0 right-0 pr-4 flex items-center text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors cursor-pointer"
                                  >
                                    {showNewPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                                  </button>
                              </div>
                              <div className="relative group">
                                  <input 
                                    type={showConfirmPassword ? 'text' : 'password'} 
                                    value={confirmPassword} 
                                    onChange={(e) => setConfirmPassword(e.target.value)} 
                                    className="block w-full pl-5 pr-12 py-4 bg-white/60 dark:bg-black/20 border border-slate-200 dark:border-white/10 rounded-2xl text-slate-900 dark:text-white placeholder:text-slate-400 focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all outline-none font-bold" 
                                    placeholder="Confirmar Senha" 
                                    maxLength={12} 
                                    autoComplete="new-password" 
                                  />
                                  <button
                                    type="button"
                                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                    className="absolute inset-y-0 right-0 pr-4 flex items-center text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors cursor-pointer"
                                  >
                                    {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                                  </button>
                              </div>
                          </div>

                          <div className="p-4 bg-slate-50 dark:bg-white/5 rounded-2xl border border-slate-100 dark:border-white/5 grid grid-cols-2 gap-3">
                              <ValidationItem fulfilled={passwordCriteria.length} label="8-12 dígitos" />
                              <ValidationItem fulfilled={passwordCriteria.isAlphanumeric} label="Letras/Números" />
                              <ValidationItem fulfilled={passwordCriteria.hasUpper} label="Maiúscula" />
                              <ValidationItem fulfilled={passwordCriteria.match} label="Senhas Iguais" />
                          </div>

                          <div className="flex gap-4">
                              <button type="button" onClick={() => { setStep('login'); setNewPassword(''); setConfirmPassword(''); setTempUserData(null); }} className="flex-1 py-4 bg-white dark:bg-white/5 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-white/10 rounded-2xl font-bold text-sm border border-slate-200 dark:border-white/10 transition-colors">Voltar</button>
                              <button type="submit" disabled={isLoading || !isPasswordValid} className="flex-[2] py-4 bg-brand-600 hover:bg-brand-500 text-white rounded-2xl font-bold text-sm shadow-lg flex items-center justify-center gap-2 disabled:opacity-50 transition-all">{isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <ArrowRight className="w-5 h-5" />} Confirmar</button>
                          </div>
                      </form>
                  )}
                  
                  <div className="mt-8 pt-6 border-t border-slate-200/50 dark:border-white/5 text-center">
                      <p className="text-[10px] uppercase font-bold text-slate-400 dark:text-slate-500 tracking-widest">
                          Desenvolvido por <a href="mailto:leowaltrick@gmail.com?subject=App Gabinete Digital" title="Entrar em contato" className="text-brand-600 dark:text-brand-400 hover:opacity-80 transition-opacity">LW Consulting</a>
                      </p>
                  </div>
              </div>
          </div>

          {/* RIGHT SIDE: FEATURES GRID (Desktop Only) */}
          <div className="hidden lg:flex w-1/2 h-full items-center justify-center p-12 xl:p-20 relative pointer-events-none">
              <div className={`
                  w-full max-w-xl pointer-events-auto
                  transform transition-all duration-1000 delay-200 flex flex-col gap-10
                  ${animateEntrance ? 'translate-x-0 opacity-100' : 'translate-x-20 opacity-0'}
              `}>
                  
                  <div>
                      <h1 className="text-4xl font-extrabold text-slate-900 dark:text-white leading-tight mb-4 drop-shadow-sm">
                          Gestão inteligente<br/>para mandatos modernos.
                      </h1>
                      <p className="text-lg text-slate-600 dark:text-slate-300 font-medium leading-relaxed">
                          Centralize demandas, acompanhe solicitações e tome decisões estratégicas baseadas em dados.
                      </p>
                  </div>

                  {/* Feature Grid */}
                  <div className="grid grid-cols-2 gap-4">
                      {[
                          { title: "Gestão de Demandas", icon: LayoutList, desc: "Controle via Lista, Kanban e Calendário." },
                          { title: "Base de Cidadãos", icon: Users, desc: "Cadastro completo com histórico e mapa." },
                          { title: "Mapa Interativo", icon: MapIcon, desc: "Visualização geoespacial de ocorrências." },
                          { title: "Agenda e Prazos", icon: Calendar, desc: "Monitoramento de tarefas e vencimentos." },
                          { title: "Dashboard e KPIs", icon: BarChart3, desc: "Métricas de desempenho em tempo real." },
                          { title: "Segurança e Acesso", icon: ShieldCheck, desc: "Controle granular de permissões." },
                      ].map((item, i) => (
                          <div key={i} className="bg-white/60 dark:bg-black/40 backdrop-blur-md border border-white/40 dark:border-white/10 p-4 rounded-2xl shadow-sm hover:bg-white/80 dark:hover:bg-white/10 transition-colors duration-300">
                              <div className="w-10 h-10 rounded-xl bg-brand-100 dark:bg-brand-900/30 flex items-center justify-center text-brand-600 dark:text-brand-400 mb-3">
                                  <item.icon className="w-5 h-5" />
                              </div>
                              <h3 className="font-bold text-slate-900 dark:text-white text-sm mb-1">{item.title}</h3>
                              <p className="text-xs text-slate-500 dark:text-slate-400 leading-snug">{item.desc}</p>
                          </div>
                      ))}
                  </div>

              </div>
          </div>

      </div>
    </div>
  );
};

export default AuthScreen;