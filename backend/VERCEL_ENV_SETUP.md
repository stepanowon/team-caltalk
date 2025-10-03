# Vercel 백엔드 환경변수 설정 가이드

## Vercel 프로젝트: team-caltalk-backend

### 필수 환경변수

#### 1. 데이터베이스 설정

**Vercel Postgres 사용 시 (권장)**
```bash
# Vercel Dashboard에서 Postgres 생성 후 자동으로 설정됨
POSTGRES_URL=
POSTGRES_URL_NON_POOLING=
POSTGRES_USER=
POSTGRES_HOST=
POSTGRES_PASSWORD=
POSTGRES_DATABASE=
```

**외부 PostgreSQL 사용 시**
```bash
DB_HOST=your-db-host.com
DB_PORT=5432
DB_NAME=team_caltalk
DB_USER=your-db-user
DB_PASSWORD=your-db-password
DB_CONNECTION_STRING=postgresql://user:password@host:5432/team_caltalk
```

#### 2. JWT 인증 설정 (필수)
```bash
# 강력한 랜덤 문자열로 설정 (최소 32자 이상)
JWT_SECRET=your-super-secret-jwt-key-min-32-chars-long
JWT_EXPIRE=24h
JWT_REFRESH_SECRET=your-super-secret-refresh-key-min-32-chars-long
JWT_REFRESH_EXPIRE=7d
```

**JWT Secret 생성 예시**
```bash
# Node.js로 생성
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"

# 또는 OpenSSL로 생성
openssl rand -base64 64
```

#### 3. CORS 설정
```bash
# Production 환경
CORS_ORIGIN=https://team-caltalk.vercel.app

# Preview 환경 (모든 Preview URL 허용)
CORS_ORIGIN=https://*.vercel.app
```

#### 4. 서버 설정
```bash
NODE_ENV=production
PORT=3000
HOST=0.0.0.0
```

#### 5. 보안 설정
```bash
BCRYPT_ROUNDS=12
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
```

#### 6. 로깅 설정
```bash
LOG_LEVEL=error
LOG_FILE=/tmp/app.log
```

#### 7. 성능 설정
```bash
DB_POOL_MIN=2
DB_POOL_MAX=20
DB_IDLE_TIMEOUT=10000
DB_CONNECTION_TIMEOUT=2000
```

## Vercel 환경변수 설정 방법

### 1. Vercel Dashboard 방식

1. Vercel Dashboard → 프로젝트 선택 (team-caltalk-backend)
2. Settings → Environment Variables
3. 각 환경변수 추가:
   - **Name**: 변수 이름 (예: `JWT_SECRET`)
   - **Value**: 변수 값
   - **Environments**: 적용할 환경 선택
     - ✅ Production (프로덕션)
     - ✅ Preview (모든 브랜치 미리보기)
     - ⬜ Development (로컬 개발)

### 2. Vercel CLI 방식

```bash
# Production 환경변수 설정
vercel env add JWT_SECRET production
vercel env add JWT_REFRESH_SECRET production
vercel env add DB_CONNECTION_STRING production
vercel env add CORS_ORIGIN production

# Preview 환경변수 설정
vercel env add JWT_SECRET preview
vercel env add JWT_REFRESH_SECRET preview
vercel env add DB_CONNECTION_STRING preview
vercel env add CORS_ORIGIN preview
```

### 3. 환경변수 일괄 업로드

```bash
# .env.production 파일에서 일괄 업로드
vercel env pull .env.vercel.production
# 편집 후
vercel env push .env.vercel.production production
```

## 환경별 설정 전략

### Production 환경
- 실제 프로덕션 데이터베이스 사용
- 강력한 JWT 시크릿 사용
- 프론트엔드 도메인만 CORS 허용
- 에러 로그만 기록 (LOG_LEVEL=error)

### Preview 환경
- 개발/스테이징 데이터베이스 사용 권장
- Production과 동일한 JWT 시크릿 (또는 별도)
- 모든 Vercel 도메인 CORS 허용
- 상세 로그 기록 가능 (LOG_LEVEL=info)

### Development 환경
- 로컬 PostgreSQL 사용
- `.env` 파일 사용 (Git에 커밋하지 않음)

## 데이터베이스 옵션

### 옵션 1: Vercel Postgres (권장)
- Vercel Dashboard에서 Postgres 추가
- 자동으로 환경변수 설정됨
- Serverless 환경에 최적화
- 무료 티어: 256MB storage, 60시간 컴퓨팅

**설정 방법:**
1. Vercel Dashboard → Storage → Create Database → Postgres
2. 프로젝트 연결 선택
3. 환경변수 자동 설정 확인

### 옵션 2: Neon (Serverless Postgres)
- https://neon.tech
- Serverless PostgreSQL 전문
- 무료 티어 제공
- 연결 문자열 복사 → Vercel 환경변수 설정

### 옵션 3: Supabase (현재 프로젝트 사용 중)
- https://supabase.com
- PostgreSQL + 추가 기능 제공
- 무료 티어 제공
- **현재 프로젝트 DB 호스트**: `db.xkntxvgelibwtaivisly.supabase.co`

**⚠️ 중요: Supabase 연결 문자열 형식**

Supabase Dashboard에서 정확한 연결 문자열을 복사해야 합니다:

**1. Supabase Dashboard에서 연결 문자열 가져오기:**
1. https://supabase.com/dashboard → 프로젝트 선택 (MyProject)
2. Project Settings → Database
3. **Connection String** 섹션 → **Transaction pooler** 모드 선택
4. URI를 복사하고 `[YOUR-PASSWORD]`를 실제 비밀번호로 변경

**2. Vercel 환경변수 설정:**
```bash
# ✅ 올바른 형식 (Transaction pooler)
DB_CONNECTION_STRING=postgresql://postgres.xkntxvgelibwtaivisly:[YOUR-PASSWORD]@aws-0-ap-northeast-2.pooler.supabase.com:6543/postgres

# ❌ 잘못된 형식 (이 형식은 작동하지 않습니다)
DB_CONNECTION_STRING=postgresql://postgres:password@db.xkntxvgelibwtaivisly.supabase.co:5432/postgres
```

**3. 연결 모드 선택:**
- **Transaction pooler** (권장): 포트 6543, Serverless 환경에 최적화
- **Session pooler**: 포트 6543, 연결 재사용
- **Direct connection**: 포트 5432, 연결 수 제한

**Serverless Function에서는 반드시 Transaction pooler 또는 Session pooler를 사용하세요!**

### 옵션 4: Railway / Render
- 외부 PostgreSQL 호스팅 서비스
- 연결 문자열 복사 → Vercel 환경변수 설정

## 보안 체크리스트

- [ ] JWT_SECRET은 최소 32자 이상의 강력한 랜덤 문자열
- [ ] JWT_REFRESH_SECRET은 JWT_SECRET과 다른 값
- [ ] DB_PASSWORD는 강력한 비밀번호
- [ ] Production 환경변수는 Development와 분리
- [ ] CORS_ORIGIN은 실제 프론트엔드 도메인만 허용
- [ ] 환경변수는 Git에 커밋하지 않음 (.env는 .gitignore에 포함)

## 테스트

### 환경변수 확인
```bash
# Vercel CLI로 환경변수 확인
vercel env ls

# 특정 환경의 환경변수 다운로드
vercel env pull .env.vercel.production
```

### 배포 후 테스트
```bash
# Health check
curl https://team-caltalk-backend.vercel.app/api/health

# 환경변수가 올바르게 설정되었는지 확인
# (실제 값은 노출하지 않고 설정 여부만 확인)
curl https://team-caltalk-backend.vercel.app/api/config/check
```

## 문제 해결

### 데이터베이스 연결 실패
- `DB_CONNECTION_STRING` 형식 확인
- 데이터베이스 서버 방화벽 설정 확인 (Vercel IP 허용)
- Vercel Postgres 사용 시 `POSTGRES_URL` 사용

### CORS 에러
- `CORS_ORIGIN` 설정 확인
- 프론트엔드 도메인 정확히 입력 (trailing slash 없이)
- Preview 환경에서는 `https://*.vercel.app` 사용 고려

### JWT 인증 실패
- `JWT_SECRET` 설정 확인
- Production과 Preview 환경에 모두 설정되었는지 확인

## 참고 자료

- [Vercel Environment Variables](https://vercel.com/docs/concepts/projects/environment-variables)
- [Vercel Postgres](https://vercel.com/docs/storage/vercel-postgres)
- [Vercel CLI](https://vercel.com/docs/cli)
