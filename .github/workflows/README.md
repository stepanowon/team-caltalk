# GitHub Actions 워크플로우

이 디렉토리는 Team CalTalk 프로젝트의 CI/CD 자동화 워크플로우를 포함합니다.

## 📁 워크플로우 목록

### 1. `deploy-backend.yml` - 백엔드 자동 배포

**트리거:**
- `main` 브랜치에 push (Production 배포)
- `main`으로의 PR 생성 (Preview 배포)
- `backend/` 디렉토리 변경 시에만 실행

**주요 기능:**
- ✅ 코드 린트 및 테스트 실행
- ✅ Vercel Preview 환경 배포 (PR)
- ✅ Vercel Production 환경 배포 (main)
- ✅ PR에 배포 URL 자동 코멘트
- ✅ 배포 상태 요약 제공

## 🚀 빠른 시작

### 1. GitHub Secrets 설정

저장소 Settings → Secrets and variables → Actions에서 다음 3개 추가:

```
VERCEL_TOKEN          # Vercel 액세스 토큰
VERCEL_ORG_ID         # Vercel Organization ID
VERCEL_PROJECT_ID     # Vercel Project ID
```

### 2. 배포 테스트

```bash
# 1. 기능 브랜치 생성
git checkout -b feature/test-deploy

# 2. backend/ 파일 수정
echo "# Test" >> backend/README.md

# 3. 커밋 및 푸시
git add .
git commit -m "test: GitHub Actions 배포 테스트"
git push origin feature/test-deploy

# 4. GitHub에서 PR 생성
# → Preview 배포 자동 실행!
```

## 📚 상세 가이드

전체 설정 및 트러블슈팅 가이드:
- [GITHUB_ACTIONS_SETUP.md](./GITHUB_ACTIONS_SETUP.md)

## 🔧 워크플로우 커스터마이징

### 다른 브랜치 추가

```yaml
on:
  push:
    branches:
      - main
      - develop  # 추가
```

### 테스트 활성화

```yaml
- name: Run tests
  run: npm run test:ci  # 주석 해제
```

### 알림 추가 (Slack, Discord 등)

```yaml
- name: Notify Slack
  uses: 8398a7/action-slack@v3
  with:
    status: ${{ job.status }}
    webhook_url: ${{ secrets.SLACK_WEBHOOK }}
```

## ⚠️ 주의사항

1. **Secrets 관리**
   - 절대 코드에 토큰을 하드코딩하지 마세요
   - GitHub Secrets에만 저장

2. **비용 관리**
   - GitHub Actions는 무료 사용량 제한 있음
   - 불필요한 워크플로우 실행 방지

3. **보안**
   - `VERCEL_TOKEN`은 Full Account 권한 필요
   - 토큰 유출 시 즉시 재생성

## 📊 배포 플로우

```
코드 변경 (backend/)
    ↓
Git Push / PR 생성
    ↓
GitHub Actions 트리거
    ↓
테스트 & 린트 실행
    ↓
Vercel 빌드
    ↓
Vercel 배포
    ↓
PR 코멘트 / 배포 완료
```

## 🛠️ 문제 해결

### 워크플로우가 실행되지 않음

1. `backend/` 파일이 변경되었는지 확인
2. 브랜치가 `main`인지 확인
3. YAML 문법 오류 확인

### 배포 실패

1. GitHub Actions 로그 확인
2. Secrets 값 확인
3. Vercel 프로젝트 설정 확인

상세한 트러블슈팅은 [GITHUB_ACTIONS_SETUP.md](./GITHUB_ACTIONS_SETUP.md#6-트러블슈팅) 참조
