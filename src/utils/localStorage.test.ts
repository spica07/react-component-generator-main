import { describe, it, expect, vi } from 'vitest';
import { safeJsonParse, safeJsonStringify, isLocalStorageAvailable } from './localStorage';

describe('safeJsonParse', () => {
  it('ISO 8601 문자열을 Date 객체로 복원한다', () => {
    const date = new Date('2024-01-15T12:00:00.000Z');
    const json = JSON.stringify({ createdAt: date });
    const result = safeJsonParse<{ createdAt: Date }>(json);
    expect(result?.createdAt).toBeInstanceOf(Date);
    expect(result?.createdAt.getTime()).toBe(date.getTime());
  });

  it('ISO 형식이 아닌 문자열은 그대로 유지한다', () => {
    const json = JSON.stringify({ name: '2024-hello-world' });
    const result = safeJsonParse<{ name: string }>(json);
    expect(result?.name).toBe('2024-hello-world');
    expect(result?.name).not.toBeInstanceOf(Date);
  });

  it('손상된 JSON은 null을 반환한다', () => {
    expect(safeJsonParse('{ invalid json')).toBeNull();
  });

  it('빈 문자열은 null을 반환한다', () => {
    expect(safeJsonParse('')).toBeNull();
  });

  it('배열 내 Date 문자열도 복원한다', () => {
    const dates = [new Date('2024-01-01T00:00:00.000Z'), new Date('2024-06-15T12:30:00.000Z')];
    const json = JSON.stringify(dates);
    const result = safeJsonParse<Date[]>(json);
    expect(result?.[0]).toBeInstanceOf(Date);
    expect(result?.[1]).toBeInstanceOf(Date);
  });
});

describe('safeJsonStringify', () => {
  it('Date 객체를 ISO 문자열로 직렬화한다', () => {
    const date = new Date('2024-01-15T12:00:00.000Z');
    const json = safeJsonStringify({ createdAt: date });
    expect(json).toContain('2024-01-15T12:00:00.000Z');
  });

  it('일반 값을 올바르게 직렬화한다', () => {
    expect(safeJsonStringify('hello')).toBe('"hello"');
    expect(safeJsonStringify(42)).toBe('42');
    expect(safeJsonStringify([1, 2, 3])).toBe('[1,2,3]');
  });
});

describe('isLocalStorageAvailable', () => {
  it('정상 환경에서 true를 반환한다', () => {
    expect(isLocalStorageAvailable()).toBe(true);
  });

  it('localStorage 접근 불가 시 false를 반환한다', () => {
    vi.spyOn(Storage.prototype, 'setItem').mockImplementationOnce(() => {
      throw new Error('QuotaExceededError');
    });
    expect(isLocalStorageAvailable()).toBe(false);
  });
});
