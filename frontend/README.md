# Team CalTalk Frontend

React 18 + TypeScript + Vite로 구축된 팀 기반 일정 관리 및 실시간 커뮤니케이션 플랫폼의 프론트엔드입니다.

## 기술 스택

- **React 18** - UI 라이브러리
- **TypeScript** - 타입 안전성
- **Vite** - 빌드 도구 및 개발 서버
- **Zustand** - 전역 상태 관리
- **React Query (TanStack Query)** - 서버 상태 관리
- **React Router DOM** - 라우팅
- **Axios** - HTTP 클라이언트
- **ESLint + Prettier** - 코드 품질 및 포맷팅

## 프로젝트 구조

```
src/
├── components/          # 재사용 가능한 UI 컴포넌트
│   └── Layout/         # 레이아웃 컴포넌트
├── pages/              # 페이지 컴포넌트
├── stores/             # Zustand 스토어
├── hooks/              # 커스텀 훅 및 React Query 설정
├── services/           # API 서비스
├── types/              # TypeScript 타입 정의
├── utils/              # 유틸리티 함수 및 상수
└── styles/             # 글로벌 스타일
```

## 시작하기

### 1. 의존성 설치

```bash
npm install
```

### 2. 환경 변수 설정

`.env` 파일이 이미 설정되어 있습니다:

```env
VITE_API_BASE_URL=http://localhost:3000/api
VITE_ENV=development
VITE_PORT=5173
```

### 3. 개발 서버 시작

```bash
npm run dev
```

개발 서버가 http://localhost:5173 에서 시작됩니다.

## 사용 가능한 스크립트

- `npm run dev` - 개발 서버 시작
- `npm run build` - 프로덕션 빌드
- `npm run preview` - 빌드된 앱 미리보기
- `npm run lint` - ESLint 검사
- `npm run lint:fix` - ESLint 자동 수정
- `npm run format` - Prettier 포맷팅
- `npm run format:check` - Prettier 포맷 검사

## API 연동

- 백엔드 API 서버는 `http://localhost:3000/api`에서 실행되어야 합니다
- Vite 개발 서버에서 `/api` 경로를 백엔드로 프록시 설정되어 있습니다
- Axios 인터셉터를 통해 자동 인증 토큰 처리 및 에러 핸들링이 구현되어 있습니다

## 라우팅

- `/` - 홈페이지
- `/login` - 로그인 페이지
- `/register` - 회원가입 페이지
- `/dashboard` - 대시보드 (인증 필요)

## 상태 관리

### Zustand (전역 상태)
- `authStore` - 사용자 인증 상태 및 정보

### React Query (서버 상태)
- 서버 데이터 캐싱 및 동기화
- 자동 재시도 및 에러 처리
- 5분 stale time, 10분 gc time 설정

## 코드 품질

### ESLint 설정
- TypeScript ESLint rules
- React hooks rules
- Prettier integration

### Prettier 설정
- 세미콜론 제거
- 싱글 쿼트 사용
- 80자 줄 길이 제한

## 배포

프로덕션 빌드:

```bash
npm run build
```

빌드 결과물은 `dist/` 디렉토리에 생성됩니다.

## 개발 가이드

### 새 컴포넌트 추가
1. `src/components/` 또는 `src/pages/`에 컴포넌트 생성
2. 필요한 타입을 `src/types/`에 정의
3. 스타일은 CSS 클래스 또는 인라인 스타일 사용

### API 서비스 추가
1. `src/services/`에 API 함수 정의
2. React Query 훅으로 래핑
3. `src/utils/constants.ts`에 엔드포인트 상수 추가

### 상태 관리
- 전역 상태: Zustand 스토어 사용
- 서버 상태: React Query 사용
- 컴포넌트 로컬 상태: useState 사용