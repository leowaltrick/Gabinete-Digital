
import { useState, useEffect, useCallback } from 'react';
import { supabase, isSupabaseConfigured } from '../services/supabaseClient';
import { Demand, Citizen, DemandInteraction, WeatherLocation, DashboardStats, ThemeMode, User } from '../types';

export const useOfflineData = (currentUser: User | null) => {
    const [isOnline, setIsOnline] = useState(navigator.onLine);
    const [isLoading, setIsLoading] = useState(true);
    
    // Data State
    const [demands, setDemands] = useState<Demand[]>([]);
    const [citizens, setCitizens] = useState<Citizen[]>([]);
    const [users, setUsers] = useState<any[]>([]);
    const [interactions, setInteractions] = useState<DemandInteraction[]>([]);
    const [weatherLocations, setWeatherLocations] = useState<WeatherLocation[]>([]);
    const [dbStats, setDbStats] = useState<DashboardStats | null>(null);
    const [themePreference, setThemePreference] = useState<ThemeMode | null>(null);
    const [syncCount, setSyncCount] = useState(0);

    // Optimized Map Caching
    const preloadMapCache = useCallback((demandsList: Demand[], citizensList: Citizen[]) => {
        try {
            const cacheRaw = localStorage.getItem('geo_map_cache');
            const cache = cacheRaw ? JSON.parse(cacheRaw) : {};
            let hasUpdates = false;

            citizensList.forEach(c => {
                if (c.lat && c.lon && !cache[c.id]) {
                    cache[c.id] = { lat: c.lat, lon: c.lon };
                    hasUpdates = true;
                }
            });

            demandsList.forEach(d => {
                if (d.lat && d.lon && !cache[d.id]) {
                    cache[d.id] = { lat: d.lat, lon: d.lon };
                    hasUpdates = true;
                }
            });

            if (hasUpdates) {
                localStorage.setItem('geo_map_cache', JSON.stringify(cache));
            }
        } catch (e) {
            console.error("Error preloading map cache", e);
        }
    }, []);

    // Fetch Data
    const fetchData = useCallback(async () => {
        setIsLoading(true);
        if (!navigator.onLine) {
            console.log("Offline mode: Loading from cache");
            const cachedDemands = localStorage.getItem('cache_demands');
            const cachedCitizens = localStorage.getItem('cache_citizens');
            const cachedQueue = localStorage.getItem('offline_demands_queue');
            
            let demandsList = cachedDemands ? JSON.parse(cachedDemands) : [];
            const citizensList = cachedCitizens ? JSON.parse(cachedCitizens) : [];
            
            // Add queued items optimistically to list
            if (cachedQueue) {
                const queued = JSON.parse(cachedQueue);
                demandsList = [...queued, ...demandsList];
            }

            setDemands(demandsList);
            setCitizens(citizensList);
            setIsLoading(false);
            return;
        }

        if (isSupabaseConfigured() && supabase) {
            try {
                const [
                    { data: dData },
                    { data: cData },
                    { data: uData },
                    { data: iData },
                    { data: configData },
                    { data: themeData },
                    { data: statsData }
                ] = await Promise.all([
                    supabase.from('demands').select('*').order('created_at', { ascending: false }).limit(2000), 
                    supabase.from('citizens').select('*').limit(3000), 
                    supabase.from('system_users').select('*'),
                    supabase.from('demand_interactions').select('*').order('created_at', { ascending: false }).limit(1000),
                    supabase.from('app_config').select('*').eq('key', 'weather_locations').maybeSingle(),
                    supabase.from('app_config').select('*').eq('key', 'global_theme_mode').maybeSingle(),
                    supabase.from('dashboard_stats').select('*').maybeSingle() 
                ]);

                const mappedDemands = dData ? dData.map((d: any) => ({ ...d, citizenId: d.citizen_id, createdAt: d.created_at })) : [];
                const mappedCitizens = cData ? cData.map((c: any) => ({ id: c.id, cpf: c.cpf, name: `${c.nome} ${c.sobrenome}`, email: c.email, phone: c.telefone, createdAt: c.created_at, logradouro: c.logradouro, numero: c.numero, bairro: c.bairro, cidade: c.cidade, estado: c.estado, cep: c.cep, lat: c.lat, lon: c.lon })) : [];

                // CACHE DATA
                localStorage.setItem('cache_demands', JSON.stringify(mappedDemands));
                localStorage.setItem('cache_citizens', JSON.stringify(mappedCitizens));

                if (dData) setDemands(mappedDemands);
                if (cData) setCitizens(mappedCitizens);
                if (uData) setUsers(uData);
                if (iData) setInteractions(iData.map((i: any) => ({ id: i.id, demandId: i.demanda_id, type: i.tipo, text: i.texto, isCompleted: i.concluido, deadline: i.prazo, user: i.usuario, createdAt: i.created_at })));
                if (configData) setWeatherLocations(configData.value);
                if (statsData) setDbStats(statsData as DashboardStats);
                
                if (themeData && themeData.value) {
                    setThemePreference(themeData.value);
                }

                preloadMapCache(mappedDemands, mappedCitizens);

            } catch (err) {
                console.error("Error fetching data, trying cache...", err);
                const cachedDemands = localStorage.getItem('cache_demands');
                const cachedCitizens = localStorage.getItem('cache_citizens');
                if (cachedDemands) setDemands(JSON.parse(cachedDemands));
                if (cachedCitizens) setCitizens(JSON.parse(cachedCitizens));
            } finally {
                setIsLoading(false);
            }
        } else {
            // Mock data or initial state if no supabase
            setDemands([]);
            setIsLoading(false);
        }
    }, [preloadMapCache]);

    const processOfflineQueue = useCallback(async () => {
        const queueRaw = localStorage.getItem('offline_demands_queue');
        if (!queueRaw) return 0;

        const queue = JSON.parse(queueRaw);
        if (queue.length === 0) return 0;

        if (isSupabaseConfigured() && supabase) {
            console.log(`Syncing ${queue.length} offline demands...`);
            let syncedCount = 0;
            
            for (const demand of queue) {
                try {
                    const { error } = await supabase.from('demands').insert({
                        id: demand.id,
                        title: demand.title,
                        description: demand.description,
                        level: demand.level,
                        status: demand.status,
                        priority: demand.priority,
                        type: demand.type,
                        deadline: demand.deadline,
                        citizen_id: demand.citizenId,
                        tags: demand.tags
                    });
                    
                    if (error) {
                        console.error("Failed to sync item", demand.id, error);
                    } else {
                        syncedCount++;
                    }
                } catch (e) {
                    console.error("Error syncing item", e);
                }
            }
            
            localStorage.removeItem('offline_demands_queue');
            setSyncCount(syncedCount);
            fetchData();
            return syncedCount;
        }
        return 0;
    }, [fetchData]);

    useEffect(() => {
        const handleOnline = () => {
            setIsOnline(true);
            processOfflineQueue();
            fetchData();
        };
        const handleOffline = () => {
            setIsOnline(false);
        };

        window.addEventListener('online', handleOnline);
        window.addEventListener('offline', handleOffline);

        return () => {
            window.removeEventListener('online', handleOnline);
            window.removeEventListener('offline', handleOffline);
        };
    }, [fetchData, processOfflineQueue]);

    useEffect(() => {
        if (currentUser) {
            fetchData();
            // Check for queue on login
            setTimeout(() => {
                if (navigator.onLine) processOfflineQueue();
            }, 2000);
        } else {
            setDemands([]); 
        }
    }, [currentUser, fetchData, processOfflineQueue]);

    return {
        isOnline,
        isLoading,
        demands,
        setDemands, 
        citizens,
        setCitizens,
        users,
        interactions,
        weatherLocations,
        setWeatherLocations,
        dbStats,
        themePreference,
        fetchData,
        processOfflineQueue,
        syncCount,
        setSyncCount
    };
};
