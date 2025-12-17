'use server';

import { readdir, readFile } from 'fs/promises';
import { join } from 'path';

/**
 * Server Action: Load and format document context from public/context directory
 * Returns formatted system instruction string for Gemini Live API
 */
export async function loadDocumentContext(): Promise<string> {
  try {
    const contextDir = join(process.cwd(), 'public', 'context');

    // Read all markdown files in context directory
    const files = await readdir(contextDir);
    const mdFiles = files.filter(f => f.endsWith('.md'));

    if (mdFiles.length === 0) {
      return 'You are a helpful voice assistant.';
    }

    // Read all document contents
    const documents = await Promise.all(
      mdFiles.map(async (filename) => {
        const content = await readFile(join(contextDir, filename), 'utf-8');
        return { filename, content };
      })
    );

    // Format as system instruction
    const systemInstruction = formatAsSystemInstruction(documents);

    return systemInstruction;
  } catch (error) {
    console.error('Error loading document context:', error);
    return 'You are a helpful voice assistant.';
  }
}

/**
 * Format documents into a single system instruction string
 */
function formatAsSystemInstruction(documents: Array<{ filename: string; content: string }>): string {
  const documentSections = documents
    .map(doc => `## Document: ${doc.filename}\n\n${doc.content}`)
    .join('\n\n---\n\n');

  return `You are a helpful voice assistant with access to the following knowledge base. Use this information to answer user questions accurately and conversationally.

${documentSections}

Guidelines:
- Reference the knowledge base when relevant to user questions
- Speak naturally and conversationally
- Be concise but informative
- If information isn't in the knowledge base, say so`;
}
