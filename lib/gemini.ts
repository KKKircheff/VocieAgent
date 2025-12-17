/**
 * Gemini Live API Session Wrapper
 * Handles WebSocket connection, audio streaming, and message processing
 */

import { GoogleGenAI } from '@google/genai';
import type { LiveSession, ServerMessage, SessionConfig } from './types';

// Model names
export const GEMINI_MODELS = {
  LIVE_FLASH: 'gemini-live-2.5-flash-preview',
  LIVE_FLASH_NATIVE: 'gemini-2.5-flash-native-audio-preview-12-2025',
} as const;

/**
 * Create and connect to Gemini Live API session
 */
export async function connectLiveSession(
  apiKey: string,
  systemInstruction: string,
  callbacks: {
    onOpen?: () => void;
    onMessage?: (message: ServerMessage) => void;
    onError?: (error: Error) => void;
    onClose?: (reason: string) => void;
  }
): Promise<LiveSession> {
  if (!apiKey) {
    throw new Error('API key is required. Please set NEXT_PUBLIC_GEMINI_API_KEY in .env.local');
  }

  try {
    // Initialize Gemini client
    const ai = new GoogleGenAI({ apiKey });

    // Session configuration
    const config: SessionConfig = {
      model: GEMINI_MODELS.LIVE_FLASH_NATIVE,
      systemInstruction,
      responseModalities: ['AUDIO'],
    };

    // Connect to Live API with callbacks
    const session = await ai.live.connect({
      model: config.model,
      config: {
        responseModalities: config.responseModalities,
        systemInstruction: config.systemInstruction,
      },
      callbacks: {
        onopen: () => {
          console.log('[Gemini] Connected');
          callbacks.onOpen?.();
        },
        onmessage: (message: ServerMessage) => {
          callbacks.onMessage?.(message);
        },
        onerror: (event: any) => {
          console.error('[Gemini] Error:', event.message || 'Connection error');
          const error = new Error(event.message || 'WebSocket error occurred');
          callbacks.onError?.(error);
        },
        onclose: (event: any) => {
          console.log('[Gemini] Disconnected');
          callbacks.onClose?.(event.reason || 'Connection closed');
        },
      },
    });

    return session as LiveSession;
  } catch (error) {
    console.error('[Gemini] Failed to connect:', error);
    throw new Error(`Failed to connect to Gemini Live API: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Send audio chunk to Gemini session
 */
export function sendAudioChunk(session: LiveSession, base64Audio: string): void {
  try {
    session.sendRealtimeInput({
      audio: {
        data: base64Audio,
        mimeType: 'audio/pcm;rate=16000',
      },
    });
  } catch (error) {
    console.error('[Gemini] Send error:', error);
    throw error;
  }
}

/**
 * Parse server message and extract relevant data
 */
export function parseServerMessage(message: any): {
  text?: string;
  audioData?: string;
  turnComplete: boolean;
} {
  const result = {
    text: undefined as string | undefined,
    audioData: undefined as string | undefined,
    turnComplete: false,
  };

  // Check for setup complete (initial handshake)
  if (message.setupComplete) {
    return result;
  }

  // Check for turn complete
  if (message.serverContent?.turnComplete) {
    result.turnComplete = true;
  }

  // Extract text content - try multiple paths
  if (message.text) {
    result.text = message.text;
  } else if (message.serverContent?.modelTurn?.parts) {
    for (const part of message.serverContent.modelTurn.parts) {
      if (part.text) {
        result.text = part.text;
        break;
      }
    }
  }

  // Extract audio data - try multiple paths
  if (message.data) {
    result.audioData = message.data;
  } else if (message.serverContent?.modelTurn?.parts) {
    for (const part of message.serverContent.modelTurn.parts) {
      if (part.inlineData?.data) {
        result.audioData = part.inlineData.data;
        break;
      }
    }
  }

  return result;
}

/**
 * Close Gemini session gracefully
 */
export function closeSession(session: LiveSession): void {
  try {
    session.close();
  } catch (error) {
    console.error('[Gemini] Close error:', error);
  }
}
