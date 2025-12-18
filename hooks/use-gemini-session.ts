import {useState, useRef} from 'react';
import {loadDocumentContext} from '@/app/actions';
import {connectLiveSession, sendAudioChunk, parseServerMessage, closeSession} from '@/lib/gemini';
import type {LiveSession, ParsedServerMessage, TokenUsage} from '@/lib/types';

interface UseGeminiSessionOptions {
    onMessage?: (message: ParsedServerMessage) => void;
    onError?: (error: Error) => void;
    systemInstruction?: string;
}

interface UseGeminiSessionReturn {
    isConnected: boolean;
    connect: () => Promise<void>;
    disconnect: () => void;
    sendAudio: (base64Audio: string) => void;
    session: LiveSession | null;
    error: string | null;
    tokenUsage: TokenUsage | null;
}

/**
 * Custom hook for managing Gemini Live API WebSocket connection.
 * Handles connection lifecycle, message routing, and error handling.
 *
 * @param options - Callbacks and configuration for the session
 * @returns Session controls, connection status, and error state
 */
export function useGeminiSession(options?: UseGeminiSessionOptions): UseGeminiSessionReturn {
    const [isConnected, setIsConnected] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [tokenUsage, setTokenUsage] = useState<TokenUsage | null>(null);

    const sessionRef = useRef<LiveSession | null>(null);

    const connect = async (): Promise<void> => {
        setError(null);

        try {
            const apiKey = process.env.GEMINI_API_KEY;
            if (!apiKey) {
                throw new Error('GEMINI_API_KEY not set in .env.local');
            }

            const systemInstruction = options?.systemInstruction || (await loadDocumentContext());

            const session = await connectLiveSession(apiKey, systemInstruction, {
                onOpen: () => {
                    setIsConnected(true);
                },
                onMessage: (message) => {
                    const parsed = parseServerMessage(message);

                    // Update cumulative token usage if available
                    if (parsed.usageMetadata) {
                        setTokenUsage((prev) => {
                            if (!prev) return parsed.usageMetadata!;

                            return {
                                promptTokenCount:
                                    (prev.promptTokenCount || 0) + (parsed.usageMetadata!.promptTokenCount || 0),
                                candidatesTokenCount:
                                    (prev.candidatesTokenCount || 0) +
                                    (parsed.usageMetadata!.candidatesTokenCount || 0),
                                totalTokenCount:
                                    (prev.totalTokenCount || 0) + (parsed.usageMetadata!.totalTokenCount || 0),
                            };
                        });
                    }

                    // Call user-provided onMessage callback
                    if (options?.onMessage) {
                        options.onMessage(parsed);
                    }
                },
                onError: (err) => {
                    const errorMessage = err instanceof Error ? err.message : 'Connection error';
                    setError(errorMessage);

                    // Call user-provided onError callback
                    if (options?.onError) {
                        options.onError(err instanceof Error ? err : new Error(errorMessage));
                    }
                },
                onClose: (reason) => {
                    setIsConnected(false);
                    sessionRef.current = null;
                },
            });

            sessionRef.current = session;
        } catch (err) {
            const message = err instanceof Error ? err.message : 'Failed to connect';
            setError(message);
            setIsConnected(false);

            if (options?.onError) {
                options.onError(err instanceof Error ? err : new Error(message));
            }

            throw err;
        }
    };

    const disconnect = (): void => {
        if (sessionRef.current) {
            closeSession(sessionRef.current);
            sessionRef.current = null;
        }

        setIsConnected(false);
        setError(null);
        setTokenUsage(null);
    };

    const sendAudio = (base64Audio: string): void => {
        if (!sessionRef.current) {
            console.warn('[useGeminiSession] Cannot send audio: not connected');
            return;
        }

        try {
            sendAudioChunk(sessionRef.current, base64Audio);
        } catch (err) {
            console.error('[useGeminiSession] Failed to send audio chunk:', err);
            const message = err instanceof Error ? err.message : 'Failed to send audio';
            setError(message);
        }
    };

    return {
        isConnected,
        connect,
        disconnect,
        sendAudio,
        session: sessionRef.current,
        error,
        tokenUsage,
    };
}
