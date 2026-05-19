# PostToolUse Reminder Hook 생성 요청 (Windows 환경)

## 목표

Claude가 `src/` 폴더의 `.ts` / `.tsx` 파일을 수정했을 때, 대응되는 테스트 파일 존재 여부를 검사하여 없으면 경고만 출력한다 (작업은 차단하지 않음). **실행 환경은 Windows (PowerShell).**

## 동작 명세

- **트리거**: `src/**/*.ts` 또는 `src/**/*.tsx` 파일이 `Edit` 또는 `Write` 도구로 수정됨
- **검사**: 같은 디렉토리에 `{파일명}.test.ts` 또는 `{파일명}.test.tsx` 가 존재하는지 확인
- **없을 때**: stderr로 `⚠ 테스트 파일 없음: {파일경로}` 출력
- **종료 코드**: 항상 `exit 0` (차단 금지)
- **제외 대상**: `*.test.ts`, `*.test.tsx` 파일 자체는 검사에서 제외
- **경로 매칭**: `file_path`는 절대경로로 들어오므로, 경로에 `\src\` 또는 `/src/`가 포함된 경우만 처리

## 생성/수정할 파일

| 파일 | 역할 |
|------|------|
| `.claude/hooks/check-test.ps1` | PowerShell 스크립트 (신규 생성) |
| `.claude/settings.json` | `hooks.PostToolUse`에 등록 (스코프: 프로젝트 공용) |

## settings.json 등록 규칙

- **대상 파일**: `.claude/settings.json` (프로젝트 공용, 팀 공유)
- **병합 정책**: 기존 `hooks.PostToolUse` 배열이 있으면 **append**, 절대 replace 금지
- **hook 등록 형식**:
  ```json
  {
    "hooks": {
      "PostToolUse": [{
        "matcher": "Edit|Write",
        "hooks": [{
          "type": "command",
          "shell": "powershell",
          "command": "pwsh -NoProfile -ExecutionPolicy Bypass -File .claude/hooks/check-test.ps1"
        }]
      }]
    }
  }
  ```
- Windows이므로 hook 정의에 `"shell": "powershell"` 명시 필수

## PowerShell 스크립트 구현 핵심

1. **stdin JSON 파싱**: PowerShell에서 stdin을 읽어 JSON 파싱
   ```powershell
   $input_json = [Console]::In.ReadToEnd()
   $data = $input_json | ConvertFrom-Json
   $file = $data.tool_input.file_path
   ```
2. **빈 입력 방어**: `$file`이 비어있으면 즉시 `exit 0`
3. **경로 필터링** (모두 통과해야 검사 진행):
   - 경로에 `\src\` 또는 `/src/` 포함
   - 확장자가 `.ts` 또는 `.tsx`
   - 파일명이 `.test.ts` 또는 `.test.tsx`로 끝나지 **않음**
4. **테스트 파일 경로 계산**: 확장자를 떼고 `.test.ts`, `.test.tsx` 두 경로 모두 `Test-Path`로 확인. 하나라도 존재하면 OK
5. **없을 때 경고**: `[Console]::Error.WriteLine("⚠ 테스트 파일 없음: $file")`
6. **항상 `exit 0`** — 에러가 발생해도 `try/catch`로 감싸서 절대 non-zero 종료 금지

## 검증 절차 (구현 후 필수)

1. **Pipe-test** (PowerShell에서):
   ```powershell
   '{"tool_input":{"file_path":"C:\\proj\\src\\foo.ts"}}' | pwsh -NoProfile -File .claude/hooks/check-test.ps1
   ```
   - 테스트 파일 없는 경로 → stderr에 경고 출력 확인
   - `.test.ts` 경로 입력 → 아무 출력 없음 확인
   - `src/` 밖 경로 입력 → 아무 출력 없음 확인

2. **settings.json 스키마 검증**:
   ```powershell
   jq -e '.hooks.PostToolUse[] | select(.matcher == "Edit|Write") | .hooks[] | select(.type == "command") | .command' .claude/settings.json
   ```

3. **실제 Hook 동작 확인**: `src/` 하위에 테스트 파일 없는 `.ts` 파일을 Edit으로 수정하여 경고가 뜨는지 확인. 확인 후 변경 되돌리기.

## Windows 특이사항 주의

- 경로 구분자는 `\`와 `/` 둘 다 처리
- PowerShell 5.1 / pwsh(7+) 모두 호환되게 작성
- 스크립트 파일은 UTF-8 (BOM 없음) 또는 UTF-8 with BOM으로 저장 (한글 `⚠` 깨지지 않도록)
- `ExecutionPolicy` 때문에 실행이 막히지 않도록 command에 `-ExecutionPolicy Bypass` 포함