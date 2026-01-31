import React, { useRef, useEffect, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';
import Hls from 'hls.js';
import { getStations, fallbackStations } from './radioStations';
import songDetectionService from './songDetection';
import StationList from './StationList';
import radiologo from './assets/radiologo.png';
import './Earth3D.css';

const AlarmForm = ({ stations, selectedStation, onSchedule, onClose }) => {
  const [time, setTime] = useState('');
  const [selectedStationForAlarm, setSelectedStationForAlarm] = useState(selectedStation || stations[0]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (time && selectedStationForAlarm) {
      onSchedule(selectedStationForAlarm, time);
    }
  };

  return (
    <form className="alarm-form" onSubmit={handleSubmit}>
      <div className="alarm-form-group">
        <label>Station</label>
        <select 
          value={selectedStationForAlarm?.streamUrl || ''} 
          onChange={(e) => {
            const station = stations.find(s => s.streamUrl === e.target.value);
            setSelectedStationForAlarm(station);
          }}
          className="alarm-select"
        >
          {stations.map((station, index) => (
            <option key={index} value={station.streamUrl}>
              {station.station} - {station.capital}, {station.name}
            </option>
          ))}
        </select>
      </div>
      <div className="alarm-form-group">
        <label>Time</label>
        <input 
          type="time" 
          value={time}
          onChange={(e) => setTime(e.target.value)}
          className="alarm-time-input"
          required
        />
      </div>
      <div className="alarm-form-actions">
        <button type="button" onClick={onClose} className="alarm-cancel-btn">Cancel</button>
        <button type="submit" className="alarm-submit-btn">Schedule</button>
      </div>
    </form>
  );
};

const Earth3D = () => {
  const mountRef = useRef(null);
  const audioRef = useRef(null);
  const hlsRef = useRef(null);
  const [stations, setStations] = useState([]);
  const [stationsLoaded, setStationsLoaded] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadingProgress, setLoadingProgress] = useState(0);
  const [selectedCountry, setSelectedCountry] = useState(null);

  useEffect(() => {
    const initStations = async () => {
      const fetchedStations = await getStations();
      if (fetchedStations.length > 0) {
        setStations(fetchedStations);
      } else {
        setStations(fallbackStations);
      }
      setStationsLoaded(true);
    };
    initStations();
  }, []);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [isPlaying, setIsPlaying] = useState(false);
  const [showInfoPanel, setShowInfoPanel] = useState(false);
  const [hasStarted, setHasStarted] = useState(false);
  const [isLoadingAudio, setIsLoadingAudio] = useState(false);
  const [audioError, setAudioError] = useState(null);
  const [favorites, setFavorites] = useState([]);
  const [showFavorites, setShowFavorites] = useState(false);
  const [showStationList, setShowStationList] = useState(false);
  const [isAttemptingPlay, setIsAttemptingPlay] = useState(false);
  const [isLocked, setIsLocked] = useState(false);
  const [history, setHistory] = useState([]);
  const [showHistory, setShowHistory] = useState(false);
  const [showAlarmModal, setShowAlarmModal] = useState(false);
  const [showAlarms, setShowAlarms] = useState(false);
  const [alarms, setAlarms] = useState([]);
  const [detectedSong, setDetectedSong] = useState(null);
  const [isDetectingSong, setIsDetectingSong] = useState(false);
  const [markerColor, setMarkerColor] = useState(0x4CAF50); // Default green
  const [showColorPicker, setShowColorPicker] = useState(false);
  // Initialize showStars from localStorage, default to false if not set
  const [showStars, setShowStars] = useState(() => {
    const saved = localStorage.getItem('radioGardenShowStars');
    return saved !== null ? saved === 'true' : false;
  });
  // Initialize showGlow from localStorage
  const [showGlow, setShowGlow] = useState(() => {
    const saved = localStorage.getItem('radioGardenShowGlow');
    return saved !== null ? saved === 'true' : false;
  });
  const sceneRef = useRef(null);
  const controlsRef = useRef(null);
  const cameraRef = useRef(null);
  const isLockedRef = useRef(false);
  const markerGroupsRef = useRef([]);
  const markerMaterialsRef = useRef([]); // Store materials directly for easier updates
  const starsRef = useRef(null); // Reference to stars object
  const glowRef = useRef(null); // Reference to glow object
  
  useEffect(() => {
    if (selectedCountry) {
      setAudioError(null);
    }
  }, [selectedCountry]);

  useEffect(() => {
    const savedMarkerColor = localStorage.getItem('radioGardenMarkerColor');
    if (savedMarkerColor) {
      const colorValue = parseInt(savedMarkerColor, 16);
      if (!isNaN(colorValue)) {
        setMarkerColor(colorValue);
      }
    }
    const savedShowStars = localStorage.getItem('radioGardenShowStars');
    if (savedShowStars !== null) {
      setShowStars(savedShowStars === 'true');
    }
  }, []);

  useEffect(() => {
    const savedFavorites = localStorage.getItem('radioGardenFavorites');
    if (savedFavorites) {
      setFavorites(JSON.parse(savedFavorites));
    }
    const savedHistory = localStorage.getItem('radioGardenHistory');
    if (savedHistory) {
      setHistory(JSON.parse(savedHistory));
    }
    const savedAlarms = localStorage.getItem('radioGardenAlarms');
    if (savedAlarms) {
      setAlarms(JSON.parse(savedAlarms));
    }
  }, []);

  useEffect(() => {
    localStorage.setItem('radioGardenFavorites', JSON.stringify(favorites));
  }, [favorites]);

  useEffect(() => {
    localStorage.setItem('radioGardenHistory', JSON.stringify(history));
  }, [history]);

  useEffect(() => {
    localStorage.setItem('radioGardenAlarms', JSON.stringify(alarms));
  }, [alarms]);

  useEffect(() => {
    localStorage.setItem('radioGardenMarkerColor', markerColor.toString(16));
  }, [markerColor]);

  useEffect(() => {
    localStorage.setItem('radioGardenShowStars', showStars.toString());
  }, [showStars]);

  useEffect(() => {
    localStorage.setItem('radioGardenShowGlow', showGlow.toString());
  }, [showGlow]);

  useEffect(() => {
    const updateStarsVisibility = () => {
      if (starsRef.current && sceneRef.current) {
        // Check if stars are already in the scene by checking the parent
        const isInScene = starsRef.current.parent === sceneRef.current;
        
        if (showStars) {
          if (!isInScene) {
            sceneRef.current.add(starsRef.current);
          }
        } else {
          if (isInScene) {
            sceneRef.current.remove(starsRef.current);
          }
        }
      }
    };
    
    // Small delay to ensure scene and stars are ready
    const timeoutId = setTimeout(updateStarsVisibility, 50);
    return () => clearTimeout(timeoutId);
  }, [showStars]);

  useEffect(() => {
    const updateGlowVisibility = () => {
      if (glowRef.current && sceneRef.current) {
        // Check if glow is already in the scene
        const isInScene = glowRef.current.parent === sceneRef.current;
        
        if (showGlow) {
          if (!isInScene) {
            sceneRef.current.add(glowRef.current);
          }
        } else {
          if (isInScene) {
            sceneRef.current.remove(glowRef.current);
          }
        }
      }
    };
    
    // Small delay to ensure scene and glow are ready
    const timeoutId = setTimeout(updateGlowVisibility, 50);
    return () => clearTimeout(timeoutId);
  }, [showGlow]);

  useEffect(() => {
    const updateMarkerColors = () => {
      // Try updating via materials ref first (more direct)
      if (markerMaterialsRef.current && markerMaterialsRef.current.length > 0) {
        markerMaterialsRef.current.forEach((materials) => {
          if (materials.sphere) {
            materials.sphere.color.setHex(markerColor);
          }
          if (materials.ring) {
            materials.ring.color.setHex(markerColor);
          }
        });
      }
      
      // Also update via marker groups (fallback)
      if (markerGroupsRef.current && markerGroupsRef.current.length > 0) {
        markerGroupsRef.current.forEach((markerGroup) => {
          if (markerGroup && markerGroup.children) {
            // Update visible marker color (first child is the visible sphere)
            if (markerGroup.children[0] && markerGroup.children[0].material) {
              markerGroup.children[0].material.color.setHex(markerColor);
            }
            // Update ring color (third child is the ring, second is click area)
            if (markerGroup.children[2] && markerGroup.children[2].material) {
              markerGroup.children[2].material.color.setHex(markerColor);
            }
          }
        });
      }
    };
    
    // Small delay to ensure markers are created
    const timeoutId = setTimeout(updateMarkerColors, 50);
    return () => clearTimeout(timeoutId);
  }, [markerColor]);

  const toggleFavorite = (station) => {
    const isFavorite = favorites.some(fav => fav.streamUrl === station.streamUrl);
    if (isFavorite) {
      setFavorites(favorites.filter(fav => fav.streamUrl !== station.streamUrl));
    } else {
      setFavorites([...favorites, station]);
    }
  };

  const isFavorite = selectedCountry && favorites.some(fav => fav.streamUrl === selectedCountry.streamUrl);

  const playFavorite = (station) => {
    if (isLocked) return;
    setSelectedCountry(station);
    setShowInfoPanel(true);
    setIsPlaying(true);
    setShowFavorites(false);
    setHistory(prev => {
      const newHistory = [station, ...prev.filter(h => h.streamUrl !== station.streamUrl)].slice(0, 50);
      return newHistory;
    });
  };

  const toggleLock = () => {
    setIsLocked(!isLocked);
    isLockedRef.current = !isLockedRef.current;
  };

  useEffect(() => {
    isLockedRef.current = isLocked;
  }, [isLocked]);

  const surpriseMe = () => {
    if (isLocked) return;
    const randomStation = stations[Math.floor(Math.random() * stations.length)];
    
    setSelectedCountry(randomStation);
    setShowInfoPanel(true);
    setIsPlaying(true);
    setHistory(prev => {
      const newHistory = [randomStation, ...prev.filter(h => h.streamUrl !== randomStation.streamUrl)].slice(0, 50);
      return newHistory;
    });
    
    // Scroll to station
    scrollToStation(randomStation.lat, randomStation.lon);
  };

  const playFromHistory = (station) => {
    if (isLocked) return;
    
    setSelectedCountry(station);
    setShowInfoPanel(true);
    setIsPlaying(true);
    setShowHistory(false);
    setHistory(prev => {
      const newHistory = [station, ...prev.filter(h => h.streamUrl !== station.streamUrl)].slice(0, 50);
      return newHistory;
    });
    
    // Scroll to station
    scrollToStation(station.lat, station.lon);
  };

  const scheduleAlarm = (station, time) => {
    const alarm = {
      id: Date.now(),
      station,
      time,
      enabled: true
    };
    setAlarms([...alarms, alarm]);
    setShowAlarmModal(false);
  };

  const deleteAlarm = (alarmId) => {
    setAlarms(alarms.filter(alarm => alarm.id !== alarmId));
  };

  const toggleAlarm = (alarmId) => {
    setAlarms(alarms.map(alarm => 
      alarm.id === alarmId ? { ...alarm, enabled: !alarm.enabled } : alarm
    ));
  };

  const getTimeUntilAlarm = (alarmTime) => {
    const now = new Date();
    const [hours, minutes] = alarmTime.split(':').map(Number);
    const alarmDate = new Date();
    alarmDate.setHours(hours, minutes, 0, 0);
    
    // If alarm time has passed today, set for tomorrow
    if (alarmDate < now) {
      alarmDate.setDate(alarmDate.getDate() + 1);
    }
    
    const diff = alarmDate - now;
    const hoursUntil = Math.floor(diff / (1000 * 60 * 60));
    const minutesUntil = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    
    if (hoursUntil > 0) {
      return `${hoursUntil}h ${minutesUntil}m`;
    } else {
      return `${minutesUntil}m`;
    }
  };

  useEffect(() => {
    const checkAlarms = () => {
      const now = new Date();
      const currentTime = now.getHours() * 60 + now.getMinutes();
      
      alarms.forEach(alarm => {
        if (!alarm.enabled) return;
        
        const [hours, minutes] = alarm.time.split(':').map(Number);
        const alarmTime = hours * 60 + minutes;
        
        if (currentTime === alarmTime && !isPlaying) {
          setSelectedCountry(alarm.station);
          setShowInfoPanel(true);
          setIsPlaying(true);
          setHistory(prev => {
            const newHistory = [alarm.station, ...prev.filter(h => h.streamUrl !== alarm.station.streamUrl)].slice(0, 50);
            return newHistory;
          });
        }
      });
    };
    
    const interval = setInterval(checkAlarms, 60000); // Check every minute
    return () => clearInterval(interval);
  }, [alarms, isPlaying]);

  // Handle play/pause
  useEffect(() => {
    // Create new audio instance for this session
    // This ensures a "hard reset" of the media pipeline on every station change
    const audio = new Audio();
    audio.crossOrigin = 'anonymous';
    audio.preload = 'none';
    audioRef.current = audio;

    // Define handlers
    const handleLoadStart = () => {
      setIsLoadingAudio(true);
      setAudioError(null);
    };
    
    const handleCanPlay = () => {
      setIsLoadingAudio(false);
      setAudioError(null);
      setIsAttemptingPlay(false);
    };
    
    const handleError = (e) => {
      setIsLoadingAudio(false);
      // Only set error if we were actually attempting to play and this is the active audio
      if (audioRef.current === audio) {
        console.error('Audio error:', e);
        setAudioError('Failed to load audio stream');
        setIsPlaying(false);
        setIsAttemptingPlay(false);
      }
    };
    
    const handleEnded = () => {
      if (audioRef.current === audio) {
        setIsPlaying(false);
      }
    };

    // Attach listeners
    audio.addEventListener('loadstart', handleLoadStart);
    audio.addEventListener('canplay', handleCanPlay);
    audio.addEventListener('error', handleError);
    audio.addEventListener('ended', handleEnded);

    if (isPlaying && hasStarted && selectedCountry) {
      // Clear any previous errors when starting to play
      setAudioError(null);
      setIsAttemptingPlay(true);
      
      const isHls = Hls.isSupported() && (selectedCountry.isHls || selectedCountry.streamUrl.includes('.m3u8') || selectedCountry.streamUrl.includes('.m3u'));

      if (isHls) {
        const hls = new Hls({
          enableWorker: true,
          lowLatencyMode: true,
          backBufferLength: 90
        });
        hlsRef.current = hls;
        
        // Attach media first
        hls.attachMedia(audio);
        
        // Load source only after media is attached
        hls.on(Hls.Events.MEDIA_ATTACHED, () => {
          // Safety check: ensure this HLS instance is still the active one
          if (hlsRef.current === hls) {
            hls.loadSource(selectedCountry.streamUrl);
          }
        });
        
        hls.on(Hls.Events.MANIFEST_PARSED, () => {
          // Check if we are still playing and this is still the active HLS instance
          if (isPlaying && audioRef.current === audio && hlsRef.current === hls) {
            const playPromise = audio.play();
            if (playPromise !== undefined) {
              playPromise.catch(err => {
                // AbortError is common when switching quickly, ignore it
                if (err.name !== 'AbortError') {
                  console.error('Play error:', err);
                  setAudioError('Failed to play audio. Please check your connection.');
                  setIsPlaying(false);
                }
                setIsAttemptingPlay(false);
              });
            }
          }
        });

        hls.on(Hls.Events.ERROR, (event, data) => {
          if (hlsRef.current !== hls) return; // Ignore errors from stale instances
          
          if (data.fatal) {
            switch (data.type) {
              case Hls.ErrorTypes.NETWORK_ERROR:
                console.log('HLS Network error, recovering...');
                hls.startLoad();
                break;
              case Hls.ErrorTypes.MEDIA_ERROR:
                console.log('HLS Media error, recovering...');
                hls.recoverMediaError();
                break;
              default:
                console.error('HLS Fatal error:', data);
                hls.destroy();
                break;
            }
          }
        });
      } else {
        // Native playback
        audio.src = selectedCountry.streamUrl;
        const playPromise = audio.play();
        
        if (playPromise !== undefined) {
          playPromise.catch(err => {
             // AbortError is common when switching quickly, ignore it
             if (err.name !== 'AbortError') {
              console.error('Play error:', err);
              setAudioError('Failed to play audio. Please check your connection.');
              setIsPlaying(false);
            }
            setIsAttemptingPlay(false);
          });
        }
      }
    } else {
      setIsAttemptingPlay(false);
    }

    // Cleanup function
    return () => {
      // Remove listeners
      audio.removeEventListener('loadstart', handleLoadStart);
      audio.removeEventListener('canplay', handleCanPlay);
      audio.removeEventListener('error', handleError);
      audio.removeEventListener('ended', handleEnded);

      // Stop playback
      audio.pause();
      audio.src = '';
      
      // Cleanup HLS
      if (hlsRef.current) {
        hlsRef.current.destroy();
        hlsRef.current = null;
      }
      
      // Clear ref if it matches (though next effect run will overwrite it)
      if (audioRef.current === audio) {
        audioRef.current = null;
      }
    };
  }, [isPlaying, selectedCountry, hasStarted]);

  // Cleanup HLS on unmount
  useEffect(() => {
    return () => {
      if (hlsRef.current) {
        hlsRef.current.destroy();
      }
    };
  }, []);

  // Song detection effect
  useEffect(() => {
    if (isPlaying && hasStarted && audioRef.current && selectedCountry) {
      // Start song detection
      setIsDetectingSong(true);
      setDetectedSong(null); // Clear previous detection
      
      const handleSongDetected = (song) => {
        setDetectedSong(song);
        setIsDetectingSong(false);
      };
      
      songDetectionService.startDetection(audioRef.current, handleSongDetected);
      
      return () => {
        // Stop detection when component unmounts or stops playing
        songDetectionService.stopDetection();
        setIsDetectingSong(false);
      };
    } else {
      // Stop detection when not playing
      songDetectionService.stopDetection();
      setIsDetectingSong(false);
    }
  }, [isPlaying, hasStarted, selectedCountry]);

  // Update current time every second
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const handleStart = () => {
    setHasStarted(true);
    
    // Auto-scroll to Philippines (user country location)
    // Try to find a station in Philippines first
    const phStation = stations.find(s => 
      s.country === 'Philippines' || 
      (s.address && s.address.includes('Philippines'))
    );
    
    if (phStation) {
      scrollToStation(phStation.lat, phStation.lon);
    } else {
      // Fallback to Philippines coordinates if no station found
      scrollToStation(12.8797, 121.7740);
    }
  };


  const latLonToVector3 = (lat, lon, radius) => {
    const phi = (90 - lat) * (Math.PI / 180);
    const theta = (lon + 180) * (Math.PI / 180);
    
    const x = -(radius * Math.sin(phi) * Math.cos(theta));
    const y = radius * Math.cos(phi);
    const z = radius * Math.sin(phi) * Math.sin(theta);
    
    return new THREE.Vector3(x, y, z);
  };

  const scrollToStation = (lat, lon) => {
    setTimeout(() => {
      if (!controlsRef.current) return;
      
      const camera = cameraRef.current || controlsRef.current.object;
      if (!camera) return;
      
      // Get station position
      const stationPos = latLonToVector3(lat, lon, 2);
      
      // Position camera in front of station (so it sees station when looking at center)
      const dist = 4.5;
      const dir = stationPos.clone().normalize();
      const targetPos = dir.multiplyScalar(dist);
      
      // Disable controls
      const wasEnabled = controlsRef.current.enabled;
      controlsRef.current.enabled = false;
      controlsRef.current.target.set(0, 0, 0);
      
      // Animate
      const start = camera.position.clone();
      let t = 0;
      
      const anim = () => {
        t += 0.02; // Faster animation speed (was 0.005)
        if (t < 1) {
          // Standard linear interpolation
          camera.position.lerpVectors(start, targetPos, t);
          
          // Force orbital distance to prevent "cutting through" the globe
          // This creates a smooth arc. Comment out this line to revert to "through globe" style.
          camera.position.normalize().multiplyScalar(dist);
          
          camera.lookAt(0, 0, 0);
          requestAnimationFrame(anim);
        } else {
          camera.position.copy(targetPos);
          camera.lookAt(0, 0, 0);
          
          // Fix teleport bug: Re-instantiate OrbitControls to sync with new camera position
          if (controlsRef.current) {
            const domElement = controlsRef.current.domElement;
            controlsRef.current.dispose();
            
            const newControls = new OrbitControls(camera, domElement);
            newControls.enableDamping = true;
            newControls.dampingFactor = 0.05;
            newControls.minDistance = 2.5;
            newControls.maxDistance = 20;
            newControls.autoRotate = false;
            newControls.autoRotateSpeed = 0;
            newControls.enablePan = true;
            newControls.enableZoom = true;
            newControls.target.set(0, 0, 0);
            
            // Restore enabled state
            newControls.enabled = wasEnabled;
            
            controlsRef.current = newControls;
            if (sceneRef.current) {
              sceneRef.current.userData.controls = newControls;
            }
          }
        }
      };
      
      anim();
    }, 100);
  };

  const createMarker = (country, earthRadius, color = markerColor) => {
    const position = latLonToVector3(country.lat, country.lon, earthRadius + 0.05);
    
    // Create a group to hold all marker components
    const markerGroup = new THREE.Group();
    markerGroup.position.copy(position);
    
    // Create VISIBLE sphere marker (smaller size)
    const markerGeometry = new THREE.SphereGeometry(0.02, 16, 16);
    const markerMaterial = new THREE.MeshBasicMaterial({ 
      color: color,
      transparent: true,
      opacity: 1.0
    });
    
    const visibleMarker = new THREE.Mesh(markerGeometry, markerMaterial);
    markerGroup.add(visibleMarker);
    
    // Create INVISIBLE click area (larger for easier clicking)
    const clickGeometry = new THREE.SphereGeometry(0.08, 8, 8); // Larger invisible sphere
    const clickMaterial = new THREE.MeshBasicMaterial({ 
      color: 0x00ff00,
      transparent: true,
      opacity: 0, // Completely invisible
      depthWrite: false // Don't interfere with depth buffer
    });
    
    const clickArea = new THREE.Mesh(clickGeometry, clickMaterial);
    markerGroup.add(clickArea);
    
    // Add a visible ring around the marker
    const pulseGeometry = new THREE.RingGeometry(0.025, 0.035, 16);
    const pulseMaterial = new THREE.MeshBasicMaterial({ 
      color: color,
      transparent: true,
      opacity: 0.5,
      side: THREE.DoubleSide
    });
    const pulseRing = new THREE.Mesh(pulseGeometry, pulseMaterial);
    pulseRing.rotation.x = Math.PI / 2; // Orient ring perpendicular to marker
    pulseRing.userData.pulse = false; // No pulse animation
    markerGroup.add(pulseRing);
    
    // Store country data on the click area (not the visible marker)
    clickArea.userData = {
      type: 'marker',
      country: country.name,
      countryData: country
    };
    
    // Also store reference to visible marker for animations
    clickArea.userData.visibleMarker = visibleMarker;
    
    return { markerGroup, clickArea };
  };

  useEffect(() => {
    if (!mountRef.current || !stationsLoaded) return;

    const scene = new THREE.Scene();
    // Static dark blue gradient background (no stars)
    scene.background = new THREE.Color(0x0a0a14);
    
    const camera = new THREE.PerspectiveCamera(
      45,
      mountRef.current.clientWidth / mountRef.current.clientHeight,
      0.1,
      1000
    );
    camera.position.z = 5;
    cameraRef.current = camera;

    const renderer = new THREE.WebGLRenderer({ 
      antialias: true,
      powerPreference: "high-performance"
    });
    renderer.setSize(mountRef.current.clientWidth, mountRef.current.clientHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    mountRef.current.appendChild(renderer.domElement);

    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();

    // Lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.7);
    scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 1.2);
    directionalLight.position.set(5, 3, 5);
    scene.add(directionalLight);

    // Create Earth sphere
    const earthGeometry = new THREE.SphereGeometry(2, 128, 128);
    const earthRadius = 2;
    
    const colorMapUrl = 'https://raw.githubusercontent.com/mrdoob/three.js/dev/examples/textures/planets/earth_atmos_2048.jpg';
    const textureLoader = new THREE.TextureLoader();
    
    textureLoader.load(
      colorMapUrl,
      (texture) => {
        texture.anisotropy = renderer.capabilities.getMaxAnisotropy();
        
        const earthMaterial = new THREE.MeshPhongMaterial({
          map: texture,
          specular: new THREE.Color(0x333333),
          shininess: 10
        });
        
        const earth = new THREE.Mesh(earthGeometry, earthMaterial);
        scene.add(earth);
        
        const getCurrentMarkerColor = () => {
          const saved = localStorage.getItem('radioGardenMarkerColor');
          if (saved) {
            const parsed = parseInt(saved, 16);
            if (!isNaN(parsed)) {
              return parsed;
            }
          }
          return markerColor;
        };
        
        const markerGroups = [];
        const clickAreas = []; // Separate array for click detection
        const currentColor = getCurrentMarkerColor(); // Get actual current color
        
        const markerMaterials = [];
        stations.forEach(station => {
          const { markerGroup, clickArea } = createMarker(station, earthRadius, currentColor);
          earth.add(markerGroup);
          markerGroups.push(markerGroup);
          clickAreas.push(clickArea);
          
          // Store materials for easy color updates
          if (markerGroup.children[0] && markerGroup.children[0].material) {
            markerMaterials.push({
              sphere: markerGroup.children[0].material,
              ring: markerGroup.children[2]?.material
            });
          }
        });
        
        // Store marker groups and materials references for color updates
        markerGroupsRef.current = markerGroups;
        markerMaterialsRef.current = markerMaterials;
        
        const createStars = () => {
          const starsGeometry = new THREE.BufferGeometry();
          const starsCount = 5000;
          const positions = new Float32Array(starsCount * 3);
          
          for (let i = 0; i < starsCount * 3; i += 3) {
            // Random position in a sphere around the scene
            const radius = 50 + Math.random() * 200;
            const theta = Math.random() * Math.PI * 2;
            const phi = Math.acos(Math.random() * 2 - 1);
            
            positions[i] = radius * Math.sin(phi) * Math.cos(theta);
            positions[i + 1] = radius * Math.sin(phi) * Math.sin(theta);
            positions[i + 2] = radius * Math.cos(phi);
          }
          
          starsGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
          
          const starsMaterial = new THREE.PointsMaterial({
            color: 0xffffff,
            size: 0.5,
            transparent: true,
            opacity: 0.8,
            sizeAttenuation: true
          });
          
          const stars = new THREE.Points(starsGeometry, starsMaterial);
          starsRef.current = stars;
          
          // Store in scene for cleanup
          scene.userData.stars = stars;
          
          // Check localStorage directly (state might not be updated yet)
          const savedShowStars = localStorage.getItem('radioGardenShowStars');
          const shouldShow = savedShowStars !== null ? savedShowStars === 'true' : false;
          
          // Only add stars if they should be shown
          if (shouldShow) {
            scene.add(stars);
          }
        };
        
        createStars();

        const createGlow = () => {
          // Simple additive glow
          const glowGeometry = new THREE.SphereGeometry(2.15, 64, 64);
          const glowMaterial = new THREE.MeshBasicMaterial({
            color: 0x4488ff,
            transparent: true,
            opacity: 0.15,
            side: THREE.FrontSide,
            blending: THREE.AdditiveBlending,
            depthWrite: false
          });
          
          const glow = new THREE.Mesh(glowGeometry, glowMaterial);
          glowRef.current = glow;
          scene.userData.glow = glow;
          
          // Check localStorage directly
          const savedShowGlow = localStorage.getItem('radioGardenShowGlow');
          const shouldShow = savedShowGlow !== null ? savedShowGlow === 'true' : false;
          
          if (shouldShow) {
            scene.add(glow);
          }
        };
        
        createGlow();

        const controls = new OrbitControls(camera, renderer.domElement);
        controls.enableDamping = true;
        controls.dampingFactor = 0.05;
        controls.minDistance = 2.5;
        controls.maxDistance = 20;
        controls.autoRotate = false;
        controls.autoRotateSpeed = 0;
        controls.enablePan = true;
        controls.enableZoom = true;

        // Store hover state
        let hoveredMarker = null;

        const handleClick = (event) => {
          const rect = renderer.domElement.getBoundingClientRect();
          mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
          mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
          
          raycaster.setFromCamera(mouse, camera);
          
          // Check clicks on click areas (larger invisible spheres)
          const intersects = raycaster.intersectObjects(clickAreas, true);
          
          if (intersects.length > 0) {
            const clickArea = intersects[0].object;
            const countryData = clickArea.userData.countryData;
            
            if (isLockedRef.current) {
            // Visual feedback that station is locked
            if (clickArea.userData.visibleMarker) {
              // Get current color from the marker itself
              const originalColor = clickArea.userData.visibleMarker.material.color.getHex();
              clickArea.userData.visibleMarker.material.color.setHex(0xff6b6b);
              setTimeout(() => {
                clickArea.userData.visibleMarker.material.color.setHex(originalColor);
              }, 300);
            }
              return;
            }
            
            setSelectedCountry(countryData);
            setShowInfoPanel(true);
            if (hasStarted) {
              setIsPlaying(true);
            }
            // Add to history
            setHistory(prev => {
              const newHistory = [countryData, ...prev.filter(h => h.streamUrl !== countryData.streamUrl)].slice(0, 50);
              return newHistory;
            });
            
            if (clickArea.userData.visibleMarker) {
              // Get current color from the marker itself
              const originalColor = clickArea.userData.visibleMarker.material.color.getHex();
              clickArea.userData.visibleMarker.material.color.setHex(0xffffff);
              setTimeout(() => {
                clickArea.userData.visibleMarker.material.color.setHex(originalColor);
              }, 300);
            }
          } else {
            if (showInfoPanel) {
              setShowInfoPanel(false);
            }
          }
        };

        const handleMouseMove = (event) => {
          const rect = renderer.domElement.getBoundingClientRect();
          mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
          mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
          
          raycaster.setFromCamera(mouse, camera);
          const intersects = raycaster.intersectObjects(clickAreas, true);
          
          // Reset all markers
          markerGroups.forEach(markerGroup => {
            if (markerGroup.children[0]) {
              markerGroup.children[0].material.opacity = 0.9;
              markerGroup.scale.setScalar(1);
            }
          });
          
          if (intersects.length > 0) {
            const clickArea = intersects[0].object;
            const markerGroup = clickArea.parent;
            
            // Highlight the marker
            if (clickArea.userData.visibleMarker) {
              clickArea.userData.visibleMarker.material.opacity = 1;
              clickArea.userData.visibleMarker.scale.setScalar(1);
            }
            markerGroup.scale.setScalar(1.2);
            renderer.domElement.style.cursor = 'pointer';
            hoveredMarker = markerGroup;
          } else {
            renderer.domElement.style.cursor = 'grab';
            hoveredMarker = null;
          }
        };

        // NO PULSE ANIMATION - completely static markers
        // Removed pulseAnimation function

        // Add event listeners
        renderer.domElement.addEventListener('click', handleClick);
        renderer.domElement.addEventListener('mousemove', handleMouseMove);

        // Store references
        scene.userData.earth = earth;
        scene.userData.markerGroups = markerGroups;
        scene.userData.clickAreas = clickAreas;
        scene.userData.controls = controls;
        scene.userData.camera = camera;
        scene.userData.earthTexture = texture;
        scene.userData.clickHandler = handleClick;
        scene.userData.mouseMoveHandler = handleMouseMove;
        sceneRef.current = scene;
        controlsRef.current = controls;

        // Main animation loop
        const animate = () => {
          scene.userData.animationId = requestAnimationFrame(animate);
          
          // NO earth rotation - completely stationary
          // NO pulse animation - completely static
          
          // Optional: Slow rotation of stars for subtle movement
          if (starsRef.current && showStars) {
            starsRef.current.rotation.y += 0.0001;
          }
          
          // Only update controls if they're enabled (prevents interference with camera animation)
          if (controlsRef.current && controlsRef.current.enabled) {
            controlsRef.current.update();
          }
          renderer.render(scene, camera);
        };
        
        scene.userData.animationId = requestAnimationFrame(animate);
        setLoading(false);
      },
      (progress) => {
        const percent = Math.round((progress.loaded / progress.total) * 100);
        setLoadingProgress(percent);
      },
      (error) => {
        console.error('Failed to load Earth texture:', error);
        setLoading(false);
      }
    );

    // Handle resize
    const handleResize = () => {
      if (!mountRef.current) return;
      
      camera.aspect = mountRef.current.clientWidth / mountRef.current.clientHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(mountRef.current.clientWidth, mountRef.current.clientHeight);
    };
    
    window.addEventListener('resize', handleResize);

    // Cleanup
    return () => {
      window.removeEventListener('resize', handleResize);
      
      if (scene.userData.animationId) {
        cancelAnimationFrame(scene.userData.animationId);
      }
      
      if (scene.userData.clickHandler) {
        renderer.domElement.removeEventListener('click', scene.userData.clickHandler);
      }
      
      if (scene.userData.mouseMoveHandler) {
        renderer.domElement.removeEventListener('mousemove', scene.userData.mouseMoveHandler);
      }
      
      if (mountRef.current && renderer.domElement.parentNode === mountRef.current) {
        mountRef.current.removeChild(renderer.domElement);
      }
      
      earthGeometry.dispose();
      
      if (scene.userData.earthTexture) {
        scene.userData.earthTexture.dispose();
      }
      
      renderer.dispose();
      
      if (scene.userData.controls) {
        scene.userData.controls.dispose();
      }
    };
  }, [stationsLoaded, stations]);

  // Format time for display
  const formatTime = (date) => {
    return date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    });
  };

  // Format date for display
  const formatDate = (date) => {
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric'
    });
  };

  // Handle station selection from list
  const handleStationSelect = (station) => {
    if (isLocked) return;
    
    setSelectedCountry(station);
    setShowInfoPanel(true);
    setIsPlaying(true);
    
    // Add to history
    setHistory(prev => {
      const newHistory = [station, ...prev.filter(h => h.streamUrl !== station.streamUrl)].slice(0, 50);
      return newHistory;
    });
    
    // Scroll to station
    scrollToStation(station.lat, station.lon);
  };

  // Find nearest station logic
  const findNearestStation = (current, excludeList = []) => {
    if (!current || stations.length === 0) return null;
    
    // Calculate distances to all other stations
    const stationsWithDist = stations
      .filter(s => s.streamUrl !== current.streamUrl && !excludeList.includes(s.streamUrl))
      .map(s => {
        // Simple Euclidean distance on lat/lon is sufficient for "nearest" finding locally
        // For global accuracy, we should use Haversine, but this is fast and good enough for neighbors
        const dLat = s.lat - current.lat;
        const dLon = s.lon - current.lon;
        const dist = Math.sqrt(dLat * dLat + dLon * dLon);
        return { ...s, dist };
      });
      
    // Sort by distance
    stationsWithDist.sort((a, b) => a.dist - b.dist);
    
    return stationsWithDist.length > 0 ? stationsWithDist[0] : null;
  };

  // Handle Next Station (Nearest)
  const handleNextStation = () => {
    if (!selectedCountry) return;
    
    // Find nearest station
    const nearest = findNearestStation(selectedCountry);
    
    if (nearest) {
      handleStationSelect(nearest);
    }
  };

  // Handle Previous Station
  const handlePrevStation = () => {
    // If we have history (more than just the current one), go back
    if (history.length > 1) {
      // Index 0 is current, Index 1 is previous
      const prevStation = history[1];
      // Move it to top of history (standard behavior) or just play it
      // handleStationSelect adds to top, so let's just use that
      handleStationSelect(prevStation);
    } else if (selectedCountry) {
      // If no history, find nearest but exclude the one we might have just come from (Next)
      // Actually, let's just find the 2nd nearest or a "random" nearest?
      // Or maybe "Previous" implies reverse direction?
      // Let's just find the nearest one that ISN'T the one we would go to with "Next"
      // to avoid a loop A -> B -> A
      const nearest = findNearestStation(selectedCountry);
      if (nearest) {
         // Find nearest excluding the primary nearest
         const secondNearest = findNearestStation(selectedCountry, [nearest.streamUrl]);
         if (secondNearest) {
            handleStationSelect(secondNearest);
         }
      }
    }
  };

  // Close info panel (but keep audio playing)
  const handleCloseInfo = () => {
    setShowInfoPanel(false);
    // Don't stop audio or clear selectedCountry - keep playing in background
  };

  // Handle play/pause button
  const handlePlayPause = () => {
    if (!hasStarted) {
      setHasStarted(true);
      setIsPlaying(true);
    } else {
      setIsPlaying(!isPlaying);
    }
  };

  return (
    <div className="earth3d-container">
      <div className="earth3d-canvas" ref={mountRef}></div>
      
      {/* Station List Overlay */}
      <StationList 
        stations={stations}
        onSelectStation={(station) => {
          handleStationSelect(station);
          setShowStationList(false);
        }}
        isOpen={showStationList}
        onClose={() => setShowStationList(false)}
        currentStation={selectedCountry}
      />
      
      {/* Play to Start Overlay */}
      {!hasStarted && !loading && (
        <div className="play-to-start-overlay">
          <div className="play-to-start-content">
            <img src={radiologo} alt="Radio Garden Logo" className="play-to-start-logo" />
            <h1 className="play-to-start-title">Radio Garden</h1>
            <p className="play-to-start-subtitle">Global Radio Player with Essentials</p>
            <button className="play-to-start-button" onClick={handleStart}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M5 3L19 12L5 21V3Z" fill="currentColor"/>
              </svg>
              <span>Press to Start</span>
            </button>
          </div>
        </div>
      )}
      
      {loading && (
        <div className="loading-overlay">
          <div className="loading-spinner"></div>
          <p>Loading Earth... {loadingProgress}%</p>
        </div>
      )}
      
      {/* Minimal Header (always visible) */}
      <div className="radio-mini-header">
        <div className="mini-time-display">
          <div className="mini-current-time">{formatTime(currentTime)}</div>
          <div className="mini-current-date">{formatDate(currentTime)}</div>
        </div>
        <img src={radiologo} alt="Radio Garden" className="header-logo" />
        <div className="mini-title">
          <span className="title-text">Radio Garden</span>
        </div>
      </div>

      {/* Favorites Button */}
      <button 
        className="favorites-button"
        onClick={() => setShowFavorites(!showFavorites)}
        title="Favorites"
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path 
            d="M12 21.35L10.55 20.03C5.4 15.36 2 12.28 2 8.5C2 5.42 4.42 3 7.5 3C9.24 3 10.91 3.81 12 5.09C13.09 3.81 14.76 3 16.5 3C19.58 3 22 5.42 22 8.5C22 12.28 18.6 15.36 13.45 20.04L12 21.35Z" 
            stroke="currentColor" 
            strokeWidth="2" 
            strokeLinecap="round" 
            strokeLinejoin="round"
            fill={favorites.length > 0 ? 'currentColor' : 'none'}
          />
        </svg>
        {favorites.length > 0 && <span className="favorites-count">{favorites.length}</span>}
      </button>

      {/* Station List Button */}
      <button 
        className={`feature-button station-list-button ${showStationList ? 'active' : ''}`}
        onClick={() => setShowStationList(!showStationList)}
        title="Station List"
        style={{ top: '180px' }}
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M8 6H21" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          <path d="M8 12H21" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          <path d="M8 18H21" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          <path d="M3 6H3.01" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          <path d="M3 12H3.01" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          <path d="M3 18H3.01" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </button>

      {/* Lock Station Button */}
      <button 
        className={`feature-button lock-button ${isLocked ? 'active' : ''}`}
        onClick={toggleLock}
        title={isLocked ? 'Unlock Station' : 'Lock Station'}
        style={{ top: '240px' }}
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          {isLocked ? (
            <>
              <rect x="3" y="11" width="18" height="11" rx="2" stroke="currentColor" strokeWidth="2" fill="currentColor" fillOpacity="0.3"/>
              <path d="M7 11V7C7 4.79086 8.79086 3 11 3H13C15.2091 3 17 4.79086 17 7V11" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
            </>
          ) : (
            <>
              <rect x="3" y="11" width="18" height="11" rx="2" stroke="currentColor" strokeWidth="2"/>
              <path d="M7 11V7C7 4.79086 8.79086 3 11 3H13C15.2091 3 17 4.79086 17 7V11" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
            </>
          )}
        </svg>
      </button>

      {/* Schedule/Alarm Button */}
      <button 
        className="feature-button alarm-button"
        onClick={() => setShowAlarms(!showAlarms)}
        title="Scheduled Alarms"
        style={{ top: '300px' }}
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2"/>
          <path d="M12 6V12L16 14" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
        </svg>
        {alarms.length > 0 && <span className="feature-count">{alarms.length}</span>}
      </button>

     {/* Surprise Me Button */}
     <button 
        className="feature-button surprise-button"
        onClick={surpriseMe}
        title="Surprise Me"
        style={{ top: '360px' }}
        disabled={isLocked}
      >
        <img 
          src="https://unpkg.com/lucide-static@latest/icons/sparkles.svg" 
          alt="Surprise" 
          style={{ width: '20px', height: '20px', filter: 'invert(58%) sepia(41%) saturate(601%) hue-rotate(76deg) brightness(92%) contrast(89%)' }} 
        />
      </button>

      {/* History/Travel Log Button */}
      <button 
        className="feature-button history-button"
        onClick={() => setShowHistory(!showHistory)}
        title="History / Travel Log"
        style={{ top: '420px' }}
      >
        <img 
          src="https://unpkg.com/lucide-static@latest/icons/scroll-text.svg" 
          alt="History" 
          style={{ width: '20px', height: '20px', filter: 'invert(58%) sepia(41%) saturate(601%) hue-rotate(76deg) brightness(92%) contrast(89%)' }} 
        />
        {history.length > 0 && <span className="feature-count">{history.length}</span>}
      </button>

      {/* Customization/Color Picker Button */}
      <button 
        className="feature-button customization-button"
        onClick={() => setShowColorPicker(!showColorPicker)}
        title="Customize"
        style={{ top: '480px' }}
      >
        <img 
          src="https://unpkg.com/lucide-static@latest/icons/palette.svg" 
          alt="Customize" 
          style={{ width: '20px', height: '20px', filter: 'invert(58%) sepia(41%) saturate(601%) hue-rotate(76deg) brightness(92%) contrast(89%)' }} 
        />
      </button>

      {/* Color Picker Menu */}
      {showColorPicker && (
        <div className="color-picker-menu">
          <div className="favorites-menu-header">
            <h3>Customization</h3>
            <button 
              className="favorites-close-btn"
              onClick={() => setShowColorPicker(false)}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M18 6L6 18M6 6L18 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
              </svg>
            </button>
          </div>
          
          {/* Stars Toggle */}
          <div className="customization-section">
            <div className="customization-label">Background Stars</div>
            <button 
              className={`stars-toggle ${showStars ? 'active' : ''}`}
              onClick={() => setShowStars(!showStars)}
              title={showStars ? 'Hide Stars' : 'Show Stars'}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                {showStars ? (
                  <path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z" fill="currentColor" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                ) : (
                  <path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
                )}
              </svg>
              <span>{showStars ? 'On' : 'Off'}</span>
            </button>
          </div>

          {/* Atmosphere Glow Toggle */}
          <div className="customization-section">
            <div className="customization-label">Atmosphere Glow</div>
            <button 
              className={`stars-toggle ${showGlow ? 'active' : ''}`}
              onClick={() => setShowGlow(!showGlow)}
              title={showGlow ? 'Hide Glow' : 'Show Glow'}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                {showGlow ? (
                  <circle cx="12" cy="12" r="6" stroke="currentColor" strokeWidth="2" fill="currentColor" fillOpacity="0.3" />
                ) : (
                  <circle cx="12" cy="12" r="6" stroke="currentColor" strokeWidth="2" fill="none" />
                )}
                <path d="M12 1V3M12 21V23M1 12H3M21 12H23M4.22 4.22L5.64 5.64M18.36 18.36L19.78 19.78M4.22 19.78L5.64 18.36M18.36 5.64L19.78 4.22" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              </svg>
              <span>{showGlow ? 'On' : 'Off'}</span>
            </button>
          </div>
          
          {/* Marker Colors */}
          <div className="customization-section">
            <div className="customization-label">Marker Colors</div>
            <div className="color-options">
            <button 
              className={`color-option ${markerColor === 0x4CAF50 ? 'active' : ''}`}
              onClick={() => setMarkerColor(0x4CAF50)}
              style={{ backgroundColor: '#4CAF50' }}
              title="Green (Default)"
            >
              {markerColor === 0x4CAF50 && (
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M20 6L9 17L4 12" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              )}
            </button>
            <button 
              className={`color-option ${markerColor === 0x2196F3 ? 'active' : ''}`}
              onClick={() => setMarkerColor(0x2196F3)}
              style={{ backgroundColor: '#2196F3' }}
              title="Blue"
            >
              {markerColor === 0x2196F3 && (
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M20 6L9 17L4 12" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              )}
            </button>
            <button 
              className={`color-option ${markerColor === 0xFF9800 ? 'active' : ''}`}
              onClick={() => setMarkerColor(0xFF9800)}
              style={{ backgroundColor: '#FF9800' }}
              title="Orange"
            >
              {markerColor === 0xFF9800 && (
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M20 6L9 17L4 12" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              )}
            </button>
            <button 
              className={`color-option ${markerColor === 0x9C27B0 ? 'active' : ''}`}
              onClick={() => setMarkerColor(0x9C27B0)}
              style={{ backgroundColor: '#9C27B0' }}
              title="Purple"
            >
              {markerColor === 0x9C27B0 && (
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M20 6L9 17L4 12" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              )}
            </button>
            <button 
              className={`color-option ${markerColor === 0xF44336 ? 'active' : ''}`}
              onClick={() => setMarkerColor(0xF44336)}
              style={{ backgroundColor: '#F44336' }}
              title="Red"
            >
              {markerColor === 0xF44336 && (
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M20 6L9 17L4 12" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              )}
            </button>
            <button 
              className={`color-option ${markerColor === 0x00BCD4 ? 'active' : ''}`}
              onClick={() => setMarkerColor(0x00BCD4)}
              style={{ backgroundColor: '#00BCD4' }}
              title="Cyan"
            >
              {markerColor === 0x00BCD4 && (
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M20 6L9 17L4 12" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              )}
            </button>
            </div>
          </div>
        </div>
      )}

      {/* Favorites Menu */}
      {showFavorites && (
        <div className="favorites-menu">
          <div className="favorites-menu-header">
            <h3>Favorites</h3>
            <button 
              className="favorites-close-btn"
              onClick={() => setShowFavorites(false)}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M18 6L6 18M6 6L18 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
              </svg>
            </button>
          </div>
          <div className="favorites-list">
            {favorites.length === 0 ? (
              <div className="favorites-empty">No favorites yet</div>
            ) : (
              favorites.map((station, index) => (
                <div 
                  key={index} 
                  className="favorite-item"
                  onClick={() => playFavorite(station)}
                >
                  <div className="favorite-info">
                    <div className="favorite-station">{station.station}</div>
                    <div className="favorite-location">{station.capital}, {station.name}</div>
                  </div>
                  <button
                    className="favorite-remove-btn"
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleFavorite(station);
                    }}
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M18 6L6 18M6 6L18 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                    </svg>
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* History Menu */}
      {showHistory && (
        <div className="history-menu">
          <div className="favorites-menu-header">
            <h3>Travel Log</h3>
            <button 
              className="favorites-close-btn"
              onClick={() => setShowHistory(false)}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M18 6L6 18M6 6L18 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
              </svg>
            </button>
          </div>
          <div className="favorites-list history-list">
            {history.length === 0 ? (
              <div className="favorites-empty">No stations played yet</div>
            ) : (
              history.map((station, index) => (
                <div 
                  key={index} 
                  className="favorite-item"
                  onClick={() => playFromHistory(station)}
                >
                  <div className="favorite-info">
                    <div className="favorite-station">{station.station}</div>
                    <div className="favorite-location">{station.capital}, {station.name}</div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* Alarms Menu */}
      {showAlarms && (
        <div className="favorites-menu" style={{ top: '300px' }}>
          <div className="favorites-menu-header">
            <h3>Scheduled Alarms</h3>
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
              <button 
                className="favorites-close-btn"
                onClick={() => setShowAlarmModal(true)}
                title="Add New Alarm"
                style={{ width: '28px', height: '28px' }}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M12 5V19M5 12H19" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                </svg>
              </button>
              <button 
                className="favorites-close-btn"
                onClick={() => setShowAlarms(false)}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M18 6L6 18M6 6L18 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                </svg>
              </button>
            </div>
          </div>
          <div className="favorites-list">
            {alarms.length === 0 ? (
              <div className="favorites-empty">No alarms scheduled</div>
            ) : (
              alarms.map((alarm) => (
                <div 
                  key={alarm.id} 
                  className="favorite-item alarm-item"
                >
                  <div className="favorite-info" style={{ flex: 1 }}>
                    <div className="favorite-station" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <button
                        className="alarm-toggle-btn"
                        onClick={() => toggleAlarm(alarm.id)}
                        title={alarm.enabled ? 'Disable' : 'Enable'}
                      >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                          {alarm.enabled ? (
                            <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" fill="currentColor" fillOpacity="0.3"/>
                          ) : (
                            <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2"/>
                          )}
                        </svg>
                      </button>
                      <span>{alarm.station.station}</span>
                    </div>
                    <div className="favorite-location">{alarm.station.capital}, {alarm.station.name}</div>
                    <div style={{ fontSize: '11px', color: 'rgba(255, 255, 255, 0.5)', marginTop: '4px' }}>
                      {alarm.time} • {getTimeUntilAlarm(alarm.time)} remaining
                    </div>
                  </div>
                  <button
                    className="favorite-remove-btn"
                    onClick={() => deleteAlarm(alarm.id)}
                    title="Delete Alarm"
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M18 6L6 18M6 6L18 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                    </svg>
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* Alarm Modal */}
      {showAlarmModal && (
        <div className="alarm-modal-overlay" onClick={() => setShowAlarmModal(false)}>
          <div className="alarm-modal" onClick={(e) => e.stopPropagation()}>
            <div className="alarm-modal-header">
              <h3>Schedule Alarm</h3>
              <button 
                className="favorites-close-btn"
                onClick={() => setShowAlarmModal(false)}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M18 6L6 18M6 6L18 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                </svg>
              </button>
            </div>
            <AlarmForm 
              selectedStation={selectedCountry}
              onSchedule={scheduleAlarm}
              onClose={() => setShowAlarmModal(false)}
            />
          </div>
        </div>
      )}
      
      {/* Click hint */}
      <div className="click-hint">
        Click on green markers to listen
      </div>
      
      {/* Mini Player (only visible when playing and panel is closed) */}
      {isPlaying && selectedCountry && !showInfoPanel && (
        <div className="mini-player" style={{ position: 'fixed', zIndex: 9999 }}>
          <div className="mini-player-info">
            <div className="mini-player-station">{selectedCountry.station}</div>
            <div className="mini-player-location">{selectedCountry.capital}</div>
          </div>
          <div className="mini-player-controls">
            <button 
              className="mini-player-play-btn"
              onClick={handlePlayPause}
              title={isPlaying ? 'Pause' : 'Play'}
            >
              {isPlaying ? (
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M10 4H6V20H10V4Z" fill="currentColor"/>
                  <path d="M18 4H14V20H18V4Z" fill="currentColor"/>
                </svg>
              ) : (
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M5 3L19 12L5 21V3Z" fill="currentColor"/>
                </svg>
              )}
            </button>
            <button 
              className="mini-player-expand-btn"
              onClick={() => setShowInfoPanel(true)}
              title="Show Details"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M12 8V16M8 12H16" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
              </svg>
            </button>
          </div>
        </div>
      )}

      {/* Info Panel (only shows when station is selected and panel is open) */}
      {showInfoPanel && selectedCountry && (
        <div className="radio-info-panel">
          <div className="info-panel-header">
            <div className="station-main-info">
              <div className="station-name-large">{selectedCountry.station}</div>
              <div className="station-location-large">
                <span className="location-icon">📍</span>
                {selectedCountry.capital}, {selectedCountry.name}
              </div>
            </div>
            <button 
              className="close-panel-btn"
              onClick={handleCloseInfo}
            >
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M13 1L1 13M1 1L13 13" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
              </svg>
            </button>
          </div>
          
          <div className="info-panel-content">
            <div className="info-grid">
              <div className="info-section">
                <div className="info-label">Frequency</div>
                <div className="frequency-value-large">{selectedCountry.frequency}</div>
              </div>
              
              <div className="info-section">
                <div className="info-label">Genre</div>
                <div className="genre-value-large">{selectedCountry.genre}</div>
              </div>
            </div>
            
            <div className="address-section">
              <div className="info-label">Station Address</div>
              <div className="address-value">{selectedCountry.address}</div>
            </div>
            
            <div className="player-controls">
              <button 
                className="player-btn prev-btn"
                onClick={handlePrevStation}
                title="Previous Station"
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M6 6V18M17 18V6L9 12L17 18Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </button>
              
              <button 
                className={`player-btn play-btn ${isPlaying ? 'playing' : ''} ${isLoadingAudio ? 'loading' : ''}`}
                onClick={handlePlayPause}
                title={isPlaying ? 'Pause' : 'Play'}
                disabled={isLoadingAudio}
              >
                {isPlaying ? (
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M10 4H6V20H10V4Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    <path d="M18 4H14V20H18V4Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                ) : (
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M5 3L19 12L5 21V3Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                )}
              </button>
              
              <button 
                className="player-btn next-btn"
                onClick={handleNextStation}
                title="Next Station"
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M18 6V18M7 18L15 12L7 6V18Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </button>
              
              <button 
                className={`player-btn fav-btn ${isFavorite ? 'active' : ''}`}
                onClick={() => selectedCountry && toggleFavorite(selectedCountry)}
                title={isFavorite ? 'Remove from Favorites' : 'Add to Favorites'}
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path 
                    d="M12 21.35L10.55 20.03C5.4 15.36 2 12.28 2 8.5C2 5.42 4.42 3 7.5 3C9.24 3 10.91 3.81 12 5.09C13.09 3.81 14.76 3 16.5 3C19.58 3 22 5.42 22 8.5C22 12.28 18.6 15.36 13.45 20.04L12 21.35Z" 
                    stroke="currentColor" 
                    strokeWidth="2" 
                    strokeLinecap="round" 
                    strokeLinejoin="round"
                    fill={isFavorite ? 'currentColor' : 'none'}
                  />
                </svg>
              </button>
            </div>
            
            {audioError && (
              <div className="audio-error-message">
                <span>⚠️</span> {audioError}
              </div>
            )}
            {isLoadingAudio && (
              <div className="audio-loading-message">
                <div className="audio-loading-spinner"></div>
                <span>Loading stream...</span>
              </div>
            )}
            <div className="signal-section">
              <div className="signal-info">
                <div className="info-label">Signal Strength</div>
                <div className="signal-bars-large">
                  <div className={`signal-bar-large ${isPlaying ? 'active' : ''}`}></div>
                  <div className={`signal-bar-large ${isPlaying ? 'active' : ''}`}></div>
                  <div className={`signal-bar-large ${isPlaying ? 'active' : ''}`}></div>
                  <div className={`signal-bar-large ${isPlaying ? 'active' : ''}`}></div>
                  <div className={`signal-bar-large ${isPlaying ? 'active' : ''}`}></div>
                </div>
              </div>
              <div className="now-playing">
                <div className="info-label">Now Playing</div>
                {detectedSong ? (
                  <div className="detected-song">
                    <div className="track-name">{detectedSong.title}</div>
                    <div className="track-artist">{detectedSong.artist}</div>
                    {detectedSong.album && (
                      <div className="track-album">{detectedSong.album}</div>
                    )}
                  </div>
                ) : isDetectingSong ? (
                  <div className="detecting-song">
                    <div className="detecting-spinner"></div>
                    <span>Detecting song...</span>
                  </div>
                ) : (
                  <div className="track-name">{selectedCountry.genre.split('&')[0].trim()} Mix</div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Earth3D;