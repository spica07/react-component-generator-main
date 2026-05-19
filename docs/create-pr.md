# Plan: pr-create 스킬 생성

## Context

PR 생성을 자동화하는 Claude Code 스킬이 없어 매번 수동으로 `gh pr create`를 실행해야 한다.
이 스킬은 현재 브랜치의 커밋/변경 파일을 분석하고, PR 템플릿에 따라 본문을 생성한 뒤 사용자 승인 후 PR을 만든다.
fork 저장소 환경을 지원하며(`context: fork`), upstream 감지 시 `--repo` 플래그를 자동 추가한다.

---

## 생성할 파일

### 1. `~/.claude/skills/pr-create/SKILL.md`

```markdown
---
name: pr-create
description: 현재 브랜치의 변경사항을 분석하여 PR을 생성합니다. "PR 만들어줘", "PR 올려줘", "pull request 생성", "/pr-create" 호출 시 반드시 실행하라. fork 저장소에서 upstream base 브랜치를 지정하여 gh pr create를 실행합니다.
version: 1.0.0
context: fork
allowed-tools: Read, Glob, Grep, Bash
---

# PR 생성 스킬

현재 브랜치를 분석하여 프로젝트 컨벤션에 맞는 PR을 생성합니다.

## 동작 방식

1. **브랜치 검증**: 현재 브랜치 확인, main에서 실행 시 경고
2. **diff 분석**: main과의 커밋 목록 및 변경 파일 수집
3. **템플릿 로드**: references/pr-template.md를 Read 도구로 읽어 본문 구성
4. **사용자 확인**: PR 미리보기 출력 후 승인 대기
5. **PR 생성**: `gh pr create` 실행, fork 감지 시 --repo 플래그 추가

## Step 1: 사전 검증

gh auth status
git branch --show-current

- `gh auth status` 실패 시: "gh auth login을 먼저 실행하세요." 출력 후 종료
- 현재 브랜치가 `main` 또는 `master`이면: 경고 출력 후 feature 브랜치 생성 여부 확인

## Step 2: diff 분석

git log main..HEAD --oneline
git diff main..HEAD --name-status

커밋 0개이면 "변경사항이 없습니다." 출력 후 종료.

## Step 3: 템플릿 로드 및 PR 본문 생성

Read 도구로 `~/.claude/skills/pr-create/references/pr-template.md`를 반드시 읽은 뒤 본문을 채운다.

**PR 제목 규칙**: `type: 요약` (70자 이내), 커밋이 단일이면 해당 메시지 그대로 사용.

**본문 채우기 순서**:
1. `## Summary`: 변경 목적을 2-3문장 (왜에 집중)
2. `## Changes`: 커밋을 타입별로 그룹핑하여 bullet 목록
3. `## Test Plan`: 변경 기능에 맞는 체크리스트
4. `## Notes`: breaking change, 환경변수, 의존성 변경 (없으면 "없음")

## Step 4: 사용자 확인

PR 미리보기(제목 + 본문 전체)를 출력하고 승인 대기.
수정 요청 시 해당 섹션 재작성 후 다시 확인.

## Step 5: gh pr create 실행

upstream remote 있으면:
  gh pr create --title "<제목>" --body "..." --base main --head <fork계정>:<브랜치> --repo <upstream-owner>/<repo>

upstream 없으면:
  gh pr create --title "<제목>" --body "..." --base main

PR 생성 성공 시 URL 출력. 실패 시 에러 원인 분석 후 해결 방법 제안.

## 주의사항

- 사용자 승인 없이 PR을 생성하지 마라
- references/pr-template.md를 읽지 않고 본문을 임의 작성하지 마라
```

---

### 2. `~/.claude/skills/pr-create/references/pr-template.md`

```markdown
# PR Template — react-component-generator

## Summary
<!-- 변경사항의 목적과 배경을 2-3문장으로 서술한다. "왜"에 집중. -->

## Changes
### feat
- 
### fix
- 
### chore / docs / style
- 

## Test Plan
- [ ] `bun run dev`로 개발 서버 정상 실행 확인 (port 3002 + 5173)
- [ ] `bun run build`로 빌드 성공 확인
- [ ] `bun run lint`로 ESLint 통과 확인

## Notes
없음
```

---

## 검증 방법

1. `/pr-create` 또는 "PR 만들어줘" 입력 시 스킬 자동 트리거 확인
2. main 브랜치에서 실행 → 경고 출력 확인
3. feature 브랜치에서 실행 → diff 분석 → 템플릿 로드 → 미리보기 출력 확인
4. `yes` 입력 시 `gh pr create` 실행 및 URL 반환 확인
5. upstream remote 있는 fork 환경에서 `--repo` 플래그 자동 추가 확인