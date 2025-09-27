# Team CalTalk Backend 테스트 가이드

이 문서는 Team CalTalk 백엔드의 테스트 구조와 실행 방법을 설명합니다.

## 📋 테스트 개요

### 테스트 커버리지 목표
- **전체 커버리지**: 80% 이상
- **브랜치 커버리지**: 80% 이상
- **함수 커버리지**: 80% 이상
- **라인 커버리지**: 80% 이상

### 성능 목표
- **일정 조회**: 2초 이내
- **메시지 조회**: 1초 이내
- **충돌 감지**: 10ms 이내
- **전체 테스트 실행**: 5분 이내

## 🗂️ 테스트 구조

```
tests/
├── test-setup.js              # 테스트 환경 설정
├── unit/                      # 단위 테스트
│   ├── models/               # 모델 테스트
│   │   ├── Schedule.test.js   # 일정 모델 테스트
│   │   └── Message.test.js    # 메시지 모델 테스트
│   └── services/             # 서비스 테스트
│       ├── ScheduleService.test.js  # 일정 서비스 테스트
│       └── MessageService.test.js   # 메시지 서비스 테스트
├── integration/              # 통합 테스트
│   ├── schedule-api.test.js   # 일정 API 통합 테스트
│   └── message-api.test.js    # 메시지 API 통합 테스트
├── security/                 # 보안 테스트
│   └── auth-security.test.js  # 인증/권한 보안 테스트
├── performance/              # 성능 테스트
│   └── schedule-performance.test.js  # 일정 성능 테스트
└── README.md                 # 이 파일
```

## 🚀 테스트 실행 방법

### 전체 테스트 실행
```bash
# 모든 테스트 실행
npm test

# 커버리지 포함 테스트 실행
npm run test:coverage

# CI 환경용 테스트 실행
npm run test:ci
```

### 카테고리별 테스트 실행
```bash
# 단위 테스트만 실행
npm run test:unit

# 통합 테스트만 실행
npm run test:integration

# 보안 테스트만 실행
npm run test:security

# 성능 테스트만 실행
npm run test:performance
```

### 특정 테스트 파일 실행
```bash
# 일정 모델 테스트
npm test tests/unit/models/Schedule.test.js

# 메시지 API 테스트
npm test tests/integration/message-api.test.js

# 성능 테스트
npm test tests/performance/schedule-performance.test.js
```

### 감시 모드 실행
```bash
# 파일 변경 시 자동 재실행
npm run test:watch
```

## 🧪 테스트 종류별 상세 설명

### 1. 단위 테스트 (Unit Tests)

#### Schedule Model Tests (`tests/unit/models/Schedule.test.js`)
- **일정 생성**: 개인/팀 일정 생성 검증
- **일정 검증**: 데이터 무결성 및 제약 조건 확인
- **충돌 감지**: PostgreSQL 함수 기반 시간 충돌 검사
- **쿼리 테스트**: 사용자별, 팀별 일정 조회
- **참가자 관리**: 일정 참가자 추가/제거/상태 변경
- **업데이트 작업**: 일정 정보 수정 및 삭제

**주요 테스트 케이스:**
```javascript
test('일정 충돌을 올바르게 감지해야 함', async () => {
  // 기존 일정: 10:00-11:00
  // 새 일정: 10:30-11:30 (충돌)
  const hasConflict = await checkScheduleConflict(userId, newStart, newEnd);
  expect(hasConflict).toBe(true);
});
```

#### Message Model Tests (`tests/unit/models/Message.test.js`)
- **메시지 생성**: 일반/일정 관련 메시지 생성
- **데이터 검증**: 길이 제한, 타입 검증
- **날짜별 조회**: 팀 채팅의 날짜별 분리 기능
- **페이지네이션**: 대량 메시지 처리
- **통계 계산**: 메시지 타입별, 날짜별 통계
- **CASCADE 동작**: 일정 삭제 시 관련 메시지 처리

#### Service Tests
**ScheduleService** (`tests/unit/services/ScheduleService.test.js`):
- 비즈니스 로직 캡슐화 테스트
- 트랜잭션 처리 검증
- 권한 검사 로직
- 복잡한 쿼리 조합

**MessageService** (`tests/unit/services/MessageService.test.js`):
- 실시간 메시징 로직
- 팀 멤버십 검증
- 메시지 검색 기능
- Long Polling 지원

### 2. 통합 테스트 (Integration Tests)

#### Schedule API Tests (`tests/integration/schedule-api.test.js`)
- **CRUD 작업**: RESTful API 엔드포인트 검증
- **권한 검사**: 팀장/팀원 권한 분리
- **충돌 감지 API**: 실시간 충돌 검사 엔드포인트
- **성능 요구사항**: 응답 시간 < 2초
- **보안 검증**: SQL Injection, XSS 방어

**주요 엔드포인트:**
```javascript
GET    /api/schedules                 # 일정 목록 조회
POST   /api/schedules                 # 일정 생성
PUT    /api/schedules/:id             # 일정 수정
DELETE /api/schedules/:id             # 일정 삭제
POST   /api/schedules/:id/conflict-check  # 충돌 검사
```

#### Message API Tests (`tests/integration/message-api.test.js`)
- **메시지 전송/조회**: 날짜별 팀 채팅
- **Long Polling**: 실시간 메시지 수신
- **페이지네이션**: 대량 메시지 처리
- **성능 요구사항**: 응답 시간 < 1초
- **보안 검증**: 메시지 내용 검증

**주요 엔드포인트:**
```javascript
GET    /api/teams/:teamId/messages/:date     # 날짜별 메시지 조회
POST   /api/teams/:teamId/messages           # 메시지 전송
DELETE /api/messages/:id                     # 메시지 삭제
GET    /api/teams/:teamId/messages/:date/poll # Long Polling
```

### 3. 보안 테스트 (Security Tests)

#### Authentication & Authorization (`tests/security/auth-security.test.js`)
- **JWT 인증**: 토큰 검증 및 만료 처리
- **로그인 보안**: 브루트 포스 방어, SQL Injection 차단
- **권한 검증**: 팀 멤버십, 팀장 권한 확인
- **토큰 조작**: 악의적 토큰 변조 차단
- **입력 검증**: XSS, NULL 바이트 주입 방어

**보안 테스트 예시:**
```javascript
test('SQL Injection 공격을 차단해야 함', async () => {
  const maliciousInput = "admin' OR '1'='1";
  const response = await request(app)
    .post('/api/auth/login')
    .send({ email: maliciousInput, password: 'test' });

  expect(response.status).toBe(401);
  expect(response.body.message).toBe('Invalid credentials');
});
```

### 4. 성능 테스트 (Performance Tests)

#### Schedule Performance (`tests/performance/schedule-performance.test.js`)
- **대량 데이터 처리**: 1,000개 일정, 100명 사용자
- **쿼리 성능**: 복잡한 JOIN 및 집계 쿼리
- **인덱스 효율성**: EXPLAIN ANALYZE 기반 검증
- **동시성**: 병렬 요청 처리
- **메모리 관리**: 메모리 누수 감지

**성능 벤치마크:**
- 사용자별 일정 조회: < 2초
- 팀별 복잡 조회: < 3초
- 일정 검색: < 1.5초
- 충돌 검사: < 10ms
- 배치 충돌 검사: 평균 < 20ms

## 🔧 테스트 환경 설정

### 데이터베이스 설정
테스트는 별도의 데이터베이스를 사용합니다:
```javascript
// test-setup.js
const TEST_DB_CONFIG = {
  host: 'localhost',
  port: 5432,
  database: 'team_caltalk_test',  // 전용 테스트 DB
  user: 'team_caltalk_user',
  password: 'team_caltalk_2024!',
};
```

### 테스트 데이터 관리
- **beforeEach**: 각 테스트 전 데이터 정리
- **afterEach**: 테스트 후 자동 정리
- **시퀀스 리셋**: ID 일관성 유지
- **트랜잭션**: 각 테스트의 격리성 보장

### Mock 및 Helper
```javascript
// 전역 헬퍼 함수
global.getTestDbPool = getTestDbPool;
global.createTestUser = createTestUser;
global.createTestTeam = createTestTeam;
global.createTestSchedule = createTestSchedule;

// Jest 매처 확장
expect.extend({
  toBeValidEmail(received) { /* ... */ },
  toBeValidJWT(received) { /* ... */ }
});
```

## 📊 커버리지 보고서

### 커버리지 확인
```bash
# HTML 보고서 생성
npm run test:coverage

# 보고서 확인
open coverage/index.html
```

### 커버리지 기준
```javascript
// package.json의 Jest 설정
"coverageThreshold": {
  "global": {
    "branches": 80,
    "functions": 80,
    "lines": 80,
    "statements": 80
  }
}
```

## 🐛 테스트 디버깅

### 개별 테스트 실행
```bash
# 특정 describe 블록만 실행
npm test -- --testNamePattern="Schedule Creation"

# 특정 테스트만 실행
npm test -- --testNamePattern="일정 충돌을 올바르게 감지해야 함"

# 디버그 모드
npm test -- --detectOpenHandles --forceExit
```

### 로그 확인
```javascript
// 테스트 중 로그 활성화
console.log('디버그 정보:', variable);

// 성능 측정
const startTime = performance.now();
// ... 테스트 코드
const endTime = performance.now();
console.log(`실행 시간: ${endTime - startTime}ms`);
```

## 🚨 일반적인 문제 해결

### 1. 데이터베이스 연결 오류
```bash
# PostgreSQL 서비스 확인
sudo systemctl status postgresql

# 테스트 데이터베이스 생성
createdb team_caltalk_test
```

### 2. 테스트 타임아웃
```javascript
// Jest 설정에서 타임아웃 증가
"testTimeout": 10000  // 10초
```

### 3. 메모리 부족
```bash
# Node.js 메모리 제한 증가
NODE_OPTIONS="--max-old-space-size=4096" npm test
```

### 4. 포트 충돌
```javascript
// 테스트용 포트 분리
const TEST_PORT = process.env.TEST_PORT || 3001;
```

## 📝 테스트 작성 가이드

### 1. 테스트 네이밍 규칙
```javascript
describe('ScheduleService', () => {
  describe('createSchedule', () => {
    test('개인 일정을 올바르게 생성해야 함', () => {
      // 한국어로 명확한 의도 표현
    });
  });
});
```

### 2. AAA 패턴 준수
```javascript
test('테스트 설명', async () => {
  // Arrange: 테스트 데이터 준비
  const userData = await createTestUser();

  // Act: 실제 동작 실행
  const result = await service.createUser(userData);

  // Assert: 결과 검증
  expect(result.id).toBeDefined();
  expect(result.email).toBe(userData.email);
});
```

### 3. 테스트 격리
```javascript
// 각 테스트는 독립적이어야 함
beforeEach(async () => {
  // 테스트별 초기 상태 설정
});

afterEach(async () => {
  // 테스트 후 정리
});
```

## 🔄 CI/CD 통합

### GitHub Actions
```yaml
- name: Run Tests
  run: |
    npm run test:ci
    npm run test:coverage

- name: Upload Coverage
  uses: codecov/codecov-action@v3
  with:
    file: ./coverage/lcov.info
```

### 성공 기준
- ✅ 모든 테스트 통과
- ✅ 커버리지 80% 이상
- ✅ 성능 요구사항 충족
- ✅ 보안 테스트 통과

## 📞 지원 및 문의

테스트 관련 문제가 있을 경우:
1. 이 README 문서 확인
2. 테스트 로그 분석
3. GitHub Issues에 문제 보고
4. 팀 채널에서 논의

---

**Happy Testing! 🧪✨**