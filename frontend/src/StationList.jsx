import React, { useState, useMemo } from 'react';
import './StationList.css';

const StationList = ({ stations, onSelectStation, isOpen, onClose, currentStation }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCountry, setSelectedCountry] = useState('');
  const [selectedGenre, setSelectedGenre] = useState('');

  // Extract unique countries and genres for filters
  const countries = useMemo(() => {
    const uniqueCountries = [...new Set(stations.map(s => s.country || s.address?.split(', ').pop()))].filter(Boolean).sort();
    return uniqueCountries;
  }, [stations]);

  const genres = useMemo(() => {
    const allGenres = stations.flatMap(s => s.genre ? s.genre.split(',').map(g => g.trim()) : []);
    return [...new Set(allGenres)].filter(Boolean).sort();
  }, [stations]);

  // Filter stations based on search and filters
  const filteredStations = useMemo(() => {
    return stations.filter(station => {
      const matchesSearch = (station.station?.toLowerCase().includes(searchQuery.toLowerCase()) || 
                             station.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                             station.capital?.toLowerCase().includes(searchQuery.toLowerCase()));
      
      const stationCountry = station.country || station.address?.split(', ').pop();
      const matchesCountry = !selectedCountry || stationCountry === selectedCountry;
      
      const matchesGenre = !selectedGenre || (station.genre && station.genre.includes(selectedGenre));

      return matchesSearch && matchesCountry && matchesGenre;
    });
  }, [stations, searchQuery, selectedCountry, selectedGenre]);

  if (!isOpen) return null;

  return (
    <div className="station-list-overlay">
      <div className="station-list-container">
        <div className="station-list-header">
          <h2>Radio Stations</h2>
          <button className="station-list-close" onClick={onClose}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18 6L6 18M6 6L18 18" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
        </div>

        <div className="station-list-filters">
          <div className="filter-group search-group">
            <svg className="search-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="11" cy="11" r="8"/>
              <path d="M21 21L16.65 16.65" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            <input 
              type="text" 
              placeholder="Search stations..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          <div className="filter-row">
            <select 
              value={selectedCountry} 
              onChange={(e) => setSelectedCountry(e.target.value)}
              className="filter-select"
            >
              <option value="">All Countries</option>
              {countries.map(country => (
                <option key={country} value={country}>{country}</option>
              ))}
            </select>

            <select 
              value={selectedGenre} 
              onChange={(e) => setSelectedGenre(e.target.value)}
              className="filter-select"
            >
              <option value="">All Genres</option>
              {genres.map(genre => (
                <option key={genre} value={genre}>{genre}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="station-list-content">
          <div className="station-count">
            Found {filteredStations.length} stations
          </div>
          
          <div className="station-items">
            {filteredStations.map((station, index) => (
              <div 
                key={`${station.streamUrl}-${index}`}
                className={`station-item ${currentStation?.streamUrl === station.streamUrl ? 'active' : ''}`}
                onClick={() => onSelectStation(station)}
              >
                <div className="station-item-icon">
                  {station.favicon ? (
                    <img src={station.favicon} alt="" onError={(e) => e.target.style.display = 'none'} />
                  ) : (
                    <div className="station-placeholder-icon">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <circle cx="12" cy="12" r="3"/>
                        <path d="M5 12a7 7 0 0 1 14 0M2 12a10 10 0 0 1 20 0"/>
                      </svg>
                    </div>
                  )}
                </div>
                <div className="station-item-info">
                  <div className="station-item-name">{station.station}</div>
                  <div className="station-item-meta">
                    <span className="station-location">{station.capital}, {station.country || station.address?.split(', ').pop()}</span>
                    {station.genre && <span className="station-genre">• {station.genre}</span>}
                  </div>
                </div>
                {currentStation?.streamUrl === station.streamUrl && (
                  <div className="station-playing-indicator">
                    <span></span><span></span><span></span>
                  </div>
                )}
              </div>
            ))}
            
            {filteredStations.length === 0 && (
              <div className="no-stations-found">
                No stations found matching your filters.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default StationList;
