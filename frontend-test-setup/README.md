# Team CalTalk 프론트엔드 테스트 설정

Issue #12 "프론트엔드 기반 구조 및 상태 관리 설정"을 위한 포괄적인 테스트 전략과 구현 가이드입니다.

## 📋 테스트 전략 개요

### 🎯 테스트 목표
- **80% 이상 코드 커버리지** 달성
- **핵심 기능 신뢰성** 확보 (상태 관리, 라우팅, API 연동)
- **성능 요구사항** 검증 (첫 로딩 < 3초, 페이지 전환 < 1초)
- **크로스 브라우저 호환성** 확인
- **접근성 기본 준수** 검증

### 🔧 테스트 도구 스택
- **단위 테스트**: Vitest + React Testing Library
- **통합 테스트**: Vitest + MSW (Mock Service Worker)
- **E2E 테스트**: Playwright
- **커버리지**: c8 (Vitest 내장)
- **접근성**: axe-playwright

## 🚀 빠른 시작

### 1. 프로젝트 설정

```bash
# 프론트엔드 디렉토리 생성
mkdir frontend && cd frontend

# Vite + React + TypeScript 프로젝트 초기화
npm create vite@latest . -- --template react-ts

# 테스트 관련 의존성 설치
npm install -D @testing-library/react @testing-library/jest-dom @testing-library/user-event
npm install -D vitest jsdom c8 @vitest/ui
npm install -D @playwright/test @axe-core/playwright
npm install -D msw fake-indexeddb

# 상태 관리 및 HTTP 클라이언트
npm install zustand @tanstack/react-query axios react-router-dom
```

### 2. 설정 파일 복사

이 디렉토리의 설정 파일들을 프론트엔드 프로젝트로 복사:

```bash
# 테스트 설정 파일들
cp vitest.config.ts frontend/
cp playwright.config.ts frontend/
cp -r src/test/ frontend/src/
cp -r tests/ frontend/

# CI/CD 워크플로우
mkdir -p frontend/.github/workflows/
cp .github/workflows/frontend-tests.yml frontend/.github/workflows/
```

### 3. Package.json 스크립트 업데이트

```json
{
  "scripts": {
    "test": "vitest",
    "test:watch": "vitest --watch",
    "test:ui": "vitest --ui",
    "test:coverage": "vitest run --coverage",
    "test:e2e": "playwright test",
    "test:e2e:headed": "playwright test --headed",
    "test:e2e:ui": "playwright test --ui",
    "test:all": "npm run test:coverage && npm run test:e2e"
  }
}
```

## 🧪 테스트 실행

### 단위 테스트

```bash
# 단위 테스트 실행
npm run test

# 커버리지와 함께 실행
npm run test:coverage

# 대화형 UI로 실행
npm run test:ui

# 파일 변경 감지로 실행
npm run test:watch
```

### E2E 테스트

```bash
# E2E 테스트 실행
npm run test:e2e

# 브라우저 창을 보면서 실행
npm run test:e2e:headed

# 대화형 UI로 실행
npm run test:e2e:ui

# 특정 브라우저에서만 실행
npx playwright test --project=chromium
```

### 전체 테스트

```bash
# 모든 테스트 실행 (단위 + E2E)
npm run test:all

# CI 환경용 (린트 + 테스트)
npm run test:ci
```

## 📁 파일 구조

```
frontend/
├── src/
│   ├── components/          # React 컴포넌트
│   │   ├── Button/
│   │   │   ├── Button.tsx
│   │   │   └── Button.test.tsx
│   │   └── Modal/
│   │       ├── Modal.tsx
│   │       └── Modal.test.tsx
│   ├── hooks/              # 커스텀 훅
│   │   ├── useAuth.ts
│   │   └── useAuth.test.ts
│   ├── stores/             # Zustand 스토어
│   ├── services/           # API 서비스
│   ├── utils/              # 유틸리티 함수
│   └── test/               # 테스트 설정
│       ├── setup.ts        # 전역 테스트 설정
│       ├── utils/
│       │   └── test-utils.tsx
│       └── mocks/          # MSW 모킹
│           ├── handlers.ts
│           ├── browser.ts
│           └── server.ts
├── tests/
│   └── e2e/                # E2E 테스트
│       ├── auth.spec.ts
│       ├── responsive.spec.ts
│       ├── global-setup.ts
│       └── global-teardown.ts
├── vitest.config.ts        # Vitest 설정
├── playwright.config.ts    # Playwright 설정
└── package.json
```

## 🎨 테스트 작성 가이드

### 컴포넌트 테스트 예시

```typescript
// src/components/Button/Button.test.tsx
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import Button from './Button';

describe('Button 컴포넌트', () => {
  it('기본 버튼 렌더링', () => {
    render(<Button>클릭</Button>);
    expect(screen.getByRole('button', { name: '클릭' })).toBeInTheDocument();
  });

  it('클릭 이벤트 처리', () => {
    const onClick = vi.fn();
    render(<Button onClick={onClick}>클릭</Button>);

    fireEvent.click(screen.getByRole('button'));
    expect(onClick).toHaveBeenCalledTimes(1);
  });
});
```

### 커스텀 훅 테스트 예시

```typescript
// src/hooks/useAuth.test.ts
import { renderHook, act } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { useAuth } from './useAuth';

describe('useAuth 훅', () => {
  it('로그인 처리', async () => {
    const { result } = renderHook(() => useAuth());

    await act(async () => {
      await result.current.login({ email: 'test@example.com', password: 'password' });
    });

    expect(result.current.isAuthenticated).toBe(true);
  });
});
```

### E2E 테스트 예시

```typescript
// tests/e2e/auth.spec.ts
import { test, expect } from '@playwright/test';

test('로그인 플로우', async ({ page }) => {
  await page.goto('/login');

  await page.fill('[data-testid="email-input"]', 'test@example.com');
  await page.fill('[data-testid="password-input"]', 'password');
  await page.click('[data-testid="login-button"]');

  await expect(page).toHaveURL('/dashboard');
});
```

## 📊 커버리지 목표

| 영역 | 목표 커버리지 | 중요도 |
|------|-------------|-------|
| 상태 관리 (Zustand 스토어) | 95% | 🔴 Critical |
| API 서비스 함수 | 90% | 🔴 Critical |
| 핵심 UI 컴포넌트 | 85% | 🟡 High |
| 유틸리티 함수 | 90% | 🟡 High |
| 커스텀 훅 | 85% | 🟡 High |
| 레이아웃 컴포넌트 | 70% | 🟢 Medium |

## 🔧 MSW 모킹 설정

API 모킹을 위해 MSW를 사용합니다:

```typescript
// src/test/mocks/handlers.ts
import { rest } from 'msw';

export const handlers = [
  rest.post('/api/auth/login', (req, res, ctx) => {
    return res(
      ctx.json({
        token: 'mock-token',
        user: { id: 1, name: '김테스트' }
      })
    );
  }),
];
```

## 🎭 Playwright 설정

다양한 브라우저와 디바이스에서 테스트:

```typescript
// playwright.config.ts
export default defineConfig({
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
    { name: 'firefox', use: { ...devices['Desktop Firefox'] } },
    { name: 'webkit', use: { ...devices['Desktop Safari'] } },
    { name: 'Mobile Chrome', use: { ...devices['Pixel 5'] } },
  ],
});
```

## 🚨 품질 게이트

### 필수 통과 조건
- [ ] 단위 테스트 100% 통과
- [ ] E2E 테스트 100% 통과
- [ ] 코드 커버리지 80% 이상
- [ ] 성능 테스트 통과 (로딩 < 3초, 전환 < 1초)
- [ ] 접근성 테스트 위반 사항 0개

### 차단 기준
- Critical/High 우선순위 테스트 실패
- 코드 커버리지 80% 미달
- 접근성 Critical 위반 사항 존재
- 성능 요구사항 50% 이상 초과

## 🔗 CI/CD 통합

GitHub Actions를 통한 자동화된 테스트:

```yaml
# .github/workflows/frontend-tests.yml
name: Frontend Test Suite
on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
      - run: npm ci
      - run: npm run test:coverage
      - run: npm run test:e2e
```

## 📚 추가 자료

- [Vitest 공식 문서](https://vitest.dev/)
- [React Testing Library 가이드](https://testing-library.com/docs/react-testing-library/intro/)
- [Playwright 문서](https://playwright.dev/)
- [MSW 문서](https://mswjs.io/)
- [접근성 테스트 가이드](https://www.w3.org/WAI/test-evaluate/)

## 🤝 기여 가이드

1. 새로운 컴포넌트 작성 시 반드시 테스트 파일도 함께 작성
2. 테스트 커버리지 80% 이상 유지
3. E2E 테스트는 핵심 사용자 시나리오에 집중
4. 접근성 테스트는 모든 페이지에 적용
5. 성능 테스트는 주요 페이지 로딩 시간 측정

이 테스트 설정을 통해 Issue #12의 모든 기능이 안정적이고 품질 높게 구현될 수 있습니다.