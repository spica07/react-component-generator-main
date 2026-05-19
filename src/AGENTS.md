# AGENTS.md — src/ (프론트엔드)

## Module Context

React 19 + TypeScript 기반 프론트엔드. `useComponentGenerator` 훅이 상태 관리의 중심이며, 컴포넌트는 각 역할에 따라 분리되어 있다.

## Tech Stack & Constraints

- `react-live`: 런타임 컴포넌트 평가 — 빌드 타임이 아닌 실행 시점에 코드를 평가한다.
- TypeScript strict 모드 적용. 생성된 컴포넌트 코드에는 TypeScript 문법 금지 (AGENTS.md 루트 Golden Rules 참조).
- 외부 CSS 파일 추가 금지 — 생성 컴포넌트는 인라인 스타일만 허용.

## Implementation Patterns

**새 컴포넌트 추가:**
- 위치: `src/components/ComponentName.tsx`
- Props 타입은 동일 파일 내 인터페이스로 정의
- 스트리밍 카드 컴포넌트: `StreamingCard` — 생성 중 실시간 코드 표시 (인터페이스: `StreamingComponent`)

**훅 수정:**
- `src/hooks/useComponentGenerator.ts`가 유일한 상태 관리 훅
- 새 상태가 필요하면 이 훅을 확장한다 (별도 훅 분리 전 검토 필요)
- `streamingComponents: Map<string, StreamingComponent>` 상태로 진행 중인 스트리밍 관리

**유틸리티:**
- `src/utils/streamParser.ts` — SSE 스트림 파싱, 코드 후처리 함수 (`parseSseLine`, `stripCodeFencesClient`, `ensureRenderCallClient`)

**타입 추가:**
- 공유 타입은 `src/types/index.ts`에 추가
- 컴포넌트 전용 타입은 해당 컴포넌트 파일 내부에 정의
- 스트리밍 관련: `StreamStatus`, `StreamingComponent` 타입

**컴포넌트 ID 패턴:**
```typescript
id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`
```

## Local Golden Rules

**Do's:**
- `useCallback`을 사용해 훅 내부 함수의 불필요한 재생성을 방지하라.
- react-live 에러는 `LivePreview.tsx`에서 캐치해 UI에 표시하라 — 전역 에러로 전파하지 마라.
- API 키는 `apiKey?: string`으로 옵셔널 처리하고, 없으면 `.env` 기반 서버 키를 사용하는 흐름을 유지하라.

**Don'ts:**
- `App.tsx`에 비즈니스 로직을 직접 작성하지 마라 — 훅으로 위임한다.
- `src/components/` 내 컴포넌트에서 직접 API fetch를 하지 마라 — 반드시 훅을 통해 호출한다.
- react-live 외의 런타임 평가 라이브러리로 교체하지 마라 (범위 주입 방식이 달라져 전체 수정 필요).
