# Vercel GitHub Action 배포 설정 가이드

Team CalTalk 프로젝트의 Vercel 배포를 위한 GitHub Actions 설정 방법입니다.

## 프로젝트 구조

```
team-caltalk/
├── frontend/          # React + Vite 프론트엔드
│   ├── src/
│   ├── package.json
│   └── vercel.json
├── backend/           # Node.js + Express 백엔드
│   ├── src/
│   ├── package.json
│   └── vercel.json
├── .github/
│   └── workflows/
│       ├── deploy-frontend.yml
│       └── deploy-backend.yml
└── docs/
```

**중요**:
- Frontend 코드는 `frontend/` 디렉토리에 위치
- Backend 코드는 `backend/` 디렉토리에 위치

---

## 1. Vercel 프로젝트 설정

### 1.1 Vercel 계정 및 프로젝트 생성

1. **Vercel 계정 연동**: https://vercel.com 에서 GitHub 계정으로 로그인

2. **프로젝트 2개 생성**:
   - **team-caltalk** (Frontend 프로젝트)
     - GitHub Repository: `team-caltalk`
     - Root Directory: `frontend`
     - Framework Preset: `Vite`

   - **team-caltalk-backend** (Backend 프로젝트)
     - GitHub Repository: `team-caltalk` (같은 저장소)
     - Root Directory: `backend`
     - Framework Preset: `Other`

### 1.2 Vercel 토큰 발급

1. Vercel Dashboard → Settings → Tokens
2. **Create Token** 클릭
3. Token Name: `github-actions-deployment`
4. Scope: `Full Account` 선택
5. **Create** 후 토큰 복사 (한 번만 표시됨)

### 1.3 프로젝트 ID 및 Org ID 확인

**team-caltalk (Frontend)**:
- Vercel Dashboard → team-caltalk → Settings → General
- Project ID: `prj_xxxxxxxxxxxxx` 복사

**team-caltalk-backend (Backend)**:
- Vercel Dashboard → team-caltalk-backend → Settings → General
- Project ID: `prj_yyyyyyyyyyyyy` 복사

**Organization ID** (공통):
- Vercel Dashboard → Settings → General
- Team ID: `team_xxxxxxxxxxxxx` 복사

---

## 2. GitHub Repository Secrets 설정

GitHub Repository → Settings → Secrets and variables → Actions

### 필수 Secrets (team-caltalk 저장소)

```
VERCEL_TOKEN=your_vercel_personal_access_token
VERCEL_ORG_ID=team_xxxxxxxxxxxxx
VERCEL_PROJECT_ID_FRONTEND=prj_xxxxxxxxxxxxx
VERCEL_PROJECT_ID_BACKEND=prj_yyyyyyyyyyyyy
```

---

## 3. Vercel 설정 파일 생성

### 3.1 Frontend: `frontend/vercel.json`

```json
{
  "version": 2,
  "buildCommand": "npm run build",
  "outputDirectory": "dist",
  "devCommand": "npm run dev",
  "installCommand": "npm install",
  "framework": "vite",
  "rewrites": [
    {
      "source": "/(.*)",
      "destination": "/index.html"
    }
  ],
  "env": {
    "VITE_API_BASE_URL": "@api_base_url"
  }
}
```

### 3.2 Backend: `backend/vercel.json`

```json
{
  "version": 2,
  "builds": [
    {
      "src": "src/server.js",
      "use": "@vercel/node"
    }
  ],
  "routes": [
    {
      "src": "/api/(.*)",
      "dest": "src/server.js"
    },
    {
      "src": "/(.*)",
      "dest": "src/server.js"
    }
  ],
  "env": {
    "DATABASE_URL": "@database_url",
    "JWT_SECRET": "@jwt_secret",
    "JWT_REFRESH_SECRET": "@jwt_refresh_secret",
    "NODE_ENV": "production",
    "ALLOWED_ORIGINS": "@allowed_origins"
  }
}
```

---

## 4. GitHub Actions Workflow 생성

### 4.1 Frontend Workflow: `.github/workflows/deploy-frontend.yml`

```yaml
name: Deploy Frontend to Vercel

on:
  push:
    branches:
      - main
      - preview
    paths:
      - 'frontend/**'
      - '.github/workflows/deploy-frontend.yml'
  pull_request:
    branches:
      - main
    paths:
      - 'frontend/**'

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout code
        uses: actions/checkout@v3

      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
          cache: 'npm'
          cache-dependency-path: frontend/package-lock.json

      - name: Install Vercel CLI
        run: npm install --global vercel@latest

      - name: Determine Environment
        id: env
        run: |
          if [[ "${{ github.ref }}" == "refs/heads/main" ]]; then
            echo "environment=production" >> $GITHUB_OUTPUT
            echo "prod_flag=--prod" >> $GITHUB_OUTPUT
          else
            echo "environment=preview" >> $GITHUB_OUTPUT
            echo "prod_flag=" >> $GITHUB_OUTPUT
          fi

      - name: Pull Vercel Environment Information
        run: vercel pull --yes --environment=${{ steps.env.outputs.environment }} --token=${{ secrets.VERCEL_TOKEN }}
        working-directory: ./frontend
        env:
          VERCEL_ORG_ID: ${{ secrets.VERCEL_ORG_ID }}
          VERCEL_PROJECT_ID: ${{ secrets.VERCEL_PROJECT_ID_FRONTEND }}

      - name: Build Project Artifacts
        run: vercel build ${{ steps.env.outputs.prod_flag }} --token=${{ secrets.VERCEL_TOKEN }}
        working-directory: ./frontend
        env:
          VERCEL_ORG_ID: ${{ secrets.VERCEL_ORG_ID }}
          VERCEL_PROJECT_ID: ${{ secrets.VERCEL_PROJECT_ID_FRONTEND }}

      - name: Deploy to Vercel
        id: deploy
        run: |
          URL=$(vercel deploy --prebuilt ${{ steps.env.outputs.prod_flag }} --token=${{ secrets.VERCEL_TOKEN }})
          echo "Deployment URL: $URL"
          echo "url=$URL" >> $GITHUB_OUTPUT
        working-directory: ./frontend
        env:
          VERCEL_ORG_ID: ${{ secrets.VERCEL_ORG_ID }}
          VERCEL_PROJECT_ID: ${{ secrets.VERCEL_PROJECT_ID_FRONTEND }}

      - name: Comment Deployment URL on PR
        if: github.event_name == 'pull_request'
        uses: actions/github-script@v6
        with:
          script: |
            github.rest.issues.createComment({
              issue_number: context.issue.number,
              owner: context.repo.owner,
              repo: context.repo.repo,
              body: '✅ Frontend deployed to: ${{ steps.deploy.outputs.url }}'
            })
```

### 4.2 Backend Workflow: `.github/workflows/deploy-backend.yml`

```yaml
name: Deploy Backend to Vercel

on:
  push:
    branches:
      - main
      - preview
    paths:
      - 'backend/**'
      - '.github/workflows/deploy-backend.yml'
  pull_request:
    branches:
      - main
    paths:
      - 'backend/**'

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout code
        uses: actions/checkout@v3

      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
          cache: 'npm'
          cache-dependency-path: backend/package-lock.json

      - name: Install Vercel CLI
        run: npm install --global vercel@latest

      - name: Determine Environment
        id: env
        run: |
          if [[ "${{ github.ref }}" == "refs/heads/main" ]]; then
            echo "environment=production" >> $GITHUB_OUTPUT
            echo "prod_flag=--prod" >> $GITHUB_OUTPUT
          else
            echo "environment=preview" >> $GITHUB_OUTPUT
            echo "prod_flag=" >> $GITHUB_OUTPUT
          fi

      - name: Pull Vercel Environment Information
        run: vercel pull --yes --environment=${{ steps.env.outputs.environment }} --token=${{ secrets.VERCEL_TOKEN }}
        working-directory: ./backend
        env:
          VERCEL_ORG_ID: ${{ secrets.VERCEL_ORG_ID }}
          VERCEL_PROJECT_ID: ${{ secrets.VERCEL_PROJECT_ID_BACKEND }}

      - name: Build Project Artifacts
        run: vercel build ${{ steps.env.outputs.prod_flag }} --token=${{ secrets.VERCEL_TOKEN }}
        working-directory: ./backend
        env:
          VERCEL_ORG_ID: ${{ secrets.VERCEL_ORG_ID }}
          VERCEL_PROJECT_ID: ${{ secrets.VERCEL_PROJECT_ID_BACKEND }}

      - name: Deploy to Vercel
        id: deploy
        run: |
          URL=$(vercel deploy --prebuilt ${{ steps.env.outputs.prod_flag }} --token=${{ secrets.VERCEL_TOKEN }})
          echo "Deployment URL: $URL"
          echo "url=$URL" >> $GITHUB_OUTPUT
        working-directory: ./backend
        env:
          VERCEL_ORG_ID: ${{ secrets.VERCEL_ORG_ID }}
          VERCEL_PROJECT_ID: ${{ secrets.VERCEL_PROJECT_ID_BACKEND }}

      - name: Comment Deployment URL on PR
        if: github.event_name == 'pull_request'
        uses: actions/github-script@v6
        with:
          script: |
            github.rest.issues.createComment({
              issue_number: context.issue.number,
              owner: context.repo.owner,
              repo: context.repo.repo,
              body: '✅ Backend deployed to: ${{ steps.deploy.outputs.url }}'
            })
```

---

## 5. Vercel 환경변수 설정 (Dashboard)

### 5.1 team-caltalk (Frontend 프로젝트)

Vercel Dashboard → team-caltalk → Settings → Environment Variables

**Preview & Production 공통**:
```
VITE_API_BASE_URL=https://team-caltalk-backend.vercel.app/api
```

### 5.2 team-caltalk-backend (Backend 프로젝트)

Vercel Dashboard → team-caltalk-backend → Settings → Environment Variables

**Preview 환경**:
```
DATABASE_URL=postgresql://user:pass@preview-db-host:5432/team_caltalk_preview
JWT_SECRET=preview_jwt_secret_key_min_32_chars
JWT_REFRESH_SECRET=preview_refresh_secret_key_min_32_chars
NODE_ENV=preview
ALLOWED_ORIGINS=https://team-caltalk-*.vercel.app,http://localhost:5173
```

**Production 환경**:
```
DATABASE_URL=postgresql://user:pass@prod-db-host:5432/team_caltalk
JWT_SECRET=production_jwt_secret_key_min_32_chars
JWT_REFRESH_SECRET=production_refresh_secret_key_min_32_chars
NODE_ENV=production
ALLOWED_ORIGINS=https://team-caltalk.vercel.app
```

---

## 6. 배포 플로우

### Preview 배포 (preview 브랜치)

**트리거**:
- `preview` 브랜치에 push
- `main` 브랜치로의 Pull Request 생성

**결과**:
- Frontend: `https://team-caltalk-xxxxx.vercel.app`
- Backend: `https://team-caltalk-backend-xxxxx.vercel.app`
- PR에 배포 URL 자동 코멘트

### Production 배포 (main 브랜치)

**트리거**:
- `main` 브랜치에 push (또는 PR 병합)

**결과**:
- Frontend: `https://team-caltalk.vercel.app`
- Backend: `https://team-caltalk-backend.vercel.app`

---

## 7. 주의사항

### 7.1 PostgreSQL 데이터베이스

**Vercel은 서버리스 환경**이므로 로컬 PostgreSQL 연결 불가

**권장 클라우드 DB**:
- **Neon** (추천): 무료 플랜, PostgreSQL 전용, Serverless 최적화
- **Supabase**: 무료 플랜, PostgreSQL + 추가 기능
- **Railway**: 무료 플랜, 다양한 DB 지원
- **AWS RDS**: 프로덕션급, 유료

**Connection String 형식**:
```
postgresql://user:password@host:5432/database?pgbouncer=true&connection_limit=1
```

### 7.2 CORS 설정

`backend/src/server.js` 또는 CORS 설정 파일:

```javascript
const allowedOrigins = process.env.ALLOWED_ORIGINS?.split(',') || [
  'https://team-caltalk.vercel.app',
  'http://localhost:5173'
]

app.use(cors({
  origin: (origin, callback) => {
    // Preview 환경 와일드카드 지원
    const isAllowed = allowedOrigins.some(allowed => {
      if (allowed.includes('*')) {
        const regex = new RegExp(allowed.replace('*', '.*'))
        return regex.test(origin)
      }
      return allowed === origin
    })

    if (!origin || isAllowed) {
      callback(null, true)
    } else {
      callback(new Error('Not allowed by CORS'))
    }
  },
  credentials: true
}))
```

### 7.3 Vercel 제약사항

| 제약 | Hobby Plan | Pro Plan |
|------|-----------|----------|
| 파일 크기 | 50MB | 50MB |
| 함수 실행 시간 | 10초 | 60초 |
| 함수 메모리 | 1024MB | 3009MB |
| 빌드 시간 | 45분 | 45분 |

**주의**:
- **Long Polling 불가**: WebSocket 대신 **Pusher**, **Ably** 사용 권장
- **Cold Start**: 첫 요청 시 2-5초 지연 가능
- **정적 파일**: 별도 CDN 사용 권장 (Cloudinary, AWS S3)

### 7.4 환경변수 동기화

Frontend의 `VITE_API_BASE_URL`과 Backend의 실제 URL이 일치해야 합니다:

```
Frontend VITE_API_BASE_URL: https://team-caltalk-backend.vercel.app/api
Backend 실제 배포 URL:       https://team-caltalk-backend.vercel.app
```

Preview 환경에서는 와일드카드 사용:
```
ALLOWED_ORIGINS=https://team-caltalk-*.vercel.app
```

---

## 8. 배포 확인

### 로컬 테스트

```bash
# Frontend 테스트
cd frontend
vercel --prod

# Backend 테스트
cd backend
vercel --prod
```

### GitHub Actions 확인

1. GitHub Repository → **Actions** 탭
2. 최신 워크플로우 실행 확인
3. 각 Job의 Logs 확인:
   ```
   ✅ Deployment URL: https://team-caltalk.vercel.app
   ```

### 배포된 서비스 테스트

```bash
# Frontend 접속 테스트
curl https://team-caltalk.vercel.app

# Backend Health Check
curl https://team-caltalk-backend.vercel.app/api/health

# Backend API 테스트
curl -X POST https://team-caltalk-backend.vercel.app/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password"}'
```

---

## 9. 트러블슈팅

### 9.1 빌드 실패

**증상**: `vercel build` 실패

**해결**:
1. 로컬에서 빌드 테스트: `npm run build`
2. `package.json`의 `engines` 필드 확인
3. Node.js 버전 일치 확인 (로컬 vs GitHub Actions)

### 9.2 환경변수 누락

**증상**: `undefined` 에러 또는 API 연결 실패

**해결**:
1. Vercel Dashboard → Settings → Environment Variables 확인
2. Preview/Production 환경별로 설정되었는지 확인
3. `vercel pull`로 로컬에 환경변수 동기화 후 테스트

### 9.3 CORS 에러

**증상**: `Access-Control-Allow-Origin` 에러

**해결**:
1. Backend의 `ALLOWED_ORIGINS` 환경변수 확인
2. Frontend URL이 정확히 포함되어 있는지 확인
3. Preview 환경은 와일드카드 사용: `https://team-caltalk-*.vercel.app`

### 9.4 Database Connection 실패

**증상**: `ECONNREFUSED` 또는 `Connection timeout`

**해결**:
1. 클라우드 DB 사용 확인 (Neon, Supabase 등)
2. Connection String에 `pgbouncer=true` 포함 확인
3. DB 방화벽 설정에서 Vercel IP 허용 확인

---

## 10. 참고 자료

- [Vercel Documentation](https://vercel.com/docs)
- [Vercel CLI Reference](https://vercel.com/docs/cli)
- [GitHub Actions Documentation](https://docs.github.com/en/actions)
- [Neon PostgreSQL](https://neon.tech/)
- [Vite Deployment Guide](https://vitejs.dev/guide/static-deploy.html)

---

## 체크리스트

배포 전 확인사항:

- [ ] Vercel 프로젝트 2개 생성 완료 (team-caltalk, team-caltalk-backend)
- [ ] Vercel Token 발급 및 GitHub Secrets 등록
- [ ] Project ID, Org ID 확인 및 Secrets 등록
- [ ] `frontend/vercel.json` 파일 생성
- [ ] `backend/vercel.json` 파일 생성
- [ ] `.github/workflows/deploy-frontend.yml` 파일 생성
- [ ] `.github/workflows/deploy-backend.yml` 파일 생성
- [ ] Vercel Dashboard에 환경변수 설정 (Frontend)
- [ ] Vercel Dashboard에 환경변수 설정 (Backend)
- [ ] 클라우드 DB 설정 완료 (Neon, Supabase 등)
- [ ] CORS 설정 확인
- [ ] 로컬 빌드 테스트 완료
- [ ] preview 브랜치 push 및 배포 확인
- [ ] main 브랜치 push 및 프로덕션 배포 확인
