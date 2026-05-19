import { describe, it, expect } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useLocalStorage } from './useLocalStorage';
import type { GeneratedComponent } from '../types';

describe('useLocalStorage', () => {
  it('key 없을 때 initialValue를 반환한다', () => {
    const { result } = renderHook(() => useLocalStorage('rcg:test', 42));
    expect(result.current[0]).toBe(42);
  });

  it('localStorage에 저장된 값을 초기 로드한다', () => {
    localStorage.setItem('rcg:test', JSON.stringify('hello'));
    const { result } = renderHook(() => useLocalStorage('rcg:test', ''));
    expect(result.current[0]).toBe('hello');
  });

  it('setValue 후 state와 localStorage 모두 업데이트된다', () => {
    const { result } = renderHook(() => useLocalStorage('rcg:test', ''));
    act(() => { result.current[1]('updated'); });
    expect(result.current[0]).toBe('updated');
    expect(localStorage.getItem('rcg:test')).toBe('"updated"');
  });

  it('함수형 업데이터를 지원한다', () => {
    const { result } = renderHook(() => useLocalStorage<number[]>('rcg:test', []));
    act(() => { result.current[1]((prev) => [...prev, 1]); });
    act(() => { result.current[1]((prev) => [...prev, 2]); });
    expect(result.current[0]).toEqual([1, 2]);
  });

  it('GeneratedComponent[]의 createdAt이 Date로 복원된다', () => {
    const component: GeneratedComponent = {
      id: 'test-id',
      prompt: 'test prompt',
      code: 'const A = () => null;',
      createdAt: new Date('2024-01-15T00:00:00.000Z'),
    };
    localStorage.setItem('rcg:components', JSON.stringify([component]));
    const { result } = renderHook(() =>
      useLocalStorage<GeneratedComponent[]>('rcg:components', [])
    );
    expect(result.current[0][0].createdAt).toBeInstanceOf(Date);
    expect(result.current[0][0].createdAt.getTime()).toBe(component.createdAt.getTime());
  });

  it('remove 후 initialValue로 복원되고 localStorage에서 제거된다', () => {
    const { result } = renderHook(() => useLocalStorage('rcg:test', 'init'));
    act(() => { result.current[1]('changed'); });
    act(() => { result.current[2](); });
    expect(result.current[0]).toBe('init');
    expect(localStorage.getItem('rcg:test')).toBeNull();
  });

  it('손상된 localStorage 값은 initialValue를 반환한다', () => {
    localStorage.setItem('rcg:test', '{ invalid json');
    const { result } = renderHook(() => useLocalStorage('rcg:test', 99));
    expect(result.current[0]).toBe(99);
  });
});
