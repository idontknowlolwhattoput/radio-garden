/**
 * Service to fetch radio stations from Radio Browser API
 * API Docs: https://api.radio-browser.info/
 */

const BASE_URL = 'https://de1.api.radio-browser.info/json/stations/search';

const formatGenre = (tags) => {
  if (!tags) return 'Variety';

  const formatted = tags
    .split(',')
    .map(tag => tag.trim())
    .filter(tag => tag.length > 0)
    .map(tag => tag.replace(/\b\w/g, l => l.toUpperCase())) // Capitalize each word
    .join(', ');

  if (formatted.length > 35) {
    return formatted.substring(0, 35) + '...';
  }

  return formatted;
};

export const getStations = async () => {
  try {
    // Fetch top 500 stations with geo-location info, ordered by click count (popularity)
    const response = await fetch(`${BASE_URL}?has_geo_info=true&limit=300&order=clickcount&hidebroken=true`);
    const data = await response.json();

    // Map the API response to our application's expected format
    return data.map(station => ({
      name: station.country,
      capital: station.state || station.country, // Fallback to country if state is missing
      lat: station.geo_lat,
      lon: station.geo_long,
      station: station.name,
      frequency: station.bitrate ? `${station.bitrate}k` : 'Online',
      address: [station.state, station.country].filter(Boolean).join(', '),
      genre: formatGenre(station.tags),
      streamUrl: station.url_resolved,
      isHls: station.hls === 1,
      favicon: station.favicon,
      votes: station.votes,
      clickCount: station.clickcount
    }));
  } catch (error) {
    console.error('Failed to fetch radio stations:', error);
    return []; // Return empty array on error
  }
};

// Keep a minimal static list as fallback/initial state if needed
export const fallbackStations = [
  { 
    name: 'Philippines', 
    capital: 'Quezon City', 
    lat: 14.6349, 
    lon: 121.0344,
    station: 'Wish 107.5 FM',
    genre: 'Pop, OPM, Live',
    streamUrl: 'https://ice1.somafm.com/groovesalad-256-mp3',
    isHls: true
  }
];
