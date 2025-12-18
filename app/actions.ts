'use server';

/**
 * Server Actions
 *
 * This file previously contained getGeminiApiKey() which exposed the API key to clients.
 * That function has been removed for security. The API key is now only accessed server-side
 * in lib/gemini-server.ts for the WebSocket proxy implementation.
 *
 * Context loading was moved to lib/system-instruction/format.ts for better architecture.
 */

// All server actions have been migrated to their appropriate modules:
// - API key handling: lib/gemini-server.ts (server-side only)
// - Context loading: lib/system-instruction/format.ts (pure function, reusable)
// - Session management: app/api/gemini/session/route.ts (API route)
