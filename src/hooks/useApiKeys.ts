import { useCallback } from 'react';
import { useLocalStorage } from './useLocalStorage';
import type { Provider } from '../types';

const KEY_MAP: Record<Provider, string> = {
  anthropic: 'rcg:apiKey:anthropic',
  google: 'rcg:apiKey:google',
};

export function useApiKeys(): {
  getApiKey: (provider: Provider) => string;
  setApiKey: (provider: Provider, key: string) => void;
} {
  const [anthropicKey, setAnthropicKey] = useLocalStorage<string>(KEY_MAP.anthropic, '');
  const [googleKey, setGoogleKey] = useLocalStorage<string>(KEY_MAP.google, '');

  const getApiKey = useCallback(
    (provider: Provider): string => {
      return provider === 'anthropic' ? anthropicKey : googleKey;
    },
    [anthropicKey, googleKey]
  );

  const setApiKey = useCallback(
    (provider: Provider, key: string) => {
      if (provider === 'anthropic') setAnthropicKey(key);
      else setGoogleKey(key);
    },
    [setAnthropicKey, setGoogleKey]
  );

  return { getApiKey, setApiKey };
}
