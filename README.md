# Team CalTalk

팀 기반 일정 관리 및 실시간 커뮤니케이션 플랫폼

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Node.js Version](https://img.shields.io/badge/node-%3E%3D18.0.0-brightgreen)](https://nodejs.org/)
[![React Version](https://img.shields.io/badge/react-18.3.1-blue)](https://reactjs.org/)

## 📋 목 차

- [프로젝트 개요](#-프로젝트-개요)
- [주요 기능](#-주요-기능)
- [기술 스택](#-기술-스택)
- [프로젝트 구조](#-프로젝트-구조)
- [시작하기](#-시작하기)
- [개발 가이드](#-개발-가이드)
- [API 문서](#-api-문서)
- [데이터베이스](#-데이터베이스)
- [배포](#-배포)
- [테스트](#-테스트)
- [라이선스](#-라이선스)

## 🎯 프로젝트 개요

Team CalTalk는 팀 중심의 일정 관리와 실시간 커뮤니케이션을 통합한 협업 플랫폼입니다. 기존 일정 관리 도구들과 달리, **일정 변경 요청과 의사결정 과정을 채팅 이력으로 투명하게 보존**하여 근거 기반의 협업을 지원합니다.

### 핵심 가치

- **투명성**: 모든 일정 조율 과정이 채팅 이력으로 기록
- **효율성**: 팀 일정과 개인 일정을 통합 관리
- **실시간성**: Long Polling 기반 실시간 커뮤니케이션
- **권한 관리**: 팀장/팀원 역할별 명확한 권한 분리

### 목표 규모

- **3,000개 팀** 동시 운영
- **30,000명 사용자** 동시 접속
- **일정 조회**: < 2초
- **메시지 전송**: < 1초

## ✨ 주요 기능

### 1. 사용자 인증 및 팀 관리
- ✅ 회원가입/로그인 (JWT 기반)
- ✅ 팀 생성 및 초대 코드 발급
- ✅ 팀 참여 및 역할 관리 (팀장/팀원)

### 2. 일정 관리
- ✅ **캘린더 뷰**: react-big-calendar 기반 월/주/일 뷰
- ✅ **개인/팀 일정 CRUD**: 팀장은 모든 일정 관리, 팀원은 조회만 가능
- ✅ **일정 충돌 감지**: PostgreSQL range 타입 + btree_gist 확장
- ✅ **참가자 관리**: 일정별 참가자 초대 및 상태 추적
- ✅ **자동 새로고침**: 30초 간격 일정 동기화
- ✅ **날짜 비례 조정**: 일정 수정 시 자동 종료 날짜 조정
- ✅ **툴팁 표시**: 일정 마우스 오버 시 참가자 정보 표시

### 3. 실시간 채팅
- ✅ **날짜별 채팅방**: 특정 날짜를 선택하여 해당 날짜 대화 조회
- ✅ **실시간 메시징**: 30초 Long Polling 방식
- ✅ **일정 변경 요청**: 팀원 → 팀장 요청 및 승인/거절 워크플로우
- ✅ **채팅 이력 보존**: 모든 일정 조율 과정 기록

### 4. 대시보드
- ✅ **최근 활동 내역**: 최근 1개월 일정 및 메시지 조회
- ✅ **팀 통계**: 팀원 수, 일정 수 등 요약 정보
- ✅ **빠른 액세스**: 주요 기능 바로가기

### 5. 다크모드
- ✅ **테마 전환**: 라이트/다크 모드 토글 (헤더 우측 상단)
- ✅ **자동 감지**: 시스템 테마 설정 자동 적용
- ✅ **설정 유지**: localStorage 기반 테마 설정 저장
- ✅ **전체 적용**: 모든 페이지 및 컴포넌트 다크모드 지원
- ✅ **CSS 변수**: 일관된 색상 시스템 및 쉬운 커스터마이징

## 🛠 기술 스택

### 백엔드
- **런타임**: Node.js 18+
- **프레임워크**: Express.js 4.18
- **데이터베이스**: PostgreSQL 17.6
- **인증**: JWT (jsonwebtoken)
- **보안**: bcrypt, helmet, express-rate-limit
- **검증**: Joi, express-validator
- **로깅**: Winston, Morgan
- **문서화**: Swagger UI

### 프론트엔드
- **프레임워크**: React 18.3 + TypeScript
- **빌드 도구**: Vite 7.1
- **상태 관리**:
  - Zustand (클라이언트 상태, 테마 관리)
  - TanStack Query (서버 상태)
- **라우팅**: React Router DOM 7.9
- **UI**:
  - Tailwind CSS (class 기반 다크모드)
  - Radix UI (Dialog, Toast, Avatar 등)
  - react-big-calendar (캘린더)
- **폼 관리**: React Hook Form + Zod
- **HTTP 클라이언트**: Axios
- **아이콘**: Lucide React
- **테스트**: Vitest, Testing Library

### 개발 도구
- **코드 품질**: ESLint, Prettier
- **테스트**: Jest (백엔드), Vitest (프론트엔드)
- **버전 관리**: Git, GitHub

## 📁 프로젝트 구조

```
team-caltalk/
├── backend/                 # 백엔드 서버
│   ├── src/
│   │   ├── config/         # 설정 파일 (DB, JWT 등)
│   │   ├── database/       # 데이터베이스 연결 및 쿼리
│   │   ├── middleware/     # Express 미들웨어
│   │   ├── models/         # 데이터 모델
│   │   ├── routes/         # API 라우트
│   │   ├── services/       # 비즈니스 로직
│   │   ├── utils/          # 유틸리티 함수
│   │   ├── app.js          # Express 앱 설정
│   │   └── server.js       # 서버 진입점
│   ├── logs/               # 로그 파일
│   ├── coverage/           # 테스트 커버리지
│   └── package.json
│
├── frontend/               # 프론트엔드 앱
│   ├── src/
│   │   ├── components/    # 재사용 컴포넌트
│   │   │   ├── ui/       # shadcn/ui 기반 UI 컴포넌트
│   │   │   ├── calendar/ # 캘린더 관련 컴포넌트
│   │   │   ├── chat/     # 채팅 관련 컴포넌트
│   │   │   ├── auth/     # 인증 관련 컴포넌트
│   │   │   └── layout/   # 레이아웃 컴포넌트
│   │   ├── pages/        # 페이지 컴포넌트
│   │   │   ├── Login.tsx
│   │   │   ├── Register.tsx
│   │   │   ├── Teams.tsx
│   │   │   ├── Calendar.tsx
│   │   │   ├── Chat.tsx
│   │   │   └── Dashboard.tsx
│   │   ├── hooks/        # 커스텀 훅
│   │   ├── stores/       # Zustand 스토어 (theme-store.ts 등)
│   │   ├── services/     # API 서비스
│   │   ├── types/        # TypeScript 타입
│   │   ├── utils/        # 유틸리티 함수
│   │   ├── styles/       # 글로벌 스타일
│   │   └── test/         # 테스트 파일
│   ├── coverage/         # 테스트 커버리지
│   └── package.json
│
├── database/              # 데이터베이스 스키마
│   ├── schema.sql        # PostgreSQL 스키마 정의
│   └── seed.sql          # 테스트 데이터
│
├── docs/                 # 프로젝트 문서
│   ├── 1-domain-definition.md
│   ├── 2-PRD.md
│   ├── 3-user-scenarios.md
│   ├── 4-project-architecture-principles.md
│   ├── 5-arch-diagram.md
│   ├── 6-database-erd.md
│   ├── 7-execution-plan.md
│   ├── 8-wireframes.md
│   ├── APP_STYLE_GUIDE.md
│   ├── FRONTEND_BACKEND_INTEGRATION.md
│   └── VERCEL_DEPLOYMENT_GUIDE.md
│
└── scripts/              # 유틸리티 스크립트
    └── create-github-issues.bat
```

## 🚀 시작하기

### 사전 요구사항

- Node.js 18.0.0 이상
- PostgreSQL 17.6 이상
- npm 8.0.0 이상

### 1. 저장소 클론

```bash
git clone https://github.com/stepanowon/team-caltalk.git
cd team-caltalk
```

### 2. 데이터베이스 설정

```bash
# PostgreSQL 접속
psql -U postgres

# 데이터베이스 및 사용자 생성 (schema.sql 참고)
CREATE DATABASE team_caltalk;
CREATE USER team_caltalk_user WITH PASSWORD 'team_caltalk_2024!';
GRANT ALL PRIVILEGES ON DATABASE team_caltalk TO team_caltalk_user;

# 스키마 적용
\q
psql -f database/schema.sql postgresql://postgres:your_password@localhost:5432/team_caltalk
```

### 3. 백엔드 설정

```bash
cd backend

# 의존성 설치
npm install

# 환경 변수 설정 (.env 파일 확인)
# DB_USER=team_caltalk_user
# DB_PASSWORD=team_caltalk_2024!
# DB_NAME=team_caltalk
# DB_HOST=localhost
# DB_PORT=5432
# JWT_SECRET=your-secret-key

# 개발 서버 시작
npm run dev
```

백엔드 서버가 http://localhost:3000 에서 실행됩니다.

### 4. 프론트엔드 설정

```bash
cd frontend

# 의존성 설치
npm install

# 환경 변수 설정 (.env 파일 확인)
# VITE_API_BASE_URL=http://localhost:3000/api
# VITE_ENV=development
# VITE_PORT=5173

# 개발 서버 시작
npm run dev
```

프론트엔드 앱이 http://localhost:5173 에서 실행됩니다.

### 5. 접속 및 테스트

브라우저에서 http://localhost:5173 접속 후:

1. **회원가입**: 새 계정 생성
2. **로그인**: 생성한 계정으로 로그인
3. **팀 생성**: 새 팀 생성 및 초대 코드 확인
4. **일정 관리**: 캘린더에서 일정 추가/조회
5. **채팅**: 날짜별 채팅방에서 메시지 전송

## 💻 개발 가이드

### 백엔드 개발

#### 사용 가능한 스크립트

```bash
npm start          # 프로덕션 서버 시작
npm run dev        # 개발 서버 시작 (nodemon)
npm run lint       # ESLint 검사
npm run lint:fix   # ESLint 자동 수정
npm test           # 테스트 실행
npm run test:coverage  # 커버리지 포함 테스트
```

#### 코드 규칙

- **SOLID 원칙** 준수
- **Clean Architecture** 구조
- **오버엔지니어링 금지**: 필요한 기능만 구현
- ESLint + Prettier 자동 포맷팅

### 프론트엔드 개발

#### 사용 가능한 스크립트

```bash
npm run dev              # 개발 서버 시작
npm run build            # 프로덕션 빌드
npm run preview          # 빌드 미리보기
npm run lint             # ESLint 검사
npm run lint:fix         # ESLint 자동 수정
npm run format           # Prettier 포맷팅
npm run format:check     # Prettier 검사
npm run type-check       # TypeScript 타입 검사
npm test                 # 테스트 실행
npm run test:coverage    # 커버리지 포함 테스트
```

#### 컴포넌트 개발 원칙

- **단일 책임 원칙**: 각 컴포넌트는 하나의 역할만
- **재사용성**: 공통 UI는 `components/ui/`에 분리
- **타입 안전성**: 모든 Props를 TypeScript 인터페이스로 정의
- **상태 관리**:
  - 전역 상태: Zustand
  - 서버 상태: TanStack Query
  - 로컬 상태: useState

## 📚 API 문서

### Swagger UI

백엔드 서버 실행 후 http://localhost:3000/api-docs 접속

### 주요 엔드포인트

#### 인증
- `POST /api/auth/register` - 회원가입
- `POST /api/auth/login` - 로그인

#### 팀
- `GET /api/teams` - 내 팀 목록
- `POST /api/teams` - 팀 생성
- `POST /api/teams/join` - 팀 참여
- `GET /api/teams/:id/members` - 팀원 목록

#### 일정
- `GET /api/teams/:teamId/schedules` - 팀 일정 목록
- `POST /api/teams/:teamId/schedules` - 일정 생성
- `PATCH /api/schedules/:id` - 일정 수정
- `DELETE /api/schedules/:id` - 일정 삭제
- `POST /api/schedules/check-conflict` - 충돌 검사

#### 메시지
- `GET /api/teams/:teamId/messages` - 메시지 목록
- `POST /api/teams/:teamId/messages` - 메시지 전송
- `POST /api/teams/:teamId/messages/schedule-request` - 일정 변경 요청
- `POST /api/messages/:messageId/approve-request` - 요청 승인

## 🗄 데이터베이스

### 스키마 개요

- **users**: 사용자 정보
- **teams**: 팀 정보
- **team_members**: 팀-사용자 관계
- **schedules**: 일정 정보
- **schedule_participants**: 일정 참가자
- **messages**: 채팅 메시지

### 주요 기능

- **일정 충돌 감지**: `tstzrange` + `btree_gist` 확장
- **초대 코드 생성**: `generate_invite_code()` 함수
- **자동 타임스탬프**: `update_updated_at_column()` 트리거

### 인덱스 최적화

- 총 21개 성능 인덱스
- GIST 인덱스로 일정 충돌 감지 최적화
- B-tree 인덱스로 조회 성능 최적화

상세 정보: `database/schema.sql` 참고

## 🌐 배포

### Vercel 배포 (프론트엔드)

```bash
# Vercel CLI 설치
npm i -g vercel

# 프로젝트 연결 및 배포
cd frontend
vercel
```

상세 가이드: `docs/VERCEL_DEPLOYMENT_GUIDE.md` 참고

### 백엔드 배포

백엔드는 별도 서버(예: AWS EC2, DigitalOcean)에 배포 권장

```bash
# 프로덕션 빌드 확인
npm run build

# PM2로 프로세스 관리
npm install -g pm2
pm2 start src/server.js --name team-caltalk-backend
```

## 🧪 테스트

### 백엔드 테스트

```bash
cd backend

# 전체 테스트
npm test

# 단위 테스트
npm run test:unit

# 커버리지
npm run test:coverage
```

커버리지 목표: 80% 이상

### 프론트엔드 테스트

```bash
cd frontend

# 전체 테스트
npm test

# 단위 테스트
npm run test:unit

# E2E 테스트
npm run test:e2e

# 커버리지
npm run test:coverage
```

커버리지 목표: 80% 이상

## 📄 라이선스

이 프로젝트는 MIT 라이선스 하에 배포됩니다. 자세한 내용은 [LICENSE](LICENSE) 파일을 참고하세요.

## 🤝 기여

기여는 언제나 환영합니다! 이슈나 PR을 자유롭게 생성해주세요.

1. Fork the Project
2. Create your Feature Branch (`git checkout -b feature/AmazingFeature`)
3. Commit your Changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the Branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📞 문의

- **GitHub Issues**: https://github.com/stepanowon/team-caltalk/issues
- **프로젝트 문서**: `docs/` 디렉토리 참고

---

**Team CalTalk** - 팀 협업의 새로운 기준을 만듭니다.
