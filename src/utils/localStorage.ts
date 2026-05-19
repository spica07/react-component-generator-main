const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?Z$/;

export function dateAwareReviver(_key: string, value: unknown): unknown {
  if (typeof value === 'string' && ISO_DATE_RE.test(value)) return new Date(value);
  return value;
}

export function safeJsonParse<T>(raw: string): T | null {
  try {
    return JSON.parse(raw, dateAwareReviver) as T;
  } catch {
    return null;
  }
}

export function safeJsonStringify<T>(value: T): string {
  return JSON.stringify(value);
}

export function isLocalStorageAvailable(): boolean {
  try {
    localStorage.setItem('__rcg_test__', '1');
    localStorage.removeItem('__rcg_test__');
    return true;
  } catch {
    return false;
  }
}
