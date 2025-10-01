# 프론트엔드-백엔드 통합 가이드

**문서 버전**: 2.0
**최종 업데이트**: 2025-10-01

## 📋 개요

이 문서는 Team CalTalk 프론트엔드-백엔드 API 통합을 위한 완전한 가이드입니다. 모든 API 엔드포인트가 구현 완료되어 프로덕션 준비 상태입니다.

## 🚀 백엔드 준비 상태: 100% 완료 ✅

### ✅ 구현 완료된 주요 기능
- **인증 시스템**: JWT 기반 완전한 인증/인가
- **팀 관리**: 팀 생성, 참여, 멤버 관리, 초대 코드
- **일정 관리**: CRUD, 충돌 감지, 참가자 관리, 자동 새로고침
- **실시간 채팅**: 날짜별 채팅, Long Polling, 메시지 타입 지원
- **일정 변경 요청**: 요청/승인/거절 워크플로우, 팀장 전용 관리 UI
- **활동 내역**: 최근 1개월 활동 조회 API
- **보안**: CORS, Rate Limiting, 입력 검증, XSS 방지

### 📦 추가 구현된 API
- `POST /api/chat/schedule-request` - 일정 변경 요청
- `POST /api/chat/approve-request/:messageId` - 요청 승인
- `POST /api/chat/reject-request/:messageId` - 요청 거절
- `GET /api/chat/teams/:teamId/schedule-requests` - 요청 목록
- `GET /api/activities` - 최근 활동 내역

## 🔧 개발 환경 설정

### 1. 백엔드 서버 실행
```bash
# 백엔드 디렉토리로 이동
cd backend

# 환경 변수 설정 (.env 파일 확인)
NODE_ENV=development
PORT=3000

# 서버 실행
npm run dev
```

### 2. 프론트엔드 개발 서버 설정
```bash
# 프론트엔드 프로젝트 생성 및 실행
npm create vite@latest frontend -- --template react-ts
cd frontend
npm install
npm run dev -- --port 5173  # Vite 기본 포트 사용 권장
```

### 3. CORS 설정 확인 ✅
현재 백엔드 CORS 설정 상태:
- **개발 환경**: 모든 origin 자동 허용 (security.js:118)
- **프로덕션용 허용 포트**:
  - `http://localhost:3000` (Create React App)
  - `http://localhost:3001` (Create React App 대체 포트)

**Vite 개발 서버 (포트 5173) 지원 상태**: ✅ 자동 지원됨
- 개발 환경에서는 모든 origin이 허용되므로 추가 설정 불필요
- 프로덕션 배포 시에만 `.env` 파일에서 CORS_ORIGIN 설정 필요

```bash
# 프로덕션 환경용 CORS 설정 (현재 개발 시에는 불필요)
CORS_ORIGIN=http://localhost:3000,http://localhost:3001,http://localhost:5173
```

## 🔐 인증 시스템 통합

### 1. API 클라이언트 설정 (Axios 권장)
```typescript
// src/services/api.ts
import axios from 'axios';

const api = axios.create({
  baseURL: 'http://localhost:3000/api',
  timeout: 10000,
  withCredentials: true,
});

// 요청 인터셉터 - 토큰 자동 첨부
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// 응답 인터셉터 - 토큰 만료 처리
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export default api;
```

### 2. 인증 상태 관리 (Zustand)
```typescript
// src/stores/authStore.ts
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import api from '../services/api';

interface User {
  id: number;
  email: string;
  name: string;
}

interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  login: (credentials: { email: string; password: string }) => Promise<void>;
  logout: () => void;
  refreshToken: () => Promise<void>;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      token: null,
      isAuthenticated: false,

      login: async (credentials) => {
        try {
          const response = await api.post('/auth/login', credentials);
          const { token, user } = response.data;

          localStorage.setItem('token', token);
          set({ token, user, isAuthenticated: true });
        } catch (error) {
          throw error;
        }
      },

      logout: () => {
        localStorage.removeItem('token');
        set({ user: null, token: null, isAuthenticated: false });
      },

      refreshToken: async () => {
        try {
          const response = await api.post('/auth/refresh');
          const { token } = response.data;

          localStorage.setItem('token', token);
          set({ token });
        } catch (error) {
          get().logout();
        }
      },
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({
        token: state.token,
        user: state.user,
        isAuthenticated: state.isAuthenticated
      }),
    }
  )
);
```

## 📡 API 엔드포인트 전체 목록

### 🔐 인증 API
```typescript
// 인증 관련 API
POST /api/auth/register    // 회원가입
POST /api/auth/login       // 로그인
POST /api/auth/logout      // 로그아웃
POST /api/auth/refresh     // 토큰 갱신
GET  /api/users/me         // 현재 사용자 정보
PUT  /api/users/me         // 사용자 정보 수정
```

### 👥 팀 관리 API
```typescript
// 팀 관련 API
POST /api/teams                     // 팀 생성
GET  /api/teams                     // 소속 팀 목록
POST /api/teams/join                // 팀 참여 (초대 코드)
GET  /api/teams/:teamId             // 팀 상세 정보
PUT  /api/teams/:teamId             // 팀 정보 수정 (팀장만)
GET  /api/teams/:teamId/members     // 팀원 목록
DELETE /api/teams/:teamId/members/:userId  // 팀원 제거 (팀장만)
POST /api/teams/:teamId/leave       // 팀 탈퇴
POST /api/teams/:teamId/invite-code/regenerate  // 초대 코드 재생성
```

### 📅 일정 관리 API
```typescript
// 일정 관련 API
POST /api/schedules                 // 일정 생성
GET  /api/schedules                 // 일정 목록 조회
GET  /api/schedules/:scheduleId     // 일정 상세 조회
PUT  /api/schedules/:scheduleId     // 일정 수정
DELETE /api/schedules/:scheduleId   // 일정 삭제
POST /api/schedules/check-conflict  // 일정 충돌 확인
```

### 💬 채팅 API
```typescript
// 채팅 관련 API
POST /api/chat/teams/:teamId/messages           // 메시지 전송
GET  /api/chat/teams/:teamId/messages           // 메시지 목록
DELETE /api/chat/messages/:messageId            // 메시지 삭제
POST /api/chat/teams/:teamId/messages/:messageId/read  // 메시지 읽음 처리
GET  /api/chat/teams/:teamId/unread-count       // 읽지 않은 메시지 수
```

### 🔄 실시간 Long Polling API
```typescript
// 실시간 통신 API
GET  /api/poll                      // Long Polling 연결
POST /api/poll/disconnect           // 연결 해제
GET  /api/poll/stats               // 연결 상태 조회
DELETE /api/poll/events            // 이벤트 큐 삭제
```

## 🔄 실시간 통신 구현 가이드

### 1. Long Polling Hook
```typescript
// src/hooks/useRealtime.ts
import { useEffect, useRef, useState } from 'react';
import { useAuthStore } from '../stores/authStore';

interface PollingEvent {
  eventId: string;
  eventType: string;
  teamId: number;
  timestamp: string;
  data: any;
}

export const useRealtime = (teamIds: number[]) => {
  const [events, setEvents] = useState<PollingEvent[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const { token } = useAuthStore();
  const lastEventIdRef = useRef<string>('');
  const timeoutRef = useRef<NodeJS.Timeout>();

  const poll = async () => {
    if (!token || teamIds.length === 0) return;

    try {
      const params = new URLSearchParams({
        lastEventId: lastEventIdRef.current,
        teamIds: teamIds.join(','),
      });

      const response = await fetch(`/api/poll?${params}`, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        signal: AbortSignal.timeout(35000), // 35초 타임아웃
      });

      setIsConnected(true);

      if (response.status === 200) {
        const result = await response.json();
        const newEvents = Array.isArray(result.data) ? result.data : [result.data];

        if (newEvents.length > 0) {
          setEvents(prev => [...prev, ...newEvents]);
          lastEventIdRef.current = newEvents[newEvents.length - 1].eventId;
        }
      }

      // 1초 후 재연결
      timeoutRef.current = setTimeout(poll, 1000);
    } catch (error) {
      setIsConnected(false);
      // 5초 후 재연결 시도
      timeoutRef.current = setTimeout(poll, 5000);
    }
  };

  useEffect(() => {
    poll();
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [token, teamIds]);

  return { events, isConnected, clearEvents: () => setEvents([]) };
};
```

### 2. 실시간 이벤트 처리
```typescript
// src/components/RealtimeHandler.tsx
import { useEffect } from 'react';
import { useRealtime } from '../hooks/useRealtime';
import { useTeamStore } from '../stores/teamStore';
import { useMessageStore } from '../stores/messageStore';

export const RealtimeHandler = () => {
  const { currentTeam } = useTeamStore();
  const { addMessage } = useMessageStore();
  const teamIds = currentTeam ? [currentTeam.id] : [];
  const { events } = useRealtime(teamIds);

  useEffect(() => {
    events.forEach(event => {
      switch (event.eventType) {
        case 'message_sent':
          addMessage(event.data.message);
          break;
        case 'schedule_created':
          // 일정 생성 알림 처리
          break;
        case 'schedule_updated':
          // 일정 수정 알림 처리
          break;
        // 기타 이벤트 처리...
      }
    });
  }, [events]);

  return null; // UI 렌더링 없음
};
```

## 📊 TanStack Query 설정

### 1. QueryClient 설정
```typescript
// src/lib/queryClient.ts
import { QueryClient } from '@tanstack/react-query';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000,      // 5분
      gcTime: 10 * 60 * 1000,        // 10분 (이전 cacheTime)
      retry: (failureCount, error) => {
        // 401 에러는 재시도하지 않음
        if (error?.response?.status === 401) return false;
        return failureCount < 3;
      },
    },
  },
});
```

### 2. API 훅 예시
```typescript
// src/hooks/api/useTeams.ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../services/api';

export const useTeams = () => {
  return useQuery({
    queryKey: ['teams'],
    queryFn: async () => {
      const response = await api.get('/teams');
      return response.data;
    },
  });
};

export const useCreateTeam = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (teamData: { name: string; description?: string }) => {
      const response = await api.post('/teams', teamData);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['teams'] });
    },
  });
};
```

## 🛡️ 보안 고려사항

### 1. 토큰 관리
```typescript
// 토큰 저장 방식 선택
// Option 1: localStorage (XSS 취약, 간단함)
localStorage.setItem('token', token);

// Option 2: httpOnly 쿠키 (CSRF 대응 필요, 보안성 높음)
// 백엔드에서 쿠키 설정 시 사용 가능
```

### 2. API 오류 처리
```typescript
// src/utils/errorHandler.ts
export const handleApiError = (error: any) => {
  if (error.response) {
    const { status, data } = error.response;

    switch (status) {
      case 400:
        return data.message || '잘못된 요청입니다.';
      case 401:
        return '인증이 필요합니다.';
      case 403:
        return '권한이 없습니다.';
      case 404:
        return '리소스를 찾을 수 없습니다.';
      case 500:
        return '서버 오류가 발생했습니다.';
      default:
        return '알 수 없는 오류가 발생했습니다.';
    }
  }

  return '네트워크 오류가 발생했습니다.';
};
```

## 🎯 Stage 5 구현 체크리스트

### ✅ 백엔드 준비사항 (완료)
- [x] CORS 설정 완료
- [x] JWT 인증 시스템 완료
- [x] 모든 REST API 구현 완료
- [x] Long Polling 실시간 시스템 완료
- [x] Rate Limiting 및 보안 설정 완료

### 📝 프론트엔드 구현 권장사항
- [ ] Vite + React 18 + TypeScript 프로젝트 생성
- [ ] Zustand 전역 상태 관리 설정
- [ ] TanStack Query 서버 상태 관리 설정
- [ ] React Router DOM 라우팅 설정
- [ ] API 클라이언트 (Axios) 설정
- [ ] 인증 가드 및 보호된 라우트 구현
- [ ] 실시간 Long Polling 연동
- [ ] 기본 UI 컴포넌트 라이브러리 구축

## 🚀 즉시 시작 가능

현재 백엔드는 Stage 5 프론트엔드 개발에 필요한 모든 기능이 완전히 구현되어 있습니다. 프론트엔드 팀은 이 가이드를 참고하여 즉시 React 프로젝트 개발을 시작할 수 있습니다.

### 추가 지원이 필요한 경우
- API 명세서: `swagger/swagger.json` 참조
- 실제 API 테스트: Postman 컬렉션 제공 가능
- 개발 중 이슈: 백엔드 팀과 실시간 협업 가능

**행운을 빕니다! 🎉**