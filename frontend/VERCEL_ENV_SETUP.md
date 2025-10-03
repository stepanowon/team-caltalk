# Vercel 프론트엔드 환경변수 설정 가이드

## Vercel 프로젝트: team-caltalk

### 필수 환경변수

#### 1. API 엔드포인트 설정 (필수)

**Production 환경**
```bash
VITE_API_BASE_URL=https://team-caltalk-backend.vercel.app/api
```

**Preview 환경**
```bash
# 옵션 1: 고정된 개발 백엔드 사용
VITE_API_BASE_URL=https://team-caltalk-backend-dev.vercel.app/api

# 옵션 2: 브랜치별 백엔드 사용 (동적)
VITE_API_BASE_URL=https://team-caltalk-backend-git-$VERCEL_GIT_COMMIT_REF.vercel.app/api
```

#### 2. 환경 설정
```bash
# Production
VITE_ENV=production

# Preview
VITE_ENV=preview

# Development (로컬)
VITE_ENV=development
```

#### 3. 선택적 환경변수

```bash
# 분석 도구 활성화 (옵션)
VITE_ENABLE_ANALYTICS=false

# 디버그 모드 (개발/Preview에서만)
VITE_ENABLE_DEBUG=false
```

## Vercel 환경변수 설정 방법

### 1. Vercel Dashboard 방식

1. Vercel Dashboard → 프로젝트 선택 (team-caltalk)
2. Settings → Environment Variables
3. 각 환경변수 추가:

**VITE_API_BASE_URL (Production)**
- Name: `VITE_API_BASE_URL`
- Value: `https://team-caltalk-backend.vercel.app/api`
- Environments: ✅ Production

**VITE_API_BASE_URL (Preview)**
- Name: `VITE_API_BASE_URL`
- Value: `https://team-caltalk-backend-dev.vercel.app/api` (또는 동적 URL)
- Environments: ✅ Preview

**VITE_ENV**
- Production: `production`
- Preview: `preview`

### 2. Vercel CLI 방식

```bash
# Production 환경변수 설정
vercel env add VITE_API_BASE_URL production
# 입력: https://team-caltalk-backend.vercel.app/api

vercel env add VITE_ENV production
# 입력: production

# Preview 환경변수 설정
vercel env add VITE_API_BASE_URL preview
# 입력: https://team-caltalk-backend-dev.vercel.app/api

vercel env add VITE_ENV preview
# 입력: preview
```

## 환경별 설정 전략

### Production 환경
- 실제 프로덕션 백엔드 API 사용
- 분석 도구 활성화 가능
- 디버그 모드 비활성화
- 에러 로깅만 활성화

### Preview 환경
- 개발/스테이징 백엔드 API 사용
- 디버그 모드 활성화 권장
- 상세 로깅 활성화
- 기능 플래그로 실험 기능 테스트

### Development 환경
- 로컬 백엔드 사용 (`http://localhost:3000/api`)
- `.env.local` 파일 사용
- 모든 디버그 기능 활성화

## Preview 배포 시 백엔드 연동 방법

### 방법 1: 고정된 개발 백엔드 사용 (권장)

**장점**: 간단하고 안정적
**단점**: 모든 Preview가 같은 백엔드 사용

```bash
# Preview 환경변수 설정
VITE_API_BASE_URL=https://team-caltalk-backend-dev.vercel.app/api
```

### 방법 2: 브랜치별 백엔드 매칭

**장점**: 각 브랜치마다 독립적인 백엔드
**단점**: 백엔드도 같은 브랜치로 배포되어야 함

```bash
# GitHub Actions에서 동적으로 설정
VITE_API_BASE_URL=https://team-caltalk-backend-git-${{ github.head_ref }}.vercel.app/api
```

### 방법 3: GitHub Actions로 동적 설정

`.github/workflows/preview.yml`에서:
```yaml
env:
  VITE_API_BASE_URL: https://team-caltalk-backend-git-${{ github.head_ref }}.vercel.app/api
```

## 환경변수 파일 구조

```
frontend/
├── .env                    # Git에 커밋 안됨 (기본값)
├── .env.local             # Git에 커밋 안됨 (로컬 개발용)
├── .env.development       # Git에 커밋 가능 (개발 기본값)
├── .env.production        # Git에 커밋 가능 (프로덕션 기본값)
└── .env.preview          # Git에 커밋 가능 (Preview 기본값)
```

**우선순위**: `.env.local` > `.env.{mode}` > `.env`

## Vite 환경변수 규칙

### ✅ 올바른 사용
```typescript
// VITE_ 접두사가 있는 변수만 클라이언트에 노출됨
const apiUrl = import.meta.env.VITE_API_BASE_URL;
const env = import.meta.env.VITE_ENV;
```

### ❌ 잘못된 사용
```typescript
// VITE_ 접두사가 없으면 노출되지 않음
const secret = import.meta.env.API_SECRET; // undefined
```

### 내장 환경변수
```typescript
import.meta.env.MODE          // 'development', 'production', 'preview'
import.meta.env.DEV           // boolean
import.meta.env.PROD          // boolean
import.meta.env.SSR           // boolean
```

## 환경변수 타입 정의

`src/vite-env.d.ts` 파일에 타입 추가:

```typescript
/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_BASE_URL: string;
  readonly VITE_ENV: 'development' | 'preview' | 'production';
  readonly VITE_ENABLE_ANALYTICS?: string;
  readonly VITE_ENABLE_DEBUG?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
```

## 환경변수 검증

`src/config/env.ts` 파일로 검증:

```typescript
function getEnv(key: keyof ImportMetaEnv): string {
  const value = import.meta.env[key];
  if (!value) {
    throw new Error(`환경변수 ${key}가 설정되지 않았습니다.`);
  }
  return value;
}

export const config = {
  apiBaseUrl: getEnv('VITE_API_BASE_URL'),
  env: getEnv('VITE_ENV'),
  enableAnalytics: import.meta.env.VITE_ENABLE_ANALYTICS === 'true',
  enableDebug: import.meta.env.VITE_ENABLE_DEBUG === 'true',
} as const;
```

## 보안 체크리스트

- [ ] `VITE_` 접두사가 있는 변수만 사용 (클라이언트 노출)
- [ ] API 키, 시크릿은 환경변수에 저장하지 않음 (백엔드에서 처리)
- [ ] `.env.local`은 `.gitignore`에 포함
- [ ] Production 환경변수는 Development와 분리
- [ ] 환경변수 파일은 Git에 커밋하지 않음 (템플릿만 커밋)

## 테스트

### 로컬 환경변수 테스트
```bash
# Development 모드
npm run dev

# Production 빌드 테스트
npm run build
npm run preview
```

### Vercel 환경변수 확인
```bash
# 환경변수 목록 조회
vercel env ls

# Production 환경변수 다운로드
vercel env pull .env.vercel.production

# Preview 환경변수 다운로드
vercel env pull .env.vercel.preview
```

### 배포 후 확인
```bash
# Production
curl https://team-caltalk.vercel.app

# Preview (PR 생성 후 자동 생성된 URL)
curl https://team-caltalk-git-feature-xxx.vercel.app
```

## 문제 해결

### API 연결 실패
1. `VITE_API_BASE_URL` 설정 확인
2. CORS 설정 확인 (백엔드에서 프론트엔드 도메인 허용)
3. 네트워크 탭에서 실제 요청 URL 확인

### 환경변수가 undefined
1. `VITE_` 접두사 확인
2. Vercel Dashboard에서 환경변수 설정 확인
3. 재배포 (환경변수 변경 후 자동 재배포 안됨)

### Preview 배포 시 잘못된 백엔드 연결
1. Preview 환경변수 설정 확인
2. GitHub Actions 환경변수 주입 확인
3. Vercel 빌드 로그에서 환경변수 값 확인

## 참고 자료

- [Vite Environment Variables](https://vitejs.dev/guide/env-and-mode.html)
- [Vercel Environment Variables](https://vercel.com/docs/concepts/projects/environment-variables)
- [Vercel CLI](https://vercel.com/docs/cli)
