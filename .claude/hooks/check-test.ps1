try {
    $input_json = $input | ConvertTo-Json -Depth 100 -ErrorAction SilentlyContinue
    if ([string]::IsNullOrWhiteSpace($input_json)) {
        $input_json = [System.IO.StreamReader]::new([System.Console]::OpenStandardInput()).ReadToEnd()
    }
    if ([string]::IsNullOrWhiteSpace($input_json)) { exit 0 }

    $data = $input_json | ConvertFrom-Json -ErrorAction Stop
    $file = $data.tool_input.file_path

    if ([string]::IsNullOrWhiteSpace($file)) { exit 0 }

    # src/ 하위 경로만 처리 (백슬래시/슬래시 모두 지원)
    if ($file -notlike '*\src\*' -and $file -notlike '*/src/*') { exit 0 }

    # .ts / .tsx 확장자만 처리
    if ($file -notmatch '\.(tsx?)$') { exit 0 }

    # 테스트 파일 자체는 제외
    if ($file -match '\.test\.(tsx?)$') { exit 0 }

    # 확장자 제거 후 테스트 파일 경로 계산
    $base = $file -replace '\.(tsx?)$', ''
    $testTs  = "$base.test.ts"
    $testTsx = "$base.test.tsx"

    if ((Test-Path $testTs) -or (Test-Path $testTsx)) { exit 0 }

    [Console]::Error.WriteLine("⚠ 테스트 파일 없음: $file")
} catch {
    # 어떤 에러가 발생해도 작업을 차단하지 않음
}
exit 0
