# 백엔드 테스트 가이드

## 테스트 구조

Team CalTalk 백엔드의 테스트는 다음과 같이 구조화되어 있습니다:

```
backend/tests/
├── README.md              # 이 문서
├── jest.config.js         # Jest 설정
├── test-setup.js          # 테스트 환경 설정
├── fixtures/              # 테스트 데이터
│   ├── users.json
│   ├── teams.json
│   └── schedules.json
├── unit/                  # 단위 테스트
│   ├── auth/
│   │   ├── bcrypt.test.js
│   │   ├── jwt.test.js
│   │   └── middleware.test.js
│   ├── models/
│   │   ├── user.test.js
│   │   ├── team.test.js
│   │   ├── schedule.test.js
│   │   └── message.test.js
│   ├── utils/
│   │   ├── validation.test.js
│   │   └── database.test.js
├── integration/           # 통합 테스트
│   ├── api/
│   │   ├── auth.test.js
│   │   ├── users.test.js
│   │   ├── teams.test.js
│   │   ├── schedules.test.js
│   │   └── messages.test.js
│   └── database/
│       ├── connection.test.js
│       └── transactions.test.js
├── security/              # 보안 테스트
│   ├── sql-injection.test.js
│   ├── xss-protection.test.js
│   ├── auth-bypass.test.js
│   └── permissions.test.js
└── performance/           # 성능 테스트
    ├── api-response.test.js
    ├── database-pool.test.js
    └── concurrent-users.test.js
```

## 테스트 목표

- **단위 테스트**: 80% 이상 커버리지
- **통합 테스트**: 모든 API 엔드포인트
- **보안 테스트**: SQL Injection, XSS, 권한 체크
- **성능 테스트**: API 응답 시간 < 100ms, 인증 < 0.5초

## 실행 방법

```bash
# 모든 테스트 실행
npm test

# 커버리지 리포트 생성
npm run test:coverage

# 단위 테스트만 실행
npm run test:unit

# 통합 테스트만 실행
npm run test:integration

# 보안 테스트만 실행
npm run test:security

# 성능 테스트만 실행
npm run test:performance

# 특정 테스트 파일 실행
npm test -- auth.test.js

# 감시 모드로 실행
npm run test:watch
```

## 테스트 데이터베이스

테스트는 별도의 테스트 데이터베이스를 사용합니다:
- 데이터베이스: `team_caltalk_test`
- 각 테스트 실행 전 데이터베이스 초기화
- 테스트 완료 후 정리