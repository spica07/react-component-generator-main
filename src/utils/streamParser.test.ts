import { describe, it, expect } from 'vitest';
import {
  parseSseLine,
  stripCodeFencesClient,
  ensureRenderCallClient,
} from './streamParser';

describe('streamParser', () => {
  describe('parseSseLine', () => {
    it('delta 이벤트를 파싱한다', () => {
      const line = 'data: {"type":"delta","text":"const "}';
      const result = parseSseLine(line);
      expect(result).toEqual({ type: 'delta', text: 'const ' });
    });

    it('done 이벤트를 파싱한다', () => {
      const line = 'data: {"type":"done"}';
      const result = parseSseLine(line);
      expect(result).toEqual({ type: 'done' });
    });

    it('error 이벤트를 파싱한다', () => {
      const line = 'data: {"type":"error","message":"API 오류"}';
      const result = parseSseLine(line);
      expect(result).toEqual({ type: 'error', message: 'API 오류' });
    });

    it('빈 줄은 null을 반환한다', () => {
      expect(parseSseLine('')).toBeNull();
      expect(parseSseLine('  ')).toBeNull();
    });

    it('data: 프리픽스 없는 줄은 null을 반환한다', () => {
      expect(parseSseLine('event: content_block_delta')).toBeNull();
    });

    it('malformed JSON은 null을 반환한다', () => {
      expect(parseSseLine('data: { invalid')).toBeNull();
    });

    it('알 수 없는 type은 null을 반환한다', () => {
      expect(parseSseLine('data: {"type":"unknown"}')).toBeNull();
    });
  });

  describe('stripCodeFencesClient', () => {
    it('```jsx 펜스를 제거한다', () => {
      const input = '```jsx\nconst A = () => null;\n```';
      expect(stripCodeFencesClient(input)).toBe('const A = () => null;');
    });

    it('```tsx 펜스를 제거한다', () => {
      const input = '```tsx\nconst Button = () => <button/>;\n```';
      expect(stripCodeFencesClient(input)).toBe('const Button = () => <button/>;');
    });

    it('```javascript 펜스를 제거한다', () => {
      const input = '```javascript\nconst x = 1;\n```';
      expect(stripCodeFencesClient(input)).toBe('const x = 1;');
    });

    it('코드 블록 없는 텍스트는 그대로 반환한다', () => {
      const input = 'const A = () => null;';
      expect(stripCodeFencesClient(input)).toBe(input);
    });

    it('중복된 펜스를 모두 제거한다', () => {
      const input = '```jsx\nfirst\n```\n```jsx\nsecond\n```';
      expect(stripCodeFencesClient(input)).toBe('first\nsecond');
    });
  });

  describe('ensureRenderCallClient', () => {
    it('render() 호출이 없으면 추가한다', () => {
      const code = 'const Button = () => <button/>;';
      const result = ensureRenderCallClient(code);
      expect(result).toContain('render(<Button />)');
    });

    it('이미 render() 있으면 그대로 반환한다', () => {
      const code = 'const A = () => null;\nrender(<A />);';
      expect(ensureRenderCallClient(code)).toBe(code);
    });

    it('PascalCase 컴포넌트를 찾아 render() 호출을 추가한다', () => {
      const code = 'function MyComponent() { return <div/>; }';
      const result = ensureRenderCallClient(code);
      expect(result).toContain('render(<MyComponent />)');
    });

    it('render() 호출이 이미 있으면 중복 추가하지 않는다', () => {
      const code = 'const App = () => null;\nrender(<App />);';
      const result = ensureRenderCallClient(code);
      expect(result.match(/render\(/g)?.length).toBe(1);
    });
  });
});
