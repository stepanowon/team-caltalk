# 프론트엔드 개발 가이드라인

## 오버엔지니어링 금지

지침에 있는 기능만을 정확하게 구현할 것

## 기술 스택

- React 18 + TypeScript
- Tailwind CSS (네이버 캘린더 스타일 시스템)
- React Query (서버 상태 관리)
- Zustand (클라이언트 상태 관리)

## 컴포넌트 설계 원칙

### 단일 책임 원칙

각 컴포넌트는 하나의 역할만 수행

### 재사용성

공통 UI는 `components/ui/`에 분리

### Props 인터페이스

모든 Props는 TypeScript 인터페이스로 정의

## 디렉토리 구조

```
src/
├── components/       → 재사용 컴포넌트
│   ├── ui/          → 기본 UI 컴포넌트
│   ├── calendar/    → 캘린더 관련
│   └── chat/        → 채팅 관련
├── pages/           → 페이지 컴포넌트
├── hooks/           → 커스텀 훅
├── stores/          → 상태 관리 (Zustand)
├── services/        → API 호출
├── types/           → TypeScript 타입 정의
└── styles/          → 스타일 유틸리티
```

## 스타일 가이드

### Tailwind CSS 사용

- 네이버 캘린더 색상 시스템 활용
- `src/styles/naver-calendar.ts` 유틸리티 사용

### 색상

- `naver-green`: 주요 액션, 오늘 날짜
- `naver-blue`: 강조, 토요일
- `naver-red`: 경고, 일요일
- `naver-gray`: 배경, 테두리

### 컴포넌트 클래스

- `.naver-header`, `.naver-sidebar`, `.naver-calendar-cell`
- 상세 내용: `docs/NAVER_STYLE_GUIDE.md` 참고

## 상태 관리

### 서버 상태 (React Query)

- API 데이터 페칭, 캐싱, 동기화
- `hooks/`에 커스텀 훅으로 분리

### 클라이언트 상태 (Zustand)

- UI 상태, 전역 상태
- `stores/`에 도메인별 스토어 분리

## API 통신

### 서비스 레이어

- `services/`에 API 호출 함수 정의
- axios 인스턴스 사용
- 에러 핸들링 일관성 유지

### 타입 안정성

- API 응답 타입 정의 (`types/`)
- 요청/응답 인터페이스 명시
