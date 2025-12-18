/**
 * Server-Side Gemini Session Manager
 *
 * Manages WebSocket connections to Gemini Live API on the server side,
 * keeping the GEMINI_API_KEY secure and never exposing it to clients.
 *
 * Security: API key loaded from process.env server-side only
 * Sessions: Stored in-memory with automatic 5-minute timeout cleanup
 */

import {GoogleGenAI, Modality} from '@google/genai';
import type {LiveSession, ServerMessage} from './types';
import {GEMINI_MODELS} from './gemini';

interface SessionData {
    connection: LiveSession;
    lastActivity: number;
    messageQueue: ServerMessage[];
}

class GeminiSessionManager {
    private sessions = new Map<string, SessionData>();

    /**
     * Create a new Gemini Live API session
     * @param systemInstruction - System instruction for the AI
     * @returns Session ID (UUID) for client to reference
     */
    async createSession(systemInstruction: string): Promise<string> {
        const sessionId = crypto.randomUUID();
        const apiKey = process.env.GEMINI_API_KEY;

        if (!apiKey) {
            throw new Error('GEMINI_API_KEY not configured in environment variables');
        }

        const ai = new GoogleGenAI({apiKey});

        const session = await ai.live.connect({
            model: GEMINI_MODELS.LIVE_FLASH_NATIVE,
            config: {
                responseModalities: ['AUDIO'] as Modality[],
                systemInstruction,
            },
            callbacks: {
                onopen: () => {
                    console.log(`[GeminiServer] Session ${sessionId} connected`);
                },
                onmessage: (msg) => this.handleMessage(sessionId, msg),
                onerror: (event: any) => {
                    console.error(`[GeminiServer] Session ${sessionId} error:`, event.message);
                },
                onclose: (event: any) => {
                    console.log(`[GeminiServer] Session ${sessionId} closed:`, event.reason);
                    this.sessions.delete(sessionId);
                },
            },
        });

        this.sessions.set(sessionId, {
            connection: session as LiveSession,
            lastActivity: Date.now(),
            messageQueue: [],
        });

        return sessionId;
    }

    /**
     * Send audio chunk to Gemini for a specific session
     * @param sessionId - Session ID
     * @param audioData - Base64-encoded PCM audio data
     */
    sendAudio(sessionId: string, audioData: string): void {
        const session = this.sessions.get(sessionId);

        if (!session) {
            throw new Error(`Session not found: ${sessionId}`);
        }

        session.connection.sendRealtimeInput({
            audio: {
                data: audioData,
                mimeType: 'audio/pcm;rate=16000',
            },
        });

        session.lastActivity = Date.now();
    }

    /**
     * Get all queued messages for a session (and clear the queue)
     * @param sessionId - Session ID
     * @returns Array of server messages
     */
    getMessages(sessionId: string): ServerMessage[] {
        const session = this.sessions.get(sessionId);

        if (!session) {
            return [];
        }

        session.lastActivity = Date.now();
        return session.messageQueue.splice(0); // Remove and return all messages
    }

    /**
     * Close a session and cleanup resources
     * @param sessionId - Session ID
     */
    closeSession(sessionId: string): void {
        const session = this.sessions.get(sessionId);

        if (session) {
            try {
                session.connection.close();
            } catch (error) {
                console.error(`[GeminiServer] Error closing session ${sessionId}:`, error);
            }

            this.sessions.delete(sessionId);
            console.log(`[GeminiServer] Session ${sessionId} closed and removed`);
        }
    }

    /**
     * Handle incoming message from Gemini WebSocket
     * @private
     */
    private handleMessage(sessionId: string, message: any): void {
        const session = this.sessions.get(sessionId);

        if (session) {
            session.messageQueue.push(message as ServerMessage);
            session.lastActivity = Date.now();
        }
    }

    /**
     * Cleanup stale sessions (called by interval timer)
     * @private
     */
    private cleanupStaleSessions(): void {
        const now = Date.now();
        const timeout = 5 * 60 * 1000; // 5 minutes

        for (const [sessionId, session] of this.sessions) {
            if (now - session.lastActivity > timeout) {
                console.log(`[GeminiServer] Cleaning up stale session ${sessionId}`);
                this.closeSession(sessionId);
            }
        }
    }

    /**
     * Get session statistics (for monitoring)
     */
    getStats(): {activeSessions: number; totalMessages: number} {
        let totalMessages = 0;

        for (const session of this.sessions.values()) {
            totalMessages += session.messageQueue.length;
        }

        return {
            activeSessions: this.sessions.size,
            totalMessages,
        };
    }
}

// Export singleton instance
export const sessionManager = new GeminiSessionManager();

// Setup cleanup interval (runs every 30 seconds)
if (typeof setInterval !== 'undefined') {
    setInterval(() => {
        sessionManager['cleanupStaleSessions']();
    }, 30000);
}
