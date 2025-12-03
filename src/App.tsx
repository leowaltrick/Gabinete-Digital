
import React, { useState, useMemo, useEffect, useCallback, Suspense, useRef } from 'react';
import { Database, AlertTriangle, Clock, CheckCircle2, Activity, FilePlus, Zap, TrendingUp, ArrowUpRight, Calendar, Filter, PieChart, BarChart2, ChevronDown, X, AlertCircle, MapPin, Loader2, LogOut, Sun, Moon, User as UserIcon, Wifi, WifiOff, CloudOff, Users, ArrowRight, Phone, Mail, UserPlus, BarChart3 } from 'lucide-react';
import Sidebar from '@/components/Sidebar';
import DemandForm from '@/components/DemandForm';
import DemandEdit from '@/components/DemandEdit';
import AuthScreen from '@/components/AuthScreen';
import DemandsView from '@/components/DemandsView';
import WeatherWidget from '@/components/WeatherWidget';
import MobileFastTrack from '@/components/MobileFastTrack';
import OnboardingTutorial from '@/components/OnboardingTutorial';
import { ViewState, Citizen, Demand, DemandLevel, DemandStatus, DemandPriority, User, FilterState, SystemConfig, DemandInteraction, WeatherLocation, DashboardWidgetsConfig, DemandType, ThemeMode, DashboardStats } from '@/types';
import { supabase, isSupabaseConfigured } from '@/services/supabaseClient';
import { formatDate, formatPhone } from '@/utils/cpfValidation';
import { useOfflineData } from '@/hooks/useOfflineData';
import StatCard from '@/components/StatCard';
import DashboardFilter from '@/components/DashboardFilter';
import SegmentedControl from '@/components/SegmentedControl';

// Lazy Load heavy components
const PeopleManager = React.lazy(() => import('@/components/PeopleManager'));
const AdminScreen = React.lazy(() => import('@/components/AdminScreen'));

const DEFAULT_SYSTEM_CONFIG: SystemConfig = {
    administrador: {
        allowedViews: ['dashboard', 'demands', 'new-demand', 'edit-demand', 'people', 'admin_panel', 'map'],
        dashboardWidgets: { showTotal: true, showCitizens: true, showPending: true, showInProgress: true, showCompleted: true, showHighPriority: true, showAnalytics: true, showTags: true, showUpcomingActivities: true, showRecentActivity: true, showQuickAccess: false },
        canCreateDemand: true,
        canCreateCitizen: true
    },
    chefe_de_gabinete: {
        allowedViews: ['dashboard', 'demands', 'new-demand', 'edit-demand', 'people', 'map', 'admin_panel'],
        dashboardWidgets: { showTotal: true, showCitizens: true, showPending: true, showInProgress: true, showCompleted: true, showHighPriority: true, showAnalytics: true, showTags: false, showUpcomingActivities: true, showRecentActivity: true, showQuickAccess: false },
        canCreateDemand: true,
        canCreateCitizen: true
    },
    assessor: {
        allowedViews: ['dashboard', 'demands', 'new-demand', 'edit-demand', 'people', 'map', 'admin_panel'],
        dashboardWidgets: { showTotal: true, showCitizens: false, showPending: true, showInProgress: true, showCompleted: false, showHighPriority: true, showAnalytics: false, showTags: false, showUpcomingActivities: true, showRecentActivity: true, showQuickAccess: false },
        canCreateDemand: true,
        canCreateCitizen: true
    }
};

const DistributionChart = React.memo(({ data, title }: { data: { label: string, value: number, color: string }[], title: string }) => {
    const total = data.reduce((a, b) => a + b.value, 0);
    let currentAngle = 0;

    if (total === 0) return <div className="h-full flex items-center justify-center text-xs text-slate-400">Sem dados</div>;

    return (
        <div className="flex items-center gap-6 h-full justify-center">
            <div className="relative w-32 h-32 shrink-0">
                <svg viewBox="0 0 100 100" className="transform -rotate-90 w-full h-full">
                    {data.map((slice, i) => {
                        const percentage = slice.value / total;
                        const radius = 40;
                        const circ = 2 * Math.PI * radius;
                        const strokeDasharray = `${percentage * circ} ${circ}`;
                        const strokeDashoffset = -currentAngle * (circ / 100);
                        
                        currentAngle += percentage * 100;

                        return (
                            <circle
                                key={i}
                                cx="50" cy="50" r={radius}
                                fill="transparent"
                                stroke={slice.color}
                                strokeWidth="12"
                                strokeDasharray={strokeDasharray}
                                strokeDashoffset={-(currentAngle - percentage * 100) / 100 * circ}
                                className="transition-all duration-1000 ease-out"
                            />
                        );
                    })}
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span className="text-xl font-bold text-slate-800 dark:text-white">{total}</span>
                    <span className="text-[9px] uppercase font-bold text-slate-400">Total</span>
                </div>
            </div>
            <div className="flex flex-col gap-2">
                {data.map((d, i) => (
                    <div key={i} className="flex items-center justify-between text-xs gap-4">
                        <div className="flex items-center gap-2">
                            <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: d.color }}></span>
                            <span className="font-medium text-slate-600 dark:text-white/80">{d.label}</span>
                        </div>
                        <span className="font-bold text-slate-800 dark:text-white">{Math.round((d.value / total) * 100)}%</span>
                    </div>
                ))}
            </div>
        </div>
    );
});

const SimpleBarChart = React.memo(({ data, unit = '' }: { data: { label: string, value: number }[], unit?: string }) => {
    const max = Math.max(...data.map(d => d.value), 1);
    if(data.length === 0) return <div className="h-full flex items-center justify-center text-xs text-slate-400">Sem dados geográficos</div>;

    return (
        <div className="h-full w-full flex items-end justify-between gap-2 px-2 pb-2 pt-4">
            {data.slice(0, 7).map((item, i) => {
                const heightPct = (item.value / max) * 100;
                return (
                    <div key={i} className="flex-1 flex flex-col items-center gap-1 group h-full justify-end">
                        <div className="text-[10px] font-bold text-slate-600 dark:text-slate-300 mb-0.5">{item.value}{unit}</div>
                        <div 
                            style={{ height: `${heightPct}%` }} 
                            className="w-full bg-brand-200 dark:bg-brand-500/30 rounded-t-sm group-hover:bg-brand-50 dark:group-hover:bg-brand-500 transition-colors min-h-[4px]"
                        />
                        <div className="text-[9px] text-slate-400 truncate w-full text-center" title={item.label}>
                            {item.label.slice(0, 6)}
                        </div>
                    </div>
                )
            })}
        </div>
    )
});

const App: React.FC = () => {
    const [currentUser, setCurrentUser] = useState<User | null>(() => {
        if (typeof window !== 'undefined') {
            const saved = localStorage.getItem('geo_user');
            return saved ? JSON.parse(saved) : null;
        }
        return null;
    });

    const [view, setView] = useState<ViewState | 'fast-track'>('dashboard');
    const [isMobileNavVisible, setIsMobileNavVisible] = useState(true);
    const lastScrollY = useRef(0);
    const mainScrollRef = useRef<HTMLDivElement>(null);
    
    // Add people manager mode state to track if we are in form or list view
    const [peopleManagerMode, setPeopleManagerMode] = useState<'list' | 'details' | 'form'>('list');

    // Theme State
    const [themeMode, setThemeMode] = useState<ThemeMode>(() => {
        if (typeof window !== 'undefined') {
            const saved = localStorage.getItem('geo_theme_pref');
            return (saved as ThemeMode) || 'auto';
        }
        return 'auto';
    });
    const [isDarkMode, setIsDarkMode] = useState(false); 

    // Filters State
    const [dashStatus, setDashStatus] = useState('all');
    const [dashPriority, setDashPriority] = useState('all');
    const [dashTimeRange, setDashTimeRange] = useState('30'); 
    const [dashboardScope, setDashboardScope] = useState<'demands' | 'citizens'>('demands');
    
    // Dashboard Tabs
    const [infoBlockTab, setInfoBlockTab] = useState<'activity' | 'upcoming'>('activity');

    const [systemConfig, setSystemConfig] = useState<SystemConfig>(DEFAULT_SYSTEM_CONFIG);
    const [filters, setFilters] = useState<FilterState>({
        search: '', level: [], priority: [], status: [], startDate: '', endDate: '', dateType: 'createdAt', tags: [], responsibleId: undefined
    });

    const [editingDemand, setEditingDemand] = useState<Demand | null>(null);
    const [selectedCitizenId, setSelectedCitizenId] = useState<string | null>(null);
    const [selectedDemandId, setSelectedDemandId] = useState<string | null>(null);
    
    // NEW STATE: Map Focus for Citizen Navigation
    const [mapFocus, setMapFocus] = useState<{lat: number, lon: number} | null>(null);
    const [initialMapViewMode, setInitialMapViewMode] = useState<'demands' | 'citizens'>('demands');

    const [notification, setNotification] = useState<{type: 'success' | 'error', message: string} | null>(null);
    const [initialDemandView, setInitialDemandView] = useState<'list' | 'board' | 'calendar' | 'map'>('list');
    
    // Onboarding State
    const [showOnboarding, setShowOnboarding] = useState(false);

    // Use Custom Hook for Data
    const { 
        demands, setDemands, 
        citizens, setCitizens, 
        users, interactions, weatherLocations, setWeatherLocations, 
        dbStats, isOnline, isLoading: isDataLoading, themePreference, fetchData, processOfflineQueue, syncCount 
    } = useOfflineData(currentUser);

    // Check for onboarding on load/login
    useEffect(() => {
        if (currentUser && currentUser.firstLogin) {
            const hasSeenOnboarding = localStorage.getItem('geo_onboarding_completed');
            if (!hasSeenOnboarding) {
                setShowOnboarding(true);
            }
        }
    }, [currentUser]);

    // Sync Theme from DB if available
    useEffect(() => {
        if (themePreference) setThemeMode(themePreference);
    }, [themePreference]);

    // 1. MAIN FILTER LOGIC
    const filteredDemands = useMemo(() => {
        let startTimestamp: number | null = null;
        let endTimestamp: number | null = null;

        if (filters.startDate) {
            const start = new Date(filters.startDate + 'T00:00:00');
            startTimestamp = start.getTime();

            if (filters.endDate) {
                const end = new Date(filters.endDate + 'T23:59:59.999');
                endTimestamp = end.getTime();
            } else {
                const end = new Date(filters.startDate + 'T23:59:59.999');
                endTimestamp = end.getTime();
            }
        }

        const searchLower = filters.search.toLowerCase();
        
        return demands.filter(d => {
            // Search
            if (filters.search) {
                const matchesId = d.id.toLowerCase().includes(searchLower);
                const matchesTitle = d.title.toLowerCase().includes(searchLower);
                const matchesDesc = d.description.toLowerCase().includes(searchLower);
                if (!matchesId && !matchesTitle && !matchesDesc) return false;
            }

            // Exact Matches
            if (filters.status.length > 0 && !filters.status.includes(d.status)) return false;
            if (filters.priority.length > 0 && !filters.priority.includes(d.priority)) return false;
            if (filters.level.length > 0 && !filters.level.includes(d.level)) return false;
            if (filters.responsibleId && d.responsibleId !== filters.responsibleId) return false;

            // Tags
            if (filters.tags && filters.tags.length > 0) {
                if (!d.tags || !filters.tags.some(t => d.tags.includes(t))) return false;
            }

            // Date Filter
            if (startTimestamp !== null && endTimestamp !== null) {
                let dateToCompare: string | undefined;
                if (filters.dateType === 'deadline') dateToCompare = d.deadline;
                else if (filters.dateType === 'updatedAt') dateToCompare = d.updatedAt;
                else dateToCompare = d.createdAt;

                if (!dateToCompare) return false;

                let timeToCompare: number;
                if (/^\d{4}-\d{2}-\d{2}$/.test(dateToCompare)) {
                     const [cy, cm, cd] = dateToCompare.split('-').map(Number);
                     timeToCompare = new Date(cy, cm - 1, cd, 12, 0, 0).getTime();
                } else {
                     timeToCompare = new Date(dateToCompare).getTime();
                }

                if (timeToCompare < startTimestamp || timeToCompare > endTimestamp) return false;
            }

            return true;
        });
    }, [demands, filters]);

    // 2. CITIZEN FILTER LOGIC
    const filteredCitizens = useMemo(() => {
        const searchLower = filters.search.toLowerCase();
        if (!filters.search) return citizens;

        return citizens.filter(c => {
            const matchesId = c.id.toLowerCase() === searchLower; // Exact match for ID navigation
            const matchesName = c.name.toLowerCase().includes(searchLower);
            const matchesEmail = c.email?.toLowerCase().includes(searchLower);
            const matchesPhone = c.phone?.includes(searchLower);
            return matchesId || matchesName || matchesEmail || matchesPhone;
        });
    }, [citizens, filters.search]);

    // 3. MAP MARKERS
    const precalculatedMapMarkers = useMemo(() => {
        const markers: any[] = [];
        if (filteredDemands.length > 0) {
             filteredDemands.forEach(d => {
                 if (d.lat && d.lon) markers.push({ id: d.id, type: 'demand', lat: d.lat, lon: d.lon, title: d.title, status: d.status, priority: d.priority });
             });
        }
        if (filteredCitizens.length > 0) {
             filteredCitizens.forEach(c => {
                 if (c.lat && c.lon) markers.push({ id: c.id, type: 'citizen', lat: c.lat, lon: c.lon, name: c.name, bairro: c.bairro });
             });
        }
        return markers;
    }, [filteredDemands, filteredCitizens]);

    // Handle Map Navigation (Safe Prop Passing)
    const handleMapFocus = useCallback((lat: number, lon: number, type: 'demands' | 'citizens', id?: string) => {
        // 1. Clear any open modals to prevent "breaking"
        setSelectedDemandId(null);
        setSelectedCitizenId(null);
        setEditingDemand(null);
        setIsMobileNavVisible(true);

        // 2. Clear filters to ensure marker is visible, BUT set search if ID is present to isolate the item
        setFilters({
            search: id || '', 
            level: [], priority: [], status: [], startDate: '', endDate: '', dateType: 'createdAt', tags: [], responsibleId: undefined
        });
        setDashTimeRange('all');

        // 3. Set Map State
        setMapFocus({ lat, lon });
        setInitialMapViewMode(type);
        
        // 4. Switch View
        setView('map');
    }, []);

    // Global Event Listener for Map Navigation (Fixes Prop Drilling)
    useEffect(() => {
        const handleMapNav = (e: CustomEvent) => {
            const { lat, lon, type, id, demandId, citizenId } = e.detail || {};
            
            // Normalize ID and Type from older event structures or the new one
            const targetId = id || demandId || citizenId;
            const targetType = type || (citizenId ? 'citizens' : 'demands');

            if (lat && lon) {
                // Full navigation with coords
                handleMapFocus(lat, lon, targetType, targetId);
            } else if (targetId && targetType === 'demands') {
                // Fallback for ID only (filters but no zoom if no coords)
                setSelectedDemandId(targetId);
                setView('map');
            }
        };
        
        window.addEventListener('navigate-to-map' as any, handleMapNav);
        return () => window.removeEventListener('navigate-to-map' as any, handleMapNav);
    }, [handleMapFocus]);

    // Notification for Sync
    useEffect(() => {
        if (syncCount > 0) {
            showNotification('success', `${syncCount} itens sincronizados.`);
        }
    }, [syncCount]);

    // RESET SCROLL ON NAVIGATE
    useEffect(() => {
        setIsMobileNavVisible(true);
        if (mainScrollRef.current) {
            mainScrollRef.current.scrollTo(0, 0);
        }
    }, [view]);

    // Scroll Handler for Mobile Nav
    const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
        const currentScrollY = e.currentTarget.scrollTop;
        if (Math.abs(currentScrollY - lastScrollY.current) > 5) { 
            if (currentScrollY > lastScrollY.current && currentScrollY > 50) {
                setIsMobileNavVisible(false); // Hide on scroll down
            } else {
                setIsMobileNavVisible(true); // Show on scroll up
            }
            lastScrollY.current = currentScrollY;
        }
    };

    // Theme Logic
    useEffect(() => {
        const applyTheme = () => {
            let activeDark = false;
            if (themeMode === 'dark') {
                activeDark = true;
            } else if (themeMode === 'light') {
                activeDark = false;
            } else {
                const hour = new Date().getHours();
                activeDark = hour < 6 || hour >= 18;
            }
            setIsDarkMode(activeDark);
            if (activeDark) document.documentElement.classList.add('dark');
            else document.documentElement.classList.remove('dark');
        };
        applyTheme();
        const interval = setInterval(applyTheme, 60000);
        return () => clearInterval(interval);
    }, [themeMode]);

    const showNotification = useCallback((type: 'success' | 'error', message: string) => {
        setNotification({ type, message });
        setTimeout(() => setNotification(null), 4000);
    }, []);

    const handleLogin = (user: User) => {
        setCurrentUser(user);
        setView('dashboard'); // Force view reset to Dashboard
    };

    const handleLogout = () => { 
        setCurrentUser(null); 
        localStorage.removeItem('geo_user');
        setDemands([]); 
        setView('dashboard'); // Reset view for next login
    };

    const handleThemeToggle = () => {
        const newMode = isDarkMode ? 'light' : 'dark';
        setThemeMode(newMode);
        localStorage.setItem('geo_theme_pref', newMode);
    };

    const handleViewCitizen = (cpf: string) => {
        setSelectedCitizenId(cpf);
        setView('people');
    };

    const handleSidebarNavigation = (newView: ViewState) => {
        setSelectedCitizenId(null);
        setEditingDemand(null);
        setSelectedDemandId(null);
        setMapFocus(null);
        setInitialMapViewMode('demands');
        setFilters({
            search: '', level: [], priority: [], status: [], startDate: '', endDate: '', dateType: 'createdAt', tags: [], responsibleId: undefined
        });
        setView(newView);
    };

    const handleStatusUpdate = async (demandId: string, newStatus: DemandStatus) => {
        const demand = demands.find(d => d.id === demandId);
        const oldStatus = demand?.status;
        if (!demand || oldStatus === newStatus) return;

        // Optimistic Update
        setDemands(prev => prev.map(d => d.id === demandId ? { ...d, status: newStatus } : d)); 
        
        if(isSupabaseConfigured() && supabase) { 
            try {
                // 1. Update Demand
                const { error: demandError } = await supabase
                    .from('demands')
                    .update({ status: newStatus })
                    .eq('id', demandId); 
                
                if (demandError) throw demandError;

                // 2. Insert Interaction History
                const currentUser = JSON.parse(localStorage.getItem('geo_user') || '{}');
                const { error: interactionError } = await supabase.from('demand_interactions').insert({
                    demanda_id: demandId,
                    tipo: 'status_change',
                    texto: `Status alterado de "${oldStatus}" para "${newStatus}"`,
                    usuario: currentUser.name || 'Sistema',
                    created_at: new Date().toISOString()
                });

                if (interactionError) throw interactionError;

                // 3. Refresh Data to ensure sync
                fetchData();
                showNotification('success', 'Status atualizado com sucesso!'); 

            } catch (err: any) {
                console.error("Error updating status:", err);
                showNotification('error', 'Erro ao atualizar status: ' + err.message);
                // Revert on error
                setDemands(prev => prev.map(d => d.id === demandId ? { ...d, status: oldStatus as DemandStatus } : d)); 
            }
        }
    };

    const getTimeCutoff = () => {
        const now = new Date();
        const cutoffDate = new Date();
        if (dashTimeRange !== 'all') {
            const days = parseInt(dashTimeRange);
            if (days === 365) {
                cutoffDate.setMonth(0, 1); 
                cutoffDate.setHours(0,0,0,0);
            } else {
                cutoffDate.setDate(now.getDate() - days);
            }
        } else {
            cutoffDate.setFullYear(1970);
        }
        return cutoffDate;
    };

    const dashboardFilteredDemands = useMemo(() => {
        const cutoffDate = getTimeCutoff();
        return demands.filter(d => {
            const dDate = new Date(d.createdAt);
            const matchesTime = dDate >= cutoffDate;
            const matchesStatus = dashStatus === 'all' || d.status === dashStatus;
            const matchesPriority = dashPriority === 'all' || d.priority === dashPriority;
            return matchesTime && matchesStatus && matchesPriority;
        });
    }, [demands, dashStatus, dashPriority, dashTimeRange]);

    const dashboardFilteredCitizens = useMemo(() => {
        const cutoffDate = getTimeCutoff();
        return citizens.filter(c => {
            if (!c.createdAt) return true;
            const cDate = new Date(c.createdAt);
            return cDate >= cutoffDate;
        });
    }, [citizens, dashTimeRange]);

    const kpiStats = useMemo(() => {
        if (dashboardScope === 'demands') {
            const total = dashboardFilteredDemands.length;
            let pending = 0; let completed = 0; let highPriority = 0;
            for(const d of dashboardFilteredDemands) {
                if (d.status === DemandStatus.PENDING) pending++;
                else if (d.status === DemandStatus.COMPLETED) completed++;
                if (d.priority === DemandPriority.HIGH) highPriority++;
            }
            return {
                stat1: { label: 'Filtradas', value: total, icon: Database, color: 'bg-blue-500', text: 'text-blue-600 dark:text-blue-400' },
                stat2: { label: 'Pendentes', value: pending, icon: Clock, color: 'bg-slate-500', text: 'text-slate-600 dark:text-slate-400' },
                stat3: { label: 'Concluídos', value: completed, icon: CheckCircle2, color: 'bg-green-500', text: 'text-green-600 dark:text-green-400' },
                stat4: { label: 'Alta Prioridade', value: highPriority, icon: AlertCircle, color: 'bg-red-500', text: 'text-red-600 dark:text-red-400' }
            };
        } else {
            const total = citizens.length;
            const today = new Date().toDateString();
            const newToday = citizens.filter(c => c.createdAt && new Date(c.createdAt).toDateString() === today).length;
            const neighborhoodCounts: Record<string, number> = {};
            for(const c of citizens) { if(c.bairro) neighborhoodCounts[c.bairro] = (neighborhoodCounts[c.bairro] || 0) + 1; }
            const topNeighborhood = Object.entries(neighborhoodCounts).sort((a,b) => b[1] - a[1])[0];
            return {
                stat1: { label: 'Total Cidadãos', value: total, icon: Users, color: 'bg-blue-500', text: 'text-blue-600 dark:text-blue-400' },
                stat2: { label: 'Novos Hoje', value: newToday, icon: UserPlus, color: 'bg-green-500', text: 'text-green-600 dark:text-green-400' },
                stat3: { label: 'Top Bairro', value: topNeighborhood ? topNeighborhood[0] : 'N/A', icon: MapPin, color: 'bg-brand-500', text: 'text-brand-600 dark:text-brand-400' },
                stat4: { label: 'Cadastros (Bairro)', value: topNeighborhood ? topNeighborhood[1] : 0, icon: BarChart3, color: 'bg-purple-500', text: 'text-purple-600 dark:text-purple-400' }
            };
        }
    }, [dashboardFilteredDemands, dashboardFilteredCitizens, citizens, dashboardScope]);

    const statusDistribution = useMemo(() => {
        if (dashboardScope === 'demands') {
            const counts = { [DemandStatus.PENDING]: 0, [DemandStatus.IN_PROGRESS]: 0, [DemandStatus.COMPLETED]: 0 };
            dashboardFilteredDemands.forEach(d => { if(counts[d.status] !== undefined) counts[d.status]++; });
            return [ { label: 'Pendente', value: counts[DemandStatus.PENDING], color: '#64748b' }, { label: 'Em Andamento', value: counts[DemandStatus.IN_PROGRESS], color: '#f59e0b' }, { label: 'Concluído', value: counts[DemandStatus.COMPLETED], color: '#10b981' } ].filter(d => d.value > 0);
        } else {
            const groups: Record<string, number> = {};
            dashboardFilteredCitizens.forEach(c => {
                const d = c.createdAt ? new Date(c.createdAt) : new Date();
                const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
                groups[key] = (groups[key] || 0) + 1;
            });
            const sortedKeys = Object.keys(groups).sort().reverse();
            const colors = ['#0ea5e9', '#6366f1', '#8b5cf6', '#ec4899', '#64748b'];
            const data = sortedKeys.slice(0, 4).map((key, index) => {
                const [y, m] = key.split('-');
                const date = new Date(parseInt(y), parseInt(m) - 1);
                const label = date.toLocaleString('pt-BR', { month: 'short', year: '2-digit' });
                return { label: label.charAt(0).toUpperCase() + label.slice(1), value: groups[key], color: colors[index % colors.length] };
            });
            const othersCount = sortedKeys.slice(4).reduce((acc, k) => acc + groups[k], 0);
            if (othersCount > 0) data.push({ label: 'Antigos', value: othersCount, color: '#94a3b8' });
            return data;
        }
    }, [dashboardFilteredDemands, dashboardFilteredCitizens, dashboardScope]);

    const neighborhoodStats = useMemo(() => {
        const counts: Record<string, number> = {};
        if (dashboardScope === 'demands') {
            dashboardFilteredDemands.forEach(d => { const citizen = citizens.find(c => c.id === d.citizenId); if (citizen && citizen.bairro) counts[citizen.bairro] = (counts[citizen.bairro] || 0) + 1; });
        } else {
            dashboardFilteredCitizens.forEach(c => { if (c.bairro) counts[c.bairro] = (counts[c.bairro] || 0) + 1; });
        }
        return Object.entries(counts).sort((a,b) => b[1] - a[1]).slice(0, 7).map(([label, value]) => ({ label, value }));
    }, [dashboardFilteredDemands, dashboardFilteredCitizens, citizens, dashboardScope]);

    const recentDemands = useMemo(() => {
        return [...dashboardFilteredDemands].sort((a,b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()).slice(0, 5);
    }, [dashboardFilteredDemands]);

    const recentCitizens = useMemo(() => {
        return [...dashboardFilteredCitizens].sort((a,b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime()).slice(0, 5);
    }, [dashboardFilteredCitizens]);

    const upcomingDeadlines = useMemo(() => {
        const now = new Date(); now.setHours(0,0,0,0);
        return dashboardFilteredDemands.filter(d => d.deadline && d.status !== DemandStatus.COMPLETED).map(d => ({ ...d, date: new Date(d.deadline!) })).filter(d => d.date >= now).sort((a,b) => a.date.getTime() - b.date.getTime()).slice(0, 5);
    }, [dashboardFilteredDemands]);

    const currentRoleConfig = currentUser ? (systemConfig[currentUser.role] || DEFAULT_SYSTEM_CONFIG['assessor']) : DEFAULT_SYSTEM_CONFIG['administrador']; 

    // Render components helper
    const renderRecentActivity = () => ( <div className="space-y-2"> {dashboardScope === 'demands' ? ( recentDemands.length === 0 ? <div className="h-32 flex flex-col items-center justify-center text-slate-400 text-xs italic"><FilePlus className="w-6 h-6 mb-2 opacity-20" />Sem dados</div> : recentDemands.map(d => ( <div key={d.id} onClick={() => { if(currentUser) { setSelectedDemandId(d.id); setView('demands'); }}} className="flex gap-3 p-2.5 bg-white dark:bg-white/5 rounded-xl border border-slate-100 dark:border-white/5 hover:border-brand-200 transition-all cursor-pointer group"> <div className="w-10 h-10 rounded-lg bg-brand-50 dark:bg-brand-500/10 flex flex-col items-center justify-center text-brand-600 dark:text-brand-400 font-bold shrink-0 border border-brand-100 dark:border-brand-500/20"> <span className="text-xs">{new Date(d.createdAt).getDate()}</span> <span className="text-[8px] uppercase">{new Date(d.createdAt).toLocaleString('default', { month: 'short' }).slice(0,3)}</span> </div> <div className="flex-1 min-w-0"> <div className="flex justify-between items-start"> <h4 className="text-xs font-bold text-slate-800 dark:text-white truncate group-hover:text-brand-600">{d.title}</h4> <span className={`shrink-0 text-[9px] font-bold px-1.5 py-0.5 rounded-md ${d.status === 'Concluído' ? 'bg-green-100 text-green-700 dark:bg-green-500/20 dark:text-green-300' : d.status === 'Em Andamento' ? 'bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-300' : 'bg-slate-100 text-slate-600 dark:bg-white/10 dark:text-slate-300'}`}> {d.status} </span> </div> <p className="text-[10px] text-slate-500 mt-0.5 line-clamp-1">{d.description}</p> </div> </div> )) ) : ( recentCitizens.length === 0 ? <div className="h-32 flex flex-col items-center justify-center text-slate-400 text-xs italic"><Users className="w-6 h-6 mb-2 opacity-20" />Sem dados</div> : recentCitizens.map(c => ( <div key={c.id} onClick={() => { handleViewCitizen(c.id); }} className="flex gap-3 p-2.5 bg-white dark:bg-white/5 rounded-xl border border-slate-100 dark:border-white/5 hover:border-brand-200 transition-all cursor-pointer group"> <div className="w-10 h-10 rounded-lg bg-blue-50 dark:bg-blue-500/10 flex flex-col items-center justify-center text-blue-600 dark:text-blue-400 font-bold shrink-0 border border-blue-100 dark:border-blue-500/20"> <span className="text-xs">{new Date(c.createdAt || Date.now()).getDate()}</span> <span className="text-[8px] uppercase">{new Date(c.createdAt || Date.now()).toLocaleString('default', { month: 'short' }).slice(0,3)}</span> </div> <div className="flex-1 min-w-0"> <div className="flex justify-between items-start"> <h4 className="text-xs font-bold text-slate-800 dark:text-white truncate group-hover:text-brand-600">{c.name}</h4> <span className="shrink-0 text-[9px] font-bold px-1.5 py-0.5 rounded-md bg-slate-100 text-slate-600 dark:bg-white/10 dark:text-slate-300"> {c.phone ? formatPhone(c.phone) : 'Sem Tel'} </span> </div> <p className="text-[10px] text-slate-500 mt-0.5 line-clamp-1 flex items-center gap-1"> {c.bairro && <><MapPin className="w-2.5 h-2.5" /> {c.bairro}</>} </p> </div> </div> )) )} </div> );
    const renderUpcoming = () => ( <div className="space-y-2"> {dashboardScope === 'demands' ? ( upcomingDeadlines.length === 0 ? <div className="h-32 flex flex-col items-center justify-center text-slate-400 text-xs italic"><CheckCircle2 className="w-6 h-6 mb-2 opacity-20" />Tudo em dia!</div> : upcomingDeadlines.map(d => { const daysLeft = Math.ceil((d.date.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)); return ( <div key={d.id} onClick={() => { if(currentUser) { setSelectedDemandId(d.id); setView('demands'); }}} className="flex gap-3 p-2.5 bg-white dark:bg-white/5 rounded-xl border border-slate-100 dark:border-white/5 hover:border-brand-200 transition-all cursor-pointer group"> <div className="w-10 h-10 rounded-lg bg-amber-50 dark:bg-amber-500/10 flex flex-col items-center justify-center text-amber-600 dark:text-amber-400 font-bold shrink-0 border border-amber-100 dark:border-amber-500/20"> <span className="text-xs">{d.date.getDate()}</span> <span className="text-[8px] uppercase">{d.date.toLocaleString('default', { month: 'short' }).slice(0,3)}</span> </div> <div className="flex-1 min-w-0"> <div className="flex justify-between items-start"> <h4 className="text-xs font-bold text-slate-800 dark:text-white truncate group-hover:text-brand-600">{d.title}</h4> <span className={`shrink-0 text-[9px] font-bold px-1.5 py-0.5 rounded-md ${daysLeft <= 2 ? 'bg-red-100 text-red-600 dark:bg-red-500/20' : 'bg-slate-100 text-slate-600 dark:bg-white/10'}`}>{daysLeft < 0 ? 'Exp.' : `${daysLeft}d`}</span> </div> <p className="text-[10px] text-slate-500 mt-0.5 line-clamp-1">{d.description}</p> </div> </div> ); }) ) : ( neighborhoodStats.length === 0 ? <div className="h-32 flex flex-col items-center justify-center text-slate-400 text-xs italic"><MapPin className="w-6 h-6 mb-2 opacity-20" />Sem dados</div> : neighborhoodStats.slice(0,5).map((n, i) => ( <div key={i} className="flex justify-between items-center p-3 bg-white dark:bg-white/5 rounded-xl border border-slate-100 dark:border-white/5"> <div className="flex items-center gap-3"> <span className="text-xs font-bold text-slate-400 w-4">{i + 1}</span> <span className="text-xs font-bold text-slate-700 dark:text-white">{n.label}</span> </div> <span className="text-[10px] font-bold bg-purple-100 text-purple-600 dark:bg-purple-500/20 dark:text-purple-300 px-2 py-1 rounded-full">{n.value}</span> </div> )) )} </div> );

    return (
        <div className={`flex h-screen bg-slate-50 dark:bg-[#020617] transition-colors duration-500 overflow-hidden ${isDarkMode ? 'dark' : ''}`}>
             
             {/* LOGIN OVERLAY */}
             {!currentUser && (
                 <div className="absolute inset-0 z-[100]">
                    <AuthScreen onLogin={handleLogin} />
                 </div>
             )}

             {/* ONBOARDING OVERLAY */}
             {showOnboarding && currentUser && (
                 <OnboardingTutorial onFinish={() => setShowOnboarding(false)} />
             )}

             {/* DASHBOARD ROOT - Always rendered (Blurred if logged out) */}
             <div className={`dashboard-root flex h-full w-full transition-all duration-700 ease-in-out ${!currentUser ? 'blur-[5px] scale-[1.02] pointer-events-none grayscale-[0.2]' : 'filter-none scale-100 opacity-100'}`}>
                
                <Sidebar 
                    currentView={view === 'fast-track' ? 'demands' : view} 
                    setView={handleSidebarNavigation} 
                    user={currentUser} 
                    onLogout={handleLogout} 
                    toggleTheme={handleThemeToggle} 
                    isDarkMode={isDarkMode} 
                    systemConfig={systemConfig} 
                    showMobileDock={isMobileNavVisible}
                />
                
                {/* Main Content Area - Applied Glass Style to Container */}
                <main className={`flex-1 flex flex-col min-w-0 transition-all duration-300 relative lg:my-4 lg:mr-4 lg:ml-4`}>
                    
                    {/* Offline Banner */}
                    {!isOnline && (
                        <div className="absolute top-0 left-0 right-0 z-[1000] bg-amber-500/90 backdrop-blur-sm text-white text-xs font-bold text-center py-1.5 flex items-center justify-center gap-2 lg:rounded-t-[2.5rem]">
                            <WifiOff className="w-3 h-3" /> Modo Offline. As alterações serão salvas localmente.
                        </div>
                    )}

                    {/* MAIN CONTENT GLASS CONTAINER */}
                    <div className="flex-1 relative overflow-hidden flex flex-col glass-container rounded-[2.5rem]">
                        
                        {notification && <div className={`fixed top-6 right-6 z-[1000] px-4 py-3 rounded-xl shadow-2xl border flex items-center gap-3 animate-in slide-in-from-right duration-300 ${notification.type === 'success' ? 'bg-green-500 text-white border-green-600' : 'bg-red-500 text-white border-red-600'}`}>{notification.type === 'success' ? <CheckCircle2 className="w-5 h-5" /> : <AlertTriangle className="w-5 h-5" />}<span className="font-bold text-sm">{notification.message}</span></div>}

                        <Suspense fallback={<div className="flex items-center justify-center h-full"><Loader2 className="w-8 h-8 animate-spin text-brand-500"/></div>}>
                            
                            {/* SCROLLABLE VIEW - Now handles map too */}
                            {['dashboard', 'new-demand', 'edit-demand', 'admin_panel', 'demands', 'people', 'map'].includes(view) && (
                                <div 
                                    className="absolute inset-0 overflow-y-auto custom-scrollbar p-4 lg:p-6 pb-32 lg:pb-6"
                                    onScroll={handleScroll}
                                    ref={mainScrollRef}
                                >
                                    {/* Mobile Spacer */}
                                    <div className="lg:hidden h-2 w-full"></div>

                                    {view === 'dashboard' && (
                                        <div className="flex flex-col gap-6 max-w-[1600px] mx-auto w-full">
                                            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 shrink-0">
                                                <div><h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white">Olá, {currentUser ? currentUser.name.split(' ')[0] : 'Bem-vindo'}</h1></div>
                                                <WeatherWidget locations={weatherLocations} />
                                            </div>
                                            
                                            <DashboardFilter 
                                                status={dashStatus} setStatus={setDashStatus} 
                                                priority={dashPriority} setPriority={setDashPriority} 
                                                timeRange={dashTimeRange} setTimeRange={setDashTimeRange} 
                                                scope={dashboardScope} setScope={setDashboardScope}
                                                className="sticky top-0 z-30" 
                                            />
                                            
                                            {/* KPI CARDS - Added Loading Prop */}
                                            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 shrink-0">
                                                <StatCard isLoading={isDataLoading} title={kpiStats.stat1.label} value={typeof kpiStats.stat1.value === 'string' ? 0 : kpiStats.stat1.value} subValue={typeof kpiStats.stat1.value === 'string' ? kpiStats.stat1.value : undefined} icon={kpiStats.stat1.icon} colorClass={kpiStats.stat1.color} textClass={kpiStats.stat1.text} />
                                                <StatCard isLoading={isDataLoading} title={kpiStats.stat2.label} value={typeof kpiStats.stat2.value === 'string' ? 0 : kpiStats.stat2.value} subValue={typeof kpiStats.stat2.value === 'string' ? kpiStats.stat2.value : undefined} icon={kpiStats.stat2.icon} colorClass={kpiStats.stat2.color} textClass={kpiStats.stat2.text} />
                                                <StatCard isLoading={isDataLoading} title={kpiStats.stat3.label} value={typeof kpiStats.stat3.value === 'string' ? 0 : kpiStats.stat3.value} subValue={typeof kpiStats.stat3.value === 'string' ? kpiStats.stat3.value : undefined} icon={kpiStats.stat3.icon} colorClass={kpiStats.stat3.color} textClass={kpiStats.stat3.text} />
                                                <StatCard isLoading={isDataLoading} title={kpiStats.stat4.label} value={typeof kpiStats.stat4.value === 'string' ? 0 : kpiStats.stat4.value} subValue={typeof kpiStats.stat4.value === 'string' ? kpiStats.stat4.value : undefined} icon={kpiStats.stat4.icon} colorClass={kpiStats.stat4.color} textClass={kpiStats.stat4.text} />
                                            </div>
                                            
                                            {currentRoleConfig.dashboardWidgets.showAnalytics && (
                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 h-auto shrink-0">
                                                    <div className="glass-panel p-5 rounded-2xl flex flex-col min-h-[250px] border border-slate-200 dark:border-white/10">
                                                        <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 flex items-center gap-2">
                                                            <PieChart className="w-3 h-3" /> {dashboardScope === 'demands' ? 'Distribuição por Status' : 'Cadastros por Mês'}
                                                        </h3>
                                                        <div className="flex-1 min-h-0">
                                                            <DistributionChart 
                                                                data={statusDistribution} 
                                                                title={dashboardScope === 'demands' ? 'Demandas' : 'Cidadãos'}
                                                            />
                                                        </div>
                                                    </div>
                                                    <div className="glass-panel p-5 rounded-2xl flex flex-col min-h-[250px] border border-slate-200 dark:border-white/10">
                                                        <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 flex items-center gap-2">
                                                            <MapPin className="w-3 h-3" /> {dashboardScope === 'demands' ? 'Top Bairros (Demandas)' : 'Top Bairros (Residentes)'}
                                                        </h3>
                                                        <div className="flex-1 min-h-0">
                                                            <SimpleBarChart data={neighborhoodStats} />
                                                        </div>
                                                    </div>
                                                </div>
                                            )}
                                            
                                            {/* SPLIT LAYOUT FOR LISTS */}
                                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 min-h-0">
                                                <div className={`glass-panel p-5 rounded-2xl flex flex-col h-full min-h-[300px] border border-slate-200 dark:border-white/10 ${infoBlockTab !== 'activity' ? 'hidden lg:flex' : 'flex'}`}>
                                                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 gap-3">
                                                        <div className="w-full lg:hidden">
                                                            <SegmentedControl value={infoBlockTab} onChange={(val) => setInfoBlockTab(val as any)} options={[{ value: 'activity', label: 'Atividade Recente', icon: Activity }, { value: 'upcoming', label: 'Próx. Prazos', icon: ArrowUpRight }]} />
                                                        </div>
                                                        <h3 className="hidden lg:flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-slate-500 dark:text-white/60">
                                                            <Activity className="w-4 h-4" /> Atividades Recentes
                                                        </h3>
                                                        <button onClick={() => setView(dashboardScope === 'demands' ? 'demands' : 'people')} className="text-xs font-bold text-brand-600 hover:text-brand-700 flex items-center gap-1">Ver Todos <ArrowRight className="w-3 h-3" /></button>
                                                    </div>
                                                    {renderRecentActivity()}
                                                </div>
                                                <div className={`glass-panel p-5 rounded-2xl flex flex-col h-full min-h-[300px] border border-slate-200 dark:border-white/10 ${infoBlockTab !== 'upcoming' ? 'hidden lg:flex' : 'flex'}`}>
                                                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 gap-3">
                                                        <div className="w-full lg:hidden">
                                                            <SegmentedControl value={infoBlockTab} onChange={(val) => setInfoBlockTab(val as any)} options={[{ value: 'activity', label: 'Atividade Recente', icon: Activity }, { value: 'upcoming', label: 'Próx. Prazos', icon: ArrowUpRight }]} />
                                                        </div>
                                                        <h3 className="hidden lg:flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-slate-500 dark:text-white/60">
                                                            <ArrowUpRight className="w-4 h-4" /> {dashboardScope === 'demands' ? 'Próximos Prazos' : 'Top Bairros'}
                                                        </h3>
                                                        <button onClick={() => { if (dashboardScope === 'demands') { setInitialDemandView('calendar'); setView('demands'); } else { setView('map'); } }} className="text-xs font-bold text-brand-600 hover:text-brand-700 flex items-center gap-1">Ver Todos <ArrowRight className="w-3 h-3" /></button>
                                                    </div>
                                                    {renderUpcoming()}
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                    {view === 'new-demand' && (
                                        <div className="max-w-[1600px] mx-auto w-full h-full">
                                            <DemandForm initialSearchTerm={selectedCitizenId || undefined} onSuccess={(id) => { fetchData(); setView('demands'); setSelectedCitizenId(null); }} onCancel={() => { setView('demands'); setSelectedCitizenId(null); }} onNotification={showNotification} />
                                        </div>
                                    )}
                                    {view === 'edit-demand' && editingDemand && (
                                        <div className="max-w-[1600px] mx-auto w-full h-full">
                                            <DemandEdit demand={editingDemand} onSuccess={(id) => { fetchData(); setView('demands'); setEditingDemand(null); }} onCancel={() => { setView('demands'); setEditingDemand(null); }} onNotification={showNotification} />
                                        </div>
                                    )}
                                    {view === 'admin_panel' && currentUser && <AdminScreen currentUser={currentUser} systemConfig={systemConfig} onUpdateConfig={setSystemConfig} onUpdateLocation={setWeatherLocations} onNotification={showNotification} onLogout={handleLogout} toggleTheme={handleThemeToggle} isDarkMode={isDarkMode} />}
                                    
                                    {/* Consolidated Map View - Now handled like Demands View to prevent expansion */}
                                    {(view === 'demands' || view === 'map') && (
                                        <DemandsView 
                                            demands={filteredDemands} 
                                            citizens={citizens} 
                                            interactions={interactions} 
                                            users={users} 
                                            onViewDemand={() => {}} 
                                            onEditDemand={(d) => { setEditingDemand(d); setView('edit-demand'); }} 
                                            onCreateDemand={() => setView('new-demand')} 
                                            onUpdateStatus={handleStatusUpdate} 
                                            onInteractionUpdate={fetchData} 
                                            filters={filters} 
                                            setFilters={setFilters} 
                                            onNotification={showNotification} 
                                            defaultLocation={weatherLocations.length > 0 ? weatherLocations[0] : null} 
                                            onViewCitizen={handleViewCitizen} 
                                            initialViewMode={view === 'map' ? 'map' : initialDemandView} 
                                            mapMarkers={precalculatedMapMarkers} 
                                            initialSelectionId={selectedDemandId} 
                                            clearSelection={() => setSelectedDemandId(null)}
                                            mapFocus={mapFocus}
                                            initialMapViewMode={initialMapViewMode}
                                            onMapFocus={handleMapFocus}
                                        />
                                    )}
                                    
                                    {view === 'people' && (
                                        <PeopleManager 
                                            initialSearchTerm={selectedCitizenId || undefined} 
                                            onCreateDemand={(cpf) => { setSelectedCitizenId(cpf); setView('new-demand'); }} 
                                            onEditDemand={(d) => { setEditingDemand(d); setView('edit-demand'); }} 
                                            onNotification={showNotification} 
                                            onPersonUpdate={fetchData} 
                                            permissions={currentRoleConfig} 
                                            onModeChange={setPeopleManagerMode} 
                                            demands={demands}
                                            onMapFocus={handleMapFocus}
                                        />
                                    )}
                                </div>
                            )}
                            
                            {view === 'fast-track' && (
                                <MobileFastTrack 
                                    onBack={() => setView('demands')}
                                    onSuccess={(citizenId) => {
                                        setSelectedCitizenId(citizenId);
                                        setView('new-demand');
                                    }}
                                />
                            )}
                        </Suspense>
                    </div>
                </main>
            </div>
        </div>
    );
};

export default App;
