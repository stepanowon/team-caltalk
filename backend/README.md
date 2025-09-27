# Team CalTalk Backend

팀 기반 일정 관리 및 실시간 커뮤니케이션 플랫폼의 백엔드 서버입니다.

## 🚀 주요 기능

### ✅ 구현 완료된 기능

- **사용자 인증 시스템**
  - JWT 기반 Access/Refresh Token 인증
  - bcrypt를 이용한 안전한 비밀번호 해싱 (12 rounds)
  - 회원가입, 로그인, 로그아웃, 비밀번호 변경
  - 토큰 갱신 및 검증

- **사용자 관리**
  - 사용자 프로필 조회 및 업데이트
  - 사용자 검색 기능
  - 계정 삭제 (팀 생성자 제약 적용)
  - 사용자 통계 정보

- **팀 관리**
  - 팀 생성, 조회, 수정, 삭제
  - 초대 코드를 통한 팀 가입
  - 팀 멤버 관리 (추가, 제거)
  - 역할 기반 권한 제어 (리더/멤버)
  - 초대 코드 재생성

- **보안 및 성능**
  - Helmet을 이용한 보안 헤더 설정
  - CORS 정책 적용
  - Rate Limiting (API별 차등 적용)
  - 요청 크기 제한 및 압축
  - 의심스러운 활동 감지
  - 종합적인 로깅 시스템

- **데이터베이스**
  - PostgreSQL 연결 풀 관리
  - 트랜잭션 지원
  - 성능 모니터링 (느린 쿼리 감지)
  - 자동 연결 복구

## 🏗️ 아키텍처

```
backend/
├── src/
│   ├── config/          # 설정 파일들
│   │   ├── database.js  # PostgreSQL 연결 풀
│   │   ├── logger.js    # Winston 로거 설정
│   │   └── environment.js # 환경 변수 관리
│   ├── middleware/      # Express 미들웨어
│   │   ├── auth.js      # JWT 인증 미들웨어
│   │   ├── validation.js # 입력 검증 규칙
│   │   └── security.js  # 보안 미들웨어
│   ├── models/          # 데이터 모델
│   │   ├── BaseModel.js # 공통 모델 기능
│   │   ├── User.js      # 사용자 모델
│   │   └── Team.js      # 팀 모델
│   ├── services/        # 비즈니스 로직
│   │   └── AuthService.js # 인증 서비스
│   ├── routes/          # API 라우터
│   │   ├── auth.js      # 인증 API
│   │   ├── users.js     # 사용자 API
│   │   └── teams.js     # 팀 API
│   ├── utils/           # 유틸리티 함수
│   │   └── responseHelper.js # 응답 헬퍼
│   ├── app.js           # Express 앱 설정
│   └── server.js        # 서버 진입점
├── tests/               # 테스트 파일들
│   ├── test-setup.js    # 테스트 환경 설정
│   └── integration/     # 통합 테스트
├── logs/                # 로그 파일들
├── .env                 # 환경 변수
├── .env.example         # 환경 변수 예시
└── package.json         # 의존성 관리
```

## 🛠️ 기술 스택

- **Runtime**: Node.js 18+
- **Framework**: Express.js 4.18+
- **Database**: PostgreSQL 17+ (pg 8.11+)
- **Authentication**: JWT (jsonwebtoken 9.0+)
- **Security**: bcrypt 5.1+, helmet 7.1+
- **Validation**: joi 17.11+, express-validator 7.0+
- **Logging**: winston 3.11+
- **Testing**: Jest 29.7+, supertest 6.3+
- **Code Quality**: ESLint 8.55+, Prettier 3.1+

## 🚀 시작하기

### 1. 환경 설정

```bash
# 의존성 설치
npm install

# 환경 변수 설정
cp .env.example .env
# .env 파일을 편집하여 데이터베이스 연결 정보 등 설정
```

### 2. 데이터베이스 설정

PostgreSQL이 설치되어 있고 `team_caltalk` 데이터베이스와 스키마가 준비되어 있어야 합니다.

```bash
# 데이터베이스 및 사용자 생성 (PostgreSQL 관리자 권한 필요)
psql -U postgres -c "CREATE DATABASE team_caltalk;"
psql -U postgres -c "CREATE USER team_caltalk_user WITH PASSWORD 'team_caltalk_2024!';"
psql -U postgres -c "GRANT ALL PRIVILEGES ON DATABASE team_caltalk TO team_caltalk_user;"

# 스키마 적용
psql -f ../database/schema.sql postgresql://team_caltalk_user:team_caltalk_2024!@localhost:5432/team_caltalk
```

### 3. 서버 실행

```bash
# 개발 모드 (nodemon 사용)
npm run dev

# 프로덕션 모드
npm start

# 테스트 실행
npm test

# 코드 검사
npm run lint
```

### 4. API 확인

서버가 정상적으로 시작되면 다음 URL들에서 확인할 수 있습니다:

- **헬스 체크**: http://localhost:3000/health
- **API 정보**: http://localhost:3000/api
- **인증 API**: http://localhost:3000/api/v1/auth
- **사용자 API**: http://localhost:3000/api/v1/users
- **팀 API**: http://localhost:3000/api/v1/teams

## 📋 API 문서

### 인증 API

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| POST   | `/api/v1/auth/register` | 회원가입 | No |
| POST   | `/api/v1/auth/login` | 로그인 | No |
| POST   | `/api/v1/auth/logout` | 로그아웃 | Yes |
| POST   | `/api/v1/auth/refresh` | 토큰 갱신 | No |
| POST   | `/api/v1/auth/change-password` | 비밀번호 변경 | Yes |
| GET    | `/api/v1/auth/me` | 내 정보 조회 | Yes |
| GET    | `/api/v1/auth/verify` | 토큰 검증 | Yes |

### 사용자 API

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| GET    | `/api/v1/users/profile` | 프로필 조회 | Yes |
| PUT    | `/api/v1/users/profile` | 프로필 업데이트 | Yes |
| GET    | `/api/v1/users/teams` | 내 팀 목록 | Yes |
| GET    | `/api/v1/users/:id` | 사용자 조회 | Yes |
| GET    | `/api/v1/users/search/:query` | 사용자 검색 | Yes |
| DELETE | `/api/v1/users/account` | 계정 삭제 | Yes |
| GET    | `/api/v1/users/stats` | 사용자 통계 | Yes |

### 팀 API

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| POST   | `/api/v1/teams` | 팀 생성 | Yes |
| GET    | `/api/v1/teams` | 내 팀 목록 | Yes |
| GET    | `/api/v1/teams/:id` | 팀 상세 조회 | Yes (멤버) |
| PUT    | `/api/v1/teams/:id` | 팀 정보 수정 | Yes (리더) |
| DELETE | `/api/v1/teams/:id` | 팀 삭제 | Yes (생성자) |
| POST   | `/api/v1/teams/join` | 초대 코드로 가입 | Yes |
| POST   | `/api/v1/teams/:id/leave` | 팀 탈퇴 | Yes (멤버) |
| GET    | `/api/v1/teams/:id/members` | 팀 멤버 목록 | Yes (멤버) |
| DELETE | `/api/v1/teams/:id/members/:userId` | 멤버 제거 | Yes (리더) |
| POST   | `/api/v1/teams/:id/regenerate-code` | 초대 코드 재생성 | Yes (리더) |

## 🔒 보안 기능

- **JWT 인증**: Access Token (24시간) + Refresh Token (7일)
- **비밀번호 해싱**: bcrypt 12 rounds
- **Rate Limiting**:
  - 일반 API: 15분에 100회
  - 인증 API: 15분에 10회
  - 메시지 API: 15분에 200회
- **보안 헤더**: Helmet으로 XSS, CSRF 등 방지
- **CORS 정책**: 허용된 origin에서만 접근 가능
- **입력 검증**: Joi와 express-validator로 이중 검증
- **SQL Injection 방지**: Parameterized queries 사용

## 🎯 성능 최적화

- **연결 풀**: PostgreSQL 연결 풀 (최소 2, 최대 20)
- **압축**: gzip 압축 적용 (1KB 이상 응답)
- **응답 시간 모니터링**: 느린 쿼리 감지 (100ms 이상)
- **메모리 관리**: 요청 크기 제한 (10MB)
- **캐싱 전략**: 준비됨 (Redis 연동 예정)

## 📊 로깅 및 모니터링

- **로그 레벨**: error, warn, info, debug
- **로그 파일**: app.log, error.log, audit.log
- **성능 로그**: API 응답 시간, DB 쿼리 시간
- **보안 감사**: 인증 실패, 권한 위반, 의심스러운 활동
- **로그 로테이션**: 5MB 단위로 최대 10개 파일 유지

## 🧪 테스트

```bash
# 전체 테스트 실행
npm test

# 커버리지 포함 테스트
npm run test:coverage

# 단위 테스트만
npm run test:unit

# 통합 테스트만
npm run test:integration

# 테스트 감시 모드
npm run test:watch
```

## 🔧 개발 도구

```bash
# 코드 검사
npm run lint

# 코드 자동 수정
npm run lint:fix

# 데이터베이스 마이그레이션
npm run db:migrate

# 테스트 데이터 생성
npm run db:seed

# 데이터베이스 리셋
npm run db:reset
```

## 🌍 환경별 설정

### Development
- 상세한 로깅
- Hot reload (nodemon)
- 모든 CORS origin 허용
- 개발용 JWT secret

### Production
- 최소한의 로깅
- 엄격한 보안 설정
- 제한된 CORS origin
- 강력한 JWT secret

### Test
- 에러 로그만
- 메모리 데이터베이스
- 느슨한 Rate limit

## 🚨 알려진 이슈

1. **데이터베이스 권한**: PostgreSQL 사용자에게 적절한 권한이 설정되어야 함
2. **한글 인코딩**: Windows 환경에서 curl 테스트 시 한글 인코딩 문제
3. **포트 충돌**: 기본 포트 3000이 사용 중인 경우 .env에서 PORT 변경 필요

## 🔄 다음 단계 (향후 구현 예정)

- [ ] 일정 관리 API (Schedule 모델)
- [ ] 실시간 메시징 API (Message 모델)
- [ ] WebSocket 또는 Long Polling
- [ ] 파일 업로드 기능
- [ ] 이메일 알림 시스템
- [ ] Redis 캐싱 시스템

## 🤝 기여하기

1. 이 저장소를 Fork 합니다
2. 새 기능 브랜치를 만듭니다 (`git checkout -b feature/새기능`)
3. 변경사항을 커밋합니다 (`git commit -am 'feat: 새 기능 추가'`)
4. 브랜치에 Push합니다 (`git push origin feature/새기능`)
5. Pull Request를 작성합니다

## 📄 라이선스

MIT License - 자세한 내용은 [LICENSE](LICENSE) 파일을 참조하세요.

## 📞 지원

문제가 발생하거나 질문이 있으시면 GitHub Issues를 통해 문의해주세요.