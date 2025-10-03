# Frontend Vercel 배포 가이드

Team CalTalk 프론트엔드를 Vercel에 배포하는 가이드입니다.

## 📋 사전 준비사항

### 1. Vercel 계정 및 CLI 설치
```bash
npm install -g vercel
vercel login
```

### 2. 백엔드 API URL 확인
프론트엔드는 백엔드 API URL이 필요합니다:
- Preview: 백엔드 Preview URL
- Production: 백엔드 Production URL

## 🚀 배포 방법

### 방법 1: Vercel CLI (수동 배포)

```bash
# 프론트엔드 디렉토리로 이동
cd frontend

# Vercel 배포 (첫 배포)
vercel

# 프로덕션 배포
vercel --prod
```

### 방법 2: GitHub Actions (자동 배포) - 권장

GitHub Actions를 통한 자동 배포는 아래 "GitHub Actions 설정" 섹션 참조

## ⚙️ 환경 변수 설정

### Vercel 대시보드에서 설정

1. https://vercel.com/dashboard 접속
2. 프론트엔드 프로젝트 선택
3. **Settings** → **Environment Variables**

### 필수 환경 변수

| 변수명 | Preview 환경 값 | Production 환경 값 |
|--------|-----------------|-------------------|
| `VITE_API_BASE_URL` | `https://backend-preview.vercel.app/api` | `https://backend-prod.vercel.app/api` |
| `VITE_ENV` | `preview` | `production` |

### Vercel CLI로 환경 변수 추가

```bash
# Preview 환경
vercel env add VITE_API_BASE_URL preview
vercel env add VITE_ENV preview

# Production 환경
vercel env add VITE_API_BASE_URL production
vercel env add VITE_ENV production
```

## 📁 프로젝트 구조

```
frontend/
├── src/              # 소스 코드
├── dist/             # 빌드 결과물 (자동 생성)
├── public/           # 정적 파일
├── vercel.json       # Vercel 설정
├── vite.config.ts    # Vite 설정
└── package.json
```

## 📄 Vercel 설정 상세 (vercel.json)

```json
{
  "version": 2,
  "name": "team-caltalk-frontend",
  "buildCommand": "npm run build",     // Vite 빌드 명령어
  "outputDirectory": "dist",           // 빌드 결과물 디렉토리
  "framework": "vite",                 // Vite 프레임워크
  "installCommand": "npm install",
  "rewrites": [
    {
      "source": "/(.*)",               // 모든 경로를
      "destination": "/index.html"     // index.html로 리다이렉트 (SPA)
    }
  ],
  "headers": [
    {
      "source": "/assets/(.*)",        // 정적 파일 캐싱
      "headers": [
        {
          "key": "Cache-Control",
          "value": "public, max-age=31536000, immutable"
        }
      ]
    },
    {
      "source": "/(.*)",               // 보안 헤더
      "headers": [
        {
          "key": "X-Content-Type-Options",
          "value": "nosniff"
        },
        {
          "key": "X-Frame-Options",
          "value": "DENY"
        },
        {
          "key": "X-XSS-Protection",
          "value": "1; mode=block"
        }
      ]
    }
  ],
  "regions": ["icn1"]                  // 서울 리전
}
```

### 주요 설정 설명

#### 1. SPA 라우팅 (rewrites)
React Router를 사용하므로 모든 경로를 `index.html`로 리다이렉트:
```json
"rewrites": [
  { "source": "/(.*)", "destination": "/index.html" }
]
```

#### 2. 정적 파일 캐싱
빌드된 assets 파일은 1년간 캐싱:
```json
"headers": [
  {
    "source": "/assets/(.*)",
    "headers": [{ "key": "Cache-Control", "value": "public, max-age=31536000, immutable" }]
  }
]
```

#### 3. 보안 헤더
XSS, Clickjacking 등 보안 공격 방어:
```json
"headers": [
  { "key": "X-Content-Type-Options", "value": "nosniff" },
  { "key": "X-Frame-Options", "value": "DENY" },
  { "key": "X-XSS-Protection", "value": "1; mode=block" }
]
```

## 🔧 GitHub Actions 설정

### 1. GitHub Secrets 추가

**저장소 Settings → Secrets and variables → Actions**에서 추가:

| Secret 이름 | 값 | 설명 |
|-------------|-----|------|
| `VERCEL_TOKEN` | `vercel_abc123...` | Vercel 액세스 토큰 (백엔드와 동일) |
| `VERCEL_ORG_ID` | `team_xyz789...` | Organization ID (백엔드와 동일) |
| `VERCEL_FRONTEND_PROJECT_ID` | `prj_frontend123...` | **프론트엔드 프로젝트 ID** |
| `VITE_API_BASE_URL_PREVIEW` | `https://backend-preview.vercel.app/api` | Preview 백엔드 URL |
| `VITE_API_BASE_URL_PRODUCTION` | `https://backend-prod.vercel.app/api` | Production 백엔드 URL |

### 2. 프론트엔드 프로젝트 ID 가져오기

```bash
cd frontend
vercel link
cat .vercel/project.json
```

출력 예시:
```json
{
  "orgId": "team_xxxxxxxxxx",
  "projectId": "prj_frontend_yyyyyy"  # 이 값을 VERCEL_FRONTEND_PROJECT_ID로 사용
}
```

### 3. 워크플로우 동작

#### Preview 배포 (PR)
```
PR 생성 (frontend/ 변경)
    ↓
GitHub Actions 실행
    ↓
Lint + Type Check
    ↓
Build (Preview 환경 변수)
    ↓
Vercel Preview 배포
    ↓
PR에 배포 URL 코멘트
    ↓
Lighthouse CI 실행 (성능 측정)
```

#### Production 배포 (main)
```
main 브랜치 푸시 (frontend/ 변경)
    ↓
GitHub Actions 실행
    ↓
Lint + Type Check
    ↓
Build (Production 환경 변수)
    ↓
Vercel Production 배포
    ↓
배포 완료 알림
```

## 🎯 배포 후 확인사항

### 1. Health Check
```bash
# 프론트엔드 접속 확인
curl -I https://your-frontend.vercel.app

# 백엔드 API 연결 확인
# 브라우저 개발자 도구 → Network 탭에서 API 요청 확인
```

### 2. 주요 페이지 테스트
- [ ] 로그인 페이지: `/login`
- [ ] 회원가입 페이지: `/signup`
- [ ] 대시보드: `/dashboard`
- [ ] 팀 생성: `/teams/create`
- [ ] 일정 캘린더: `/teams/:teamId/calendar`
- [ ] 채팅: `/teams/:teamId/chat`

### 3. 환경 변수 확인
브라우저 콘솔에서:
```javascript
console.log(import.meta.env.VITE_API_BASE_URL)
// Preview: https://backend-preview.vercel.app/api
// Production: https://backend-prod.vercel.app/api
```

## 🌐 도메인 연결 (선택사항)

### 1. Vercel 대시보드에서 도메인 추가

1. 프로젝트 선택 → **Settings** → **Domains**
2. 도메인 입력 (예: `caltalk.com`)
3. DNS 레코드 설정:

```
Type: A
Name: @
Value: 76.76.21.21

Type: CNAME
Name: www
Value: cname.vercel-dns.com
```

### 2. SSL/TLS 자동 설정
Vercel이 자동으로 Let's Encrypt SSL 인증서 발급

## 📊 성능 최적화

### 1. Code Splitting
Vite가 자동으로 처리:
```typescript
// 라우트별 lazy loading
const Dashboard = lazy(() => import('./pages/Dashboard'))
```

### 2. 이미지 최적화
```typescript
// Vercel Image Optimization (선택사항)
import Image from 'next/image'  // Next.js 사용 시
```

### 3. 번들 사이즈 분석
```bash
npm run build
# dist/ 디렉토리 크기 확인
du -sh dist/
```

## 🔍 Lighthouse CI (성능 측정)

PR 생성 시 자동으로 Lighthouse 성능 측정:
- Performance
- Accessibility
- Best Practices
- SEO

결과는 GitHub Actions Summary에서 확인

## ⚠️ 주의사항

### 1. 환경 변수 관리
- `.env` 파일은 절대 커밋하지 않음
- Vercel 환경 변수에만 저장
- Preview와 Production 환경 분리

### 2. CORS 설정
백엔드에서 프론트엔드 도메인 허용:
```javascript
// backend/src/config/environment.js
allowedOrigins: [
  'https://your-frontend.vercel.app',
  'https://your-preview-*.vercel.app'
]
```

### 3. API URL 확인
- Preview 배포 시 Preview 백엔드 URL 사용
- Production 배포 시 Production 백엔드 URL 사용

## 🛠️ 트러블슈팅

### 문제 1: 빌드 실패 - "Vite config not found"
```
Error: Cannot find Vite config
```

**해결:**
```bash
# vite.config.ts 존재 확인
ls -la vite.config.ts

# vercel.json에서 buildCommand 확인
"buildCommand": "npm run build"
```

### 문제 2: 환경 변수가 undefined
```javascript
console.log(import.meta.env.VITE_API_BASE_URL)  // undefined
```

**해결:**
1. Vercel 대시보드에서 환경 변수 확인
2. 변수 이름이 `VITE_` 접두사로 시작하는지 확인
3. 재배포 필요 (환경 변수 변경 후)

### 문제 3: 404 에러 (라우팅)
```
/dashboard → 404 Not Found
```

**해결:**
`vercel.json`에 rewrites 설정 확인:
```json
"rewrites": [
  { "source": "/(.*)", "destination": "/index.html" }
]
```

### 문제 4: CORS 에러
```
Access to fetch at 'https://backend.vercel.app/api' has been blocked by CORS
```

**해결:**
백엔드 ALLOWED_ORIGINS에 프론트엔드 도메인 추가

## 📚 참고 자료

- [Vercel Vite 배포 가이드](https://vercel.com/docs/frameworks/vite)
- [Vite 환경 변수](https://vitejs.dev/guide/env-and-mode.html)
- [React Router with Vercel](https://vercel.com/guides/deploying-react-with-vercel)
- [Vercel 도메인 설정](https://vercel.com/docs/concepts/projects/domains)

## ✅ 배포 체크리스트

### 초기 설정
- [ ] Vercel CLI 설치 및 로그인
- [ ] 프론트엔드 프로젝트 연결 (`vercel link`)
- [ ] 프로젝트 ID 확인
- [ ] GitHub Secrets 설정 (5개)
  - [ ] `VERCEL_TOKEN`
  - [ ] `VERCEL_ORG_ID`
  - [ ] `VERCEL_FRONTEND_PROJECT_ID`
  - [ ] `VITE_API_BASE_URL_PREVIEW`
  - [ ] `VITE_API_BASE_URL_PRODUCTION`

### 배포 전 확인
- [ ] `frontend/vercel.json` 파일 생성
- [ ] 로컬 빌드 테스트: `npm run build`
- [ ] 타입 체크: `npm run type-check`
- [ ] 린트: `npm run lint`
- [ ] 백엔드 API URL 확인

### 배포 테스트
- [ ] 테스트 브랜치로 PR 생성 → Preview 배포 확인
- [ ] Preview URL에서 기능 테스트
- [ ] Lighthouse 성능 점수 확인
- [ ] main 머지 → Production 배포 확인
- [ ] Production URL에서 최종 테스트

### 배포 후 확인
- [ ] 모든 페이지 접속 가능
- [ ] 백엔드 API 통신 정상
- [ ] 로그인/회원가입 동작
- [ ] 일정 CRUD 동작
- [ ] 채팅 기능 동작
- [ ] 반응형 UI 동작
- [ ] 브라우저 콘솔 에러 없음

## 🎯 배포 플로우 다이어그램

```
코드 변경 (frontend/)
    ↓
Git Push / PR 생성
    ↓
GitHub Actions 트리거
    ↓
Lint + Type Check + Tests
    ↓
Vite Build
    ↓
Vercel 배포
    ↓
PR 코멘트 (Preview URL)
    ↓
Lighthouse CI 실행
    ↓
성능 리포트 생성
    ↓
배포 완료 ✅
```
