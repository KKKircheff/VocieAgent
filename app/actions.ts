'use server';

export async function getGeminiApiKey(): Promise<string> {
    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) {
        throw new Error('GEMINI_API_KEY not set in .env.local');
    }

    return apiKey;
}
