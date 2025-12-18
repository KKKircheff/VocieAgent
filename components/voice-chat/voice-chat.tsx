'use client';

import { useEffect, useState } from 'react';
import { useGeminiSession } from '@/hooks/use-gemini-session';
import { useAudioCapture } from '@/hooks/use-audio-capture';
import { useAudioPlayback } from '@/hooks/use-audio-playback';
import { useVolumeLevel } from '@/hooks/use-volume-level';

import { ConnectionControls } from './connection-controls';
import { RecordingControls } from './recording-controls';
import { VolumeBar } from './volume-bar';
import { ErrorAlert } from './error-alert';
import { TranscriptDisplay } from './transcript-display';
import { WelcomeMessage } from './welcome-message';
import { TokenUsageDisplay } from './token-usage-display';

import type { Message } from '@/lib/types';

/**
 * Main VoiceChat orchestrator component.
 * Coordinates all custom hooks and child components for the voice chat experience.
 *
 * Reduced from 283 lines to ~80 lines through proper separation of concerns.
 */
export function VoiceChat() {
    const [transcript, setTranscript] = useState<Message[]>([]);

    // Custom hooks manage all business logic
    const audioPlayback = useAudioPlayback(24000);
    const audioCapture = useAudioCapture();
    const volumeLevel = useVolumeLevel(audioCapture.analyser, audioCapture.isRecording);

    const geminiSession = useGeminiSession({
        onMessage: (message) => {
            // Handle text response - add to transcript
            if (message.text) {
                setTranscript((prev) => [
                    ...prev,
                    {
                        role: 'model',
                        content: message.text!,
                        timestamp: Date.now(),
                    },
                ]);
            }

            // Handle audio response - play through speakers
            if (message.audioData) {
                audioPlayback.play(message.audioData).catch((err) => {
                    console.error('[VoiceChat] Audio playback error:', err);
                });
            }
        },
    });

    useEffect(() => {
        return () => {
            audioCapture.stopRecording();
            audioPlayback.stop();
            geminiSession.disconnect();
        };
    }, []);

    // Start recording and stream audio to Gemini
    const handleStartRecording = async () => {
        try {
            await audioCapture.startRecording(geminiSession.sendAudio);
        } catch (error) {
            console.error('[VoiceChat] Failed to start recording:', error);
        }
    };

    // Disconnect and cleanup all resources
    const handleDisconnect = () => {
        audioCapture.stopRecording();
        audioPlayback.stop();
        geminiSession.disconnect();
        setTranscript([]);
    };

    // Combine errors from both session and capture
    const error = geminiSession.error || audioCapture.error;

    return (
        <div className="w-full space-y-6">
            {/* Connection status and controls */}
            <ConnectionControls
                isConnected={geminiSession.isConnected}
                onConnect={geminiSession.connect}
                onDisconnect={handleDisconnect}
            />

            {/* Recording controls (Start/Stop) */}
            <RecordingControls
                isRecording={audioCapture.isRecording}
                isConnected={geminiSession.isConnected}
                onStart={handleStartRecording}
                onStop={audioCapture.stopRecording}
            />

            {/* Volume visualization during recording */}
            <VolumeBar level={volumeLevel.volumeLevel} show={audioCapture.isRecording} />

            {/* Error display */}
            <ErrorAlert error={error} />

            {/* Conversation transcript */}
            <TranscriptDisplay messages={transcript} />

            {/* Welcome message for new users */}
            <WelcomeMessage show={!geminiSession.isConnected} />

            {/* Token usage display - centered below card */}
            <div className="flex justify-center">
                <TokenUsageDisplay
                    usage={geminiSession.tokenUsage}
                    isConnected={geminiSession.isConnected}
                />
            </div>
        </div>
    );
}
