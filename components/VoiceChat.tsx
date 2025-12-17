'use client';

import { useState, useEffect, useRef } from 'react';
import { loadDocumentContext } from '@/app/actions';
import { connectLiveSession, sendAudioChunk, parseServerMessage, closeSession } from '@/lib/gemini';
import { createAudioProcessor, calculateVolumeLevel } from '@/lib/audio/capture';
import { createAudioPlayer } from '@/lib/audio/playback';
import type { VoiceState, LiveSession, Message } from '@/lib/types';

export function VoiceChat() {
  const [state, setState] = useState<VoiceState>({
    isConnected: false,
    isRecording: false,
    transcript: [],
    error: null,
  });

  const [volumeLevel, setVolumeLevel] = useState(0);

  // Refs for session and audio management
  const sessionRef = useRef<LiveSession | null>(null);
  const audioProcessorRef = useRef<ReturnType<typeof createAudioProcessor> | null>(null);
  const audioPlayerRef = useRef<ReturnType<typeof createAudioPlayer> | null>(null);
  const stopCaptureRef = useRef<(() => void) | null>(null);

  // Initialize audio player
  useEffect(() => {
    audioPlayerRef.current = createAudioPlayer(24000);

    return () => {
      audioPlayerRef.current?.cleanup();
    };
  }, []);

  // Volume level animation
  useEffect(() => {
    if (!state.isRecording || !audioProcessorRef.current) return;

    const analyser = audioProcessorRef.current.getAnalyser();
    if (!analyser) return;

    const intervalId = setInterval(() => {
      const level = calculateVolumeLevel(analyser);
      setVolumeLevel(level);
    }, 50);

    return () => clearInterval(intervalId);
  }, [state.isRecording]);

  // Connect to Gemini and start voice session
  const handleConnect = async () => {
    setState((prev) => ({ ...prev, error: null }));

    try {
      // Get API key
      const apiKey = process.env.NEXT_PUBLIC_GEMINI_API_KEY;
      if (!apiKey) {
        throw new Error('NEXT_PUBLIC_GEMINI_API_KEY not set in .env.local');
      }

      // Load document context
      const systemInstruction = await loadDocumentContext();

      // Connect to Gemini Live API
      const session = await connectLiveSession(apiKey, systemInstruction, {
        onOpen: () => {
          setState((prev) => ({ ...prev, isConnected: true }));
        },
        onMessage: (message) => {
          const parsed = parseServerMessage(message);

          // Handle audio response
          if (parsed.audioData && audioPlayerRef.current) {
            audioPlayerRef.current.play(parsed.audioData).catch((err) => {
              console.error('[Audio] Playback error:', err);
            });
          }

          // Handle text response
          if (parsed.text) {
            setState((prev) => ({
              ...prev,
              transcript: [
                ...prev.transcript,
                {
                  role: 'model',
                  content: parsed.text!,
                  timestamp: Date.now(),
                },
              ],
            }));
          }
        },
        onError: (error) => {
          setState((prev) => ({ ...prev, error: error.message }));
        },
        onClose: (reason) => {
          setState((prev) => ({
            ...prev,
            isConnected: false,
            isRecording: false,
          }));
        },
      });

      sessionRef.current = session;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to connect';
      setState((prev) => ({ ...prev, error: message }));
    }
  };

  // Start recording and streaming audio
  const handleStartRecording = async () => {
    if (!sessionRef.current) {
      setState((prev) => ({ ...prev, error: 'Not connected to Gemini' }));
      return;
    }

    try {
      // Set recording state FIRST
      setState((prev) => ({ ...prev, isRecording: true }));

      // Create audio processor
      const processor = createAudioProcessor();
      audioProcessorRef.current = processor;

      // Start capturing and sending audio chunks
      const stopCapture = await processor.start((base64Audio) => {
        if (sessionRef.current) {
          sendAudioChunk(sessionRef.current, base64Audio);
        }
      });

      stopCaptureRef.current = stopCapture;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to start recording';
      setState((prev) => ({ ...prev, error: message, isRecording: false }));
    }
  };

  // Stop recording
  const handleStopRecording = () => {
    if (stopCaptureRef.current) {
      stopCaptureRef.current();
      stopCaptureRef.current = null;
    }

    audioProcessorRef.current = null;
    setState((prev) => ({ ...prev, isRecording: false }));
    setVolumeLevel(0);
  };

  // Disconnect from Gemini
  const handleDisconnect = () => {
    // Stop recording if active
    if (state.isRecording) {
      handleStopRecording();
    }

    // Close session
    if (sessionRef.current) {
      closeSession(sessionRef.current);
      sessionRef.current = null;
    }

    // Stop audio playback
    audioPlayerRef.current?.stop();

    setState({
      isConnected: false,
      isRecording: false,
      transcript: [],
      error: null,
    });
  };

  return (
    <div className="w-full space-y-6">
      {/* Status and Controls */}
      <div className="flex flex-col items-center gap-4">
        {/* Connection Status */}
        <div className="flex items-center gap-2">
          <div
            className={`w-3 h-3 rounded-full transition-colors ${
              state.isConnected ? 'bg-green-400 animate-pulse' : 'bg-red-400'
            }`}
          />
          <span className="text-white/80 text-sm">
            {state.isConnected ? 'Connected' : 'Disconnected'}
          </span>
        </div>

        {/* Main Control Buttons */}
        <div className="flex gap-3">
          {!state.isConnected ? (
            <button
              onClick={handleConnect}
              className="px-8 py-4 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-full font-semibold hover:from-purple-600 hover:to-pink-600 transition-all shadow-lg hover:shadow-xl transform hover:scale-105"
            >
              Connect
            </button>
          ) : (
            <>
              {!state.isRecording ? (
                <button
                  onClick={handleStartRecording}
                  className="px-8 py-4 bg-green-500 text-white rounded-full font-semibold hover:bg-green-600 transition-all shadow-lg hover:shadow-xl transform hover:scale-105"
                >
                  🎤 Start Talking
                </button>
              ) : (
                <button
                  onClick={handleStopRecording}
                  className="px-8 py-4 bg-red-500 text-white rounded-full font-semibold hover:bg-red-600 transition-all shadow-lg hover:shadow-xl transform hover:scale-105 animate-pulse"
                >
                  ⏸️ Stop
                </button>
              )}

              <button
                onClick={handleDisconnect}
                className="px-6 py-4 bg-white/10 text-white rounded-full font-semibold hover:bg-white/20 transition-all border border-white/30"
              >
                Disconnect
              </button>
            </>
          )}
        </div>

        {/* Volume Indicator */}
        {state.isRecording && (
          <div className="w-full max-w-xs">
            <div className="h-2 bg-white/10 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-green-400 to-blue-500 transition-all duration-75"
                style={{ width: `${volumeLevel}%` }}
              />
            </div>
          </div>
        )}
      </div>

      {/* Error Display */}
      {state.error && (
        <div className="p-4 bg-red-500/20 border border-red-500/50 rounded-lg text-red-200 text-sm">
          <strong>Error:</strong> {state.error}
        </div>
      )}

      {/* Transcript Display */}
      {state.transcript.length > 0 && (
        <div className="space-y-2 max-h-64 overflow-y-auto">
          {state.transcript.map((message, index) => (
            <div
              key={index}
              className={`p-3 rounded-lg ${
                message.role === 'user'
                  ? 'bg-blue-500/20 text-blue-100 ml-8'
                  : 'bg-purple-500/20 text-purple-100 mr-8'
              }`}
            >
              <div className="text-xs opacity-60 mb-1">
                {message.role === 'user' ? 'You' : 'Gemini'}
              </div>
              <div className="text-sm">{message.content}</div>
            </div>
          ))}
        </div>
      )}

      {/* Instructions */}
      {!state.isConnected && (
        <div className="text-center text-white/60 text-sm space-y-2">
          <p>Click &quot;Connect&quot; to start a voice session with Gemini</p>
          <p className="text-xs text-white/40">
            Make sure your microphone is enabled
          </p>
        </div>
      )}
    </div>
  );
}
