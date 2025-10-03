# GitHub Actions를 통한 Vercel 자동 배포 가이드

이 문서는 GitHub Actions를 사용하여 백엔드를 Vercel에 자동으로 배포하는 방법을 설명합니다.

## 📋 개요

### 워크플로우 동작 방식

1. **PR 생성 시**: Preview 환경에 자동 배포
2. **main 브랜치 푸시 시**: Production 환경에 자동 배포
3. **backend/ 디렉토리 변경 시에만** 배포 트리거

## 🔐 1. Vercel 토큰 및 프로젝트 정보 가져오기

### Step 1: Vercel 토큰 생성

1. https://vercel.com/account/tokens 접속
2. **"Create Token"** 클릭
3. 토큰 이름 입력 (예: `github-actions-team-caltalk`)
4. Scope: **Full Account** 선택
5. **"Create"** 클릭
6. 생성된 토큰 복사 (한 번만 표시됨!)
   - 예: `vercel_abcd1234efgh5678...`

### Step 2: Vercel 프로젝트 연결 및 ID 가져오기

#### Option 1: Vercel CLI 사용 (권장)

```bash
# Vercel CLI 설치
npm install -g vercel

# 로그인
vercel login

# 프로젝트 연결
cd backend
vercel link

# 프로젝트 정보 확인
vercel project ls

# .vercel/project.json 파일에서 ID 확인
cat .vercel/project.json
```

`.vercel/project.json` 파일 내용:
```json
{
  "orgId": "team_xxxxxxxxxxxxxxxxxx",
  "projectId": "prj_xxxxxxxxxxxxxxxxxx"
}
```

#### Option 2: Vercel 대시보드에서 가져오기

1. https://vercel.com/dashboard 접속
2. 프로젝트 선택
3. **Settings** → **General** 메뉴
4. Project ID 복사 (예: `prj_abc123def456`)
5. **Settings** → **General** → Organization ID 복사 (예: `team_xyz789`)

## 🔑 2. GitHub Secrets 설정

### Step 1: GitHub 저장소 설정 접속

1. GitHub 저장소 페이지 이동
2. **Settings** 탭 클릭
3. 왼쪽 메뉴에서 **Secrets and variables** → **Actions** 선택

### Step 2: Secrets 추가

아래 3개의 Secret을 추가합니다:

| Secret 이름 | 값 | 설명 |
|-------------|-----|------|
| `VERCEL_TOKEN` | `vercel_abcd1234...` | Step 1에서 생성한 Vercel 토큰 |
| `VERCEL_ORG_ID` | `team_xxxxxxxxxx` | Vercel Organization ID |
| `VERCEL_PROJECT_ID` | `prj_xxxxxxxxxx` | Vercel Project ID |

**추가 방법:**
1. **"New repository secret"** 클릭
2. Name: `VERCEL_TOKEN` 입력
3. Secret: 토큰 값 붙여넣기
4. **"Add secret"** 클릭
5. 나머지 2개도 동일하게 추가

### Step 3: Secrets 확인

설정 완료 후 다음과 같이 표시됩니다:
```
✓ VERCEL_TOKEN          Updated X hours ago
✓ VERCEL_ORG_ID         Updated X hours ago
✓ VERCEL_PROJECT_ID     Updated X hours ago
```

## 🚀 3. 워크플로우 동작 확인

### 자동 배포 트리거 조건

#### Preview 배포 (PR)
- PR이 `main` 브랜치로 생성될 때
- `backend/` 디렉토리 파일이 변경된 경우

```bash
git checkout -b feature/new-api
# backend/ 파일 수정
git add .
git commit -m "feat: 새로운 API 추가"
git push origin feature/new-api
# GitHub에서 PR 생성 → Preview 배포 자동 실행
```

#### Production 배포 (main 브랜치)
- `main` 브랜치에 push될 때
- `backend/` 디렉토리 파일이 변경된 경우

```bash
# PR 머지 후
git checkout main
git pull
# Production 배포 자동 실행
```

### 배포 확인

1. **GitHub Actions 탭**에서 워크플로우 실행 확인
   - https://github.com/[username]/team-caltalk/actions

2. **PR 코멘트**에서 Preview URL 확인
   ```
   🚀 Backend Preview Deployment
   Preview URL: https://team-caltalk-backend-xxx.vercel.app
   - Health Check: .../health
   - API Info: .../api
   - Swagger Docs: .../api/docs
   ```

3. **Vercel 대시보드**에서 배포 상태 확인
   - https://vercel.com/dashboard

## 📊 4. 워크플로우 상세 설명

### 워크플로우 파일 구조

```yaml
# .github/workflows/deploy-backend.yml

name: Deploy Backend to Vercel

# 트리거 조건
on:
  push:
    branches: [main]           # main 브랜치 푸시 시
    paths: ['backend/**']      # backend/ 변경 시만
  pull_request:
    branches: [main]           # main으로의 PR 시
    paths: ['backend/**']      # backend/ 변경 시만

jobs:
  deploy:
    steps:
      # 1. 코드 체크아웃
      - uses: actions/checkout@v4

      # 2. Node.js 설정
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'

      # 3. 의존성 설치
      - run: npm ci

      # 4. 테스트 실행 (선택적)
      - run: npm run lint

      # 5. Vercel CLI 설치
      - run: npm install --global vercel@latest

      # 6. Vercel 환경 정보 가져오기
      - run: vercel pull --environment=preview

      # 7. 프로젝트 빌드
      - run: vercel build

      # 8. Vercel 배포
      - run: vercel deploy --prebuilt

      # 9. PR에 코멘트 작성
      - uses: actions/github-script@v7
```

### 주요 단계 설명

#### 1. 환경 정보 가져오기 (vercel pull)
```bash
vercel pull --yes --environment=preview --token=${{ secrets.VERCEL_TOKEN }}
```
- `.vercel/` 디렉토리에 프로젝트 설정 다운로드
- 환경 변수 및 빌드 설정 가져오기

#### 2. 프로젝트 빌드 (vercel build)
```bash
vercel build --prod --token=${{ secrets.VERCEL_TOKEN }}
```
- `.vercel/output/` 디렉토리에 빌드 결과 생성
- Serverless Functions 준비

#### 3. 배포 (vercel deploy)
```bash
vercel deploy --prebuilt --prod --token=${{ secrets.VERCEL_TOKEN }}
```
- 미리 빌드된 결과물 배포
- 배포 URL 반환

## 🔧 5. 커스터마이징

### 테스트 활성화

```yaml
- name: Run tests
  working-directory: ./backend
  run: |
    npm run lint
    npm run test:ci  # 테스트 활성화
  env:
    NODE_ENV: test
```

### 배포 전 린트/타입 체크 강제

```yaml
- name: Lint and Type Check
  working-directory: ./backend
  run: |
    npm run lint           # 실패 시 배포 중단
    npm run type-check     # TypeScript 타입 체크
```

### 특정 브랜치에만 배포

```yaml
on:
  push:
    branches:
      - main
      - staging        # staging 브랜치 추가
    paths:
      - 'backend/**'
```

### Slack 알림 추가

```yaml
- name: Notify Slack
  if: always()
  uses: 8398a7/action-slack@v3
  with:
    status: ${{ job.status }}
    text: 'Backend deployment ${{ job.status }}'
    webhook_url: ${{ secrets.SLACK_WEBHOOK }}
```

## 🛠️ 6. 트러블슈팅

### 문제 1: VERCEL_TOKEN 인증 실패
```
Error: Invalid token
```

**해결:**
1. Vercel 토큰이 올바른지 확인
2. GitHub Secrets에 정확히 입력되었는지 확인
3. 토큰이 만료되지 않았는지 확인 (재생성)

### 문제 2: Project not found
```
Error: Project not found
```

**해결:**
1. `VERCEL_PROJECT_ID`가 올바른지 확인
2. `VERCEL_ORG_ID`가 올바른지 확인
3. Vercel 프로젝트가 실제로 존재하는지 확인

### 문제 3: 빌드 실패
```
Error: Command "npm run build" exited with 1
```

**해결:**
1. 로컬에서 빌드 테스트: `npm run build`
2. 환경 변수 확인
3. `package.json`의 빌드 스크립트 확인

### 문제 4: 워크플로우가 실행되지 않음

**해결:**
1. 트리거 조건 확인:
   - `backend/` 파일이 변경되었는지
   - 브랜치가 `main`인지
2. `.github/workflows/` 경로 확인
3. YAML 문법 오류 확인

## 📚 7. 참고 자료

- [Vercel CLI 문서](https://vercel.com/docs/cli)
- [GitHub Actions 문서](https://docs.github.com/en/actions)
- [Vercel + GitHub Actions 공식 가이드](https://vercel.com/guides/how-can-i-use-github-actions-with-vercel)

## ✅ 8. 배포 체크리스트

배포 전 확인사항:

- [ ] Vercel 토큰 생성
- [ ] Vercel 프로젝트 ID, Organization ID 확인
- [ ] GitHub Secrets 3개 설정 완료
  - [ ] `VERCEL_TOKEN`
  - [ ] `VERCEL_ORG_ID`
  - [ ] `VERCEL_PROJECT_ID`
- [ ] `.github/workflows/deploy-backend.yml` 파일 커밋
- [ ] 워크플로우 파일 문법 확인
- [ ] 로컬에서 빌드 테스트 완료
- [ ] 테스트 브랜치로 PR 생성하여 Preview 배포 확인
- [ ] main 브랜치 머지하여 Production 배포 확인

## 🎯 9. 배포 플로우 요약

```
┌─────────────────┐
│  코드 변경       │
│  (backend/)     │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Git Push       │
│  또는 PR 생성    │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ GitHub Actions  │
│ 워크플로우 실행  │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ 1. 코드 체크아웃│
│ 2. 의존성 설치  │
│ 3. 테스트 실행  │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Vercel CLI      │
│ pull → build    │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Vercel Deploy   │
│ (Preview/Prod)  │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ 배포 완료       │
│ URL 생성        │
│ PR 코멘트       │
└─────────────────┘
```
