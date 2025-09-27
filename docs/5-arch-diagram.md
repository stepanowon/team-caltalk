# Team CalTalk 기술 아키텍처 다이어그램

## 1. 전체 시스템 아키텍처 (고수준)

```mermaid
graph TB
    %% 사용자
    U[사용자 브라우저]

    %% 프론트엔드
    FE[React 18 Frontend<br/>- 반응형 UI<br/>- JWT 토큰 관리<br/>- Long Polling 클라이언트<br/>- Zustand + TanStack Query]

    %% 백엔드
    BE[Node.js 18+ + Express Backend<br/>- JWT 인증<br/>- REST API<br/>- Long Polling 서버]

    %% 데이터베이스
    DB[(PostgreSQL 14+<br/>- 사용자/팀 정보<br/>- 일정 데이터<br/>- 채팅 메시지)]

    %% 연결 관계
    U -.->|HTTPS| FE
    FE <-->|REST API<br/>Long Polling| BE
    BE <-->|SQL 쿼리| DB

    %% 스타일링
    classDef frontend fill:#e1f5fe
    classDef backend fill:#f3e5f5
    classDef database fill:#e8f5e8

    class FE frontend
    class BE backend
    class DB database
```

**설명**: 3-tier 웹 아키텍처로 React 18 프론트엔드(Zustand + TanStack Query), Node.js 18+ 백엔드, PostgreSQL 14+ 데이터베이스로 구성. Long Polling을 통한 실시간 통신으로 WebSocket 없이도 실시간 기능 구현.

## 2. 프론트엔드 아키텍처 (컴포넌트 구조)

```mermaid
graph TD
    %% 최상위 앱
    App[App.jsx<br/>라우팅 & 인증 상태]

    %% 페이지 컴포넌트
    Login[LoginPage<br/>로그인/회원가입]
    Dashboard[Dashboard<br/>메인 화면]

    %% 메인 기능 컴포넌트
    Cal[Calendar<br/>일정 표시/관리]
    Chat[ChatPanel<br/>실시간 채팅]
    Team[TeamManagement<br/>팀 관리]

    %% 하위 컴포넌트
    CalView[CalendarView<br/>월/주/일 뷰]
    Event[EventCard<br/>일정 카드]
    ChatMsg[MessageList<br/>메시지 목록]
    ChatInput[MessageInput<br/>메시지 입력]

    %% 상태 관리 및 서비스
    AuthStore[AuthStore<br/>Zustand 인증 상태]
    TeamStore[TeamStore<br/>Zustand 팀 상태]
    QueryClient[TanStack Query<br/>서버 상태 캐싱]
    Polling[PollingService<br/>실시간 데이터 동기화]

    %% 연결 관계
    App --> AuthStore
    App --> Login
    App --> Dashboard

    Dashboard --> Cal
    Dashboard --> Chat
    Dashboard --> Team
    Dashboard --> QueryClient
    Dashboard --> Polling

    Cal --> CalView
    Cal --> Event
    Cal --> TeamStore

    Chat --> ChatMsg
    Chat --> ChatInput
    Chat --> TeamStore

    %% 스타일링
    classDef page fill:#e3f2fd
    classDef feature fill:#f1f8e9
    classDef component fill:#fff3e0
    classDef service fill:#fce4ec

    class App,Login,Dashboard page
    class Cal,Chat,Team feature
    class CalView,Event,ChatMsg,ChatInput component
    class AuthStore,TeamStore,QueryClient,Polling service
```

**설명**: React 18 컴포넌트 기반 구조로 인증, 캘린더, 채팅 기능을 독립적인 모듈로 분리. Zustand를 통한 클라이언트 상태 관리, TanStack Query를 통한 서버 상태 캐싱, Long Polling 서비스로 실시간 동기화.

## 3. 백엔드 아키텍처 (API 및 서비스 레이어)

```mermaid
graph TB
    %% API 레이어
    subgraph API ["API Layer (Express Routes)"]
        AuthAPI["/api/auth<br/>로그인/회원가입"]
        UserAPI["/api/users<br/>사용자 관리"]
        TeamAPI["/api/teams<br/>팀 관리"]
        ScheduleAPI["/api/schedules<br/>일정 관리"]
        ChatAPI["/api/chat<br/>채팅 메시지"]
        PollAPI["/api/poll<br/>Long Polling"]
    end

    %% 미들웨어
    subgraph MW ["Middleware"]
        JWTMid[JWT 인증]
        ValidMid[입력 검증]
        LogMid[로깅]
    end

    %% 서비스 레이어
    subgraph SVC ["Service Layer"]
        AuthSvc[AuthService<br/>인증/권한]
        UserSvc[UserService<br/>사용자 관리]
        TeamSvc[TeamService<br/>팀 관리]
        ScheduleSvc[ScheduleService<br/>일정/충돌 감지]
        ChatSvc[ChatService<br/>메시지 관리]
        PollSvc[PollingService<br/>실시간 알림]
    end

    %% 데이터 레이어
    subgraph DATA ["Data Layer"]
        UserRepo[UserRepository]
        TeamRepo[TeamRepository]
        ScheduleRepo[ScheduleRepository]
        ChatRepo[ChatRepository]
    end

    %% 연결 관계
    AuthAPI --> JWTMid --> AuthSvc --> UserRepo
    UserAPI --> JWTMid --> UserSvc --> UserRepo
    TeamAPI --> JWTMid --> TeamSvc --> TeamRepo
    ScheduleAPI --> ValidMid --> ScheduleSvc --> ScheduleRepo
    ChatAPI --> JWTMid --> ChatSvc --> ChatRepo
    PollAPI --> JWTMid --> PollSvc

    PollSvc -.-> ScheduleSvc
    PollSvc -.-> ChatSvc

    %% 스타일링
    classDef api fill:#e8f5e8
    classDef middleware fill:#fff3e0
    classDef service fill:#f3e5f5
    classDef data fill:#e1f5fe

    class AuthAPI,UserAPI,TeamAPI,ScheduleAPI,ChatAPI,PollAPI api
    class JWTMid,ValidMid,LogMid middleware
    class AuthSvc,UserSvc,TeamSvc,ScheduleSvc,ChatSvc,PollSvc service
    class UserRepo,TeamRepo,ScheduleRepo,ChatRepo data
```

**설명**: 계층형 아키텍처로 API → 미들웨어 → 서비스 → 데이터 레이어로 분리. JWT 기반 인증과 Repository 패턴으로 데이터 접근 추상화. Long Polling 서비스가 실시간 알림 담당.

## 4. 데이터베이스 ERD (핵심 테이블)

```mermaid
erDiagram
    users {
        bigserial id PK
        varchar email UK
        varchar password_hash
        varchar name
        timestamp created_at
        timestamp updated_at
    }

    teams {
        bigserial id PK
        varchar name
        varchar invite_code UK
        bigint creator_id FK
        timestamp created_at
    }

    team_members {
        bigint team_id FK
        bigint user_id FK
        varchar role
        timestamp joined_at
    }

    schedules {
        bigserial id PK
        bigint team_id FK
        bigint creator_id FK
        varchar title
        text content
        timestamp start_datetime
        timestamp end_datetime
        varchar schedule_type
        timestamp created_at
        timestamp updated_at
    }

    schedule_participants {
        bigint schedule_id FK
        bigint user_id FK
        varchar participation_status
    }

    messages {
        bigserial id PK
        bigint team_id FK
        bigint sender_id FK
        text content
        date target_date
        bigint related_schedule_id FK
        varchar message_type
        timestamp sent_at
        timestamp created_at
    }

    %% 관계 정의
    users ||--o{ teams : creates
    users ||--o{ team_members : belongs_to
    teams ||--o{ team_members : has
    teams ||--o{ schedules : contains
    users ||--o{ schedules : creates
    schedules ||--o{ schedule_participants : has
    users ||--o{ schedule_participants : participates
    teams ||--o{ messages : has
    users ||--o{ messages : sends
    schedules ||--o{ messages : relates_to
```

**설명**: 정규화된 관계형 스키마로 사용자, 팀, 일정, 채팅 엔티티 간의 관계 정의. 팀 멤버십과 일정 참가자를 별도 테이블로 관리하여 다대다 관계 지원.

## 5. 실시간 통신 플로우 (Long Polling)

```mermaid
sequenceDiagram
    participant C as Client (React)
    participant S as Server (Express)
    participant DB as PostgreSQL
    participant P as Polling Service

    %% 초기 연결
    C->>S: GET /api/poll (Long Polling 시작)
    S->>P: 클라이언트 등록

    %% 데이터 변경 시나리오
    C->>S: POST /api/schedules (새 일정 생성)
    S->>DB: 일정 저장
    S->>P: 일정 변경 이벤트 발생
    P->>P: 관련 팀원들 식별

    %% 실시간 알림 전달
    P-->>S: 변경 알림 준비
    S-->>C: 200 OK (일정 변경 데이터)

    %% 폴링 재연결
    C->>S: GET /api/poll (즉시 재연결)
    S->>P: 클라이언트 재등록

    %% 채팅 메시지 시나리오
    C->>S: POST /api/chat/messages
    S->>DB: 메시지 저장
    S->>P: 채팅 이벤트 발생
    P-->>S: 메시지 알림 준비
    S-->>C: 200 OK (새 메시지 데이터)

    %% 타임아웃 처리
    Note over S,C: 30초 타임아웃 시
    S-->>C: 204 No Content (변경사항 없음)
    C->>S: GET /api/poll (자동 재연결)
```

**설명**: Long Polling을 통한 실시간 통신으로 WebSocket 없이도 1초 내 메시지 전달 보장. 클라이언트가 서버에 지속적인 연결을 유지하다가 이벤트 발생 시 즉시 응답 받고 재연결하는 구조.

## 6. 주요 기능별 데이터 플로우

### 일정 충돌 감지 플로우

```mermaid
flowchart TD
    A[일정 생성/수정 요청] --> B{권한 확인}
    B -->|권한 없음| C[403 Forbidden]
    B -->|권한 있음| D[입력 데이터 검증]
    D --> E[기존 일정과 시간 겹침 검사]
    E --> F{충돌 감지?}
    F -->|충돌 없음| G[일정 저장]
    F -->|충돌 있음| H[충돌 일정 목록 반환]
    G --> I[팀원들에게 알림]
    I --> J[클라이언트 업데이트]
    H --> K[사용자에게 충돌 알림]
```

### 실시간 채팅 플로우

```mermaid
flowchart TD
    A[메시지 전송] --> B[JWT 토큰 검증]
    B --> C[팀 멤버십 확인]
    C --> D[메시지 DB 저장]
    D --> E[Long Polling 서비스에 이벤트 전달]
    E --> F[해당 팀의 모든 연결된 클라이언트 식별]
    F --> G[클라이언트들에게 메시지 즉시 전달]
    G --> H[클라이언트 UI 업데이트]
```

## 7. 기술 스택 요약

| 레이어 | 기술 | 역할 |
|--------|------|------|
| 프론트엔드 | React 18 | UI 컴포넌트, 상태 관리 |
| 백엔드 | Node.js + Express | REST API, 비즈니스 로직 |
| 데이터베이스 | PostgreSQL | 관계형 데이터 저장 |
| 인증 | JWT | 토큰 기반 인증 |
| 실시간 통신 | Long Polling | 실시간 알림/채팅 |
| 배포 | 클라우드 웹서비스 | MVP 서비스 운영 |

## 8. MVP 구현 우선순위

1. **인증 시스템**: 회원가입/로그인, JWT 토큰 관리
2. **기본 일정 관리**: CRUD, 캘린더 뷰, 충돌 감지
3. **실시간 채팅**: Long Polling 기반 메시지 전송/수신
4. **팀 관리**: 팀 생성, 초대 코드, 멤버 관리
5. **통합 UI**: 캘린더와 채팅을 하나의 화면에서 제공

이 아키텍처는 MVP 범위에 맞춰 복잡성을 최소화하면서도 확장 가능한 구조로 설계되었습니다. Long Polling을 통해 WebSocket 없이도 실시간 기능을 구현하여 배포 환경의 제약을 극복하고, 3000개 팀 동시 지원이라는 목표를 달성할 수 있습니다.