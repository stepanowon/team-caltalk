# Team CalTalk 프로젝트 구조 설계 원칙

**문서 버전**: 1.0
**작성일**: 2025-09-22
**작성자**: Architecture Team

## 개요

Team CalTalk는 팀 중심의 일정 관리와 실시간 커뮤니케이션 통합 플랫폼으로, 5일 MVP 개발과 3000개 팀 동시 지원을 목표로 합니다. 본 문서는 React 18 + TypeScript + Node.js/Express + PostgreSQL 기술 스택 기반의 1인 풀스택 개발에 최적화된 구조 설계 원칙을 정의합니다.

## 1. 최상위 설계 원칙

### 1.1 MVP 우선 원칙 (MVP-First Principle)
- **기능 최소화**: 핵심 기능(인증, 일정 관리, 실시간 채팅)에만 집중
- **확장 가능한 단순함**: 복잡한 패턴보다 확장 가능한 단순한 구조 선택
- **검증 후 확장**: 기본 기능 검증 후 점진적 기능 추가

### 1.2 실시간 우선 원칙 (Real-time First)
- **1초 이내 메시지 전달**: Long Polling 기반 실시간 통신 우선 설계
- **즉시 피드백**: 모든 사용자 액션에 대한 즉각적 시각적 반응
- **상태 동기화**: 클라이언트-서버 간 실시간 상태 일관성 보장

### 1.3 확장성 고려 원칙 (Scalability Awareness)
- **수평 확장 가능**: 3000개 팀 동시 지원을 위한 무상태 설계
- **데이터베이스 최적화**: 인덱싱과 쿼리 최적화를 통한 성능 확보
- **부하 분산 준비**: 향후 로드 밸런서 도입 고려한 세션 관리

## 2. 의존성 및 레이어 구조

### 2.1 전체 아키텍처 레이어

```
┌─────────────────────────────────────┐
│           Client Layer              │
│    (React SPA + Browser APIs)      │
├─────────────────────────────────────┤
│           API Layer                 │
│     (Express REST + Long Poll)     │
├─────────────────────────────────────┤
│         Business Layer              │
│    (Service Logic + Validation)    │
├─────────────────────────────────────┤
│          Data Layer                 │
│      (PostgreSQL + Models)         │
└─────────────────────────────────────┘
```

### 2.2 의존성 원칙

#### 레이어 간 의존성 규칙
- **하향 의존성**: 상위 레이어만 하위 레이어 참조 가능
- **인터페이스 분리**: 각 레이어는 명확한 인터페이스로 소통
- **순환 의존성 금지**: 레이어 간 순환 참조 절대 불허

#### 모듈 의존성 원칙
```
Auth → Database
Schedule → Auth, Database
Chat → Auth, Database
API → Auth, Schedule, Chat
```

## 3. 코드 구조 및 네이밍 원칙

### 3.1 공통 네이밍 컨벤션

#### 파일 및 디렉토리
- **kebab-case**: 디렉토리명, 파일명 (예: `user-service.js`, `auth-middleware/`)
- **PascalCase**: React 컴포넌트 파일 (예: `TeamCalendar.jsx`, `ChatRoom.jsx`)
- **camelCase**: 일반 JavaScript 파일 (예: `databaseConfig.js`, `apiHelpers.js`)

#### 변수 및 함수
- **camelCase**: 변수명, 함수명 (예: `getUserById`, `teamScheduleList`)
- **UPPER_SNAKE_CASE**: 상수 (예: `MAX_TEAM_SIZE`, `DEFAULT_TIMEOUT`)
- **PascalCase**: 클래스명, 생성자 함수 (예: `UserModel`, `ScheduleService`)

### 3.2 컴포넌트 구조 패턴

#### React 컴포넌트 구조
```javascript
// 1. Import 섹션
import React, { useState, useEffect } from 'react';
import { apiService } from '../services';

// 2. 타입 정의 (향후 TypeScript 전환 대비)
// interface TeamCalendarProps { ... }

// 3. 상수 정의
const DEFAULT_VIEW = 'month';

// 4. 메인 컴포넌트
const TeamCalendar = ({ teamId, currentUser }) => {
  // 4.1 State 선언
  const [schedules, setSchedules] = useState([]);
  const [viewMode, setViewMode] = useState(DEFAULT_VIEW);

  // 4.2 Effect 훅
  useEffect(() => {
    loadTeamSchedules();
  }, [teamId]);

  // 4.3 Helper 함수들
  const loadTeamSchedules = async () => {
    // 구현
  };

  // 4.4 Event Handler들
  const handleDateClick = (date) => {
    // 구현
  };

  // 4.5 Render
  return (
    // JSX
  );
};

// 5. Export
export default TeamCalendar;
```

### 3.3 API 엔드포인트 네이밍

#### RESTful 패턴
```
GET    /api/teams/{teamId}/schedules     - 팀 일정 목록
POST   /api/teams/{teamId}/schedules     - 팀 일정 생성
PUT    /api/teams/{teamId}/schedules/{id} - 팀 일정 수정
DELETE /api/teams/{teamId}/schedules/{id} - 팀 일정 삭제

GET    /api/teams/{teamId}/messages      - 팀 채팅 내역
POST   /api/teams/{teamId}/messages      - 메시지 전송

GET    /api/teams/{teamId}/members       - 팀원 목록
POST   /api/teams/{teamId}/invite        - 팀원 초대
```

## 4. 테스트 및 품질 원칙

### 4.1 테스트 전략

#### 테스트 피라미드 (MVP 단계)
```
┌─────────────────┐
│   E2E Tests     │  최소한 (핵심 시나리오만)
│   (Playwright)  │
├─────────────────┤
│ Integration     │  중간 수준 (API 테스트)
│ Tests (Jest)    │
├─────────────────┤
│   Unit Tests    │  기반 (비즈니스 로직)
│   (Jest)        │
└─────────────────┘
```

#### 최소 테스트 커버리지 (MVP 기준)
- **핵심 비즈니스 로직**: 80% 이상
- **API 엔드포인트**: 100% (모든 성공/실패 케이스)
- **데이터베이스 연동**: 90% 이상
- **실시간 통신**: 주요 시나리오 100%

### 4.2 코드 품질 기준

#### ESLint 규칙 (기본 + 추가)
```javascript
// .eslintrc.js
module.exports = {
  extends: ['react-app', 'react-app/jest'],
  rules: {
    // 명명 규칙
    'camelcase': ['error', { properties: 'never' }],

    // 함수 복잡도 제한
    'complexity': ['warn', 10],
    'max-lines-per-function': ['warn', 50],

    // React 특화
    'react-hooks/exhaustive-deps': 'error',
    'react/prop-types': 'error'
  }
};
```

#### Prettier 설정
```javascript
// .prettierrc
{
  "semi": true,
  "trailingComma": "es5",
  "singleQuote": true,
  "printWidth": 80,
  "tabWidth": 2
}
```

## 5. 설정, 보안 및 운영 원칙

### 5.1 환경 설정 관리

#### 환경별 설정 분리
```
config/
├── development.js    - 개발 환경
├── production.js     - 운영 환경
├── test.js          - 테스트 환경
└── index.js         - 환경별 로더
```

#### 보안 정보 관리
```bash
# .env 파일 구조
NODE_ENV=development
PORT=3001

# 데이터베이스
DB_HOST=localhost
DB_PORT=5432
DB_NAME=team_caltalk_dev
DB_USER=caltalk_user
DB_PASSWORD=

# JWT 설정
JWT_SECRET=
JWT_EXPIRES_IN=24h

# 보안 설정
BCRYPT_ROUNDS=12
RATE_LIMIT_WINDOW=15
RATE_LIMIT_MAX=100
```

### 5.2 보안 원칙

#### 인증 및 권한 관리
- **JWT 토큰**: 무상태 인증으로 확장성 확보
- **역할 기반 접근제어**: 팀장/팀원 권한 명확히 분리
- **팀 격리**: 팀 간 데이터 완전 격리 보장

#### 데이터 보호
```javascript
// 비밀번호 해싱
const bcrypt = require('bcrypt');
const SALT_ROUNDS = 12;

// SQL 인젝션 방지 (Parameterized Query)
const query = 'SELECT * FROM users WHERE email = $1';
const values = [email];

// XSS 방지 (입력 검증)
const sanitizer = require('express-validator');
```

### 5.3 로깅 및 모니터링

#### 로그 레벨 정의
```javascript
// 로그 레벨: ERROR > WARN > INFO > DEBUG
const logger = {
  error: (message, meta) => {}, // 시스템 오류, 보안 이벤트
  warn: (message, meta) => {},  // 비즈니스 예외, 성능 경고
  info: (message, meta) => {},  // 사용자 액션, API 호출
  debug: (message, meta) => {}  // 개발용 디버깅 정보
};
```

#### 핵심 모니터링 지표
- **응답 시간**: API 응답 시간 (목표: 2초 이내)
- **메시지 전달 시간**: 실시간 채팅 지연 (목표: 1초 이내)
- **동시 접속자**: 팀별 동시 접속 사용자 수
- **오류율**: HTTP 5xx 에러 비율 (목표: 1% 미만)

## 6. 프론트엔드 구조

### 6.0 기술 스택 상세

#### 핵심 프레임워크
- **React 18**: Concurrent Features, Suspense, 자동 배칭 활용
- **TypeScript**: 타입 안전성, IntelliSense, 런타임 오류 방지
- **Vite**: 빠른 HMR, 효율적 번들링, ES modules 네이티브 지원

#### 상태 관리
- **Zustand**: 2.5KB 경량 라이브러리, Context API 대체
- **TanStack Query**: 서버 상태 캐싱, 백그라운드 동기화, Optimistic Updates

#### UI/스타일링
- **Tailwind CSS**: 유틸리티 퍼스트, 빠른 프로토타이핑, 일관된 디자인 시스템
- **Headless UI**: 접근성 최적화된 unstyled 컴포넌트
- **React Router v6**: 최신 라우팅 패턴, Nested Routes

### 6.1 디렉토리 구조

```
src/
├── components/           # 재사용 가능한 UI 컴포넌트
│   ├── common/          # 공통 컴포넌트
│   │   ├── Button/
│   │   ├── Modal/
│   │   └── Loading/
│   ├── calendar/        # 캘린더 관련 컴포넌트
│   │   ├── CalendarView/
│   │   ├── ScheduleCard/
│   │   └── DatePicker/
│   └── chat/           # 채팅 관련 컴포넌트
│       ├── ChatRoom/
│       ├── MessageList/
│       └── MessageInput/
├── pages/              # 페이지 컴포넌트
│   ├── LoginPage/
│   ├── TeamDashboard/
│   └── ScheduleDetail/
├── hooks/              # 커스텀 훅
│   ├── useAuth.js
│   ├── useRealtime.js
│   └── useSchedules.js
├── stores/             # Zustand 상태 스토어
│   ├── authStore.js
│   ├── teamStore.js
│   └── themeStore.js
├── services/           # API 서비스
│   ├── auth-service.js
│   ├── schedule-service.js
│   └── chat-service.js
├── utils/              # 유틸리티 함수
│   ├── date-helpers.js
│   ├── validation.js
│   └── constants.js
├── styles/             # 스타일 정의
│   ├── globals.css
│   ├── variables.css
│   └── components/
└── App.js             # 메인 앱 컴포넌트
```

### 6.2 상태 관리 원칙

#### Zustand 활용 (MVP 단계)
```javascript
// 전역 상태는 최소화, 필요한 경우만 Zustand 스토어 사용
├── authStore       - 사용자 인증 정보
├── teamStore       - 현재 팀 정보
└── themeStore      - UI 테마 설정 (다크모드 등)

// stores/authStore.js
import { create } from 'zustand';

const useAuthStore = create((set, get) => ({
  user: null,
  token: null,
  isAuthenticated: false,

  login: (user, token) => set({
    user,
    token,
    isAuthenticated: true
  }),

  logout: () => set({
    user: null,
    token: null,
    isAuthenticated: false
  }),

  updateUser: (userData) => set((state) => ({
    user: { ...state.user, ...userData }
  }))
}));

// stores/teamStore.js
const useTeamStore = create((set) => ({
  currentTeam: null,
  teamMembers: [],

  setCurrentTeam: (team) => set({ currentTeam: team }),
  setTeamMembers: (members) => set({ teamMembers: members }),
  addTeamMember: (member) => set((state) => ({
    teamMembers: [...state.teamMembers, member]
  }))
}));
```

#### 상태 관리 우선순위
- **지역 상태 우선**: useState로 컴포넌트 내부 상태 관리
- **전역 상태 최소화**: 정말 필요한 경우에만 Zustand 스토어 사용
- **서버 상태 분리**: TanStack Query로 API 데이터 관리
- **Zustand 장점**:
  - Context Provider 래핑 불필요
  - 타입스크립트 친화적
  - 작은 번들 사이즈 (2.5kb)

#### TanStack Query 활용 (서버 상태 관리)
```javascript
// hooks/useSchedules.js
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { scheduleService } from '../services/schedule-service';

export const useTeamSchedules = (teamId) => {
  return useQuery({
    queryKey: ['schedules', teamId],
    queryFn: () => scheduleService.getTeamSchedules(teamId),
    staleTime: 5 * 60 * 1000, // 5분간 fresh 상태 유지
    gcTime: 10 * 60 * 1000,   // 10분간 캐시 보관
  });
};

export const useCreateSchedule = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: scheduleService.createSchedule,
    onSuccess: (data, variables) => {
      // 팀 일정 목록 캐시 무효화
      queryClient.invalidateQueries(['schedules', variables.teamId]);

      // 실시간 업데이트를 위한 캐시 직접 업데이트
      queryClient.setQueryData(['schedules', variables.teamId], (old) => {
        return old ? [...old, data] : [data];
      });
    },
  });
};

// hooks/useTeamMessages.js
export const useTeamMessages = (teamId) => {
  return useQuery({
    queryKey: ['messages', teamId],
    queryFn: () => chatService.getTeamMessages(teamId),
    staleTime: 0, // 실시간 데이터이므로 항상 fresh하지 않음
    refetchInterval: 30000, // 30초마다 자동 refetch
  });
};
```

#### 서버 상태 관리 원칙
- **캐싱 전략**: 자주 변경되지 않는 데이터는 긴 staleTime 설정
- **실시간 데이터**: 짧은 staleTime + 자동 refetch 조합
- **낙관적 업데이트**: 사용자 경험 향상을 위한 즉시 UI 반영
- **에러 경계**: React Error Boundary와 함께 사용
- **TanStack Query 장점**:
  - 백그라운드 refetch
  - 캐싱 및 동기화
  - 로딩/에러 상태 자동 관리
  - Optimistic Updates 지원

### 6.3 성능 최적화 원칙

#### 컴포넌트 최적화
```javascript
// React.memo 사용 기준
const ExpensiveComponent = React.memo(({ data }) => {
  // 렌더링 비용이 높거나 자주 리렌더링되는 컴포넌트
});

// useCallback 사용 기준
const handleClick = useCallback((id) => {
  // 자식 컴포넌트에 전달되는 함수
}, [dependency]);
```

#### 번들 최적화
- **코드 스플리팅**: 페이지별 lazy loading
- **이미지 최적화**: WebP 포맷 사용
- **CSS 최적화**: 불필요한 스타일 제거

## 7. 백엔드 구조

### 7.0 기술 스택 상세

#### 핵심 런타임 & 프레임워크
- **Node.js 18+**: ES modules, Top-level await, 향상된 성능
- **Express.js**: 가장 안정적이고 성숙한 Node.js 웹 프레임워크

#### 인증 & 보안
- **JWT (jsonwebtoken)**: 무상태 토큰 기반 인증, 확장성 우수
- **bcrypt**: 비밀번호 안전한 해싱, Salt rounds 12 적용
- **helmet**: 보안 HTTP 헤더 자동 설정
- **cors**: Cross-Origin 요청 정책 관리

#### 데이터 검증 & 미들웨어
- **joi**: 스키마 기반 입력 검증, 타입 안전성
- **express-rate-limit**: API 호출 제한, DDoS 방지
- **winston**: 구조화된 로깅, 레벨별 로그 관리

#### 실시간 통신
- **Long Polling**: WebSocket 대비 배포 환경 호환성 우수
- **EventEmitter**: 내장 이벤트 시스템 활용

### 7.1 디렉토리 구조

```
src/
├── routes/             # API 라우트 정의
│   ├── auth.js
│   ├── teams.js
│   ├── schedules.js
│   └── messages.js
├── middleware/         # Express 미들웨어
│   ├── auth.js        # JWT 인증
│   ├── validation.js  # 입력 검증
│   ├── rate-limit.js  # 요청 제한
│   └── error-handler.js
├── services/          # 비즈니스 로직
│   ├── auth-service.js
│   ├── team-service.js
│   ├── schedule-service.js
│   └── chat-service.js
├── models/            # 데이터 모델
│   ├── User.js
│   ├── Team.js
│   ├── Schedule.js
│   └── Message.js
├── database/          # 데이터베이스 관련
│   ├── connection.js
│   ├── migrations/
│   └── seeds/
├── utils/             # 유틸리티
│   ├── logger.js
│   ├── validator.js
│   └── crypto.js
├── config/            # 설정 파일
│   ├── database.js
│   ├── security.js
│   └── server.js
└── app.js            # Express 앱 설정
```

### 7.2 API 설계 원칙

#### RESTful 설계
```javascript
// 리소스 중심 URL 설계
GET    /api/teams/:teamId/schedules
POST   /api/teams/:teamId/schedules
PUT    /api/teams/:teamId/schedules/:scheduleId
DELETE /api/teams/:teamId/schedules/:scheduleId

// 응답 형식 표준화
{
  "success": true,
  "data": {...},
  "message": "Success",
  "timestamp": "2025-09-22T10:30:00Z"
}
```

#### 에러 처리 표준화
```javascript
// HTTP 상태 코드 + 에러 메시지
{
  "success": false,
  "error": {
    "code": "SCHEDULE_CONFLICT",
    "message": "일정이 겹칩니다",
    "details": {
      "conflictWith": "스프린트 계획 미팅",
      "conflictTime": "14:00-16:00"
    }
  },
  "timestamp": "2025-09-22T10:30:00Z"
}
```

### 7.3 데이터베이스 설계

#### 기술 스택 상세
- **PostgreSQL 14+**: ACID 트랜잭션, 복잡한 쿼리, JSON 지원
- **btree_gist 확장**: 일정 충돌 감지용 Range 타입 인덱싱
- **pg (node-postgres)**: 네이티브 PostgreSQL 드라이버
- **Connection Pooling**: 동시 연결 관리, 성능 최적화

#### 특화 기능 활용
- **Range 타입**: 일정 시간 범위 저장 및 겹침 검사
- **GIST 인덱스**: 시간 범위 쿼리 성능 최적화
- **트랜잭션**: 데이터 일관성 보장
- **Prepared Statements**: SQL 인젝션 방지

#### 테이블 구조
```sql
-- 사용자 테이블
CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  name VARCHAR(100) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 팀 테이블
CREATE TABLE teams (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  invite_code VARCHAR(20) UNIQUE NOT NULL,
  created_by INTEGER REFERENCES users(id),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 팀 멤버십 테이블
CREATE TABLE team_members (
  team_id INTEGER REFERENCES teams(id),
  user_id INTEGER REFERENCES users(id),
  role VARCHAR(20) DEFAULT 'member', -- 'leader' or 'member'
  joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (team_id, user_id)
);

-- 일정 테이블
CREATE TABLE schedules (
  id SERIAL PRIMARY KEY,
  team_id INTEGER REFERENCES teams(id),
  created_by INTEGER REFERENCES users(id),
  title VARCHAR(200) NOT NULL,
  description TEXT,
  start_time TIMESTAMP NOT NULL,
  end_time TIMESTAMP NOT NULL,
  schedule_type VARCHAR(20) DEFAULT 'team', -- 'personal' or 'team'
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 메시지 테이블
CREATE TABLE messages (
  id SERIAL PRIMARY KEY,
  team_id INTEGER REFERENCES teams(id),
  sender_id INTEGER REFERENCES users(id),
  content TEXT NOT NULL,
  message_type VARCHAR(20) DEFAULT 'normal', -- 'normal', 'schedule_request'
  related_date DATE,
  sent_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

#### 인덱스 최적화
```sql
-- 성능 최적화를 위한 인덱스
CREATE INDEX idx_schedules_team_time ON schedules(team_id, start_time, end_time);
CREATE INDEX idx_messages_team_date ON messages(team_id, related_date, sent_at);
CREATE INDEX idx_team_members_lookup ON team_members(team_id, user_id);
```

## 8. 실시간 통신 구조

### 8.1 Long Polling 구현

#### 클라이언트 사이드
```javascript
// hooks/useRealtime.js
const useRealtime = (teamId) => {
  const [messages, setMessages] = useState([]);
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    let polling = true;

    const pollMessages = async () => {
      while (polling) {
        try {
          const response = await fetch(`/api/teams/${teamId}/messages/poll`, {
            timeout: 30000 // 30초 타임아웃
          });

          if (response.ok) {
            const newMessages = await response.json();
            setMessages(prev => [...prev, ...newMessages]);
            setIsConnected(true);
          }
        } catch (error) {
          setIsConnected(false);
          await new Promise(resolve => setTimeout(resolve, 3000)); // 3초 대기
        }
      }
    };

    pollMessages();

    return () => {
      polling = false;
    };
  }, [teamId]);

  return { messages, isConnected };
};
```

#### 서버 사이드
```javascript
// routes/messages.js
router.get('/teams/:teamId/messages/poll', async (req, res) => {
  const { teamId } = req.params;
  const { lastMessageId } = req.query;

  // 새 메시지가 올 때까지 최대 30초 대기
  const timeout = setTimeout(() => {
    res.json([]); // 빈 배열 반환
  }, 30000);

  // 새 메시지 체크 (1초마다)
  const checkMessages = setInterval(async () => {
    const newMessages = await getNewMessages(teamId, lastMessageId);

    if (newMessages.length > 0) {
      clearTimeout(timeout);
      clearInterval(checkMessages);
      res.json(newMessages);
    }
  }, 1000);
});
```

## 9. 배포 및 운영 구조

### 9.1 배포 환경 설정

#### Docker 컨테이너화 (향후 확장 대비)
```dockerfile
# Dockerfile
FROM node:18-alpine

WORKDIR /app

# 의존성 설치
COPY package*.json ./
RUN npm ci --production

# 소스 코드 복사
COPY . .

# 빌드
RUN npm run build

EXPOSE 3001

CMD ["npm", "start"]
```

#### 환경별 배포 전략
- **개발**: 로컬 개발 서버 (Hot reload)
- **스테이징**: 운영과 동일한 환경에서 테스트
- **운영**: 최적화된 빌드 + PM2 프로세스 관리

### 9.2 성능 모니터링

#### 핵심 지표 수집
```javascript
// utils/metrics.js
const metrics = {
  // API 응답 시간 측정
  apiResponseTime: (req, res, next) => {
    const start = Date.now();
    res.on('finish', () => {
      const duration = Date.now() - start;
      logger.info('API Response Time', {
        method: req.method,
        url: req.url,
        duration,
        status: res.statusCode
      });
    });
    next();
  },

  // 실시간 메시지 지연 측정
  messageDelay: (sentTime) => {
    const delay = Date.now() - sentTime;
    logger.info('Message Delay', { delay });
    return delay;
  }
};
```

## 10. 확장 계획

### 10.1 단계별 확장 로드맵

#### Phase 1: MVP (5일)
- 기본 인증, 일정 관리, 실시간 채팅
- 단일 서버, 단일 데이터베이스
- 기본 보안 및 에러 처리

#### Phase 2: 성능 최적화 (2주)
- 데이터베이스 쿼리 최적화
- 프론트엔드 성능 개선
- 모니터링 시스템 도입

#### Phase 3: 스케일 아웃 (1개월)
- 로드 밸런서 도입
- 데이터베이스 읽기 복제본
- CDN 도입

#### Phase 4: 고급 기능 (2개월)
- 알림 시스템
- 모바일 앱
- 고급 분석 기능

### 10.2 기술 부채 관리

#### 주기적 리팩토링 계획
- **월간**: 코드 품질 점검 및 개선
- **분기별**: 성능 최적화 및 보안 점검
- **반기별**: 기술 스택 업그레이드 검토

## 결론

Team CalTalk 프로젝트는 5일 MVP 개발과 장기적 확장성을 동시에 고려한 실용적 아키텍처를 채택합니다. 간단함과 확장성의 균형을 맞추어, 빠른 개발과 안정적인 운영을 모두 달성할 수 있는 구조로 설계되었습니다.

핵심은 **단순한 시작, 체계적 확장**입니다. MVP 단계에서는 복잡한 패턴을 피하고 검증된 기술 스택으로 빠르게 구현하되, 확장 시점에서 큰 변경 없이 성능과 기능을 향상시킬 수 있도록 설계되었습니다.