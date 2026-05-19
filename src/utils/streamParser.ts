export type SseEvent =
  | { type: 'delta'; text: string }
  | { type: 'done' }
  | { type: 'error'; message: string };

export function parseSseLine(line: string): SseEvent | null {
  const trimmed = line.trim();
  if (!trimmed) return null;

  if (!trimmed.startsWith('data: ')) return null;

  const jsonStr = trimmed.slice(6);
  try {
    const data = JSON.parse(jsonStr);

    if (data.type === 'delta' && typeof data.text === 'string') {
      return { type: 'delta', text: data.text };
    }
    if (data.type === 'done') {
      return { type: 'done' };
    }
    if (data.type === 'error' && typeof data.message === 'string') {
      return { type: 'error', message: data.message };
    }
  } catch {
    return null;
  }

  return null;
}

export function stripCodeFencesClient(text: string): string {
  return text
    .replace(/^```(?:jsx|tsx|javascript|typescript)?\n?/gm, '')
    .replace(/```$/gm, '')
    .trim();
}

export function ensureRenderCallClient(code: string): string {
  if (/\brender\s*\(/.test(code)) return code;

  const match = code.match(/(?:const|function)\s+([A-Z]\w+)/);
  if (match) {
    return `${code}\n\nrender(<${match[1]} />);`;
  }

  return code;
}
