# 캘린더 뷰 및 일정 관리 UI 테스트 가이드

GitHub Issue #14 "캘린더 뷰 및 일정 관리 UI 구현"에 대한 포괄적인 테스트 케이스입니다.

## 📋 테스트 개요

### 커버리지 목표
- **Branches**: 80% 이상
- **Functions**: 80% 이상
- **Lines**: 80% 이상
- **Statements**: 80% 이상

### 테스트 구조
```
src/
├── components/calendar/
│   ├── CalendarGrid/CalendarGrid.test.tsx     # 캘린더 그리드 단위 테스트
│   └── ScheduleCard/ScheduleCard.test.tsx     # 일정 카드 단위 테스트
├── hooks/useSchedules/useSchedules.test.ts    # 일정 관리 훅 테스트
├── services/ScheduleService/ScheduleService.test.ts  # API 서비스 테스트
└── test/
    ├── integration/CalendarIntegration.test.tsx      # 통합 테스트
    ├── e2e/CalendarE2E.test.ts                      # E2E 테스트
    ├── performance/CalendarPerformance.test.ts      # 성능 테스트
    └── mocks/handlers/schedule.ts                   # MSW 모킹 핸들러
```

## 🧪 테스트 카테고리

### 1. 단위 테스트 (Unit Tests)

#### CalendarGrid 컴포넌트
- **기본 렌더링**: 캘린더 그리드, 헤더, 네비게이션 버튼
- **뷰 전환**: 월/주/일 뷰 간 전환 및 활성 상태
- **사용자 상호작용**: 날짜 클릭, 일정 클릭, 네비게이션
- **반응형 디자인**: 모바일/데스크톱 환경 대응
- **접근성**: 키보드 네비게이션, ARIA 라벨
- **성능**: 대량 데이터 렌더링 (100ms 이내)

#### ScheduleCard 컴포넌트
- **기본 렌더링**: 제목, 설명, 시간, 참가자 정보
- **권한 기반 UI**: 팀장/팀원별 다른 액션 버튼
- **상태 표시**: 참가자 상태, 충돌 경고, 색상 코딩
- **사용자 상호작용**: 수정/삭제, 참석 상태 변경
- **카드 변형**: 컴팩트/상세 뷰
- **에지 케이스**: 빈 데이터, 누락된 정보 처리

#### useSchedules 훅
- **데이터 조회**: 팀별, 날짜별 일정 조회
- **CRUD 작업**: 생성, 수정, 삭제 및 상태 관리
- **충돌 검사**: 일정 시간 충돌 감지 및 대안 제안
- **캐시 관리**: TanStack Query 기반 캐싱
- **에러 처리**: 네트워크, 권한, 서버 오류
- **낙관적 업데이트**: UI 즉시 반영 및 롤백

#### ScheduleService
- **API 호출**: RESTful API 엔드포인트 테스트
- **인증**: 토큰 기반 인증 헤더
- **에러 처리**: HTTP 상태 코드별 처리
- **데이터 변환**: 요청/응답 데이터 매핑
- **성능**: 동시 요청, 캐싱, 타임아웃
- **확장 기능**: 반복 일정, 검색, 대량 작업

### 2. 통합 테스트 (Integration Tests)

#### 캘린더 뷰 전환 플로우
- 월/주/일 뷰 간 매끄러운 전환
- 뷰 전환 시 현재 날짜 및 데이터 유지
- 각 뷰에서 동일한 기능 제공

#### 일정 CRUD 전체 플로우
- 생성 → 조회 → 수정 → 삭제 전체 워크플로우
- 권한 기반 접근 제어 (팀장/팀원)
- 충돌 감지 및 해결 프로세스

#### 에러 처리 시나리오
- 네트워크 오류, 서버 오류, 권한 오류
- 로딩 상태 및 에러 메시지 표시
- 자동 재시도 및 사용자 액션

### 3. E2E 테스트 (End-to-End Tests)

#### 사용자 워크플로우 - 팀장
- 로그인 → 캘린더 접근 → 일정 생성 → 관리
- 반복 일정 생성 및 수정
- 여러 뷰에서 일정 관리

#### 사용자 워크플로우 - 팀원
- 일정 조회 및 상세 보기
- 참석 상태 변경
- 일정 변경 요청 (채팅 연동)

#### 충돌 감지 및 해결
- 충돌하는 일정 생성 시 경고 표시
- 대안 시간 제안 및 선택
- 수정 시 충돌 재검사

### 4. 성능 테스트 (Performance Tests)

#### 렌더링 성능
- 100개 일정: 100ms 이내
- 1000개 일정: 500ms 이내
- 가상화를 통한 대량 데이터 최적화

#### API 호출 성능
- 일정 목록 API: 2초 이내
- 병렬 vs 순차 호출 비교
- 캐싱을 통한 중복 요청 방지

#### 사용자 상호작용 성능
- 뷰 전환: 1초 이내, 60fps 유지
- 스크롤: 부드러운 스크롤 (가상화)
- 대량 작업: UI 블로킹 방지

#### 메모리 관리
- 컴포넌트 언마운트 시 메모리 누수 방지
- 이벤트 리스너 정리
- 캐시 효율성

## 🔧 테스트 실행 방법

### 전체 캘린더 테스트
```bash
# 모든 캘린더 관련 테스트
npm run test:calendar:all

# 개별 카테고리별 실행
npm run test:calendar:unit          # 단위 테스트
npm run test:calendar:integration   # 통합 테스트
npm run test:calendar:e2e          # E2E 테스트
npm run test:calendar:performance  # 성능 테스트
```

### 도메인별 테스트
```bash
# 일정 관련 테스트만
npm run test:calendar

# 특정 컴포넌트 테스트
npm test CalendarGrid
npm test ScheduleCard
npm test useSchedules
npm test ScheduleService
```

### 커버리지 포함 테스트
```bash
# 캘린더 관련 커버리지
npm run test:coverage:calendar

# 전체 커버리지
npm run test:coverage:all
```

### 개발 모드 테스트
```bash
# 변경사항 감지하여 자동 실행
npm run test:watch

# UI 모드로 실행
npm run test:ui

# 특정 파일만 감시
npm test -- --watch CalendarGrid
```

## 📊 MSW 모킹 핸들러

### 일정 API 모킹
- `GET /teams/:teamId/schedules` - 일정 목록 조회
- `GET /schedules/:id` - 일정 상세 조회
- `POST /teams/:teamId/schedules` - 일정 생성
- `PATCH /schedules/:id` - 일정 수정
- `DELETE /schedules/:id` - 일정 삭제
- `POST /schedules/check-conflict` - 충돌 검사

### 테스트 시나리오
- **정상 응답**: 성공적인 CRUD 작업
- **에러 응답**: 401, 403, 404, 409, 500 상태 코드
- **충돌 감지**: 시간 겹침 검사 및 대안 제안
- **권한 검증**: 팀장/팀원별 접근 제어
- **성능 시나리오**: 느린 응답, 대량 데이터

## 🎯 핵심 테스트 지표

### 기능 커버리지
- [x] 캘린더 뷰 전환 (월/주/일)
- [x] 일정 CRUD 작업
- [x] 권한 기반 접근 제어
- [x] 충돌 감지 및 해결
- [x] 참가자 상태 관리
- [x] 실시간 업데이트 (WebSocket)

### 성능 지표
- [x] 로딩 시간: 2초 이내
- [x] 뷰 전환: 1초 이내
- [x] 렌더링: 대량 데이터 500ms 이내
- [x] 메모리: 누수 없음
- [x] 프레임율: 60fps 유지

### 사용성 지표
- [x] 반응형 디자인 (모바일/데스크톱)
- [x] 접근성 (키보드, 스크린리더)
- [x] 브라우저 호환성
- [x] 고대비 모드 지원

## 🐛 일반적인 테스트 문제 해결

### Mock 데이터 불일치
```bash
# MSW 핸들러 확인
npm test -- --reporter=verbose schedule

# 모킹 상태 초기화
npm run test:clear
```

### 성능 테스트 실패
```bash
# 가비지 컬렉션 강제 실행
NODE_OPTIONS="--expose-gc" npm test

# 메모리 사용량 모니터링
npm test -- --reporter=verbose performance
```

### E2E 테스트 불안정
```bash
# 헤드리스 모드 비활성화
npm test:e2e -- --headed

# 디버그 모드로 실행
npm run test:debug CalendarE2E
```

## 📚 추가 리소스

### 테스트 도구
- **Vitest**: 테스트 러너 및 어서션
- **Testing Library**: 컴포넌트 테스트
- **MSW**: API 모킹
- **Playwright**: E2E 테스트 (시뮬레이션)
- **TanStack Query**: 상태 관리 및 캐싱

### 참고 문서
- [Vitest 설정](./setup.ts)
- [MSW 핸들러](./mocks/handlers/schedule.ts)
- [커버리지 설정](../vitest.config.ts)
- [GitHub Issue #14](https://github.com/stepanowon/team-caltalk/issues/14)

---

**목표**: 80% 이상 커버리지를 달성하여 안정적이고 신뢰할 수 있는 캘린더 뷰 및 일정 관리 UI를 구현합니다.