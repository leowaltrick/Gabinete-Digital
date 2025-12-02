
export enum DemandLevel {
  MUNICIPAL = 'Municipal',
  ESTADUAL = 'Estadual',
  FEDERAL = 'Federal'
}

export enum DemandStatus {
  PENDING = 'Pendente',
  IN_PROGRESS = 'Em Andamento',
  COMPLETED = 'Concluído'
}

export enum DemandPriority {
  LOW = 'Baixa',
  MEDIUM = 'Média',
  HIGH = 'Alta'
}

export enum DemandType {
  SOLICITACAO = 'Solicitação',
  RECLAMACAO = 'Reclamação',
  ELOGIO = 'Elogio',
  DENUNCIA = 'Denúncia',
  SUGESTAO = 'Sugestão'
}

// Atualizado conforme ENUM do banco de dados
export type Role = 'administrador' | 'chefe_de_gabinete' | 'assessor';
export type ThemeMode = 'light' | 'dark' | 'auto';

export interface User {
  id: string;
  name: string;
  email: string;
  role: Role;
  avatar?: string;
  active?: boolean; // Adicionado para controle de acesso
}

// Configuração granular do Dashboard
export interface DashboardWidgetsConfig {
    // Cards de Topo
    showTotal: boolean;
    showCitizens: boolean;
    showPending: boolean;
    showInProgress: boolean;
    showCompleted: boolean;
    showHighPriority: boolean;
    
    // Gráficos
    showAnalytics: boolean; 
    showTags?: boolean; // Novo

    // Listas Laterais e Inferiores
    showUpcomingActivities: boolean; // Renomeado de showUpcomingDeadlines
    showRecentActivity: boolean;
    showQuickAccess?: boolean; // Adicionado para corrigir erro de tipo
}

export interface RoleConfig {
  allowedViews: ViewState[];
  dashboardWidgets: DashboardWidgetsConfig;
  canCreateDemand: boolean; // Nova permissão
  canCreateCitizen: boolean; // Nova permissão
}

export type SystemConfig = Record<Role, RoleConfig>;

export interface Citizen {
  id: string;
  cpf?: string; // Opcional
  name: string;
  email: string;
  phone: string;
  createdAt?: string;
  logradouro?: string;
  numero?: string;
  complemento?: string;
  bairro?: string;
  cep?: string;
  cidade?: string;
  estado?: string;
  lat?: number;
  lon?: number;
}

export interface Pessoa {
  id?: string; // UUID é mandatório na prática, mas opcional na criação local antes do save
  cpf?: string; // Opcional
  nome: string;
  sobrenome: string;
  email?: string | null;
  telefone?: string | null;
  logradouro: string;
  numero: string;
  complemento?: string | null;
  bairro: string;
  cep: string;
  cidade: string;
  estado: string;
  created_at?: string;
  lat?: number;
  lon?: number;
}

export interface Demand {
  id: string;
  title: string;
  description: string;
  level: DemandLevel;
  status: DemandStatus;
  priority: DemandPriority;
  type: DemandType; // Novo campo
  deadline: string; // ISO Date string
  citizenId: string;
  createdAt: string; // ISO Date string
  updatedAt?: string; // ISO Date string
  responsibleId?: string; // ID of the user responsible
  tags: string[];
  lat?: number;
  lon?: number;
}

export type InteractionType = 'comentario' | 'checklist';

export interface DemandInteraction {
  id: string;
  demandId: string;
  type: InteractionType;
  text: string;
  isCompleted?: boolean; // Apenas para checklist
  deadline?: string;     // Apenas para checklist
  user: string;
  createdAt: string;
}

export type DateFilterType = 'createdAt' | 'updatedAt' | 'deadline';

export interface FilterState {
  search: string;
  level: string[];      // Changed to array for multi-select
  priority: string[];   // Changed to array for multi-select
  status: string[];     // Changed to array for multi-select
  startDate: string;
  endDate: string;
  dateType: DateFilterType; // New field for advanced date filtering
  responsibleId?: string;   // New field for filtering by responsible user
  bairros?: string[];   // Added for consistency in demand filtering if needed
  tags?: string[]; // Added tags filter
  city?: string;
  groupBy?: 'demand' | 'citizen';
}

export type ViewState = 'dashboard' | 'new-demand' | 'edit-demand' | 'people' | 'admin_panel' | 'demands' | 'map';

export interface WeatherLocation {
  id?: string; // Optional ID for list management
  name: string;
  lat: number;
  lon: number;
}

export interface Notice {
  id: string;
  title: string;
  content: string;
  date: string; // ISO Date YYYY-MM-DD
  type: 'general' | 'alert' | 'event';
  createdAt: string;
}

export interface MapPoint {
  lat: number;
  lon: number;
  intensity: number;
}

// Interface para a View Materializada de Performance
export interface DashboardStats {
  total: number;
  pending: number;
  in_progress: number;
  completed: number;
  high_priority: number;
}
