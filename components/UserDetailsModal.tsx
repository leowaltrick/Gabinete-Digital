
import React, { useState, useEffect } from 'react';
import { User, Role } from '../types';
import { X, User as UserIcon, Mail, Shield, Save, Power, KeyRound, Check, Loader2, AlertCircle, Lock } from 'lucide-react';

interface UserDetailsModalProps {
  user: any; // System user object from DB
  currentUser: User;
  onClose: () => void;
  onSave: (id: string, data: { nome: string; email: string; perfil: Role }) => Promise<void>;
  onToggleStatus: (user: any) => Promise<void>;
  onResetPassword?: (user: any) => Promise<void>;
}

const UserDetailsModal: React.FC<UserDetailsModalProps> = ({ 
    user, 
    currentUser, 
    onClose, 
    onSave, 
    onToggleStatus,
    onResetPassword
}) => {
  const isNewUser = !user?.id;
  const [isEditing, setIsEditing] = useState(isNewUser);
  const [isLoading, setIsLoading] = useState(false);
  
  const [nome, setNome] = useState(user.nome || '');
  const [email, setEmail] = useState(user.email || '');
  const [perfil, setPerfil] = useState<Role>(user.perfil || 'assessor');

  // Reset state when user prop changes (e.g. viewing a different user)
  useEffect(() => {
      const newUserState = !user?.id;
      setIsEditing(newUserState);
      setNome(user.nome || '');
      setEmail(user.email || '');
      setPerfil(user.perfil || 'assessor');
  }, [user]);

  const handleSave = async () => {
      setIsLoading(true);
      try {
          await onSave(user.id, { nome, email, perfil });
          if (!isNewUser) setIsEditing(false);
      } catch (error) {
          console.error(error);
      } finally {
          setIsLoading(false);
      }
  };

  const formatRole = (role: string) => role.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
        <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-md transition-opacity" onClick={onClose}></div>
        
        <div className="relative w-full max-w-2xl bg-white dark:bg-[#0b1121] rounded-3xl shadow-2xl overflow-hidden flex flex-col animate-in zoom-in-95 duration-300 border border-slate-200 dark:border-white/10">
            
            {/* Header */}
            <div className="px-6 py-4 border-b border-slate-200 dark:border-white/10 flex items-center justify-between bg-white/90 dark:bg-[#0b1121]/90 backdrop-blur-md z-20">
                <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-lg border border-slate-200 dark:border-white/10 ${!user.ativo ? 'bg-slate-200 text-slate-400' : 'bg-brand-100 dark:bg-brand-500/20 text-brand-600 dark:text-brand-400'}`}>
                        {nome ? nome.charAt(0).toUpperCase() : (isNewUser ? '+' : '?')}
                    </div>
                    <div>
                        <h2 className="text-xl font-bold text-slate-900 dark:text-white leading-tight">
                            {isNewUser ? 'Novo Usuário' : (isEditing ? 'Editar Usuário' : user.nome)}
                        </h2>
                        {!isNewUser && (
                            <div className="flex items-center gap-2">
                                <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${user.ativo ? 'bg-green-100 text-green-700 dark:bg-green-500/20 dark:text-green-300' : 'bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-300'}`}>
                                    {user.ativo ? 'Ativo' : 'Inativo'}
                                </span>
                                <span className="text-xs text-slate-500 dark:text-white/50">{user.email}</span>
                            </div>
                        )}
                        {isNewUser && <span className="text-xs text-slate-500 dark:text-white/50">Preencha os dados abaixo</span>}
                    </div>
                </div>
                <button onClick={onClose} className="p-2 rounded-full hover:bg-slate-100 dark:hover:bg-white/10 text-slate-400 dark:text-white/40 transition-colors">
                    <X className="w-6 h-6" />
                </button>
            </div>

            {/* Content */}
            <div className="p-6 md:p-8 space-y-6 overflow-y-auto max-h-[70vh]">
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-4">
                        <label className="text-xs font-bold uppercase text-slate-500 dark:text-white/50 block">Dados Pessoais</label>
                        <div className="space-y-3">
                            <div>
                                <label className="block text-xs font-medium text-slate-400 mb-1">Nome Completo</label>
                                <div className="relative">
                                    <UserIcon className="absolute left-3 top-3 w-4 h-4 text-slate-400" />
                                    <input 
                                        type="text" 
                                        value={nome} 
                                        onChange={e => setNome(e.target.value)} 
                                        disabled={!isEditing}
                                        placeholder="Ex: João Silva"
                                        className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/5 outline-none focus:border-brand-500 disabled:opacity-70 disabled:bg-transparent text-sm font-medium text-slate-900 dark:text-white transition-colors"
                                        autoFocus={isNewUser}
                                    />
                                </div>
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-slate-400 mb-1">Email Corporativo</label>
                                <div className="relative">
                                    <Mail className="absolute left-3 top-3 w-4 h-4 text-slate-400" />
                                    <input 
                                        type="email" 
                                        value={email} 
                                        onChange={e => setEmail(e.target.value)} 
                                        disabled={!isEditing}
                                        placeholder="Ex: joao@gabinete.com"
                                        className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/5 outline-none focus:border-brand-500 disabled:opacity-70 disabled:bg-transparent text-sm font-medium text-slate-900 dark:text-white transition-colors"
                                    />
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="space-y-4">
                        <label className="text-xs font-bold uppercase text-slate-500 dark:text-white/50 block">Permissões de Acesso</label>
                        <div className="space-y-2">
                             {['administrador', 'chefe_de_gabinete', 'assessor'].map((role) => (
                                 <button
                                    key={role}
                                    type="button"
                                    disabled={!isEditing}
                                    onClick={() => setPerfil(role as Role)}
                                    className={`w-full p-3 rounded-xl border text-left flex items-center justify-between transition-all ${
                                        perfil === role 
                                        ? 'bg-brand-50 border-brand-500 text-brand-700 dark:bg-brand-500/20 dark:text-brand-300 dark:border-brand-500/30' 
                                        : 'bg-white dark:bg-white/5 border-slate-200 dark:border-white/10 text-slate-600 dark:text-white/60 hover:bg-slate-50 dark:hover:bg-white/10'
                                    } ${!isEditing ? 'opacity-70 cursor-default' : 'cursor-pointer active:scale-[0.98]'}`}
                                 >
                                    <span className="text-sm font-bold">{formatRole(role)}</span>
                                    {perfil === role && <Check className="w-4 h-4" />}
                                 </button>
                             ))}
                        </div>
                    </div>
                </div>

                {!isNewUser && (
                    <div className="pt-6 border-t border-slate-100 dark:border-white/5">
                        <h4 className="text-xs font-bold uppercase text-slate-500 dark:text-white/50 mb-4 flex items-center gap-2">
                            <Shield className="w-4 h-4" /> Conta e Segurança
                        </h4>
                        
                        <div className="border border-slate-200 dark:border-white/10 rounded-2xl divide-y divide-slate-100 dark:divide-white/5 overflow-hidden bg-white dark:bg-white/5">
                            {/* Access Row */}
                            <div className="p-4 flex items-center justify-between hover:bg-slate-50 dark:hover:bg-white/5 transition-colors">
                                <div className="flex items-center gap-4">
                                    <div className={`p-2 rounded-xl ${user.ativo ? 'bg-green-100 text-green-600 dark:bg-green-500/20 dark:text-green-400' : 'bg-red-100 text-red-600 dark:bg-red-500/20 dark:text-red-400'}`}>
                                        <Power className="w-5 h-5" />
                                    </div>
                                    <div>
                                        <p className="text-sm font-bold text-slate-900 dark:text-white">Acesso ao Sistema</p>
                                        <p className="text-xs text-slate-500 dark:text-white/50">
                                            {user.ativo ? 'A conta está ativa e pode acessar.' : 'O acesso está bloqueado.'}
                                        </p>
                                    </div>
                                </div>
                                <button 
                                    onClick={() => onToggleStatus(user)}
                                    disabled={!isEditing}
                                    className={`
                                        relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-brand-500 focus:ring-offset-2
                                        ${user.ativo ? 'bg-green-500' : 'bg-slate-200 dark:bg-slate-700'}
                                        ${!isEditing ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
                                    `}
                                >
                                    <span className={`${user.ativo ? 'translate-x-6' : 'translate-x-1'} inline-block h-4 w-4 transform rounded-full bg-white transition-transform`} />
                                </button>
                            </div>

                            {/* Credentials Row */}
                            {onResetPassword && (
                                <div className="p-4 flex items-center justify-between hover:bg-slate-50 dark:hover:bg-white/5 transition-colors">
                                    <div className="flex items-center gap-4">
                                        <div className="p-2 rounded-xl bg-slate-100 text-slate-600 dark:bg-white/10 dark:text-white">
                                            <KeyRound className="w-5 h-5" />
                                        </div>
                                        <div>
                                            <p className="text-sm font-bold text-slate-900 dark:text-white">Credenciais</p>
                                            <p className="text-xs text-slate-500 dark:text-white/50">Redefinir senha para o padrão.</p>
                                        </div>
                                    </div>
                                    <button 
                                        onClick={() => onResetPassword(user)}
                                        disabled={!isEditing}
                                        className="px-4 py-2 rounded-xl text-xs font-bold bg-slate-100 text-slate-700 dark:bg-white/10 dark:text-white hover:bg-slate-200 dark:hover:bg-white/20 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                        Resetar
                                    </button>
                                </div>
                            )}
                        </div>
                        {!isEditing && <p className="text-[10px] text-slate-400 mt-3 text-center italic flex items-center justify-center gap-1"><AlertCircle className="w-3 h-3" /> Habilite a edição para alterar configurações de segurança.</p>}
                    </div>
                )}

            </div>

            {/* Footer Actions */}
            <div className="p-4 md:p-6 bg-slate-50 dark:bg-black/20 border-t border-slate-200 dark:border-white/10 flex justify-end gap-3">
                {isEditing ? (
                    <>
                        <button 
                            onClick={() => { 
                                if (isNewUser) {
                                    onClose();
                                } else {
                                    setIsEditing(false); 
                                    setNome(user.nome); 
                                    setPerfil(user.perfil); 
                                    setEmail(user.email); 
                                }
                            }}
                            className="px-5 py-2.5 rounded-xl text-sm font-bold text-slate-500 hover:bg-slate-200/50 transition-colors"
                        >
                            Cancelar
                        </button>
                        <button 
                            onClick={handleSave}
                            disabled={isLoading}
                            className="px-6 py-2.5 bg-brand-600 hover:bg-brand-500 text-white rounded-xl text-sm font-bold shadow-lg shadow-brand-500/20 flex items-center gap-2 disabled:opacity-70"
                        >
                            {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                            {isNewUser ? 'Criar Usuário' : 'Salvar Alterações'}
                        </button>
                    </>
                ) : (
                    <button 
                        onClick={() => setIsEditing(true)}
                        className="w-full md:w-auto px-6 py-2.5 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-xl text-sm font-bold shadow-lg flex items-center justify-center gap-2 hover:opacity-90 transition-opacity"
                    >
                        <Shield className="w-4 h-4" />
                        Editar Permissões
                    </button>
                )}
            </div>
        </div>
    </div>
  );
};

export default UserDetailsModal;
