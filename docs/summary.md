# 에이전틱 엔지니어링 with Claude Code

---

## 목차

1. [AI 엔지니어링 패러다임 5단계](#1-ai-엔지니어링-패러다임-5단계)
2. [하네스 4대 구성요소](#2-하네스-4대-구성요소)
3. [Rule — AGENTS.md 설계](#3-rule--agentsmd-설계)
4. [Skill — 재사용 가능한 작업 패키지](#4-skill--재사용-가능한-작업-패키지)
5. [Hook — 규칙을 코드로 강제](#5-hook--규칙을-코드로-강제)
6. [Sub-agent — 컨텍스트 격리와 검증 분리](#6-sub-agent--컨텍스트-격리와-검증-분리)
7. [멀티 에이전트 패턴 3종](#7-멀티-에이전트-패턴-3종)
8. [Git Worktree — 병렬 개발](#8-git-worktree--병렬-개발)
9. [Claude Code 운영 옵션](#9-claude-code-운영-옵션)
10. [내일 당장 적용할 3가지](#10-내일-당장-적용할-3가지)

---

## 1. AI 엔지니어링 패러다임 5단계

| 단계 | 시기 | 핵심 |
|------|------|------|
| STAGE 1 — 프롬프트 엔지니어링 | 2022 | AI에게 좋은 질문을 하는 기술 |
| STAGE 2 — 바이브 코딩 | 2025.02 | AI에 전적으로 의존해 코드 생성 (70% 문제: 프로토타입은 OK, 프로덕션엔 NO) |
| STAGE 3 — 컨텍스트 엔지니어링 | 2025.04 | "모델이 그 말을 들을 때 무엇을 알고 있게 할 것인가를 설계" (Karpathy) |
| STAGE 4 — 하네스 엔지니어링 | 2025.11 | 에이전트 실수를 반복 방지하는 시스템 구축 |
| STAGE 5 — 에이전틱 엔지니어링 | 2026.02 | 에이전트 루프 전체를 설계·운영 |

**핵심 인사이트:** 각 계층은 대체가 아닌 확장. 프롬프트 ⊂ 컨텍스트 ⊂ 하네스 ⊂ 에이전틱.

### Context Stuffing vs Context Curation

- **Context Stuffing** (`/init` 자동 생성): 문서 통째로 넣기 → 추론 토큰 14~22% 증가, 성공률 하락
- **Context Curation** (중첩 AGENTS.md): 필요한 정보만 설계 → 토큰 효율 + 에이전트 성능 향상
- ETH Zurich 연구: `/init` 자동 생성 파일을 붙이면 문제 해결률 -0.5~-2% 하락, 추론 스텝 +2.45~+3.92 증가

---

## 2. 하네스 4대 구성요소

```
Rule  → 에이전트가 따라야 할 행동 규칙 (권고 수준, AI가 무시 가능)
Skill → 반복 작업을 재사용 가능한 패키지로 묶기
Hook  → 규칙을 프로그래밍 로직으로 강제 (Rule은 권고, Hook은 강제)
Sub-agent → 컨텍스트 격리 & 작업 위임
```

**Anthropic 실험 결과:** 동일 모델·동일 프롬프트에서 하네스만 변경 → 성공률 42% → 78%

**레트로 게임 메이커 사례 (Anthropic):**
- 하네스 없이 (Solo): 20분, $9, 주요 기능 미작동
- 하네스 적용 (3에이전트): 6시간, $200, 완전 기능 구현
- 같은 모델·같은 프롬프트 → 하네스 구성만으로 성패가 갈림

---

## 3. Rule — AGENTS.md 설계

### 파일 계층 구조

```
./AGENTS.md          ← 전체 프로젝트 규칙 (루트)
./src/AGENTS.md      ← 프론트엔드 전용
./server/AGENTS.md   ← 백엔드 전용
.claude/rules/*.md   ← Claude Code 전용 모듈 규칙
~/.claude/CLAUDE.md  ← 개인(글로벌) 규칙
```

**CLAUDE.md vs AGENTS.md:**
- `AGENTS.md`: 에이전트 도구 표준 (Claude Code, Codex, Cursor, Gemini 공통)
- `CLAUDE.md`: Claude Code 전용, `@AGENTS.md`로 임포트 권장

```markdown
# CLAUDE.md
@AGENTS.md
```

### AGENTS.md 핵심 섹션

```markdown
## Operational Commands   ← 빌드/실행/테스트 명령어
## Golden Rules           ← 절대 타협 불가한 보안·아키텍처 제약
## Do's & Don'ts          ← 명확한 행동 수칙
## Maintenance Policy     ← 규칙과 코드 괴리 발생 시 업데이트 제안
## Context Map            ← 하위 AGENTS.md 링크
```

### .claude/rules/ 활용

```
.claude/rules/tdd.md       ← TDD 규칙 (paths 없으면 항상 로드)
.claude/rules/security.md  ← 보안 규칙
```

- `paths` 없음: 세션 시작 시 항상 로드
- `paths` 있음: 매칭 파일 읽을 때만 로드 → 토큰 효율적
- 작업별 지침은 rules보다 **skills** 권장 (필요 시에만 로드)

---

## 4. Skill — 재사용 가능한 작업 패키지

### Agent Skills 오픈 표준 (agentskills.io)

- 35개+ 에이전트/도구가 채택
- 한 번 만든 스킬이 어떤 에이전트에서든 동작
- 점진적 로딩으로 토큰 절약:
  1. 발견: 이름·설명만 (~100 토큰)
  2. 활성화: SKILL.md 읽음 (~5,000 토큰)
  3. 실행: references/ 폴더를 그때 읽음

### 기본 스킬 구조

```
.claude/skills/
  commit.md              ← 단순 스킬 (파일 1개)
  create-pr/             ← 디렉토리 구조 스킬
    SKILL.md             ← 메인 스킬 설명
    references/
      pr-template.md     ← 필요 시에만 로드
```

### SKILL.md Frontmatter 핵심 옵션

```yaml
---
name: create-pr
description: |
  PR 생성 요청 시 자동 호출.  # AI가 자동 호출 시기 판단
argument-hint: "[브랜치명]"   # 자동완성 힌트
disable-model-invocation: true  # true = 사용자만 호출 가능
user-invocable: false           # false = Claude만 호출 가능
context: fork                   # 서브에이전트에서 격리 실행
allowed-tools:                  # 스킬별 도구 제한
  - Read
  - Glob
  - Grep
  - Bash
---
```

**`context: fork` 핵심:**
- 스킬이 별도 서브에이전트에서 격리 실행
- 메인 대화 컨텍스트를 오염시키지 않음
- 결과 요약만 메인으로 반환

### skill-creator 활용

```bash
# Anthropic 공식 스킬
/plugin install skill-creator@anthropic-agent-skills

# 사용법: "이런 스킬 만들어줘" → 자동 SKILL.md 생성
```

---

## 5. Hook — 규칙을 코드로 강제

### Hook vs Rule

| 구분 | 방식 | 실행 보장 |
|------|------|-----------|
| Rule (CLAUDE.md) | 자연어 지시, LLM이 판단 | "아마도" 실행 |
| Hook | 이벤트에 직접 연결, Shell 실행 | "반드시" 실행 |

### 주요 Hook 이벤트 (26개 중 핵심 9개)

| 이벤트 | 시점 | 활용 예 |
|--------|------|---------|
| `SessionStart` | 세션 시작 시 | 환경 로드, .env 복사 자동화 |
| `UserPromptSubmit` | 프롬프트 제출 시 | 프롬프트 검증·보강 |
| `PreToolUse` | 도구 실행 직전 | 위험 명령 차단 (**차단 가능**) |
| `PostToolUse` | 도구 실행 직후 | 자동 포매팅, 테스트 파일 누락 경고 |
| `PermissionRequest` | 권한 요청 시 | 안전 명령 자동 승인 |
| `Stop` | 응답 완료 시 | 테스트 통과 강제 |
| `SubagentStop` | 서브에이전트 종료 | 서브 결과 검증 |
| `PreCompact` | 컨텍스트 압축 전 | 중요 정보 백업 |

### Hook 3가지 패턴

**Protection Hook** — 위험 작업 차단 (`exit 2`)

```json
// .claude/settings.json
"permissions": {
  "deny": [
    "Read(.env*)", "Read(*credentials*)", "Read(*secrets*)",
    "Bash(cat .env*)", "Bash(cat *secrets*)"
  ]
}
```

```json
// 커밋 전 테스트 강제
"PreToolUse": [{
  "matcher": "Bash",
  "if": "Bash(git commit*)",
  "command": "bun run test || { echo 'Tests failed' >&2; exit 2; }"
}]
```

**Reminder Hook** — 경고만, 차단 안 함 (`exit 0` + stderr)

```bash
# .claude/hooks/check-test.sh
FILE=$(jq -r '.tool_input.file_path')
[ -f "${FILE%.ts}.test.ts" ] || echo "⚠ 테스트 파일 없음: $FILE" >&2
```

**Workflow Trigger Hook** — 조건부 자동 실행

```json
// 파일 편집 후 자동 포매팅
"PostToolUse": [{
  "matcher": "Edit",
  "command": "prettier --write \"$TOOL_INPUT_FILE_PATH\""
}]
```

**exit 코드 의미:**
- `exit 0`: 통과 (Reminder, Workflow)
- `exit 2`: 차단 (Protection)

---

## 6. Sub-agent — 컨텍스트 격리와 검증 분리

### 왜 Sub-agent가 필요한가

**컨텍스트 상태 변화:**
- 초반: 정교한 추론, 엣지케이스 고려
- 중반: Context Drift — 초반 지시·맥락에서 서서히 이탈
- 후반: 지름길, 주석 스킵, TODO 난립

**Self-Evaluation 편향 문제:**
- 에이전트가 자기 코드를 스스로 평가하면 과대평가 → 맹점 발생
- 해법: 작업자(Generator)와 검증자(Evaluator)를 분리

### Generator-Evaluator 패턴

```
메인 Claude (Generator) → 코드 작성
     ↓
Sub-agent Evaluator → 독립 컨텍스트에서 검증 → 피드백 반환
```

**Evaluator 서브에이전트 설정:**

```markdown
---
name: evaluator
model: sonnet      # 실전 권장: opus (편향 제거 극대화)
tools:             # 읽기 전용만 허용
  - Read
  - Glob
  - Grep
---
독립적인 코드 리뷰어로서 작업자가 작성한 코드를 평가...
```

**Stop Hook으로 자동화:**

```json
"Stop": [{
  "command": "claude --agent evaluator 'Code review requested'"
}]
```

### Cross-Model Evaluator (고급)

```
Codex → 계획 수립
Claude Code → 구현 실행
Codex → 결과 검증 (서브에이전트 격리)
```

같은 모델은 같은 편향 공유 → 다른 모델로 적대적 리뷰(Adversarial Review) 시 블라인드 스팟 제거

### Advisor Strategy (비용 최적화)

- **Sonnet** → 실행자 (툴 호출, 코드 작성)
- **막힐 때만** → **Opus** 내부 조언자 호출 (방향만 제시, 툴 호출 없음)

Anthropic 벤치마크:
- SWE-bench Multilingual: +2.7%p 향상, 비용 11.9% 절감
- Haiku + Opus advisor: BrowseComp 19.7% → 41.2% (2배 이상), Sonnet 대비 비용 85% 절감

### 내장 서브에이전트 유형

| 유형 | 모델 | 도구 | 용도 |
|------|------|------|------|
| Explore | Haiku | 읽기 전용 | 코드베이스 탐색 |
| Plan | 부모 상속 | 읽기 전용 | 분석·계획 수립 |
| General-purpose | 부모 상속 | 전체 도구 | 코드 작성·범용 |

---

## 7. 멀티 에이전트 패턴 3종

| 패턴 | 구조 | 통신 | 적합한 경우 |
|------|------|------|-------------|
| **Subagent** | 메인 → 하위(1:N) | 결과 보고만 (단방향) | 코드 탐색, 검증 요약, 단일 태스크 위임 |
| **Worktree** | 독립 개발자 N명 | 없음 (완전 독립) | 독립 기능 동시 개발, 실험 브랜치 병렬 시도 |
| **Agent Teams** | Lead + Teammates (N:N) | 메일박스, 공유 태스크리스트 | 다면 리뷰(보안·성능·테스트), 크로스레이어 조율 |

**선택 기준:** "통신이 필요한가?"
- 보고만 받으면 → Subagent
- 완전 독립이면 → Worktree
- 팀원끼리 대화해야 하면 → Agent Teams (실험적)

---

## 8. Git Worktree — 병렬 개발

### 기본 명령어

```bash
# 생성: 새 브랜치 + 새 디렉토리를 한 번에
git worktree add -b feature/streaming ../streaming

# 목록 확인
git worktree list

# 제거 (브랜치는 유지, 디렉토리만 삭제)
git worktree remove ../streaming

# 수동 삭제 후 메타데이터 정리
git worktree prune
```

### Worktree 사용 흐름

```bash
# 1. Worktree 생성
git worktree add -b feature/streaming ../streaming

# 2. .env 복사 (.gitignore 파일은 자동으로 따라오지 않음!)
cp .env ../streaming/.env

# 3. 의존성 설치 + Claude Code 실행
cd ../streaming && bun install && claude
```

### .env 자동 복사 자동화

**Claude Code Hook 방식:**
```json
"SessionStart": [{
  "matcher": "startup",
  "command": "[ -f .env ] || cp ../main/.env ."
}]
```

**Git Hook 방식 (`.git/hooks/post-worktree-add`):**
```bash
#!/bin/bash
TARGET_DIR="$1"
cp .env "$TARGET_DIR/.env"
echo "✓ .env copied"
```

---

## 9. Claude Code 운영 옵션

### 도입 방식 비교

| 방식 | 비용 | 장점 | 단점 | 추천 |
|------|------|------|------|------|
| **구독제** (Pro/Max/Team) | $20~$200/월 | 빠른 시작, 정액 예측 쉬움, 헤비 유저에 가장 저렴 | 사용량 한도, VPC 실행 불가 | 헤비 유저는 Max 필수 |
| **Anthropic API** | 토큰당 과금 | 사용한 만큼 지불, 자동화·CI에 최적 | 헤비 유저 비용 폭증 | 자동화 전용 |
| **AWS Bedrock** | AWS 과금 + 10% 프리미엄 | 데이터 외부 유출 없음, HIPAA·금융권 적합 | AWS 설정 복잡, 최신 모델 반영 지연 | 규제 환경에서만 |

### 격리 방식

1. **샌드박스 모드** (기본값): macOS·Linux·WSL2에서만 지원, 위험 명령 필터링
2. **YOLO 모드** (`--dangerously-skip-permissions`): 모든 권한 해제, 호스트 전체 접근 가능
3. **DevContainer** ← 권장: 컨테이너 안에서 skip-permissions 켜도 호스트는 안전

### DevContainer 설정 (Node.js)

```json
// .devcontainer/devcontainer.json
{
  "name": "Dev Container",
  "image": "...devcontainers/javascript-node:20",
  "features": { "claude-code": {} },
  "postCreateCommand": "bun install",
  "remoteUser": "node"
}
```

---

## 10. 내일 당장 적용할 3가지

### ① AGENTS.md 하나 만들기

```bash
# skill-creator의 agents-md 스킬 활용
/agents-md
```

Golden Rules + Operational Commands만 넣어도 AI 응답 품질 즉시 향상.

### ② 반복 프롬프트 하나를 스킬로 저장

```bash
# skill-creator 설치 후
/plugin install skill-creator@anthropic-agent-skills

# "이런 스킬 만들어줘" → 자동 SKILL.md 생성
```

자주 쓰는 패턴 1개 (커밋, PR 생성, 코드 리뷰 등)부터 시작.

### ③ 지키고 싶은 규칙 하나를 Hook으로 강제

```json
// .claude/settings.json 에 1개 추가
"permissions": {
  "deny": ["Read(.env*)"]  // .env 접근 차단
}
```

또는:
```json
// main 직접 커밋 방지
"PreToolUse": [{
  "matcher": "Bash",
  "if": "Bash(git commit*)",
  "command": "[ \"$(git branch --show-current)\" != 'main' ] || { echo '⛔ main에 직접 커밋 금지' >&2; exit 2; }"
}]
```

---

## 완성된 하네스 구조 (전체 그림)

```
프로젝트/
├── AGENTS.md                      # Rule: 전체 프로젝트 규칙
├── CLAUDE.md                      # @AGENTS.md 참조
├── src/AGENTS.md                  # Rule: 프론트엔드 전용
├── server/AGENTS.md               # Rule: 백엔드 전용
└── .claude/
    ├── settings.json              # Hook 3개 (Protection 2 + Reminder 1)
    ├── rules/
    │   └── tdd.md                 # Rule: TDD 규칙 (권고)
    ├── skills/
    │   ├── commit.md              # Skill: 커밋 자동화
    │   └── create-pr/             # Skill: PR 생성 (디렉토리 구조)
    │       ├── SKILL.md
    │       └── references/
    │           └── pr-template.md
    └── agents/
        └── evaluator.md           # Sub-agent: 독립 검증자
```

### 다층 검증 레이어

```
1. Rule       → 권고 (AI가 참고하지만 무시 가능)
2. TDD        → 자동 테스트 (코드 정확성 검증)
3. Hook       → 강제 (규칙 위반 시 차단)
4. Sub-agent  → 독립 검증 (작업자 ≠ 검증자)
5. /review    → AI 코드 리뷰 (내장 스킬)
```

단일 레이어가 아닌 다층 검증이 핵심.

---

## Claude Code 주요 조작법

| 명령어 | 용도 |
|--------|------|
| `/help` | 도움말 |
| `/model` | 모델 변경 |
| `/cost` | 비용 확인 |
| `/compact` | 컨텍스트 압축 |
| `/clear` | 대화 초기화 |
| `/plan` | 계획 모드 (코드 수정 없이 분석) |
| `@파일경로` | 특정 파일 직접 참조 |
| `think` / `ultrathink` | 사고 깊이 조절 |
| `Esc` | 응답 중단 |
| `Esc × 2` | 마지막 대화 되돌리기 |
| `Shift+Tab` | Auto Mode 전환 |

---

*"엔지니어링 엄밀함은 사라지지 않는다. 더 높은 추상화 수준으로 이동할 뿐이다."*
