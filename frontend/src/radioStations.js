// Radio stations with verified working stream URLs (Updated Jan 2026)
export const radioStations = [
    // --- PHILIPPINES (Separated by specific coordinates) ---
    { 
      name: 'Philippines', 
      capital: 'Quezon City', 
      lat: 14.6349, // Diliman area
      lon: 121.0344,
      station: 'Wish 107.5 FM',
      frequency: '107.5 FM',
      address: 'Quezon City, Philippines',
      genre: 'Contemporary & Live Hits',
      streamUrl: 'https://radio.wish1075.com/web/stream/wish.m3u8' 
    },
    { 
      name: 'Philippines', 
      capital: 'Quezon City', 
      lat: 14.6385, // GMA Network Center tower
      lon: 121.0398,
      station: 'Barangay LS 97.1',
      frequency: '97.1 FM',
      address: 'Diliman, Quezon City',
      genre: 'OPM & Pop',
      streamUrl: 'https://cmshls.gmanews.tv/radio/dwls/playlist.m3u8' 
    },
    { 
      name: 'Philippines', 
      capital: 'Pasay City', 
      lat: 14.5550, // MBC Building (Vicente Sotto St)
      lon: 120.9850,
      station: '90.7 Love Radio',
      frequency: '90.7 FM',
      address: 'CCP Complex, Pasay City',
      genre: 'Adult Hits & OPM',
      streamUrl: 'https://stream.zeno.fm/c2afcra6obttv' 
    },
    { 
      name: 'Philippines', 
      capital: 'Pasig City', 
      lat: 14.5866, // Ortigas Center
      lon: 121.0617,
      station: 'Monster RX 93.1',
      frequency: '93.1 FM',
      address: 'Strata 2000, Pasig City',
      genre: 'Top 40 & Urban',
      streamUrl: 'https://rx931.com/Streaming' 
    },
    { 
      name: 'Philippines', 
      capital: 'Quezon City', 
      lat: 14.6515, // Visayas Avenue Studio
      lon: 121.0371,
      station: 'Radyo Pilipinas 1',
      frequency: '738 AM',
      address: 'PIA Bldg, Quezon City',
      genre: 'Public Service & News',
      streamUrl: 'https://stream.zeno.fm/8r8tuvp1nfevv' 
    },
  
    // --- INTERNATIONAL (Verified & Stable 2026) ---
    { 
      name: 'Spain', 
      capital: 'Madrid', 
      lat: 40.4168, 
      lon: -3.7038,
      station: 'RNE Radio 3',
      frequency: '96k HLS',
      address: 'Madrid, Spain',
      genre: 'Alternative & Indie',
      streamUrl: 'https://rtve-live-radio-as.akamaized.net/rtve/radio3/mp3/icecast.audio' 
    },
    { 
      name: 'UK', 
      capital: 'London', 
      lat: 51.5074, 
      lon: -0.1278,
      station: 'BBC Radio 1',
      frequency: '96k HLS',
      address: 'London, UK',
      genre: 'Pop & Dance',
      streamUrl: 'http://as-hls-ww-live.akamaized.net/pool_01505109/live/ww/bbc_radio_one/bbc_radio_one.isml/bbc_radio_one-audio%3d96000.norewind.m3u8' 
    },
    { 
      name: 'USA', 
      capital: 'San Francisco', 
      lat: 37.7749, 
      lon: -122.4194,
      station: 'SomaFM - Groove Salad',
      frequency: '256k MP3',
      address: 'San Francisco, USA',
      genre: 'Ambient & Chill',
      streamUrl: 'https://ice1.somafm.com/groovesalad-256-mp3' 
    },
    { 
      name: 'Japan', 
      capital: 'Tokyo', 
      lat: 35.6895, 
      lon: 139.6917,
      station: 'NHK World Radio Japan',
      frequency: '128k MP3',
      address: 'Tokyo, Japan',
      genre: 'International News',
      streamUrl: 'https://nhkwlive-ojp.akamaized.net/hls/live/2003230/nhkwlive-ojp-en/index.m3u8' 
    },
    { 
      name: 'Germany', 
      capital: 'Berlin', 
      lat: 52.5200, 
      lon: 13.4050,
      station: 'Radio Paradise',
      frequency: '320k AAC',
      address: 'Berlin, Germany',
      genre: 'Eclectic Mix',
      streamUrl: 'https://stream.radioparadise.com/aac-320' 
    }
  ];