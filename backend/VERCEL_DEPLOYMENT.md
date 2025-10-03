# Vercel Serverless 배포 가이드

Team CalTalk 백엔드를 Vercel Serverless Functions로 배포하는 가이드입니다.

## 📋 사전 준비사항

### 1. Vercel 계정 및 CLI 설치
```bash
npm install -g vercel
vercel login
```

### 2. PostgreSQL 데이터베이스 준비

⚠️ **중요**: Vercel Serverless Functions는 전통적인 연결 풀 관리가 어렵습니다.

**권장 옵션:**

#### Option 1: Vercel Postgres (권장)
```bash
# Vercel 대시보드에서 Postgres 추가
# 자동으로 DATABASE_URL 환경 변수가 설정됨
```

#### Option 2: Supabase (무료 시작 가능)
- https://supabase.com 에서 프로젝트 생성
- Connection Pooling URL 복사 (중요!)
- `postgresql://[user]:[password]@[host]:6543/postgres?pgbouncer=true`

#### Option 3: Neon DB (Serverless PostgreSQL)
- https://neon.tech 에서 프로젝트 생성
- Connection String 복사

## 🚀 배포 방법

### 1. 환경 변수 설정

Vercel 대시보드 또는 CLI로 환경 변수 설정:

```bash
# Vercel CLI로 환경 변수 추가
vercel env add DATABASE_URL
vercel env add JWT_SECRET
vercel env add JWT_EXPIRES_IN
vercel env add ALLOWED_ORIGINS
```

**필수 환경 변수:**

| 변수명 | 설명 | 예시 |
|--------|------|------|
| `DATABASE_URL` | PostgreSQL 연결 문자열 (Connection Pooling 사용) | `postgresql://user:pass@host:6543/db?pgbouncer=true` |
| `JWT_SECRET` | JWT 서명 키 (최소 32자) | `your-super-secret-jwt-key-min-32-chars` |
| `JWT_EXPIRES_IN` | JWT 만료 시간 | `7d` |
| `ALLOWED_ORIGINS` | CORS 허용 도메인 (쉼표 구분) | `https://your-frontend.vercel.app,https://yourdomain.com` |
| `NODE_ENV` | 환경 설정 | `production` (자동 설정됨) |

**선택적 환경 변수:**

| 변수명 | 설명 | 기본값 |
|--------|------|--------|
| `PORT` | 포트 (Vercel에서 자동 설정) | `3000` |
| `API_VERSION` | API 버전 | `v1` |
| `LOG_LEVEL` | 로그 레벨 | `info` |
| `MAX_PAYLOAD_SIZE` | 최대 요청 크기 | `10mb` |

### 2. 프로젝트 배포

```bash
# 백엔드 디렉토리로 이동
cd backend

# Vercel 배포 (첫 배포)
vercel

# 프로덕션 배포
vercel --prod
```

### 3. 배포 확인

배포 완료 후 표시되는 URL로 접속하여 확인:

```bash
# Health Check
curl https://your-backend.vercel.app/health

# API 정보
curl https://your-backend.vercel.app/api
```

## 📁 배포 구조

```
backend/
├── api/
│   └── index.js          # Serverless Function 엔트리포인트
├── src/
│   ├── app.js            # Express 앱 (수정 없음)
│   ├── server.js         # 로컬 개발용 (Vercel에서 미사용)
│   └── ...
├── vercel.json           # Vercel 설정
└── package.json
```

## ⚙️ Vercel 설정 상세

### vercel.json 설명

```json
{
  "version": 2,
  "name": "team-caltalk-backend",
  "builds": [
    {
      "src": "api/index.js",      // Serverless Function 파일
      "use": "@vercel/node"        // Node.js 런타임
    }
  ],
  "routes": [
    {
      "src": "/health",            // Health Check
      "dest": "api/index.js"
    },
    {
      "src": "/api/(.*)",          // 모든 API 요청
      "dest": "api/index.js"
    },
    {
      "src": "/(.*)",              // 기타 요청
      "dest": "api/index.js"
    }
  ],
  "env": {
    "NODE_ENV": "production"       // 프로덕션 환경
  },
  "regions": ["icn1"]              // 서울 리전 (한국 서비스)
}
```

### 리전 옵션

- `icn1`: 서울 (한국 사용자 대상)
- `hnd1`: 도쿄 (일본 사용자 대상)
- `sin1`: 싱가포르 (동남아시아)
- `sfo1`: 샌프란시스코 (미국 서부)

## 🔧 데이터베이스 연결 최적화

### Connection Pooling 설정

Serverless 환경에서는 각 함수 호출마다 새로운 연결이 생성될 수 있어 Connection Pooling이 필수입니다.

**Supabase 예시:**
```
postgresql://postgres:[password]@db.[project].supabase.co:6543/postgres?pgbouncer=true
                                                          ^^^^
                                                     6543 포트 사용 (pgbouncer)
```

**일반 PostgreSQL + PgBouncer:**
```bash
# PgBouncer 설치 및 설정
# /etc/pgbouncer/pgbouncer.ini
[databases]
team_caltalk = host=localhost port=5432 dbname=team_caltalk

[pgbouncer]
pool_mode = transaction
max_client_conn = 100
default_pool_size = 20
```

### 연결 설정 수정 (src/config/database.js)

Serverless 환경용 연결 설정 조정:

```javascript
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
  // Serverless 최적화
  max: 1,                    // 연결 수 제한 (각 함수는 1개 연결만 사용)
  idleTimeoutMillis: 30000,  // 30초 후 유휴 연결 종료
  connectionTimeoutMillis: 10000,  // 10초 연결 타임아웃
});
```

## 🌐 프론트엔드 연동

프론트엔드 환경 변수 업데이트:

```env
# frontend/.env.production
VITE_API_BASE_URL=https://your-backend.vercel.app/api
VITE_ENV=production
```

## 📊 모니터링 및 로그

### Vercel 대시보드
- https://vercel.com/dashboard
- Deployments → 배포 로그 확인
- Functions → 함수 실행 로그 및 메트릭

### 로그 확인
```bash
# 실시간 로그 스트리밍
vercel logs --follow

# 최근 로그
vercel logs
```

## ⚠️ 주의사항

### 1. Cold Start
- 첫 요청 시 함수 초기화로 1-3초 지연 가능
- `api/index.js`에서 앱 인스턴스 재사용으로 최소화

### 2. 실행 시간 제한
- Hobby 플랜: 10초
- Pro 플랜: 60초
- Long Polling 등 긴 요청은 제한될 수 있음

### 3. 파일 시스템
- `/tmp` 디렉토리만 쓰기 가능 (임시)
- 로그 파일은 `/tmp`에 저장되거나 외부 서비스 사용 권장

### 4. WebSocket 미지원
- Vercel은 WebSocket 미지원
- Long Polling은 사용 가능하나 실행 시간 제한 고려

## 🔄 CI/CD 자동 배포

### GitHub 연동 (권장)

1. Vercel 대시보드에서 "Import Project"
2. GitHub 저장소 선택
3. Root Directory: `backend` 설정
4. 환경 변수 추가
5. Deploy 클릭

**자동 배포 규칙:**
- `main` 브랜치 push → 프로덕션 배포
- 다른 브랜치 push → 프리뷰 배포

## 🛠️ 트러블슈팅

### 문제 1: Database connection timeout
**원인**: Connection Pooling 미사용
**해결**: DATABASE_URL에 Connection Pooling 포트 사용 (6543)

### 문제 2: Cold start 너무 느림
**원인**: 앱 초기화 시간
**해결**:
- `api/index.js`에서 앱 인스턴스 재사용
- 필요 없는 미들웨어 제거
- 환경 변수로 기능 토글

### 문제 3: CORS 에러
**원인**: ALLOWED_ORIGINS 미설정
**해결**: Vercel 환경 변수에 프론트엔드 도메인 추가

### 문제 4: 환경 변수가 적용 안됨
**원인**: 배포 후 환경 변수 추가
**해결**:
```bash
vercel env add [변수명]
vercel --prod  # 재배포
```

## 📚 참고 자료

- [Vercel Serverless Functions 문서](https://vercel.com/docs/functions/serverless-functions)
- [Vercel Postgres 문서](https://vercel.com/docs/storage/vercel-postgres)
- [Supabase Connection Pooling](https://supabase.com/docs/guides/database/connecting-to-postgres#connection-pooler)
- [Neon Serverless Driver](https://neon.tech/docs/serverless/serverless-driver)

## 🚀 배포 체크리스트

- [ ] PostgreSQL 데이터베이스 준비 (Connection Pooling 포함)
- [ ] Vercel CLI 설치 및 로그인
- [ ] 환경 변수 설정 (DATABASE_URL, JWT_SECRET 등)
- [ ] `vercel.json` 설정 확인
- [ ] `api/index.js` 엔트리포인트 확인
- [ ] 로컬 테스트: `vercel dev`
- [ ] 프리뷰 배포: `vercel`
- [ ] 프로덕션 배포: `vercel --prod`
- [ ] Health Check 확인: `/health`
- [ ] API 동작 확인: `/api`
- [ ] 프론트엔드 연동 테스트
- [ ] 모니터링 설정 (Vercel Dashboard)
