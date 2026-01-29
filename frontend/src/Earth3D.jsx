import React, { useRef, useEffect, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';
import './Earth3D.css';

const Earth3D = () => {
  const mountRef = useRef(null);
  const [loading, setLoading] = useState(true);
  const [loadingProgress, setLoadingProgress] = useState(0);
  const [selectedCountry, setSelectedCountry] = useState(null);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [isPlaying, setIsPlaying] = useState(false);
  const [showInfoPanel, setShowInfoPanel] = useState(false);
  
  // Update current time every second
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // ASEAN countries with capital coordinates and station info
  const aseanCountries = [
    { 
      name: 'Indonesia', 
      capital: 'Jakarta', 
      lat: -6.2088, 
      lon: 106.8456,
      station: 'Radio Republik Indonesia',
      frequency: '88.8 FM',
      address: 'Jl. Merdeka Barat 9, Jakarta',
      genre: 'News & Traditional Music'
    },
    { 
      name: 'Thailand', 
      capital: 'Bangkok', 
      lat: 13.7563, 
      lon: 100.5018,
      station: 'Radio Thailand',
      frequency: '91.5 FM',
      address: 'Rama I Rd, Pathum Wan, Bangkok',
      genre: 'Pop & Luk Thung'
    },
    { 
      name: 'Vietnam', 
      capital: 'Hanoi', 
      lat: 21.0285, 
      lon: 105.8542,
      station: 'Voice of Vietnam',
      frequency: '100.0 FM',
      address: '58 Quán Sứ, Hoàn Kiếm, Hanoi',
      genre: 'Traditional & Contemporary'
    },
    { 
      name: 'Philippines', 
      capital: 'Manila', 
      lat: 14.5995, 
      lon: 120.9842,
      station: 'ABS-CBN Radio',
      frequency: '90.7 FM',
      address: 'Mother Ignacia Ave, Quezon City',
      genre: 'OPM & Talk Radio'
    },
    { 
      name: 'Malaysia', 
      capital: 'Kuala Lumpur', 
      lat: 3.1390, 
      lon: 101.6869,
      station: 'Radio Televisyen Malaysia',
      frequency: '92.9 FM',
      address: 'Angkasapuri, Kuala Lumpur',
      genre: 'Pop & Traditional'
    },
    { 
      name: 'Singapore', 
      capital: 'Singapore', 
      lat: 1.3521, 
      lon: 103.8198,
      station: 'Mediacorp Radio',
      frequency: '93.3 FM',
      address: '1 Stars Ave, Singapore',
      genre: 'International Hits'
    },
    { 
      name: 'Myanmar', 
      capital: 'Naypyidaw', 
      lat: 19.7633, 
      lon: 96.0785,
      station: 'Myanmar Radio',
      frequency: '87.9 FM',
      address: 'Naypyidaw, Myanmar',
      genre: 'Traditional Burmese Music'
    },
    { 
      name: 'Cambodia', 
      capital: 'Phnom Penh', 
      lat: 11.5564, 
      lon: 104.9282,
      station: 'National Radio of Cambodia',
      frequency: '95.0 FM',
      address: 'Phnom Penh, Cambodia',
      genre: 'Khmer Music & News'
    },
    { 
      name: 'Laos', 
      capital: 'Vientiane', 
      lat: 17.9757, 
      lon: 102.6331,
      station: 'Lao National Radio',
      frequency: '96.0 FM',
      address: 'Vientiane, Laos',
      genre: 'Traditional Lao Music'
    },
    { 
      name: 'Brunei', 
      capital: 'Bandar Seri Begawan', 
      lat: 4.9031, 
      lon: 114.9398,
      station: 'Radio Television Brunei',
      frequency: '94.1 FM',
      address: 'Bandar Seri Begawan, Brunei',
      genre: 'Islamic & Malay Music'
    }
  ];

  // Convert lat/lon to 3D coordinates on a sphere
  const latLonToVector3 = (lat, lon, radius) => {
    const phi = (90 - lat) * (Math.PI / 180);
    const theta = (lon + 180) * (Math.PI / 180);
    
    const x = -(radius * Math.sin(phi) * Math.cos(theta));
    const y = radius * Math.cos(phi);
    const z = radius * Math.sin(phi) * Math.sin(theta);
    
    return new THREE.Vector3(x, y, z);
  };

  // Create a green radio station marker with invisible click area
  const createMarker = (country, earthRadius) => {
    const position = latLonToVector3(country.lat, country.lon, earthRadius + 0.05);
    
    // Create a group to hold all marker components
    const markerGroup = new THREE.Group();
    markerGroup.position.copy(position);
    
    // Create VISIBLE green sphere marker (small)
    const markerGeometry = new THREE.SphereGeometry(0.025, 16, 16);
    const markerMaterial = new THREE.MeshBasicMaterial({ 
      color: 0x4CAF50,
      transparent: true,
      opacity: 0.9
    });
    
    const visibleMarker = new THREE.Mesh(markerGeometry, markerMaterial);
    markerGroup.add(visibleMarker);
    
    // Create INVISIBLE click area (larger for easier clicking)
    const clickGeometry = new THREE.SphereGeometry(0.06, 8, 8); // Larger invisible sphere
    const clickMaterial = new THREE.MeshBasicMaterial({ 
      color: 0x00ff00,
      transparent: true,
      opacity: 0, // Completely invisible
      depthWrite: false // Don't interfere with depth buffer
    });
    
    const clickArea = new THREE.Mesh(clickGeometry, clickMaterial);
    markerGroup.add(clickArea);
    
    // Add a static pulse ring (no animation)
    const pulseGeometry = new THREE.SphereGeometry(0.04, 8, 8);
    const pulseMaterial = new THREE.MeshBasicMaterial({ 
      color: 0x4CAF50,
      transparent: true,
      opacity: 0.3,
      side: THREE.DoubleSide
    });
    const pulseRing = new THREE.Mesh(pulseGeometry, pulseMaterial);
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
    if (!mountRef.current) return;

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
        
        // Create ASEAN markers
        const markerGroups = [];
        const clickAreas = []; // Separate array for click detection
        
        aseanCountries.forEach(country => {
          const { markerGroup, clickArea } = createMarker(country, earthRadius);
          earth.add(markerGroup);
          markerGroups.push(markerGroup);
          clickAreas.push(clickArea);
        });

        // NO STARS BACKGROUND - completely removed
        // Everything is now static

        // Add orbit controls with NO auto-rotation
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

        // Mouse click handler - IMPROVED
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
            setSelectedCountry(countryData);
            setShowInfoPanel(true);
            setIsPlaying(true);
            
            // Visual feedback on the visible marker
            if (clickArea.userData.visibleMarker) {
              clickArea.userData.visibleMarker.material.color.setHex(0xffffff);
              setTimeout(() => {
                clickArea.userData.visibleMarker.material.color.setHex(0x4CAF50);
              }, 300);
            }
          } else {
            setShowInfoPanel(false);
            setIsPlaying(false);
            setSelectedCountry(null);
          }
        };

        // Mouse move handler for hover effect - IMPROVED
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
        scene.userData.earthTexture = texture;
        scene.userData.clickHandler = handleClick;
        scene.userData.mouseMoveHandler = handleMouseMove;

        // Main animation loop - NO ANIMATIONS AT ALL
        const animate = () => {
          scene.userData.animationId = requestAnimationFrame(animate);
          
          // NO earth rotation - completely stationary
          // NO pulse animation - completely static
          // NO star animation - removed entirely
          
          controls.update();
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
  }, []);

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

  // Close info panel
  const handleCloseInfo = () => {
    setShowInfoPanel(false);
    setSelectedCountry(null);
    setIsPlaying(false);
  };

  return (
    <div className="earth3d-container">
      <div className="earth3d-canvas" ref={mountRef}></div>
      
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
        <div className="mini-title">
          <span className="mini-radio-icon">🌍</span>
          <span className="title-text">ASEAN Radio Network</span>
        </div>
      </div>
      
      {/* Click hint */}
      <div className="click-hint">
        Click on green markers to listen
      </div>
      
      {/* Info Panel (only shows when station is selected) */}
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
                title="Previous Station"
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M6 6V18M17 18V6L9 12L17 18Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </button>
              
              <button 
                className={`player-btn play-btn ${isPlaying ? 'playing' : ''}`}
                onClick={() => setIsPlaying(!isPlaying)}
                title={isPlaying ? 'Pause' : 'Play'}
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
                title="Next Station"
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M18 6V18M7 18L15 12L7 6V18Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </button>
              
              <button 
                className="player-btn fav-btn"
                title="Add to Favorites"
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M12 21.35L10.55 20.03C5.4 15.36 2 12.28 2 8.5C2 5.42 4.42 3 7.5 3C9.24 3 10.91 3.81 12 5.09C13.09 3.81 14.76 3 16.5 3C19.58 3 22 5.42 22 8.5C22 12.28 18.6 15.36 13.45 20.04L12 21.35Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </button>
            </div>
            
            <div className="signal-section">
              <div className="signal-info">
                <div className="info-label">Signal Strength</div>
                <div className="signal-bars-large">
                  <div className="signal-bar-large active"></div>
                  <div className="signal-bar-large active"></div>
                  <div className="signal-bar-large active"></div>
                  <div className="signal-bar-large"></div>
                  <div className="signal-bar-large"></div>
                </div>
              </div>
              <div className="now-playing">
                <div className="info-label">Now Playing</div>
                <div className="track-name">{selectedCountry.genre.split('&')[0].trim()} Mix</div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Earth3D;