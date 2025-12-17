/**
 * Audio Capture Utilities
 * Handles microphone access, audio processing, and PCM conversion for Gemini Live API
 */

import type { AudioConfig } from '../types';

// Default audio configuration for Gemini Live API
export const DEFAULT_AUDIO_CONFIG: AudioConfig = {
  sampleRate: 16000, // 16kHz required by Gemini
  channels: 1,       // Mono
  bufferSize: 4096,  // Process 4096 samples at a time
};

/**
 * Request microphone access with specific audio constraints
 */
export async function requestMicrophoneAccess(sampleRate: number = 16000): Promise<MediaStream> {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({
      audio: {
        sampleRate: { ideal: sampleRate },
        channelCount: { ideal: 1 },
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true,
      },
    });
    return stream;
  } catch (error) {
    throw new Error(`Failed to access microphone: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Pure function: Convert Float32Array to Int16Array (PCM 16-bit)
 */
export function float32ToInt16(float32Array: Float32Array): Int16Array {
  const int16Array = new Int16Array(float32Array.length);

  for (let i = 0; i < float32Array.length; i++) {
    // Clamp value between -1 and 1
    const clamped = Math.max(-1, Math.min(1, float32Array[i]));
    // Convert to 16-bit integer
    int16Array[i] = clamped < 0 ? clamped * 0x8000 : clamped * 0x7fff;
  }

  return int16Array;
}

/**
 * Pure function: Convert Int16Array to Base64 string
 */
export function int16ToBase64(int16Array: Int16Array): string {
  const uint8Array = new Uint8Array(int16Array.buffer);
  let binary = '';

  for (let i = 0; i < uint8Array.length; i++) {
    binary += String.fromCharCode(uint8Array[i]);
  }

  return btoa(binary);
}

/**
 * Pure function composition: Convert Float32Array directly to Base64
 */
export function float32ToBase64(float32Array: Float32Array): string {
  return int16ToBase64(float32ToInt16(float32Array));
}

/**
 * Pure function: Resample audio from one sample rate to another
 * Uses linear interpolation for simplicity
 */
export function resampleAudio(
  inputData: Float32Array,
  fromRate: number,
  toRate: number
): Float32Array {
  if (fromRate === toRate) return inputData;

  const ratio = fromRate / toRate;
  const outputLength = Math.round(inputData.length / ratio);
  const output = new Float32Array(outputLength);

  for (let i = 0; i < outputLength; i++) {
    const position = i * ratio;
    const index = Math.floor(position);
    const fraction = position - index;

    if (index + 1 < inputData.length) {
      // Linear interpolation
      output[i] = inputData[index] * (1 - fraction) + inputData[index + 1] * fraction;
    } else {
      output[i] = inputData[index];
    }
  }

  return output;
}

/**
 * Create an audio processor using AudioContext and ScriptProcessorNode
 * Returns a function to start capturing and a function to stop
 */
export function createAudioProcessor(
  config: AudioConfig = DEFAULT_AUDIO_CONFIG
): {
  start: (onAudioChunk: (base64: string) => void) => Promise<() => void>;
  getAnalyser: () => AnalyserNode | null;
} {
  let audioContext: AudioContext | null = null;
  let analyserNode: AnalyserNode | null = null;
  let mediaStream: MediaStream | null = null;
  let processorNode: ScriptProcessorNode | null = null;
  let sourceNode: MediaStreamAudioSourceNode | null = null;

  const start = async (onAudioChunk: (base64: string) => void): Promise<() => void> => {
    // Get microphone access
    mediaStream = await requestMicrophoneAccess(config.sampleRate);

    // Create audio context with default sample rate (browser native)
    // This avoids sample rate mismatch errors
    audioContext = new AudioContext();

    // Create analyser for visualization
    analyserNode = audioContext.createAnalyser();
    analyserNode.fftSize = 2048;

    // Create source from media stream
    sourceNode = audioContext.createMediaStreamSource(mediaStream);

    // Create script processor for audio data
    // Use browser's native sample rate to avoid mismatches
    processorNode = audioContext.createScriptProcessor(
      config.bufferSize,
      config.channels,
      config.channels
    );

    // Process audio data
    processorNode.onaudioprocess = (event) => {
      const inputData = event.inputBuffer.getChannelData(0);
      const nativeSampleRate = audioContext!.sampleRate;

      // Resample if needed (browser native -> 16kHz for Gemini)
      let processedData = inputData;
      if (nativeSampleRate !== config.sampleRate) {
        processedData = resampleAudio(inputData, nativeSampleRate, config.sampleRate);
      }

      // Convert to base64 and send
      const base64Audio = float32ToBase64(processedData);
      onAudioChunk(base64Audio);
    };

    // Connect audio nodes
    sourceNode.connect(analyserNode);
    analyserNode.connect(processorNode);
    processorNode.connect(audioContext.destination);

    // Return stop function
    return () => {
      if (processorNode) {
        processorNode.disconnect();
        processorNode = null;
      }
      if (sourceNode) {
        sourceNode.disconnect();
        sourceNode = null;
      }
      if (mediaStream) {
        mediaStream.getTracks().forEach((track) => track.stop());
        mediaStream = null;
      }
      if (audioContext) {
        audioContext.close();
        audioContext = null;
      }
      analyserNode = null;
    };
  };

  const getAnalyser = () => analyserNode;

  return { start, getAnalyser };
}

/**
 * Calculate volume level from analyser (0-100)
 */
export function calculateVolumeLevel(analyser: AnalyserNode): number {
  const dataArray = new Uint8Array(analyser.frequencyBinCount);
  analyser.getByteTimeDomainData(dataArray);

  let sum = 0;
  for (let i = 0; i < dataArray.length; i++) {
    const normalized = (dataArray[i] - 128) / 128;
    sum += normalized * normalized;
  }

  const rms = Math.sqrt(sum / dataArray.length);
  return Math.min(100, Math.round(rms * 200)); // Scale to 0-100
}
