# Team CalTalk Vercel 배포 가이드

## 목차
1. [개요](#개요)
2. [사전 준비](#사전-준비)
3. [Vercel 프로젝트 설정](#vercel-프로젝트-설정)
4. [환경변수 설정](#환경변수-설정)
5. [배포 방법](#배포-방법)
6. [Preview 배포](#preview-배포)
7. [문제 해결](#문제-해결)

---

## 개요

Team CalTalk은 하나의 Git 저장소에서 백엔드와 프론트엔드를 각각 별도의 Vercel 프로젝트로 배포합니다.

### 배포 구조
```
Git Repository (team-caltalk)
├── backend/          → Vercel Project: team-caltalk-backend
└── frontend/         → Vercel Project: team-caltalk
```

### 배포 전략
- **Production**: `main` 브랜치 → 프로덕션 배포
- **Preview**: PR 생성 시 → Preview 배포 (GitHub Actions)
- **Development**: 로컬 개발 환경

---

## 사전 준비

### 1. 필수 계정
- [ ] GitHub 계정
- [ ] Vercel 계정 (GitHub 연동)
- [ ] PostgreSQL 데이터베이스 (Vercel Postgres 또는 외부 DB)

### 2. 필수 설치
```bash
# Node.js 18 이상
node --version

# Vercel CLI (옵션)
npm install -g vercel
```

### 3. 저장소 준비
```bash
# 저장소 클론
git clone https://github.com/stepanowon/team-caltalk.git
cd team-caltalk

# 의존성 설치
cd backend && npm install
cd ../frontend && npm install
```

---

## Vercel 프로젝트 설정

### 1. 백엔드 프로젝트 생성

#### Dashboard 방식
1. Vercel Dashboard → **Add New Project**
2. GitHub 저장소 선택: `team-caltalk`
3. 프로젝트 설정:
   - **Project Name**: `team-caltalk-backend`
   - **Framework Preset**: Other
   - **Root Directory**: `backend`
   - **Build Command**: (비워두기)
   - **Output Directory**: (비워두기)
   - **Install Command**: `npm install`

#### CLI 방식
```bash
cd backend
vercel --prod

# 프롬프트에서:
# - Set up and deploy? Y
# - Which scope? (본인 계정 선택)
# - Link to existing project? N
# - Project name: team-caltalk-backend
# - Directory: ./
# - Override settings? N
```

### 2. 프론트엔드 프로젝트 생성

#### Dashboard 방식
1. Vercel Dashboard → **Add New Project**
2. GitHub 저장소 선택: `team-caltalk`
3. 프로젝트 설정:
   - **Project Name**: `team-caltalk`
   - **Framework Preset**: Vite
   - **Root Directory**: `frontend`
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`
   - **Install Command**: `npm install`

#### CLI 방식
```bash
cd frontend
vercel --prod

# 프롬프트에서:
# - Set up and deploy? Y
# - Which scope? (본인 계정 선택)
# - Link to existing project? N
# - Project name: team-caltalk
# - Directory: ./
# - Override settings? N
```

---

## 환경변수 설정

### 백엔드 환경변수

#### 필수 환경변수 (Vercel Dashboard)

**Settings → Environment Variables → Add**

| 변수명 | Production 값 | Preview 값 | 설명 |
|--------|--------------|-----------|------|
| `DB_CONNECTION_STRING` | `postgresql://user:pass@host/db` | (개발DB) | PostgreSQL 연결 문자열 |
| `JWT_SECRET` | (64자 랜덤 문자열) | (64자 랜덤 문자열) | JWT 토큰 시크릿 |
| `JWT_REFRESH_SECRET` | (64자 랜덤 문자열) | (64자 랜덤 문자열) | JWT 리프레시 시크릿 |
| `CORS_ORIGIN` | `https://team-caltalk.vercel.app` | `https://*.vercel.app` | CORS 허용 도메인 |
| `NODE_ENV` | `production` | `preview` | 환경 설정 |

**JWT Secret 생성 방법:**
```bash
# Node.js 사용
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"

# 또는 OpenSSL 사용
openssl rand -base64 64
```

#### 선택적 환경변수
| 변수명 | 기본값 | 설명 |
|--------|-------|------|
| `BCRYPT_ROUNDS` | `12` | 비밀번호 해싱 라운드 |
| `RATE_LIMIT_MAX_REQUESTS` | `100` | Rate Limit 최대 요청 수 |
| `LOG_LEVEL` | `error` | 로그 레벨 |

#### CLI로 환경변수 설정
```bash
cd backend

# Production 환경변수
vercel env add DB_CONNECTION_STRING production
vercel env add JWT_SECRET production
vercel env add JWT_REFRESH_SECRET production
vercel env add CORS_ORIGIN production

# Preview 환경변수
vercel env add DB_CONNECTION_STRING preview
vercel env add JWT_SECRET preview
vercel env add JWT_REFRESH_SECRET preview
vercel env add CORS_ORIGIN preview
```

### 프론트엔드 환경변수

#### 필수 환경변수 (Vercel Dashboard)

| 변수명 | Production 값 | Preview 값 |
|--------|--------------|-----------|
| `VITE_API_BASE_URL` | `https://team-caltalk-backend.vercel.app/api` | `https://team-caltalk-backend-dev.vercel.app/api` |
| `VITE_ENV` | `production` | `preview` |

#### CLI로 환경변수 설정
```bash
cd frontend

# Production
vercel env add VITE_API_BASE_URL production
# 입력: https://team-caltalk-backend.vercel.app/api

vercel env add VITE_ENV production
# 입력: production

# Preview
vercel env add VITE_API_BASE_URL preview
# 입력: https://team-caltalk-backend-dev.vercel.app/api

vercel env add VITE_ENV preview
# 입력: preview
```

---

## 배포 방법

### 1. 자동 배포 (Production)

#### main 브랜치 푸시 시 자동 배포
```bash
git checkout main
git add .
git commit -m "feat: 새 기능 추가"
git push origin main
```

**배포 흐름:**
1. GitHub에 코드 푸시
2. Vercel이 자동으로 감지
3. 백엔드 빌드 및 배포 (`backend/` 디렉토리)
4. 프론트엔드 빌드 및 배포 (`frontend/` 디렉토리)
5. 배포 완료 알림

### 2. 수동 배포

#### Vercel Dashboard
1. Vercel Dashboard → 프로젝트 선택
2. **Deployments** 탭
3. **Redeploy** 버튼 클릭

#### Vercel CLI
```bash
# 백엔드 배포
cd backend
vercel --prod

# 프론트엔드 배포
cd frontend
vercel --prod
```

### 3. GitHub Actions 배포 (선택)

기존 워크플로우 사용:
- `.github/workflows/deploy-backend.yml`
- `.github/workflows/deploy-frontend.yml`

**트리거:**
- `main` 브랜치에 푸시 시 자동 실행

---

## Preview 배포

### Preview 배포란?
- PR 생성/업데이트 시 자동으로 생성되는 임시 배포
- 프로덕션 배포 전 테스트 및 리뷰 용도
- PR 종료 시 자동으로 삭제

### Preview 배포 설정

#### 1. GitHub Secrets 설정

**Settings → Secrets and variables → Actions → New repository secret**

| Secret 이름 | 설명 | 얻는 방법 |
|------------|------|----------|
| `VERCEL_TOKEN` | Vercel API 토큰 | Vercel Dashboard → Settings → Tokens |
| `VERCEL_ORG_ID` | Vercel Organization ID | `vercel --debug` 실행 후 출력 확인 |
| `VERCEL_PROJECT_ID_BACKEND` | 백엔드 프로젝트 ID | 백엔드 디렉토리에서 `.vercel/project.json` 확인 |
| `VERCEL_PROJECT_ID_FRONTEND` | 프론트엔드 프로젝트 ID | 프론트엔드 디렉토리에서 `.vercel/project.json` 확인 |

**VERCEL_TOKEN 생성:**
```
1. Vercel Dashboard → Account Settings → Tokens
2. Create Token
3. Name: GitHub Actions
4. Scope: Full Account (또는 필요한 권한만)
5. Expiration: No Expiration
6. 생성된 토큰 복사 → GitHub Secret에 추가
```

**프로젝트 ID 확인:**
```bash
# 백엔드
cd backend
vercel link
cat .vercel/project.json
# {"projectId": "prj_xxxxxxxxxxxx", "orgId": "team_xxxxxxxxxxxx"}

# 프론트엔드
cd frontend
vercel link
cat .vercel/project.json
```

#### 2. Preview 워크플로우 확인

`.github/workflows/preview-deploy.yml` 파일이 생성되어 있습니다.

**워크플로우 동작:**
1. PR 생성/업데이트 시 트리거
2. 백엔드 Preview 배포
3. 프론트엔드 Preview 배포 (백엔드 URL 자동 주입)
4. PR에 Preview URL 코멘트 자동 추가
5. E2E 테스트 실행 (옵션)

#### 3. Preview 배포 테스트

```bash
# 1. 새 브랜치 생성
git checkout -b feature/test-preview

# 2. 변경사항 커밋
echo "test" > test.txt
git add test.txt
git commit -m "test: Preview 배포 테스트"

# 3. GitHub에 푸시
git push origin feature/test-preview

# 4. GitHub에서 PR 생성
# 5. Actions 탭에서 워크플로우 실행 확인
# 6. PR에 자동으로 추가된 Preview URL 확인
```

### Preview URL 형식

**백엔드:**
```
https://team-caltalk-backend-git-{브랜치명}.vercel.app
```

**프론트엔드:**
```
https://team-caltalk-git-{브랜치명}.vercel.app
```

---

## 데이터베이스 설정

### 옵션 1: Vercel Postgres (권장)

**장점:**
- Vercel과 완벽 통합
- Serverless 환경 최적화
- 환경변수 자동 설정

**설정 방법:**
```
1. Vercel Dashboard → Storage → Create Database
2. Postgres 선택
3. 프로젝트 연결 (team-caltalk-backend)
4. 환경변수 자동 설정 확인
5. 스키마 적용:
   psql $POSTGRES_URL -f database/schema.sql
```

### 옵션 2: Neon (Serverless Postgres)

**설정 방법:**
```
1. https://neon.tech 회원가입
2. 새 프로젝트 생성
3. 연결 문자열 복사
4. Vercel 환경변수에 추가:
   DB_CONNECTION_STRING=postgresql://user:pass@host/db
5. 스키마 적용:
   psql $DB_CONNECTION_STRING -f database/schema.sql
```

### 옵션 3: Supabase

**설정 방법:**
```
1. https://supabase.com 회원가입
2. 새 프로젝트 생성
3. Database Settings → Connection String 복사
4. Vercel 환경변수에 추가
5. 스키마 적용
```

---

## 도메인 설정 (옵션)

### Custom Domain 추가

#### 백엔드
```
1. Vercel Dashboard → team-caltalk-backend → Settings → Domains
2. Add Domain: api.team-caltalk.com
3. DNS 설정:
   - Type: CNAME
   - Name: api
   - Value: cname.vercel-dns.com
4. CORS_ORIGIN 환경변수 업데이트:
   https://team-caltalk.com
```

#### 프론트엔드
```
1. Vercel Dashboard → team-caltalk → Settings → Domains
2. Add Domain: team-caltalk.com
3. DNS 설정:
   - Type: A
   - Name: @
   - Value: 76.76.21.21
4. VITE_API_BASE_URL 환경변수 업데이트:
   https://api.team-caltalk.com/api
```

---

## 모니터링 및 로그

### Vercel Dashboard
```
1. Vercel Dashboard → 프로젝트 선택
2. Analytics: 트래픽, 성능 지표
3. Logs: 실시간 로그
4. Deployments: 배포 이력
```

### 로그 확인 (CLI)
```bash
# 실시간 로그
vercel logs team-caltalk-backend --follow

# 최근 로그
vercel logs team-caltalk-backend
```

---

## 문제 해결

### 1. 배포 실패

**증상:** 배포가 실패하고 에러 메시지 표시

**해결 방법:**
```bash
# 1. 로그 확인
vercel logs [프로젝트명]

# 2. 로컬에서 빌드 테스트
cd backend && npm run build  # 백엔드
cd frontend && npm run build # 프론트엔드

# 3. 환경변수 확인
vercel env ls
```

### 2. API 연결 실패 (CORS 에러)

**증상:** 프론트엔드에서 백엔드 API 호출 시 CORS 에러

**해결 방법:**
```bash
# 1. 백엔드 CORS_ORIGIN 환경변수 확인
CORS_ORIGIN=https://team-caltalk.vercel.app

# 2. Preview 환경에서는 와일드카드 허용
CORS_ORIGIN=https://*.vercel.app

# 3. 환경변수 재배포
vercel --prod
```

### 3. 데이터베이스 연결 실패

**증상:** 500 에러, "Database connection failed"

**해결 방법:**
```bash
# 1. DB_CONNECTION_STRING 확인
vercel env pull .env.vercel.production

# 2. 연결 문자열 형식 확인
postgresql://user:password@host:5432/database

# 3. 데이터베이스 방화벽 설정
# Vercel IP 허용 또는 Vercel Postgres 사용

# 4. 연결 테스트
psql $DB_CONNECTION_STRING -c "SELECT 1"
```

### 4. 환경변수가 적용되지 않음

**증상:** 환경변수 값이 undefined

**해결 방법:**
```bash
# 1. VITE_ 접두사 확인 (프론트엔드)
VITE_API_BASE_URL=...  # ✅ 올바름
API_BASE_URL=...       # ❌ 노출 안됨

# 2. 환경변수 재설정 후 재배포
vercel env add VITE_API_BASE_URL production
vercel --prod

# 3. 빌드 로그에서 환경변수 확인
```

### 5. Preview 배포가 안됨

**증상:** PR 생성 시 Preview 배포가 트리거되지 않음

**해결 방법:**
```bash
# 1. GitHub Secrets 확인
Settings → Secrets → Actions
- VERCEL_TOKEN
- VERCEL_ORG_ID
- VERCEL_PROJECT_ID_BACKEND
- VERCEL_PROJECT_ID_FRONTEND

# 2. 워크플로우 실행 확인
Actions 탭에서 실행 이력 확인

# 3. 권한 확인
Settings → Actions → General
- Workflow permissions: Read and write permissions
```

---

## 체크리스트

### 초기 설정
- [ ] Vercel 계정 생성 및 GitHub 연동
- [ ] 백엔드 프로젝트 생성 (Root: `backend`)
- [ ] 프론트엔드 프로젝트 생성 (Root: `frontend`)
- [ ] PostgreSQL 데이터베이스 준비
- [ ] 스키마 적용 (`database/schema.sql`)

### 백엔드 환경변수
- [ ] `DB_CONNECTION_STRING` 설정
- [ ] `JWT_SECRET` 설정 (64자 이상)
- [ ] `JWT_REFRESH_SECRET` 설정 (64자 이상)
- [ ] `CORS_ORIGIN` 설정
- [ ] Production/Preview 환경 분리

### 프론트엔드 환경변수
- [ ] `VITE_API_BASE_URL` 설정 (Production)
- [ ] `VITE_API_BASE_URL` 설정 (Preview)
- [ ] `VITE_ENV` 설정

### GitHub Actions (Preview)
- [ ] `VERCEL_TOKEN` Secret 추가
- [ ] `VERCEL_ORG_ID` Secret 추가
- [ ] `VERCEL_PROJECT_ID_BACKEND` Secret 추가
- [ ] `VERCEL_PROJECT_ID_FRONTEND` Secret 추가
- [ ] 워크플로우 파일 확인 (`.github/workflows/`)

### 배포 테스트
- [ ] Production 배포 테스트
- [ ] API Health check (`/api/health`)
- [ ] 프론트엔드 접속 테스트
- [ ] API 연동 테스트 (CORS 확인)
- [ ] Preview 배포 테스트 (PR 생성)

---

## 참고 자료

### 공식 문서
- [Vercel Documentation](https://vercel.com/docs)
- [Vercel Monorepo](https://vercel.com/docs/concepts/monorepos)
- [Vercel Environment Variables](https://vercel.com/docs/concepts/projects/environment-variables)
- [Vercel Postgres](https://vercel.com/docs/storage/vercel-postgres)

### 프로젝트 문서
- `backend/VERCEL_ENV_SETUP.md` - 백엔드 환경변수 상세 가이드
- `frontend/VERCEL_ENV_SETUP.md` - 프론트엔드 환경변수 상세 가이드
- `.github/workflows/README.md` - GitHub Actions 워크플로우 가이드

### 도움말
- Vercel Support: https://vercel.com/support
- GitHub Discussions: https://github.com/stepanowon/team-caltalk/discussions
