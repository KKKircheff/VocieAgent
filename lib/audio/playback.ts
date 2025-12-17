/**
 * Audio Playback Utilities
 * Handles decoding and playing audio responses from Gemini Live API
 */

/**
 * Pure function: Convert Base64 string to Uint8Array
 */
export function base64ToUint8Array(base64: string): Uint8Array {
  const binaryString = atob(base64);
  const bytes = new Uint8Array(binaryString.length);

  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }

  return bytes;
}

/**
 * Pure function: Convert Uint8Array to Int16Array
 */
export function uint8ToInt16(uint8Array: Uint8Array): Int16Array {
  return new Int16Array(uint8Array.buffer, uint8Array.byteOffset, uint8Array.length / 2);
}

/**
 * Pure function: Convert Int16Array to Float32Array
 */
export function int16ToFloat32(int16Array: Int16Array): Float32Array {
  const float32Array = new Float32Array(int16Array.length);

  for (let i = 0; i < int16Array.length; i++) {
    float32Array[i] = int16Array[i] / (int16Array[i] < 0 ? 0x8000 : 0x7fff);
  }

  return float32Array;
}

/**
 * Pure function composition: Convert Base64 directly to Float32Array
 */
export function base64ToFloat32(base64: string): Float32Array {
  return int16ToFloat32(uint8ToInt16(base64ToUint8Array(base64)));
}

/**
 * Create an audio player for handling Gemini audio responses
 * Manages AudioContext and audio buffer playback
 */
export function createAudioPlayer(sampleRate: number = 24000) {
  let audioContext: AudioContext | null = null;
  let gainNode: GainNode | null = null;
  let currentSource: AudioBufferSourceNode | null = null;
  const audioQueue: AudioBuffer[] = [];
  let isPlaying = false;

  // Initialize audio context
  const init = () => {
    if (!audioContext) {
      audioContext = new AudioContext({ sampleRate });
      gainNode = audioContext.createGain();
      gainNode.connect(audioContext.destination);
    }
  };

  // Play next audio buffer in queue
  const playNext = () => {
    if (!audioContext || !gainNode || audioQueue.length === 0) {
      isPlaying = false;
      return;
    }

    isPlaying = true;
    const buffer = audioQueue.shift()!;

    currentSource = audioContext.createBufferSource();
    currentSource.buffer = buffer;
    currentSource.connect(gainNode);

    currentSource.onended = () => {
      currentSource = null;
      playNext();
    };

    currentSource.start(0);
  };

  // Play base64-encoded PCM audio
  const play = async (base64Audio: string): Promise<void> => {
    init();

    if (!audioContext) {
      throw new Error('Failed to initialize AudioContext');
    }

    try {
      // Convert base64 to Float32Array
      const float32Data = base64ToFloat32(base64Audio);

      // Create audio buffer
      const audioBuffer = audioContext.createBuffer(1, float32Data.length, sampleRate);
      audioBuffer.getChannelData(0).set(float32Data);

      // Add to queue and play if not already playing
      audioQueue.push(audioBuffer);

      if (!isPlaying) {
        playNext();
      }
    } catch (error) {
      console.error('Error playing audio:', error);
      throw error;
    }
  };

  // Stop current playback
  const stop = () => {
    if (currentSource) {
      currentSource.stop();
      currentSource.disconnect();
      currentSource = null;
    }
    audioQueue.length = 0;
    isPlaying = false;
  };

  // Set volume (0-1)
  const setVolume = (volume: number) => {
    if (gainNode) {
      gainNode.gain.value = Math.max(0, Math.min(1, volume));
    }
  };

  // Cleanup
  const cleanup = () => {
    stop();
    if (audioContext) {
      audioContext.close();
      audioContext = null;
      gainNode = null;
    }
  };

  return {
    play,
    stop,
    setVolume,
    cleanup,
    isPlaying: () => isPlaying,
  };
}
