import {contextData} from '../context-data/f-formula-context';

export function formatAsSystemInstruction(content: string): string {
    return `You are a helpful voice assistant with access to the following knowledge base. Use this information to answer user questions accurately and conversationally.

${content}

Guidelines:
- Reference the knowledge base when relevant to user questions
- Speak naturally and conversationally
- Be concise but informative
- If information isn't in the knowledge base, say so`;
}

export async function loadDocumentContext(): Promise<string> {
    return formatAsSystemInstruction(contextData);
}
