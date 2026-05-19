# Code Quality Review: ComponentCard Refine Feature

## 변경 사항
- App.tsx: `onRefine={handleRefine}` 및 `isRefining={refiningIds.includes(component.id)}` props 추가
- 이미 구현된 ComponentCard.tsx와 useComponentGenerator.ts와의 통합

## 검증 결과

### 1. TDD 준수 ✅ 부분 충족
- ✅ useComponentGenerator에 refine 로직 테스트 존재 (5개)
- ❌ ComponentCard의 onRefine 전달 및 호출 테스트 없음
- ❌ App.tsx의 handleRefine 함수 테스트 없음

### 2. 테스트 커버리지 ⚠️ 불완전
- Hook: ~80% (refine 로직은 커버, 동기화 시나리오 부족)
- Component: ~0% (onRefine prop 미테스트)
- Integration: 0% (App ↔ Hook 흐름 미테스트)

### 3. 네이밍 ✅ 우수
- `onRefine`, `isRefining`, `handleRefine`, `refiningIds`: 모두 명확하고 일관성 있음

### 4. 단일 책임 원칙 ✅ 양호
- App: 상태 관리 및 서버 검증 담당
- ComponentCard: UI 및 사용자 입력 담당
- useComponentGenerator: 비즈니스 로직 담당

### 5. 숨은 버그 가능성 🔴 **높음**

#### Critical Issues:

1. **API 키 검증 에러 (handleRefine)**
   ```typescript
   if (!apiKey.trim() && !hasEnvKey) {
   ```
   - apiKey가 null/undefined일 때 .trim() 호출 시 TypeError 발생
   - **Fix**: `if ((!apiKey || !apiKey.trim()) && !hasEnvKey)`

2. **컴포넌트 찾기 실패 시 무시 (useComponentGenerator.refine)**
   ```typescript
   const target = components.find((c) => c.id === id);
   if (!target) return;  // ← 침묵한 실패, 사용자 피드백 없음
   ```
   - 사용자는 "수정 중..." 상태에서 무한 대기
   - refiningIds에서도 제거되지 않아 UI 잠금 상태 지속
   - **Fix**: 
   ```typescript
   if (!target) {
     setError('컴포넌트를 찾을 수 없습니다');
     return;
   }
   ```

3. **isLoading vs isRefining 상태 충돌**
   - App.tsx에서 isLoading 중일 때도 특정 컴포넌트는 refine 가능
   - 사용자 경험상 모호 (한 번에 하나만 해야 하는지 명확하지 않음)
   - **Recommendation**: isLoading 중이면 refine도 비활성화하도록 일관성 유지

4. **다중 refine 동시 요청 처리 불명확**
   ```typescript
   refiningIds.includes(component.id)  // ← true/false만 반영
   ```
   - API 오류 시 refiningIds에서 제거되지 않을 수 있는 시나리오 있음
   - 네트워크 타임아웃 후 사용자가 버튼을 다시 클릭하면?
   - **Fix**: refine 완료/실패 시 반드시 refiningIds 정리 보장

#### Medium Issues:

5. **ComponentCard isRefining prop 의존성**
   - ComponentCard가 onRefine 호출 후 즉시 isRefining={true}로 변함
   - Hook의 refiningIds 업데이트 타이밍과 UI 업데이트 타이밍 불일치 가능성

6. **프롬프트 이력에 "수정 지시"는 추가 안 됨**
   - generate: promptHistory에 추가
   - refine: promptHistory에 추가하지 않음
   - 일관성 문제 (의도적인지 불명확)

#### Minor Issues:

7. **테스트 커버리지 누락**
   - ComponentCard.test.tsx 없음
   - App.test.tsx 없음
   - refine 실패 시나리오 (network, API error) 재현 테스트 부족

## 권장 조치

### 필수 (Critical)
- [ ] handleRefine의 apiKey.trim() null-safe 처리
- [ ] refine 실패 시 error state 설정 및 사용자 알림
- [ ] refiningIds 정리 보장 (finally 블록 확인)

### 권장 (Important)
- [ ] ComponentCard.test.tsx 작성 (onRefine 호출 테스트)
- [ ] App.test.tsx 작성 (handleRefine, provider validation 테스트)
- [ ] refine 중일 때 isLoading도 함께 비활성화 처리
- [ ] 다중 refine 동시 요청 테스트 케이스 추가

### 개선 (Nice-to-Have)
- [ ] refine 지시도 promptHistory에 기록할지 검토
- [ ] 컴포넌트별 refine 이력 추적 고려
- [ ] 롤백 기능 (refine 전 코드 백업)
