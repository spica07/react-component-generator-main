# AGENTS.md — React Component Generator

## Operational Commands

```bash
bun install          # 의존성 설치
bun run dev          # 프론트엔드(5173) + API 서버(3002) 동시 실행
bun run server       # API 서버만 실행 (변경 감지 포함)
bun run build        # 타입 검사 + Vite 프로덕션 빌드
bun run lint         # ESLint 실행
bun run preview      # 프로덕션 빌드 미리보기
```

패키지 관리자는 **Bun 고정** — npm, yarn, pnpm 절대 사용 금지.

## Golden Rules

**Immutable (절대 규칙):**
- API 키를 코드에 하드코딩하지 마라. `.env` 또는 런타임 UI 입력 경로만 허용.
- 생성된 컴포넌트 코드에 TypeScript 문법(타입 어노테이션, 인터페이스, 제네릭, `as` 캐스팅)을 절대 포함하지 마라 — react-live가 런타임 평가 중 즉시 실패한다.
- 생성된 컴포넌트 코드에 `import` 문을 포함하지 마라 — React는 전역으로 주입된다.
- 생성된 컴포넌트 코드 말미에 반드시 `render(<ComponentName />)` 호출이 있어야 한다.

**Do's:**
- 외부 CSS 없이 인라인 스타일(`style={{}}`)만 사용하라.
- 컴포넌트 ID는 `${Date.now()}-${Math.random().toString(36).slice(2, 7)}` 패턴으로 생성하라.
- 서버 변경 후에는 `bun run server`로 재시작해 반영을 확인하라.
- API 에러 핸들링 시 503(과부하), 429(레이트 리밋), MAX_TOKENS 케이스를 구분해 처리하라.

**Don'ts:**
- 생성된 컴포넌트에 외부 라이브러리 import 추가 금지 — 자체 완결 구조를 유지한다.
- CORS 헤더를 제거하거나 축소하지 마라 — 프론트엔드-서버 분리 구조에 필수다.
- `server/index.ts`의 `SYSTEM_PROMPT`를 프론트엔드에서 재정의하지 마라.

## Project Context

자연어 프롬프트로 React 컴포넌트를 생성하고 실시간 미리보기를 제공하는 AI 워크벤치.

Tech Stack: React 19, TypeScript, Vite, react-live, Bun, Anthropic Claude API, Google Gemini API

## Standards & References

**커밋 메시지:** Conventional Commits 형식 (`feat:`, `fix:`, `chore:`, `refactor:`)

**코딩 컨벤션:**
- 프론트엔드: TypeScript strict, ESLint React/Hooks 플러그인 준수
- 서버: Bun 네이티브 API 우선 사용 (Node.js 호환 레이어 지양)

**새 AI 프로바이더 추가 시 체크리스트:**
1. `server/index.ts`에 `Provider` 타입 추가
2. `callProviderName()` 함수 작성
3. 라우팅 로직에 프로바이더 연결
4. `App.tsx`의 `PROVIDER_CONFIG`에 추가
5. `src/types/index.ts` 타입 정의 업데이트

**Maintenance Policy:** 이 파일의 규칙과 실제 코드가 불일치하면 즉시 업데이트를 제안하라.

## Context Map

- **[프론트엔드 컴포넌트 및 훅 (src/)](./src/AGENTS.md)** — React 컴포넌트, 훅, 타입 작업 시.
- **[API 서버 및 AI 통합 (server/)](./server/AGENTS.md)** — Bun 서버, 엔드포인트, AI 프로바이더 작업 시.
