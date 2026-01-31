class SongDetectionService {
  constructor() {
    this.audioContext = null;
    this.source = null;
    this.processor = null;
    this.isDetecting = false;
    this.detectionInterval = null;
    this.onSongDetected = null;
    this.auddConfig = {
      apiToken: '9d3405425f45268e656da60daf37f7f2', 
      baseUrl: 'https://api.audd.io/'
    };
  }

  async initialize(audioElement) {
    try {
      if (!this.audioContext) {
        this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
      }

      if (this.audioContext.state === 'suspended') {
        await this.audioContext.resume();
      }

      if (this.source) {
        this.source.disconnect();
      }

      this.source = this.audioContext.createMediaElementSource(audioElement);
      this.source.connect(this.audioContext.destination);

      return true;
    } catch (error) {
      return false;
    }
  }

  async startDetection(audioElement, onSongDetectedCallback, onStatusCallback) {
    if (this.isDetecting) return;

    this.onSongDetected = onSongDetectedCallback;
    this.onStatus = onStatusCallback;

    const initialized = await this.initialize(audioElement);
    if (!initialized) {
      if (this.onStatus) this.onStatus('error', 'Initialization failed');
      return;
    }

    this.isDetecting = true;
    if (this.onStatus) this.onStatus('detecting');

    this.detectionInterval = setInterval(() => {
      this.detectSong(audioElement);
    }, 30000);

    setTimeout(() => {
      this.detectSong(audioElement);
    }, 5000);
  }

  stopDetection() {
    this.isDetecting = false;
    if (this.detectionInterval) {
      clearInterval(this.detectionInterval);
      this.detectionInterval = null;
    }

    if (this.source) {
      try {
        this.source.disconnect();
      } catch (e) {}
    }

    if (this.processor) {
      try {
        this.processor.disconnect();
      } catch (e) {}
    }
    
    this.onSongDetected = null;
    this.onStatus = null;
  }

  async detectSong(audioElement) {
    if (!audioElement || audioElement.paused) {
      return;
    }
    
    if (this.onStatus) this.onStatus('detecting');

    try {
      const audioData = await this.captureAudioSample();
      
      if (this.isSilence(audioData)) {
        if (this.onStatus) this.onStatus('error', 'Stream protected');
        return; 
      }

      const songInfo = await this.identifyWithAudD(audioData);

      if (songInfo) {
        const detectedSong = {
          title: songInfo.title || 'Unknown',
          artist: songInfo.artist || 'Unknown Artist',
          album: songInfo.album || '',
          duration: 0,
          timestamp: new Date().toISOString()
        };

        if (this.onSongDetected) {
          this.onSongDetected(detectedSong);
        }
        if (this.onStatus) this.onStatus('success');
      } else {
        if (this.onStatus) this.onStatus('no-match');
      }
    } catch (error) {
      if (this.onStatus) this.onStatus('error', error.message);
    }
  }

  isSilence(audioData) {
    let sum = 0;
    for (let i = 0; i < audioData.length; i++) {
      sum += Math.abs(audioData[i]);
    }
    const average = sum / audioData.length;
    return average < 0.001; 
  }

  async captureAudioSample() {
    return new Promise((resolve, reject) => {
      if (!this.audioContext || !this.source) {
        reject(new Error('Audio context not initialized'));
        return;
      }

      const bufferSize = 4096;
      const channels = 1;
      const duration = 4; 
      const sampleRate = this.audioContext.sampleRate;
      const totalSamples = sampleRate * duration;
      const collectedSamples = new Float32Array(totalSamples);
      let offset = 0;

      this.processor = this.audioContext.createScriptProcessor(bufferSize, channels, channels);

      this.processor.onaudioprocess = (e) => {
        const inputData = e.inputBuffer.getChannelData(0);
        
        if (offset + inputData.length > totalSamples) {
          const remaining = totalSamples - offset;
          collectedSamples.set(inputData.subarray(0, remaining), offset);
          offset += remaining;
        } else {
          collectedSamples.set(inputData, offset);
          offset += inputData.length;
        }

        if (offset >= totalSamples) {
          this.processor.disconnect();
          this.source.disconnect(this.processor);
          resolve(collectedSamples);
        }
      };

      this.source.connect(this.processor);
      this.processor.connect(this.audioContext.destination);
    });
  }

  async identifyWithAudD(audioData) {
    try {
      const base64Audio = this.encodeWAV(audioData);

      const formData = new FormData();
      formData.append('api_token', this.auddConfig.apiToken);
      formData.append('audio', base64Audio);
      formData.append('return', 'apple_music,spotify');

      const response = await fetch(this.auddConfig.baseUrl, {
        method: 'POST',
        body: formData
      });

      const result = await response.json();

      if (result && result.status === 'success' && result.result) {
        return result.result;
      }
      return null;
    } catch (error) {
      return null;
    }
  }

  encodeWAV(samples) {
    const sampleRate = this.audioContext.sampleRate;
    const buffer = new ArrayBuffer(44 + samples.length * 2);
    const view = new DataView(buffer);

    const writeString = (offset, string) => {
      for (let i = 0; i < string.length; i++) {
        view.setUint8(offset + i, string.charCodeAt(i));
      }
    };

    writeString(0, 'RIFF');
    view.setUint32(4, 36 + samples.length * 2, true);
    writeString(8, 'WAVE');
    writeString(12, 'fmt ');
    view.setUint32(16, 16, true);
    view.setUint16(20, 1, true);
    view.setUint16(22, 1, true);
    view.setUint32(24, sampleRate, true);
    view.setUint32(28, sampleRate * 2, true);
    view.setUint16(32, 2, true);
    view.setUint16(34, 16, true);
    writeString(36, 'data');
    view.setUint32(40, samples.length * 2, true);

    let offset = 44;
    for (let i = 0; i < samples.length; i++) {
      const s = Math.max(-1, Math.min(1, samples[i]));
      view.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7FFF, true);
      offset += 2;
    }

    let binary = '';
    const bytes = new Uint8Array(buffer);
    const len = bytes.byteLength;
    for (let i = 0; i < len; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return window.btoa(binary);
  }
}

export default new SongDetectionService();
