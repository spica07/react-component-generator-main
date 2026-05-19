import { useState, useCallback } from 'react';
import type { GeneratedComponent, Provider, StreamingComponent } from '../types';
import { useLocalStorage } from './useLocalStorage';
import { parseSseLine, stripCodeFencesClient, ensureRenderCallClient } from '../utils/streamParser';

const MAX_COMPONENTS = 20;
const MAX_PROMPT_HISTORY = 50;

interface UseComponentGeneratorReturn {
  components: GeneratedComponent[];
  streamingComponents: Map<string, StreamingComponent>;
  promptHistory: string[];
  isLoading: boolean;
  refiningIds: string[];
  error: string | null;
  generate: (prompt: string, apiKey: string | undefined, provider: Provider) => Promise<void>;
  refine: (id: string, instruction: string, apiKey: string | undefined, provider: Provider) => Promise<void>;
  removeComponent: (id: string) => void;
  removePromptHistory: (prompt: string) => void;
  clearPromptHistory: () => void;
  clearAll: () => void;
}

export function useComponentGenerator(): UseComponentGeneratorReturn {
  const [components, setComponents] = useLocalStorage<GeneratedComponent[]>('rcg:components', []);
  const [promptHistory, setPromptHistory] = useLocalStorage<string[]>('rcg:promptHistory', []);
  const [isLoading, setIsLoading] = useState(false);
  const [refiningIds, setRefiningIds] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [streamingComponents, setStreamingComponents] = useState<Map<string, StreamingComponent>>(new Map());

  const generate = useCallback(async (prompt: string, apiKey: string | undefined, provider: Provider) => {
    setIsLoading(true);
    setError(null);

    const id = `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;

    setStreamingComponents((prev) => {
      const next = new Map(prev);
      next.set(id, {
        id,
        prompt,
        partialCode: '',
        status: 'streaming',
        createdAt: new Date(),
      });
      return next;
    });

    try {
      const res = await fetch('/api/generate/stream', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt, ...(apiKey && { apiKey }), provider }),
      });

      if (!res.ok) {
        const data = await res.json() as { error?: string };
        throw new Error(data.error || 'Failed to generate component');
      }

      const reader = res.body!.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      let accumulated = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() ?? '';

        for (const line of lines) {
          const event = parseSseLine(line);
          if (event?.type === 'delta') {
            accumulated += event.text;
            setStreamingComponents((prev) => {
              const next = new Map(prev);
              const comp = prev.get(id);
              if (comp) next.set(id, { ...comp, partialCode: accumulated });
              return next;
            });
          } else if (event?.type === 'done') {
            const finalCode = ensureRenderCallClient(stripCodeFencesClient(accumulated));
            const newComponent: GeneratedComponent = {
              id,
              prompt,
              code: finalCode,
              createdAt: new Date(),
            };
            setComponents((prev) => [newComponent, ...prev].slice(0, MAX_COMPONENTS));
            setStreamingComponents((prev) => {
              const next = new Map(prev);
              next.delete(id);
              return next;
            });
            setPromptHistory((prev) => [prompt, ...prev.filter((p) => p !== prompt)].slice(0, MAX_PROMPT_HISTORY));
          } else if (event?.type === 'error') {
            throw new Error(event.message);
          }
        }
      }
    } catch (err) {
      setStreamingComponents((prev) => {
        const next = new Map(prev);
        const comp = prev.get(id);
        if (comp) next.set(id, { ...comp, status: 'error' });
        return next;
      });
      const message = err instanceof Error ? err.message : 'Unknown error';
      setError(message);

      setTimeout(() => {
        setStreamingComponents((prev) => {
          const next = new Map(prev);
          if (prev.get(id)?.status === 'error') next.delete(id);
          return next;
        });
      }, 3000);
    } finally {
      setIsLoading(false);
    }
  }, [setComponents, setPromptHistory]);

  const refine = useCallback(async (id: string, instruction: string, apiKey: string | undefined, provider: Provider) => {
    const target = components.find((c) => c.id === id);
    if (!target) return;

    setRefiningIds((prev) => [...prev, id]);
    setError(null);

    try {
      const res = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: instruction,
          existingCode: target.code,
          ...(apiKey && { apiKey }),
          provider,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to refine component');

      setComponents((prev) => prev.map((c) => c.id === id ? { ...c, code: data.code } : c));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setRefiningIds((prev) => prev.filter((refId) => refId !== id));
    }
  }, [components, setComponents]);

  const removeComponent = useCallback((id: string) => {
    setComponents((prev) => prev.filter((c) => c.id !== id));
  }, []);

  const removePromptHistory = useCallback((prompt: string) => {
    setPromptHistory((prev) => prev.filter((p) => p !== prompt));
  }, []);

  const clearPromptHistory = useCallback(() => {
    setPromptHistory([]);
  }, []);

  const clearAll = useCallback(() => {
    setComponents([]);
    setPromptHistory([]);
  }, [setComponents, setPromptHistory]);

  return {
    components,
    streamingComponents,
    promptHistory,
    isLoading,
    refiningIds,
    error,
    generate,
    refine,
    removeComponent,
    removePromptHistory,
    clearPromptHistory,
    clearAll,
  };
}
