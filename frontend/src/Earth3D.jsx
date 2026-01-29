import React, { useRef, useEffect, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';
import './Earth3D.css';

const Earth3D = () => {
  const mountRef = useRef(null);
  const [loading, setLoading] = useState(true);
  const [loadingProgress, setLoadingProgress] = useState(0);
  
  useEffect(() => {
    if (!mountRef.current) return;

    // Scene setup
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x000011);
    
    const camera = new THREE.PerspectiveCamera(
      45,
      mountRef.current.clientWidth / mountRef.current.clientHeight,
      0.1,
      1000
    );
    camera.position.z = 5;

    const renderer = new THREE.WebGLRenderer({ 
      antialias: true, 
      alpha: false,
      powerPreference: "high-performance"
    });
    renderer.setSize(mountRef.current.clientWidth, mountRef.current.clientHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    mountRef.current.appendChild(renderer.domElement);

    // Lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.7);
    scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 1.2);
    directionalLight.position.set(5, 3, 5);
    scene.add(directionalLight);

    // Create Earth sphere
    const earthGeometry = new THREE.SphereGeometry(2, 128, 128);
    
    // Simple color map URL
    const colorMapUrl = 'https://raw.githubusercontent.com/mrdoob/three.js/dev/examples/textures/planets/earth_atmos_2048.jpg';
    
    // Load texture
    const textureLoader = new THREE.TextureLoader();
    
    textureLoader.load(
      colorMapUrl,
      (texture) => {
        texture.anisotropy = renderer.capabilities.getMaxAnisotropy();
        
        // Create Earth material with just the color map
        const earthMaterial = new THREE.MeshPhongMaterial({
          map: texture,
          specular: new THREE.Color(0x333333),
          shininess: 10
        });
        
        const earth = new THREE.Mesh(earthGeometry, earthMaterial);
        scene.add(earth);
        setLoading(false);

        // Create clouds layer (optional - using a simple transparent sphere)
        const cloudsGeometry = new THREE.SphereGeometry(2.05, 64, 64);
        const cloudsMaterial = new THREE.MeshPhongMaterial({
          color: 0xffffff,
          transparent: true,
          opacity: 0.15,
          depthWrite: false,
          side: THREE.DoubleSide
        });
        
        const clouds = new THREE.Mesh(cloudsGeometry, cloudsMaterial);
        scene.add(clouds);
        
        // Create stars background
        const starsGeometry = new THREE.BufferGeometry();
        const starCount = 5000;
        const starPositions = new Float32Array(starCount * 3);
        
        for (let i = 0; i < starCount; i++) {
          starPositions[i * 3] = (Math.random() - 0.5) * 2000;
          starPositions[i * 3 + 1] = (Math.random() - 0.5) * 2000;
          starPositions[i * 3 + 2] = (Math.random() - 0.5) * 2000;
        }
        
        starsGeometry.setAttribute('position', new THREE.BufferAttribute(starPositions, 3));
        
        const starsMaterial = new THREE.PointsMaterial({
          size: 0.7,
          color: 0xffffff,
          transparent: true,
          opacity: 0.8
        });
        
        const stars = new THREE.Points(starsGeometry, starsMaterial);
        scene.add(stars);

        // Add orbit controls
        const controls = new OrbitControls(camera, renderer.domElement);
        controls.enableDamping = true;
        controls.dampingFactor = 0.05;
        controls.minDistance = 2.5;
        controls.maxDistance = 20;
        controls.autoRotate = true;
        controls.autoRotateSpeed = 0.3;

        // Store references for cleanup
        scene.userData.earth = earth;
        scene.userData.clouds = clouds;
        scene.userData.controls = controls;
        scene.userData.earthTexture = texture;

        // Animation
        const animate = () => {
          requestAnimationFrame(animate);
          
          // Auto rotate Earth and clouds
          earth.rotation.y += 0.001;
          clouds.rotation.y += 0.0012;
          
          controls.update();
          renderer.render(scene, camera);
        };
        
        scene.userData.animationId = requestAnimationFrame(animate);
      },
      (progress) => {
        // Update loading progress
        const percent = Math.round((progress.loaded / progress.total) * 100);
        setLoadingProgress(percent);
      },
      (error) => {
        console.error('Failed to load Earth texture:', error);
        setLoading(false);
        // Create a fallback Earth with color
        const earthMaterial = new THREE.MeshPhongMaterial({
          color: 0x2233ff,
          specular: 0x333333,
          shininess: 10
        });
        const earth = new THREE.Mesh(earthGeometry, earthMaterial);
        scene.add(earth);
        scene.userData.earth = earth;
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
      
      if (mountRef.current && renderer.domElement.parentNode === mountRef.current) {
        mountRef.current.removeChild(renderer.domElement);
      }
      
      // Dispose all resources
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

  return (
    <div className="earth3d-container">
      <div className="earth3d-canvas" ref={mountRef}></div>
      
      {loading && (
        <div className="loading-overlay">
          <div className="loading-spinner"></div>
          <p>Loading Earth... {loadingProgress}%</p>
        </div>
      )}
      
 
    </div>
  );
};

export default Earth3D;