import { useState, useEffect } from 'react';
import './App.css';

function App() {
  const [city, setCity] = useState('');
  const [weather, setWeather] = useState(null);
  const [hourly, setHourly] = useState([]);
  const [daily, setDaily] = useState([]); 
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const [favorites, setFavorites] = useState(() => {
    const saved = localStorage.getItem('weatherFavorites');
    return saved ? JSON.parse(saved) : [];
  });

  const API_KEY = import.meta.env.VITE_WEATHER_API_KEY;

  useEffect(() => {
    localStorage.setItem('weatherFavorites', JSON.stringify(favorites));
  }, [favorites]);

  const fetchWeatherData = async (searchUrl, forecastUrl) => {
    setLoading(true);
    setError(null);
    setWeather(null);
    setHourly([]);
    setDaily([]);

    try {
      const [weatherRes, forecastRes] = await Promise.all([
        fetch(searchUrl),
        fetch(forecastUrl)
      ]);

      const weatherData = await weatherRes.json();
      const forecastData = await forecastRes.json();

      if (!weatherRes.ok) throw new Error(weatherData.message);
      if (!forecastRes.ok) throw new Error(forecastData.message);

      setWeather(weatherData);
      
      setHourly(forecastData.list.slice(0, 8));

      const dailyForecast = forecastData.list.filter(item => item.dt_txt.includes('12:00:00'));
      setDaily(dailyForecast);

    } catch (err) {
      setError(err.message === 'city not found' ? 'City not found.' : err.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchByCityName = (cityName) => {
    setCity(cityName);
    const weatherUrl = `https://api.openweathermap.org/data/2.5/weather?q=${cityName}&units=metric&appid=${API_KEY}`;
    const forecastUrl = `https://api.openweathermap.org/data/2.5/forecast?q=${cityName}&units=metric&appid=${API_KEY}`;
    fetchWeatherData(weatherUrl, forecastUrl);
  };

  useEffect(() => {
    fetchByCityName('New Delhi');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSearch = (e) => {
    e.preventDefault();
    if (!city.trim()) return;
    fetchByCityName(city);
  };

  const toggleFavorite = () => {
    if (!weather) return;
    const cityName = weather.name;
    if (favorites.includes(cityName)) {
      setFavorites(favorites.filter(c => c !== cityName));
    } else {
      setFavorites([...favorites, cityName]);
    }
  };

  const formatTime = (timestamp) => {
    const date = new Date(timestamp * 1000);
    return date.toLocaleTimeString('en-US', { hour: 'numeric', hour12: true });
  };

  const formatDate = (timestamp) => {
    const date = new Date(timestamp * 1000);
    return date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
  };

  const generateGraphPath = () => {
    if (!hourly.length) return "";
    const temps = hourly.map(h => Math.round(h.main.temp));
    const minTemp = Math.min(...temps);
    const maxTemp = Math.max(...temps);
    const range = maxTemp - minTemp === 0 ? 1 : maxTemp - minTemp;
    
    let path = "";
    temps.forEach((temp, i) => {
      const x = (i / (temps.length - 1)) * 100;
      const y = 80 - ((temp - minTemp) / range) * 60; 
      if (i === 0) path += `M ${x} ${y}`;
      else path += ` L ${x} ${y}`;
    });
    return path;
  };

  return (
    <div className="dashboard-wrapper">
      <div className="top-nav">
        <h1 className="brand-logo">Weather<span>Wave</span></h1>
        <form onSubmit={handleSearch} className="search-bar">
          <input
            type="text"
            placeholder="Search for a city..."
            value={city}
            onChange={(e) => setCity(e.target.value)}
          />
          <button type="submit">🔍</button>
        </form>
      </div>

      {favorites.length > 0 && (
        <div className="favorites-container">
          {favorites.map((fav) => (
            <button key={fav} onClick={() => fetchByCityName(fav)} className="fav-badge">
              {fav}
            </button>
          ))}
        </div>
      )}

      {loading && <div className="loader">Loading atmosphere...</div>}
      {error && <div className="error-box">{error}</div>}

      {weather && !loading && !error && (
        <div className="bento-container">
          
          {/* ================= LEFT COLUMN ================= */}
          <div className="left-column">
            
            <div className="bento-card current-card">
              <div className="current-sky">
                <div className="sky-header">
                  <h2>{weather.name}</h2>
                  <button onClick={toggleFavorite} className={`fav-star ${favorites.includes(weather.name) ? 'active' : ''}`}>
                    {favorites.includes(weather.name) ? '★' : '☆'}
                  </button>
                </div>
                <div className="sky-body">
                  <h1 className="giant-temp">{Math.round(weather.main.temp)}°</h1>
                  <div className="sky-desc">
                    <p className="desc-text">{weather.weather[0].description}</p>
                    <p className="feels-like">Feels like {Math.round(weather.main.feels_like)}°</p>
                  </div>
                </div>
              </div>

              <div className="metrics-grid">
                <div className="metric">
                  <span className="m-label">Wind</span>
                  <span className="m-value">{Math.round(weather.wind.speed)} m/s</span>
                </div>
                <div className="metric">
                  <span className="m-label">Humidity</span>
                  <span className="m-value">{weather.main.humidity}%</span>
                </div>
                <div className="metric">
                  <span className="m-label">Visibility</span>
                  <span className="m-value">{(weather.visibility / 1000).toFixed(1)} km</span>
                </div>
                <div className="metric">
                  <span className="m-label">Pressure</span>
                  <span className="m-value">{weather.main.pressure} hPa</span>
                </div>
              </div>
            </div>

            <div className="bento-card daily-card">
              <h3 className="card-title">5-Day Forecast</h3>
              <div className="daily-list">
                {daily.map((day, idx) => (
                  <div key={idx} className="daily-item">
                    <span className="daily-date">{formatDate(day.dt)}</span>
                    <div className="daily-center">
                      <img 
                        src={`https://openweathermap.org/img/wn/${day.weather[0].icon}.png`} 
                        alt="icon" 
                      />
                      <span className="daily-desc">{day.weather[0].description}</span>
                    </div>
                    <span className="daily-temp">{Math.round(day.main.temp)}°</span>
                  </div>
                ))}
              </div>
            </div>

          </div>

          {/* ================= RIGHT COLUMN ================= */}
          <div className="right-column">
            
            <div className="bento-card forecast-card">
              <h3 className="card-title">24-Hour Forecast</h3>
              
              {/* UPDATED: Unified Scroll Wrapper for true responsiveness */}
              <div className="forecast-scroll-wrapper">
                <div className="forecast-inner">
                  <div className="dynamic-graph-container">
                    <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="real-graph">
                      <path 
                        d={generateGraphPath()} 
                        fill="none" 
                        stroke="#f97316" 
                        strokeWidth="2" 
                        strokeLinejoin="round"
                        vectorEffect="non-scaling-stroke" 
                      />
                    </svg>
                  </div>
                  <div className="timeline-labels">
                    {hourly.map((hour, idx) => (
                      <div key={idx} className="timeline-item">
                        <span className="time">{formatTime(hour.dt)}</span>
                        <img 
                          src={`https://openweathermap.org/img/wn/${hour.weather[0].icon}.png`} 
                          alt="icon" 
                        />
                        <span className="timeline-temp">{Math.round(hour.main.temp)}°</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            <div className="bento-card map-card">
              <iframe
                src={`https://embed.windy.com/embed.html?type=map&location=coordinates&metricRain=mm&metricTemp=°C&metricWind=m/s&zoom=6&overlay=wind&product=ecmwf&level=surface&lat=${weather.coord.lat}&lon=${weather.coord.lon}&detailLat=${weather.coord.lat}&detailLon=${weather.coord.lon}&marker=true`}
                frameBorder="0"
                title="Live Weather Map"
              ></iframe>
            </div>

          </div>

        </div>
      )}
    </div>
  );
}

export default App; 