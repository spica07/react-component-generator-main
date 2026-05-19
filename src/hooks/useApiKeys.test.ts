import { describe, it, expect } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useApiKeys } from './useApiKeys';

describe('useApiKeys', () => {
  it('초기 상태에서 모든 Provider 키는 빈 문자열이다', () => {
    const { result } = renderHook(() => useApiKeys());
    expect(result.current.getApiKey('anthropic')).toBe('');
    expect(result.current.getApiKey('google')).toBe('');
  });

  it('anthropic 키를 저장하고 반환한다', () => {
    const { result } = renderHook(() => useApiKeys());
    act(() => { result.current.setApiKey('anthropic', 'sk-ant-xxx'); });
    expect(result.current.getApiKey('anthropic')).toBe('sk-ant-xxx');
  });

  it('Provider별로 키를 독립적으로 저장한다', () => {
    const { result } = renderHook(() => useApiKeys());
    act(() => { result.current.setApiKey('anthropic', 'sk-ant-xxx'); });
    expect(result.current.getApiKey('google')).toBe('');
  });

  it('google 키 설정이 anthropic 키에 영향을 주지 않는다', () => {
    const { result } = renderHook(() => useApiKeys());
    act(() => { result.current.setApiKey('anthropic', 'sk-ant-xxx'); });
    act(() => { result.current.setApiKey('google', 'AIza-yyy'); });
    expect(result.current.getApiKey('anthropic')).toBe('sk-ant-xxx');
    expect(result.current.getApiKey('google')).toBe('AIza-yyy');
  });

  it('localStorage에 저장된 키가 새 훅 인스턴스에서도 로드된다', () => {
    localStorage.setItem('rcg:apiKey:anthropic', JSON.stringify('sk-ant-persisted'));
    const { result } = renderHook(() => useApiKeys());
    expect(result.current.getApiKey('anthropic')).toBe('sk-ant-persisted');
  });
});
