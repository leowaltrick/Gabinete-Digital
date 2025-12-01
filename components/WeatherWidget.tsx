
import React, { useState, useEffect } from 'react';
import { Cloud, Sun, CloudRain, Snowflake, MapPin, Loader2 } from 'lucide-react';
import { WeatherLocation } from '../types';

interface WeatherWidgetProps {
  locations: WeatherLocation[];
}

const WeatherWidget: React.FC<WeatherWidgetProps> = ({ locations }) => {
  const [weather, setWeather] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  // Use only the first location as the primary/single location
  const primaryLocation = locations.length > 0 ? locations[0] : null;

  useEffect(() => {
    const fetchWeather = async () => {
      if (!primaryLocation) {
          setLoading(false);
          return;
      }

      // Cache Logic: Check if we have data for the current hour
      const cacheKey = `weather_cache_${primaryLocation.lat}_${primaryLocation.lon}`;
      const cachedRaw = localStorage.getItem(cacheKey);
      const currentHour = new Date().toISOString().slice(0, 13); // "YYYY-MM-DDTHH"

      if (cachedRaw) {
          const cached = JSON.parse(cachedRaw);
          if (cached.hour === currentHour) {
              setWeather(cached.data);
              return; // Use cache
          }
      }
      
      setLoading(true);
      try {
         const response = await fetch(
            `https://api.open-meteo.com/v1/forecast?latitude=${primaryLocation.lat}&longitude=${primaryLocation.lon}&current=temperature_2m,weather_code&timezone=auto`
         );
         const data = await response.json();
         setWeather(data);
         
         // Save to cache
         localStorage.setItem(cacheKey, JSON.stringify({
             hour: currentHour,
             data: data
         }));

      } catch (error) {
        console.error("Failed to fetch weather", error);
      } finally {
        setLoading(false);
      }
    };

    fetchWeather();
  }, [primaryLocation]);

  const getIcon = (code: number) => {
    if (code === 0) return <Sun className="w-6 h-6 text-amber-500" />;
    if (code >= 1 && code <= 3) return <Cloud className="w-6 h-6 text-slate-400" />;
    if (code >= 51 && code <= 67) return <CloudRain className="w-6 h-6 text-blue-400" />;
    if (code >= 71 && code <= 77) return <Snowflake className="w-6 h-6 text-cyan-300" />;
    return <Sun className="w-6 h-6 text-amber-500" />;
  };

  if (loading && primaryLocation) {
     return (
        <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-200/50 dark:bg-white/5 animate-pulse min-w-[140px] h-[46px]">
             <Loader2 className="w-4 h-4 animate-spin text-slate-400" />
             <div className="h-3 w-16 bg-slate-300 dark:bg-white/10 rounded"></div>
        </div>
     );
  }

  if (!primaryLocation || !weather) return null;

  const temp = Math.round(weather.current.temperature_2m);
  const code = weather.current.weather_code;

  return (
    <div className="flex items-center gap-4 px-4 py-2 rounded-xl bg-white/60 dark:bg-white/5 backdrop-blur-md border border-slate-200 dark:border-white/10 shadow-sm transition-all hover:bg-white/80 dark:hover:bg-white/10 cursor-default">
        <div className="flex items-center gap-2">
            {getIcon(code)}
            <span className="text-xl font-bold text-slate-900 dark:text-white">{temp}°</span>
        </div>
        <div className="flex flex-col border-l border-slate-300 dark:border-white/10 pl-4 h-8 justify-center">
            <span className="text-xs font-bold text-slate-700 dark:text-white uppercase tracking-wide flex items-center gap-1">
                <MapPin className="w-3 h-3 text-brand-600 dark:text-brand-400" />
                {primaryLocation.name}
            </span>
            <span className="text-[10px] text-slate-500 dark:text-white/50">Tempo Agora</span>
        </div>
    </div>
  );
};

export default WeatherWidget;
