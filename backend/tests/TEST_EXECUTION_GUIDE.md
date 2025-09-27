# 테스트 실행 가이드

## 🎯 테스트 개요

GitHub 이슈 9번 "[Stage 2] 백엔드 기반 구조 및 인증 시스템 구현"에 대한 종합적인 테스트 케이스입니다.

### 📊 테스트 커버리지 목표
- **전체 커버리지**: 80% 이상
- **단위 테스트**: 90% 이상
- **통합 테스트**: 모든 API 엔드포인트
- **보안 테스트**: SQL Injection, XSS, 권한 체크
- **성능 테스트**: 인증 < 0.5초, API < 100ms

## 🚀 빠른 시작

### 1. 환경 설정
```bash
# 백엔드 디렉토리로 이동
cd backend

# 의존성 설치
npm install

# 환경 변수 설정 (.env 파일 생성)
NODE_ENV=test
JWT_SECRET=test-jwt-secret-key-very-long-and-secure
JWT_EXPIRES_IN=1h
BCRYPT_ROUNDS=10
```

### 2. 테스트 데이터베이스 준비
```bash
# PostgreSQL에서 테스트 데이터베이스 생성
createdb -h localhost -p 5432 -U team_caltalk_user team_caltalk_test

# 스키마 적용
psql -f ../database/schema.sql postgresql://team_caltalk_user:team_caltalk_2024!@localhost:5432/team_caltalk_test
```

### 3. 테스트 실행
```bash
# Windows 사용자 (추천)
scripts\run-tests.bat

# 또는 npm 명령어 직접 사용
npm test
```

## 📋 테스트 카테고리

### 🔧 단위 테스트 (Unit Tests)
**위치**: `tests/unit/`
**실행**: `npm run test:unit`

#### 인증 모듈 (`tests/unit/auth/`)
- **bcrypt.test.js**: 비밀번호 해싱/검증 (43개 테스트)
  - 비밀번호 해싱 정확성
  - 솔트 라운드별 성능
  - 에러 처리 및 보안
  - 동시성 테스트

- **jwt.test.js**: JWT 토큰 관리 (38개 테스트)
  - 토큰 생성/검증/디코딩
  - 만료 시간 처리
  - 보안 및 성능
  - 에지 케이스

- **middleware.test.js**: 인증 미들웨어 (25개 테스트)
  - 토큰 인증 미들웨어
  - 역할 기반 권한 체크
  - 팀 멤버십 확인
  - 미들웨어 체인

#### 모델 (`tests/unit/models/`)
- **user.test.js**: User 모델 (35개 테스트)
  - CRUD 연산
  - 데이터 검증
  - 비밀번호 보안
  - 페이지네이션

### 🔗 통합 테스트 (Integration Tests)
**위치**: `tests/integration/`
**실행**: `npm run test:integration`

#### API 엔드포인트 (`tests/integration/api/`)
- **auth.test.js**: 인증 API (45개 테스트)
  - 회원가입/로그인/토큰갱신
  - 입력 검증 및 에러 처리
  - 성능 및 동시성
  - 보안 테스트

### 🛡️ 보안 테스트 (Security Tests)
**위치**: `tests/security/`
**실행**: `npm run test:security`

- **sql-injection.test.js**: SQL Injection 방어 (30개 테스트)
  - Union/Boolean/Time-based 공격
  - Stacked Queries 방어
  - 입력 검증 및 이스케이핑
  - 데이터베이스 권한 확인

### ⚡ 성능 테스트 (Performance Tests)
**위치**: `tests/performance/`
**실행**: `npm run test:performance`

- **api-response.test.js**: API 응답 시간 (25개 테스트)
  - 인증 API < 500ms
  - 일반 API < 100ms
  - 데이터베이스 쿼리 < 50ms
  - 동시성 및 부하 테스트

## 📊 성능 기준

### API 응답 시간 목표
| API 카테고리 | 목표 시간 | 측정 방법 |
|-------------|----------|----------|
| 인증 (회원가입/로그인) | < 500ms | 단일 요청 |
| 토큰 갱신 | < 100ms | 단일 요청 |
| 일반 API (조회/생성) | < 100ms | 단일 요청 |
| 데이터베이스 쿼리 | < 50ms | 직접 쿼리 |

### 동시성 성능 목표
| 테스트 시나리오 | 목표 | 측정 대상 |
|---------------|------|----------|
| 동시 로그인 10개 | 평균 < 500ms | 전체 처리 시간 |
| 동시 API 요청 20개 | 평균 < 200ms | 개별 응답 시간 |
| 동시 DB 쿼리 15개 | 평균 < 50ms | 쿼리 실행 시간 |

## 🔍 테스트 실행 옵션

### 기본 명령어
```bash
# 모든 테스트 실행
npm test

# 특정 카테고리 실행
npm run test:unit           # 단위 테스트
npm run test:integration    # 통합 테스트
npm run test:security      # 보안 테스트
npm run test:performance   # 성능 테스트

# 커버리지 리포트
npm run test:coverage

# 감시 모드 (개발 중)
npm run test:watch

# CI 환경용
npm run test:ci
```

### 고급 옵션
```bash
# 특정 테스트 파일 실행
npx jest auth.test.js

# 특정 테스트 케이스 실행
npx jest --testNamePattern="회원가입"

# 병렬 실행 제어
npx jest --maxWorkers=4

# 상세 출력
npx jest --verbose

# 감시 모드에서 특정 패턴
npx jest --watch --testPathPattern=unit
```

## 📈 커버리지 확인

### 커버리지 리포트 생성
```bash
npm run test:coverage
```

### 리포트 위치
- **HTML 리포트**: `coverage/lcov-report/index.html`
- **텍스트 요약**: 콘솔 출력
- **JSON 데이터**: `coverage/coverage-final.json`

### 커버리지 기준
- **라인 커버리지**: 80% 이상
- **함수 커버리지**: 80% 이상
- **브랜치 커버리지**: 80% 이상
- **구문 커버리지**: 80% 이상

## 🚨 문제 해결

### 자주 발생하는 문제

#### 1. 데이터베이스 연결 실패
```bash
# 해결방법
# 1. PostgreSQL 서비스 확인
net start postgresql-x64-17

# 2. 데이터베이스 존재 확인
psql -l | findstr team_caltalk_test

# 3. 권한 확인
psql -U team_caltalk_user -d team_caltalk_test -c "SELECT 1;"
```

#### 2. JWT 시크릿 키 오류
```bash
# 해결방법: 환경변수 확인
echo %JWT_SECRET%

# 또는 .env 파일 확인
type .env
```

#### 3. 의존성 설치 문제
```bash
# 해결방법
rm -rf node_modules package-lock.json
npm install
```

#### 4. 포트 충돌
```bash
# 해결방법: 다른 포트 사용
set PORT=3001
npm test
```

### 성능 테스트 최적화

#### 테스트 속도 향상
```bash
# 병렬 실행 최적화
npx jest --maxWorkers=50%

# 캐시 활용
npx jest --cache

# 변경된 파일만 테스트
npx jest -o
```

#### 메모리 사용량 최적화
```bash
# 메모리 제한 설정
node --max-old-space-size=4096 ./node_modules/.bin/jest

# 가비지 컬렉션 활성화
node --expose-gc ./node_modules/.bin/jest
```

## 📝 테스트 작성 가이드

### 새로운 테스트 추가 시

1. **적절한 디렉토리 선택**
   - 단위 테스트: `tests/unit/`
   - 통합 테스트: `tests/integration/`
   - 보안 테스트: `tests/security/`
   - 성능 테스트: `tests/performance/`

2. **테스트 파일 명명 규칙**
   - `기능명.test.js` 또는 `기능명.spec.js`
   - 예: `schedule.test.js`, `team-management.test.js`

3. **테스트 구조**
   ```javascript
   describe('기능 또는 모듈명', () => {
     beforeAll(() => {
       // 테스트 전체 설정
     });

     beforeEach(() => {
       // 각 테스트 전 설정
     });

     describe('세부 기능', () => {
       test('구체적인 동작', () => {
         // 테스트 로직
       });
     });
   });
   ```

## 🎯 다음 단계

### 테스트 통과 후
1. **코드 리뷰 요청**
2. **성능 최적화**
3. **보안 검토**
4. **문서화 업데이트**

### 지속적 개선
1. **테스트 커버리지 모니터링**
2. **성능 지표 추적**
3. **보안 취약점 스캔**
4. **테스트 자동화 파이프라인 구축**

---

## 📞 지원

문제가 발생하거나 질문이 있으시면:
1. 이 가이드의 문제 해결 섹션 확인
2. GitHub Issues에 문제 등록
3. 팀 채널에서 문의

**테스트는 코드 품질의 기반입니다. 철저한 테스트로 안정적인 서비스를 만들어봅시다! 🚀**