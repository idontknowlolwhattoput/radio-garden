class SongDetectionService {
  constructor() {
    this.audioContext = null;
    this.analyser = null;
    this.source = null;
    this.isDetecting = false;
    this.detectionInterval = null;
    this.currentSong = null;
    this.onSongDetected = null;

    this.shazamConfig = {
      apiKey: '15f4b239b2mshaeeae7ac5ddf658p16cffdjsn05fdf1b05836', 

      apiHost: 'shazam-api7.p.rapidapi.com',
      baseUrl: 'https://shazam-api7.p.rapidapi.com'
    };
  }

  async initialize(audioElement) {
    try {

      this.audioContext = new (window.AudioContext || window.webkitAudioContext)();

      this.source = this.audioContext.createMediaElementSource(audioElement);

      this.analyser = this.audioContext.createAnalyser();
      this.analyser.fftSize = 2048;
      this.analyser.smoothingTimeConstant = 0.8;

      this.source.connect(this.analyser);
      this.source.connect(this.audioContext.destination);

      return true;
    } catch (error) {
      console.error('Failed to initialize audio context:', error);
      return false;
    }
  }

  async startDetection(audioElement, onSongDetectedCallback) {
    if (this.isDetecting) return;

    this.onSongDetected = onSongDetectedCallback;

    const initialized = await this.initialize(audioElement);
    if (!initialized) {
      console.error('Failed to initialize audio detection');
      return;
    }

    this.isDetecting = true;

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
      } catch (e) {

      }
    }

    if (this.audioContext && this.audioContext.state !== 'closed') {
      this.audioContext.close();
    }
  }

  async detectSong(audioElement) {
    if (!this.analyser || !audioElement || audioElement.paused) {
      console.log('Song detection skipped: analyser not ready or audio paused');
      return;
    }

    try {
      console.log('Starting song detection...');

      const audioData = await this.captureAudioSample();
      console.log('Audio sample captured, sending to Shazam API...');

      const songInfo = await this.identifyWithShazam(audioData);

      if (songInfo && songInfo.track) {
        const track = songInfo.track;
        const detectedSong = {
          title: track.title || 'Unknown',
          artist: track.subtitle || track.artist || 'Unknown Artist',
          album: track.sections?.[0]?.metadata?.[0]?.text || track.album || '',
          duration: track.duration || 0,
          timestamp: new Date().toISOString()
        };

        console.log('Song detected:', detectedSong);
        this.currentSong = detectedSong;
        if (this.onSongDetected) {
          this.onSongDetected(detectedSong);
        }
      } else if (songInfo === null) {

        console.log('Song detection failed, will retry on next interval');
      } else {
        console.log('No track data in Shazam response');
      }
    } catch (error) {
      console.error('Song detection error:', error);
    }
  }

  async captureAudioSample() {
    return new Promise((resolve) => {
      const bufferLength = this.analyser.frequencyBinCount;
      const dataArray = new Uint8Array(bufferLength);

      const samples = [];
      let sampleCount = 0;
      const maxSamples = 10; 

      const captureSample = () => {
        this.analyser.getByteFrequencyData(dataArray);
        samples.push([...dataArray]);
        sampleCount++;

        if (sampleCount < maxSamples) {
          setTimeout(captureSample, 100);
        } else {
          resolve(samples);
        }
      };

      captureSample();
    });
  }

  async identifyWithShazam(audioData) {

    if (!this.shazamConfig.apiKey || this.shazamConfig.apiKey === 'YOUR_RAPIDAPI_KEY') {
      console.warn('Shazam API key not configured. Please add your RapidAPI key in songDetection.js');

      return this.getMockSongData();
    }

    try {

      const audioBuffer = this.convertToAudioBuffer(audioData);
      const base64Audio = await this.audioBufferToBase64(audioBuffer);

      const endpoints = [
        { url: `${this.shazamConfig.baseUrl}/songs/detect`, body: { audio_base64: base64Audio } },
        { url: `${this.shazamConfig.baseUrl}/songs/detect`, body: { audio: base64Audio } },
        { url: `${this.shazamConfig.baseUrl}/songs/recognize`, body: { audio_base64: base64Audio } },
        { url: `${this.shazamConfig.baseUrl}/search`, body: { audio_base64: base64Audio } }
      ];

      let lastError = null;
      for (const endpoint of endpoints) {
        try {
          console.log(`Trying Shazam endpoint: ${endpoint.url}`);
          const response = await fetch(endpoint.url, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'X-RapidAPI-Key': this.shazamConfig.apiKey,
              'X-RapidAPI-Host': this.shazamConfig.apiHost
            },
            body: JSON.stringify(endpoint.body)
          });

          if (!response.ok) {
            const errorText = await response.text();
            console.log(`Endpoint ${endpoint.url} returned ${response.status}:`, errorText);
            lastError = new Error(`Shazam API error: ${response.status} - ${errorText}`);
            continue; 

          }

          const result = await response.json();
          console.log('Shazam API response:', result);

          if (result && result.track) {
            return result;
          } else if (result && result.matches && result.matches.length > 0) {

            return { track: result.matches[0].track };
          } else if (result && result.data && result.data.length > 0) {

            return { track: result.data[0].track };
          } else {
            console.warn('Shazam API returned no track data:', result);
            continue; 

          }
        } catch (endpointError) {
          console.log(`Endpoint ${endpoint.url} failed:`, endpointError);
          lastError = endpointError;
          continue;
        }
      }

      throw lastError || new Error('All Shazam API endpoints failed');
    } catch (error) {
      console.error('Shazam identification error:', error);

      return null;
    }
  }

  async identifyWithShazamFingerprint(audioData) {
    if (this.shazamConfig.apiKey === 'YOUR_RAPIDAPI_KEY') {
      return this.getMockSongData();
    }

    try {

      const fingerprint = await this.createAudioFingerprint(audioData);

      const response = await fetch(`${this.shazamConfig.baseUrl}/songs/search`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-RapidAPI-Key': this.shazamConfig.apiKey,
          'X-RapidAPI-Host': this.shazamConfig.apiHost
        },
        body: JSON.stringify({
          fingerprint: fingerprint
        })
      });

      if (!response.ok) {
        throw new Error(`Shazam API error: ${response.status}`);
      }

      const result = await response.json();
      return result;
    } catch (error) {
      console.error('Shazam fingerprint identification error:', error);
      return this.getMockSongData();
    }
  }

  convertToAudioBuffer(samples) {
    const sampleRate = 44100;
    const length = samples.length * samples[0].length;
    const buffer = this.audioContext.createBuffer(1, length, sampleRate);
    const channelData = buffer.getChannelData(0);

    let index = 0;
    samples.forEach(sample => {
      sample.forEach(value => {
        channelData[index++] = (value / 255) * 2 - 1;
      });
    });

    return buffer;
  }

  async audioBufferToBase64(audioBuffer) {

    const wav = this.audioBufferToWav(audioBuffer);
    const base64 = btoa(String.fromCharCode(...new Uint8Array(wav)));
    return base64;
  }

  audioBufferToWav(audioBuffer) {
    const length = audioBuffer.length;
    const sampleRate = audioBuffer.sampleRate;
    const arrayBuffer = new ArrayBuffer(44 + length * 2);
    const view = new DataView(arrayBuffer);
    const channelData = audioBuffer.getChannelData(0);

    const writeString = (offset, string) => {
      for (let i = 0; i < string.length; i++) {
        view.setUint8(offset + i, string.charCodeAt(i));
      }
    };

    writeString(0, 'RIFF');
    view.setUint32(4, 36 + length * 2, true);
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
    view.setUint32(40, length * 2, true);

    let offset = 44;
    for (let i = 0; i < length; i++) {
      const sample = Math.max(-1, Math.min(1, channelData[i]));
      view.setInt16(offset, sample < 0 ? sample * 0x8000 : sample * 0x7FFF, true);
      offset += 2;
    }

    return arrayBuffer;
  }

  async createAudioFingerprint(audioData) {

    const bufferLength = audioData[0].length;
    const fingerprint = [];

    audioData.forEach(sample => {
      const sum = sample.reduce((a, b) => a + b, 0);
      const avg = sum / bufferLength;
      fingerprint.push(Math.round(avg));
    });

    return fingerprint.join(',');
  }

  getMockSongData() {
    const mockSongs = [
      { track: { title: 'Song Title', subtitle: 'Artist Name', duration: 180000, sections: [{ metadata: [{ text: 'Album Name' }] }] } },
      { track: { title: 'Another Song', subtitle: 'Another Artist', duration: 200000, sections: [{ metadata: [{ text: 'Another Album' }] }] } },
      { track: { title: 'Popular Track', subtitle: 'Popular Artist', duration: 195000, sections: [{ metadata: [{ text: 'Popular Album' }] }] } }
    ];

    return mockSongs[Math.floor(Math.random() * mockSongs.length)];
  }

  setApiKey(apiKey) {
    this.shazamConfig.apiKey = apiKey;
  }
}

export default new SongDetectionService();

