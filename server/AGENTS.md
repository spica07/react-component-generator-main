# AGENTS.md — server/ (API 서버)

## Module Context

Bun 네이티브 HTTP 서버. Anthropic Claude API와 Google Gemini API를 통합하고, 생성된 컴포넌트 코드의 후처리를 담당한다.

## Tech Stack & Constraints

- Bun 런타임 전용 — `Bun.serve()` API 사용. Node.js `http` 모듈 사용 금지.
- 외부 HTTP 라이브러리(Express, Hono 등) 추가 금지 — Bun 네이티브 라우팅으로 충분하다.
- 엔드포인트: `GET /api/config`, `POST /api/generate` — 이 두 개가 전부다.

## Implementation Patterns

**AI 프로바이더 함수 구조:**
```typescript
async function callProviderName(prompt: string, apiKey: string): Promise<string> {
  // API 호출
  // stripCodeFences() 적용
  // ensureRenderCall() 적용
  return code;
}
```

**후처리 함수 (수정 시 주의):**
- `stripCodeFences()` — API 응답에서 마크다운 코드 펜스 제거
- `ensureRenderCall()` — 코드 말미에 `render()` 호출 보장

**에러 응답 형식:**
```typescript
return Response.json({ error: '메시지' }, { status: 코드, headers: CORS_HEADERS });
```

**SYSTEM_PROMPT 수정 시 체크리스트:**
- TypeScript 문법 금지 지시문 유지 여부 확인
- `render(<ComponentName />)` 요구사항 유지 여부 확인
- `import` 문 금지 지시문 유지 여부 확인

## Token Limits

- Anthropic: `max_tokens: 4096`
- Google: `maxOutputTokens: 8192` — MAX_TOKENS finish reason 별도 처리 필요

## Local Golden Rules

**Do's:**
- 모든 응답에 `CORS_HEADERS`를 포함하라 — OPTIONS preflight 포함.
- API 키 우선순위: 요청 바디의 `apiKey` → 환경변수 순으로 적용하라.
- `/api/config` 엔드포인트는 키 존재 여부(boolean)만 반환하라 — 키 값 자체를 노출하지 마라.

**Don'ts:**
- `SYSTEM_PROMPT`를 요청별로 동적으로 변경하지 마라 — 일관성 파괴로 예측 불가능한 출력이 발생한다.
- 서버에서 생성된 컴포넌트 코드를 검증하거나 실행하지 마라 — react-live가 프론트엔드에서 처리한다.
- 새 엔드포인트 추가 시 CORS 헤더 누락 금지.
