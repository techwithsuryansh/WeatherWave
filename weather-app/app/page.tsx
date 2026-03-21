'use client';

import { useEffect, useMemo, useState } from 'react';
import { 
  Search, MapPin, Wind, Droplets, Sun, Cloud, CloudRain, 
  CloudLightning, Snowflake, CloudFog, Thermometer 
} from 'lucide-react';

type GeoResult = { id: number; name: string; latitude: number; longitude: number; country: string; admin1?: string; timezone?: string; };
type ForecastResponse = {
  current: { temperature_2m: number; weather_code: number; wind_speed_10m: number; };
  daily: { time: string[]; temperature_2m_max: number[]; temperature_2m_min: number[]; precipitation_sum: number[]; weather_code: number[]; };
  timezone: string;
};
type AirQualityResponse = { hourly: { time: string[]; us_aqi: number[]; pm2_5: number[]; pm10: number[]; ozone: number[]; nitrogen_dioxide: number[]; sulphur_dioxide: number[]; carbon_monoxide: number[]; }; };

const getWeatherInfo = (code: number) => {
  if (code === 0) return { label: 'Clear sky', icon: <Sun className="text-yellow-400" size={32} /> };
  if ([1, 2, 3].includes(code)) return { label: 'Cloudy', icon: <Cloud className="text-slate-300" size={32} /> };
  if ([45, 48].includes(code)) return { label: 'Fog', icon: <CloudFog className="text-slate-400" size={32} /> };
  if ([51, 53, 55, 56, 57, 61, 63, 65, 66, 67, 80, 81, 82].includes(code)) return { label: 'Rain', icon: <CloudRain className="text-blue-400" size={32} /> };
  if ([71, 73, 75, 77, 85, 86].includes(code)) return { label: 'Snow', icon: <Snowflake className="text-blue-200" size={32} /> };
  if ([95, 96, 99].includes(code)) return { label: 'Thunderstorm', icon: <CloudLightning className="text-purple-400" size={32} /> };
  return { label: 'Unknown', icon: <Cloud className="text-slate-400" size={32} /> };
};

const aqiCategory = (aqi: number) => {
  if (aqi <= 50) return { label: 'Good', color: 'text-emerald-400', bg: 'bg-emerald-400/10 border-emerald-400/20' };
  if (aqi <= 100) return { label: 'Moderate', color: 'text-yellow-400', bg: 'bg-yellow-400/10 border-yellow-400/20' };
  if (aqi <= 150) return { label: 'Sensitive', color: 'text-orange-400', bg: 'bg-orange-400/10 border-orange-400/20' };
  if (aqi <= 200) return { label: 'Unhealthy', color: 'text-red-400', bg: 'bg-red-400/10 border-red-400/20' };
  return { label: 'Hazardous', color: 'text-rose-500', bg: 'bg-rose-500/10 border-rose-500/20' };
};

export default function Home() {
  const [query, setQuery] = useState('');
  const [suggestions, setSuggestions] = useState<GeoResult[]>([]);
  const [selected, setSelected] = useState<GeoResult | null>(null);
  const [forecast, setForecast] = useState<ForecastResponse | null>(null);
  const [air, setAir] = useState<AirQualityResponse | null>(null);
  const [loading, setLoading] = useState(false);

  const displayName = useMemo(() => selected ? `${selected.name}${selected.admin1 ? ', ' + selected.admin1 : ''}` : '', [selected]);

  // FIXED: Prevents re-opening the dropdown when a city is clicked
  useEffect(() => {
    if (selected && query === `${selected.name}, ${selected.country}`) {
      setSuggestions([]);
      return;
    }

    const handler = setTimeout(async () => {
      if (!query.trim()) return setSuggestions([]);
      try {
        const res = await fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(query)}&count=5&language=en`);
        const data = await res.json();
        setSuggestions(data?.results ?? []);
      } catch (err) {
        console.error(err);
      }
    }, 300);
    return () => clearTimeout(handler);
  }, [query, selected]);

  async function fetchData(location: GeoResult) {
    setLoading(true); setForecast(null); setAir(null);
    try {
      const forecastUrl = `https://api.open-meteo.com/v1/forecast?latitude=${location.latitude}&longitude=${location.longitude}&current=temperature_2m,weather_code,wind_speed_10m&daily=temperature_2m_max,temperature_2m_min,precipitation_sum,weather_code&forecast_days=7&timezone=auto`;
      const airUrl = `https://air-quality-api.open-meteo.com/v1/air-quality?latitude=${location.latitude}&longitude=${location.longitude}&hourly=us_aqi,pm2_5,pm10,ozone,nitrogen_dioxide,sulphur_dioxide,carbon_monoxide&forecast_days=1&timezone=auto`;
      
      const [fRes, aRes] = await Promise.all([fetch(forecastUrl), fetch(airUrl)]);
      setForecast(await fRes.json());
      setAir(await aRes.json());
    } finally { setLoading(false); }
  }

  function onSelect(location: GeoResult) {
    setSelected(location);
    setQuery(`${location.name}, ${location.country}`);
    setSuggestions([]);
    fetchData(location);
  }

  const todayAQI = air?.hourly?.us_aqi?.[0] ?? null;

  return (
    <main className="min-h-screen bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-indigo-900 via-slate-950 to-black text-slate-100 font-sans selection:bg-cyan-500/30">
      <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:py-12">
        
        {/* Header & Search */}
        <header className="mb-8 flex flex-col items-center justify-between gap-6 sm:flex-row">
          <div>
            <h1 className="text-3xl font-extrabold tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-500">
              WeatherWave
            </h1>
          </div>
          <div className="relative w-full sm:w-96 text-slate-900">
            <Search className="absolute left-3 top-3 h-5 w-5 text-slate-400" />
            <input
              className="w-full rounded-2xl border-0 bg-white/10 py-3 pl-10 pr-4 text-white placeholder-slate-400 backdrop-blur-md focus:bg-white/20 focus:outline-none focus:ring-2 focus:ring-cyan-500 transition-all"
              placeholder="Search city..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
            {suggestions.length > 0 && (
              <ul className="absolute z-20 mt-2 w-full overflow-hidden rounded-2xl bg-slate-800/90 shadow-2xl backdrop-blur-xl border border-white/10">
                {suggestions.map((s) => (
                  <li key={s.id} className="cursor-pointer px-4 py-3 text-slate-200 hover:bg-white/10 transition-colors flex items-center gap-2" onClick={() => onSelect(s)}>
                    <MapPin size={16} className="text-cyan-400" /> {s.name}, {s.country}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </header>

        {loading && <div className="mt-20 text-center text-cyan-400 animate-pulse">Fetching latest data...</div>}

        {selected && forecast && (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
            
            {/* Top Grid: Current Weather & AQI */}
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
              
              {/* Hero: Current Weather */}
              <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-white/5 p-8 backdrop-blur-md flex flex-col justify-center items-center text-center shadow-2xl">
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-cyan-500 to-blue-500 opacity-50" />
                <h2 className="text-xl font-medium text-slate-300 flex items-center gap-2">
                  <MapPin size={18} className="text-cyan-400"/> {displayName}
                </h2>
                <div className="my-6 flex items-center justify-center gap-4">
                  {getWeatherInfo(forecast.current.weather_code).icon}
                  <span className="text-7xl font-bold tracking-tighter text-white">
                    {Math.round(forecast.current.temperature_2m)}°
                  </span>
                </div>
                <p className="text-xl text-slate-300 font-medium">
                  {getWeatherInfo(forecast.current.weather_code).label}
                </p>
                <div className="mt-6 flex gap-6 text-sm text-slate-400">
                  <span className="flex items-center gap-1"><Wind size={16}/> {forecast.current.wind_speed_10m} km/h</span>
                  <span className="flex items-center gap-1"><Thermometer size={16}/> H:{Math.round(forecast.daily.temperature_2m_max[0])}° L:{Math.round(forecast.daily.temperature_2m_min[0])}°</span>
                </div>
              </div>

              {/* AQI Card */}
              {todayAQI !== null && (
                <div className={`flex flex-col justify-between rounded-3xl border border-white/10 bg-white/5 p-8 backdrop-blur-md shadow-2xl`}>
                  <div>
                    <h3 className="text-lg font-medium text-slate-300 mb-2">Air Quality Index</h3>
                    <div className="flex items-end gap-3">
                      <span className="text-5xl font-bold">{todayAQI}</span>
                      <span className={`px-3 py-1 rounded-full text-sm font-semibold border ${aqiCategory(todayAQI).bg} ${aqiCategory(todayAQI).color}`}>
                        {aqiCategory(todayAQI).label}
                      </span>
                    </div>
                  </div>
                  
                  <div className="mt-8 grid grid-cols-3 gap-4">
                    {[
                      { label: 'PM2.5', val: air?.hourly?.pm2_5?.[0] },
                      { label: 'PM10', val: air?.hourly?.pm10?.[0] },
                      { label: 'O3', val: air?.hourly?.ozone?.[0] },
                      { label: 'NO2', val: air?.hourly?.nitrogen_dioxide?.[0] },
                      { label: 'SO2', val: air?.hourly?.sulphur_dioxide?.[0] },
                      { label: 'CO', val: air?.hourly?.carbon_monoxide?.[0] },
                    ].map((p, i) => (
                      <div key={i} className="rounded-2xl bg-black/20 p-3 text-center border border-white/5">
                        <div className="text-xs text-slate-400 font-medium">{p.label}</div>
                        <div className="text-sm font-semibold mt-1">{p.val}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* 7-Day Forecast (Horizontal layout) */}
            <div className="rounded-3xl border border-white/10 bg-white/5 p-6 backdrop-blur-md shadow-2xl">
              <h3 className="mb-6 text-lg font-medium text-slate-300 px-2">7-Day Forecast</h3>
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-4 md:grid-cols-7">
                {forecast.daily.time.map((date, idx) => {
                  const dayObj = new Date(date);
                  const dayName = idx === 0 ? 'Today' : dayObj.toLocaleDateString('en-US', { weekday: 'short' });
                  const info = getWeatherInfo(forecast.daily.weather_code[idx]);
                  
                  return (
                    <div key={date} className="flex flex-col items-center justify-between rounded-2xl bg-black/20 p-4 border border-white/5 hover:bg-white/10 transition-colors">
                      <span className="text-sm font-medium text-slate-400">{dayName}</span>
                      <div className="my-3">
                        {info.icon}
                      </div>
                      <div className="flex w-full justify-between text-sm font-semibold">
                        <span className="text-slate-200">{Math.round(forecast.daily.temperature_2m_max[idx])}°</span>
                        <span className="text-slate-500">{Math.round(forecast.daily.temperature_2m_min[idx])}°</span>
                      </div>
                      {forecast.daily.precipitation_sum[idx] > 0 && (
                        <div className="mt-2 text-xs text-blue-400 flex items-center gap-1">
                          <Droplets size={12}/> {forecast.daily.precipitation_sum[idx]}mm
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

          </div>
        )}
      </div>
    </main>
  );



}