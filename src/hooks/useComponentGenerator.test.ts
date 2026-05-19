import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useComponentGenerator } from './useComponentGenerator';

const mockFetch = vi.fn();

function makeFetchResponse(code: string) {
  return Promise.resolve({
    ok: true,
    json: () => Promise.resolve({ code }),
  });
}

beforeEach(() => {
  vi.stubGlobal('fetch', mockFetch);
  mockFetch.mockReset();
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('useComponentGenerator — promptHistory', () => {
  it('generate 호출 후 promptHistory[0]이 입력 프롬프트이다', async () => {
    mockFetch.mockReturnValueOnce(makeFetchResponse('const A = () => null;'));
    const { result } = renderHook(() => useComponentGenerator());
    await act(async () => {
      await result.current.generate('테스트 프롬프트', undefined, 'anthropic');
    });
    expect(result.current.promptHistory[0]).toBe('테스트 프롬프트');
  });

  it('동일 프롬프트 2회 입력 시 히스토리에 1개만 존재한다', async () => {
    mockFetch.mockReturnValue(makeFetchResponse('const A = () => null;'));
    const { result } = renderHook(() => useComponentGenerator());
    await act(async () => { await result.current.generate('중복 프롬프트', undefined, 'anthropic'); });
    await act(async () => { await result.current.generate('중복 프롬프트', undefined, 'anthropic'); });
    expect(result.current.promptHistory.filter((p) => p === '중복 프롬프트').length).toBe(1);
  });

  it('clearAll 후 promptHistory가 빈 배열이 된다', async () => {
    mockFetch.mockReturnValueOnce(makeFetchResponse('const A = () => null;'));
    const { result } = renderHook(() => useComponentGenerator());
    await act(async () => { await result.current.generate('프롬프트', undefined, 'anthropic'); });
    act(() => { result.current.clearAll(); });
    expect(result.current.promptHistory).toEqual([]);
  });
});

describe('useComponentGenerator — components 제한', () => {
  it('21개 컴포넌트 생성 시 목록 크기가 20을 넘지 않는다', async () => {
    mockFetch.mockReturnValue(makeFetchResponse('const A = () => null;'));
    const { result } = renderHook(() => useComponentGenerator());
    for (let i = 0; i < 21; i++) {
      await act(async () => {
        await result.current.generate(`프롬프트 ${i}`, undefined, 'anthropic');
      });
    }
    await waitFor(() => {
      expect(result.current.components.length).toBeLessThanOrEqual(20);
    });
  });

  it('clearAll 후 components가 빈 배열이 된다', async () => {
    mockFetch.mockReturnValueOnce(makeFetchResponse('const A = () => null;'));
    const { result } = renderHook(() => useComponentGenerator());
    await act(async () => { await result.current.generate('프롬프트', undefined, 'anthropic'); });
    act(() => { result.current.clearAll(); });
    expect(result.current.components).toEqual([]);
  });
});

describe('useComponentGenerator — localStorage 영속화', () => {
  it('generate 후 rcg:components가 localStorage에 저장된다', async () => {
    mockFetch.mockReturnValueOnce(makeFetchResponse('const A = () => null;'));
    const { result } = renderHook(() => useComponentGenerator());
    await act(async () => { await result.current.generate('프롬프트', undefined, 'anthropic'); });
    const stored = localStorage.getItem('rcg:components');
    expect(stored).not.toBeNull();
    const parsed = JSON.parse(stored!);
    expect(parsed).toHaveLength(1);
    expect(parsed[0].prompt).toBe('프롬프트');
  });

  it('generate 후 rcg:promptHistory가 localStorage에 저장된다', async () => {
    mockFetch.mockReturnValueOnce(makeFetchResponse('const A = () => null;'));
    const { result } = renderHook(() => useComponentGenerator());
    await act(async () => { await result.current.generate('히스토리 프롬프트', undefined, 'anthropic'); });
    const stored = localStorage.getItem('rcg:promptHistory');
    expect(stored).not.toBeNull();
    expect(JSON.parse(stored!)[0]).toBe('히스토리 프롬프트');
  });
});
