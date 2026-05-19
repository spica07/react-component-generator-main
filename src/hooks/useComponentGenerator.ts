import { useState, useCallback } from 'react';
import type { GeneratedComponent, Provider } from '../types';
import { useLocalStorage } from './useLocalStorage';

const MAX_COMPONENTS = 20;
const MAX_PROMPT_HISTORY = 50;

interface UseComponentGeneratorReturn {
  components: GeneratedComponent[];
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

  const generate = useCallback(async (prompt: string, apiKey: string | undefined, provider: Provider) => {
    setIsLoading(true);
    setError(null);

    try {
      const res = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt, ...(apiKey && { apiKey }), provider }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to generate component');
      }

      const newComponent: GeneratedComponent = {
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        prompt,
        code: data.code,
        createdAt: new Date(),
      };

      setComponents((prev) => [newComponent, ...prev].slice(0, MAX_COMPONENTS));
      setPromptHistory((prev) => [prompt, ...prev.filter((p) => p !== prompt)].slice(0, MAX_PROMPT_HISTORY));
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      setError(message);
    } finally {
      setIsLoading(false);
    }
  }, []);

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

  return { components, promptHistory, isLoading, refiningIds, error, generate, refine, removeComponent, removePromptHistory, clearPromptHistory, clearAll };
}
