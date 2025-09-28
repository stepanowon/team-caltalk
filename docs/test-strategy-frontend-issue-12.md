# Issue #12 프론트엔드 기반 구조 테스트 전략

**문서 버전**: 1.0
**작성일**: 2025-09-28
**대상**: Issue #12 - 프론트엔드 기반 구조 및 상태 관리 설정

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

---

## 🧪 단위 테스트 (Unit Tests)

### 1️⃣ 기본 UI 컴포넌트 테스트

#### Button 컴포넌트 테스트
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

  it('variant별 스타일 적용', () => {
    const { rerender } = render(<Button variant="primary">Primary</Button>);
    expect(screen.getByRole('button')).toHaveClass('btn-primary');

    rerender(<Button variant="secondary">Secondary</Button>);
    expect(screen.getByRole('button')).toHaveClass('btn-secondary');

    rerender(<Button variant="danger">Danger</Button>);
    expect(screen.getByRole('button')).toHaveClass('btn-danger');
  });

  it('disabled 상태 처리', () => {
    const onClick = vi.fn();
    render(<Button disabled onClick={onClick}>Disabled</Button>);

    const button = screen.getByRole('button');
    expect(button).toBeDisabled();

    fireEvent.click(button);
    expect(onClick).not.toHaveBeenCalled();
  });

  it('loading 상태 표시', () => {
    render(<Button loading>Loading</Button>);
    expect(screen.getByRole('button')).toBeDisabled();
    expect(screen.getByTestId('loading-spinner')).toBeInTheDocument();
  });

  it('onClick 이벤트 처리', () => {
    const onClick = vi.fn();
    render(<Button onClick={onClick}>Click Me</Button>);

    fireEvent.click(screen.getByRole('button'));
    expect(onClick).toHaveBeenCalledTimes(1);
  });
});
```

#### Modal 컴포넌트 테스트
```typescript
// src/components/Modal/Modal.test.tsx
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import Modal from './Modal';

describe('Modal 컴포넌트', () => {
  it('열린 상태에서 모달 표시', () => {
    render(
      <Modal isOpen onClose={vi.fn()}>
        <div>모달 내용</div>
      </Modal>
    );

    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByText('모달 내용')).toBeInTheDocument();
  });

  it('닫힌 상태에서 모달 숨김', () => {
    render(
      <Modal isOpen={false} onClose={vi.fn()}>
        <div>모달 내용</div>
      </Modal>
    );

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('오버레이 클릭으로 모달 닫기', () => {
    const onClose = vi.fn();
    render(
      <Modal isOpen onClose={onClose}>
        <div>모달 내용</div>
      </Modal>
    );

    fireEvent.click(screen.getByTestId('modal-overlay'));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('ESC 키로 모달 닫기', () => {
    const onClose = vi.fn();
    render(
      <Modal isOpen onClose={onClose}>
        <div>모달 내용</div>
      </Modal>
    );

    fireEvent.keyDown(document, { key: 'Escape' });
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('포커스 트랩 동작', () => {
    render(
      <Modal isOpen onClose={vi.fn()}>
        <input data-testid="first-input" />
        <button data-testid="modal-button">확인</button>
        <input data-testid="last-input" />
      </Modal>
    );

    const firstInput = screen.getByTestId('first-input');
    expect(firstInput).toHaveFocus();
  });
});
```

#### Input 컴포넌트 테스트
```typescript
// src/components/Input/Input.test.tsx
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import Input from './Input';

describe('Input 컴포넌트', () => {
  it('기본 입력 필드 렌더링', () => {
    render(<Input placeholder="이름을 입력하세요" />);
    expect(screen.getByPlaceholderText('이름을 입력하세요')).toBeInTheDocument();
  });

  it('값 변경 처리', () => {
    const onChange = vi.fn();
    render(<Input value="" onChange={onChange} />);

    fireEvent.change(screen.getByRole('textbox'), { target: { value: 'test' } });
    expect(onChange).toHaveBeenCalledWith('test');
  });

  it('에러 상태 표시', () => {
    render(<Input error="필수 항목입니다" />);
    expect(screen.getByText('필수 항목입니다')).toBeInTheDocument();
    expect(screen.getByRole('textbox')).toHaveClass('input-error');
  });

  it('비밀번호 타입 처리', () => {
    render(<Input type="password" />);
    expect(screen.getByRole('textbox')).toHaveAttribute('type', 'password');
  });

  it('required 속성 처리', () => {
    render(<Input required />);
    expect(screen.getByRole('textbox')).toBeRequired();
  });
});
```

### 2️⃣ 레이아웃 컴포넌트 테스트

#### Header 컴포넌트 테스트
```typescript
// src/components/Layout/Header.test.tsx
import { render, screen } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { describe, it, expect } from 'vitest';
import Header from './Header';

const renderWithRouter = (component: React.ReactElement) => {
  return render(<BrowserRouter>{component}</BrowserRouter>);
};

describe('Header 컴포넌트', () => {
  it('로그인된 사용자 정보 표시', () => {
    const mockUser = { id: 1, name: '김개발', email: 'dev@example.com' };
    renderWithRouter(<Header user={mockUser} />);

    expect(screen.getByText('김개발')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /사용자 메뉴/ })).toBeInTheDocument();
  });

  it('로그아웃 상태에서 로그인 링크 표시', () => {
    renderWithRouter(<Header user={null} />);

    expect(screen.getByRole('link', { name: '로그인' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: '회원가입' })).toBeInTheDocument();
  });

  it('네비게이션 메뉴 링크', () => {
    const mockUser = { id: 1, name: '김개발', email: 'dev@example.com' };
    renderWithRouter(<Header user={mockUser} />);

    expect(screen.getByRole('link', { name: '대시보드' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: '팀 관리' })).toBeInTheDocument();
  });
});
```

### 3️⃣ 커스텀 훅 테스트

#### useAuth 훅 테스트
```typescript
// src/hooks/useAuth.test.ts
import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useAuth } from './useAuth';

// Mock localStorage
const mockLocalStorage = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
};

Object.defineProperty(window, 'localStorage', {
  value: mockLocalStorage
});

describe('useAuth 훅', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('초기 상태 확인', () => {
    mockLocalStorage.getItem.mockReturnValue(null);
    const { result } = renderHook(() => useAuth());

    expect(result.current.user).toBeNull();
    expect(result.current.token).toBeNull();
    expect(result.current.isAuthenticated).toBe(false);
  });

  it('localStorage에서 토큰 복원', () => {
    const mockToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...';
    const mockUser = { id: 1, name: '김개발', email: 'dev@example.com' };

    mockLocalStorage.getItem.mockReturnValueOnce(mockToken);
    mockLocalStorage.getItem.mockReturnValueOnce(JSON.stringify(mockUser));

    const { result } = renderHook(() => useAuth());

    expect(result.current.token).toBe(mockToken);
    expect(result.current.user).toEqual(mockUser);
    expect(result.current.isAuthenticated).toBe(true);
  });

  it('로그인 처리', async () => {
    const { result } = renderHook(() => useAuth());

    const mockCredentials = { email: 'test@example.com', password: 'password' };
    const mockResponse = {
      token: 'new-token',
      user: { id: 1, name: '김개발', email: 'test@example.com' }
    };

    // Mock API call
    global.fetch = vi.fn().mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(mockResponse)
    });

    await act(async () => {
      await result.current.login(mockCredentials);
    });

    expect(result.current.isAuthenticated).toBe(true);
    expect(result.current.user).toEqual(mockResponse.user);
    expect(mockLocalStorage.setItem).toHaveBeenCalledWith('token', 'new-token');
  });

  it('로그아웃 처리', async () => {
    // Setup initial authenticated state
    mockLocalStorage.getItem.mockReturnValueOnce('existing-token');
    mockLocalStorage.getItem.mockReturnValueOnce(JSON.stringify({ id: 1, name: 'User' }));

    const { result } = renderHook(() => useAuth());

    act(() => {
      result.current.logout();
    });

    expect(result.current.isAuthenticated).toBe(false);
    expect(result.current.user).toBeNull();
    expect(result.current.token).toBeNull();
    expect(mockLocalStorage.removeItem).toHaveBeenCalledWith('token');
    expect(mockLocalStorage.removeItem).toHaveBeenCalledWith('user');
  });
});
```

### 4️⃣ 유틸리티 함수 테스트

#### 날짜 헬퍼 함수 테스트
```typescript
// src/utils/dateHelpers.test.ts
import { describe, it, expect } from 'vitest';
import { formatDate, parseDate, isDateValid, getWeekRange } from './dateHelpers';

describe('날짜 헬퍼 함수', () => {
  describe('formatDate', () => {
    it('YYYY-MM-DD 형식으로 포맷', () => {
      const date = new Date('2024-03-15');
      expect(formatDate(date, 'YYYY-MM-DD')).toBe('2024-03-15');
    });

    it('MM/DD/YYYY 형식으로 포맷', () => {
      const date = new Date('2024-03-15');
      expect(formatDate(date, 'MM/DD/YYYY')).toBe('03/15/2024');
    });

    it('한국어 형식으로 포맷', () => {
      const date = new Date('2024-03-15');
      expect(formatDate(date, 'YYYY년 MM월 DD일')).toBe('2024년 03월 15일');
    });
  });

  describe('parseDate', () => {
    it('ISO 문자열 파싱', () => {
      const dateStr = '2024-03-15T10:30:00.000Z';
      const parsed = parseDate(dateStr);
      expect(parsed).toBeInstanceOf(Date);
      expect(parsed.getFullYear()).toBe(2024);
    });

    it('잘못된 날짜 문자열 처리', () => {
      expect(parseDate('invalid-date')).toBeNull();
    });
  });

  describe('isDateValid', () => {
    it('유효한 날짜 확인', () => {
      expect(isDateValid(new Date('2024-03-15'))).toBe(true);
    });

    it('무효한 날짜 확인', () => {
      expect(isDateValid(new Date('invalid'))).toBe(false);
    });
  });

  describe('getWeekRange', () => {
    it('주간 범위 계산', () => {
      const date = new Date('2024-03-15'); // 금요일
      const { start, end } = getWeekRange(date);

      expect(start.getDay()).toBe(1); // 월요일
      expect(end.getDay()).toBe(0);   // 일요일
    });
  });
});
```

#### 검증 함수 테스트
```typescript
// src/utils/validation.test.ts
import { describe, it, expect } from 'vitest';
import { validateEmail, validatePassword, validateScheduleTime } from './validation';

describe('검증 함수', () => {
  describe('validateEmail', () => {
    it('유효한 이메일 주소', () => {
      expect(validateEmail('test@example.com')).toBe(true);
      expect(validateEmail('user.name+tag@domain.co.kr')).toBe(true);
    });

    it('무효한 이메일 주소', () => {
      expect(validateEmail('invalid-email')).toBe(false);
      expect(validateEmail('test@')).toBe(false);
      expect(validateEmail('@domain.com')).toBe(false);
    });
  });

  describe('validatePassword', () => {
    it('강력한 비밀번호', () => {
      const result = validatePassword('Password123!');
      expect(result.isValid).toBe(true);
      expect(result.strength).toBe('strong');
    });

    it('약한 비밀번호', () => {
      const result = validatePassword('123456');
      expect(result.isValid).toBe(false);
      expect(result.strength).toBe('weak');
      expect(result.errors).toContain('최소 8자 이상');
    });
  });

  describe('validateScheduleTime', () => {
    it('유효한 일정 시간', () => {
      const start = new Date('2024-03-15 09:00');
      const end = new Date('2024-03-15 10:00');
      expect(validateScheduleTime(start, end)).toBe(true);
    });

    it('종료 시간이 시작 시간보다 이른 경우', () => {
      const start = new Date('2024-03-15 10:00');
      const end = new Date('2024-03-15 09:00');
      expect(validateScheduleTime(start, end)).toBe(false);
    });
  });
});
```

---

## 🔗 통합 테스트 (Integration Tests)

### 1️⃣ 상태 관리 통합 테스트

#### Zustand + TanStack Query 통합
```typescript
// src/tests/integration/stateManagement.test.tsx
import { render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { setupServer } from 'msw/node';
import { rest } from 'msw';
import TestComponent from './TestComponent';

const server = setupServer(
  rest.get('/api/user/profile', (req, res, ctx) => {
    return res(ctx.json({ id: 1, name: '김개발', email: 'dev@example.com' }));
  }),

  rest.post('/api/auth/login', (req, res, ctx) => {
    return res(ctx.json({
      token: 'mock-token',
      user: { id: 1, name: '김개발', email: 'dev@example.com' }
    }));
  })
);

beforeEach(() => {
  server.listen();
});

afterEach(() => {
  server.resetHandlers();
});

afterAll(() => {
  server.close();
});

describe('상태 관리 통합 테스트', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
      },
    });
  });

  it('로그인 후 사용자 정보 상태 업데이트', async () => {
    render(
      <QueryClientProvider client={queryClient}>
        <TestComponent />
      </QueryClientProvider>
    );

    // 로그인 버튼 클릭
    fireEvent.click(screen.getByText('로그인'));

    // 로그인 후 사용자 정보 표시 확인
    await waitFor(() => {
      expect(screen.getByText('김개발')).toBeInTheDocument();
    });

    // Zustand store 상태 확인
    expect(useAuthStore.getState().isAuthenticated).toBe(true);
  });

  it('API 에러 시 상태 처리', async () => {
    server.use(
      rest.post('/api/auth/login', (req, res, ctx) => {
        return res(ctx.status(401), ctx.json({ error: '인증 실패' }));
      })
    );

    render(
      <QueryClientProvider client={queryClient}>
        <TestComponent />
      </QueryClientProvider>
    );

    fireEvent.click(screen.getByText('로그인'));

    await waitFor(() => {
      expect(screen.getByText('인증 실패')).toBeInTheDocument();
    });

    expect(useAuthStore.getState().isAuthenticated).toBe(false);
  });
});
```

### 2️⃣ API 연동 테스트

#### AuthService 통합 테스트
```typescript
// src/services/auth.test.ts
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { setupServer } from 'msw/node';
import { rest } from 'msw';
import { AuthService } from './authService';

const server = setupServer();

beforeEach(() => {
  server.listen();
});

afterEach(() => {
  server.resetHandlers();
});

afterAll(() => {
  server.close();
});

describe('AuthService 통합 테스트', () => {
  it('로그인 성공 시나리오', async () => {
    server.use(
      rest.post('/api/auth/login', (req, res, ctx) => {
        return res(ctx.json({
          token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
          user: { id: 1, name: '김개발', email: 'dev@example.com' }
        }));
      })
    );

    const result = await AuthService.login({
      email: 'dev@example.com',
      password: 'password123'
    });

    expect(result.success).toBe(true);
    expect(result.data.user.name).toBe('김개발');
    expect(result.data.token).toBeTruthy();
  });

  it('로그인 실패 시나리오', async () => {
    server.use(
      rest.post('/api/auth/login', (req, res, ctx) => {
        return res(ctx.status(401), ctx.json({
          error: '이메일 또는 비밀번호가 잘못되었습니다'
        }));
      })
    );

    const result = await AuthService.login({
      email: 'wrong@example.com',
      password: 'wrongpassword'
    });

    expect(result.success).toBe(false);
    expect(result.error).toBe('이메일 또는 비밀번호가 잘못되었습니다');
  });

  it('토큰 갱신 처리', async () => {
    server.use(
      rest.post('/api/auth/refresh', (req, res, ctx) => {
        return res(ctx.json({
          token: 'new-token-value'
        }));
      })
    );

    const result = await AuthService.refreshToken('old-token');

    expect(result.success).toBe(true);
    expect(result.data.token).toBe('new-token-value');
  });
});
```

### 3️⃣ 라우팅 통합 테스트

#### ProtectedRoute 테스트
```typescript
// src/components/ProtectedRoute.test.tsx
import { render, screen } from '@testing-library/react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { describe, it, expect, vi } from 'vitest';
import ProtectedRoute from './ProtectedRoute';

const mockUseAuth = vi.fn();
vi.mock('../hooks/useAuth', () => ({
  useAuth: () => mockUseAuth()
}));

const TestApp = ({ isAuthenticated }: { isAuthenticated: boolean }) => {
  mockUseAuth.mockReturnValue({
    isAuthenticated,
    user: isAuthenticated ? { id: 1, name: 'Test User' } : null
  });

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<div>로그인 페이지</div>} />
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <div>대시보드</div>
            </ProtectedRoute>
          }
        />
      </Routes>
    </BrowserRouter>
  );
};

describe('ProtectedRoute 컴포넌트', () => {
  it('인증된 사용자는 보호된 페이지 접근 가능', () => {
    render(<TestApp isAuthenticated={true} />);
    expect(screen.getByText('대시보드')).toBeInTheDocument();
  });

  it('미인증 사용자는 로그인 페이지로 리다이렉트', () => {
    render(<TestApp isAuthenticated={false} />);
    expect(screen.getByText('로그인 페이지')).toBeInTheDocument();
  });
});
```

---

## 🎭 E2E 테스트 (End-to-End Tests)

### 1️⃣ 사용자 인증 플로우

```typescript
// tests/e2e/auth.spec.ts
import { test, expect } from '@playwright/test';

test.describe('사용자 인증', () => {
  test('회원가입 → 로그인 → 대시보드 접근', async ({ page }) => {
    // 회원가입
    await page.goto('/register');
    await page.fill('[data-testid="email-input"]', 'test@example.com');
    await page.fill('[data-testid="password-input"]', 'Password123!');
    await page.fill('[data-testid="name-input"]', '김테스트');
    await page.click('[data-testid="register-button"]');

    // 성공 메시지 확인
    await expect(page.locator('[data-testid="success-message"]')).toBeVisible();

    // 로그인 페이지로 이동
    await page.goto('/login');
    await page.fill('[data-testid="email-input"]', 'test@example.com');
    await page.fill('[data-testid="password-input"]', 'Password123!');
    await page.click('[data-testid="login-button"]');

    // 대시보드 페이지로 자동 이동 확인
    await expect(page).toHaveURL('/dashboard');
    await expect(page.locator('[data-testid="user-name"]')).toContainText('김테스트');
  });

  test('잘못된 자격증명으로 로그인 실패', async ({ page }) => {
    await page.goto('/login');
    await page.fill('[data-testid="email-input"]', 'wrong@example.com');
    await page.fill('[data-testid="password-input"]', 'wrongpassword');
    await page.click('[data-testid="login-button"]');

    await expect(page.locator('[data-testid="error-message"]')).toContainText('로그인 정보가 올바르지 않습니다');
  });

  test('로그아웃 기능', async ({ page }) => {
    // 사전 로그인
    await page.goto('/login');
    await page.fill('[data-testid="email-input"]', 'test@example.com');
    await page.fill('[data-testid="password-input"]', 'Password123!');
    await page.click('[data-testid="login-button"]');

    // 로그아웃
    await page.click('[data-testid="user-menu"]');
    await page.click('[data-testid="logout-button"]');

    // 로그인 페이지로 리다이렉트 확인
    await expect(page).toHaveURL('/login');
  });
});
```

### 2️⃣ 반응형 디자인 테스트

```typescript
// tests/e2e/responsive.spec.ts
import { test, expect } from '@playwright/test';

test.describe('반응형 디자인', () => {
  const viewports = [
    { name: 'Desktop', width: 1920, height: 1080 },
    { name: 'Tablet', width: 768, height: 1024 },
    { name: 'Mobile', width: 375, height: 667 }
  ];

  viewports.forEach(({ name, width, height }) => {
    test(`${name} 뷰포트에서 헤더 표시`, async ({ page }) => {
      await page.setViewportSize({ width, height });
      await page.goto('/dashboard');

      const header = page.locator('[data-testid="header"]');
      await expect(header).toBeVisible();

      if (width < 768) {
        // 모바일에서는 햄버거 메뉴 표시
        await expect(page.locator('[data-testid="mobile-menu-toggle"]')).toBeVisible();
      } else {
        // 데스크톱/태블릿에서는 전체 네비게이션 표시
        await expect(page.locator('[data-testid="desktop-nav"]')).toBeVisible();
      }
    });
  });

  test('모바일에서 사이드바 토글', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/dashboard');

    // 초기에는 사이드바 숨김
    await expect(page.locator('[data-testid="sidebar"]')).not.toBeVisible();

    // 햄버거 메뉴 클릭으로 사이드바 표시
    await page.click('[data-testid="mobile-menu-toggle"]');
    await expect(page.locator('[data-testid="sidebar"]')).toBeVisible();

    // 오버레이 클릭으로 사이드바 숨김
    await page.click('[data-testid="sidebar-overlay"]');
    await expect(page.locator('[data-testid="sidebar"]')).not.toBeVisible();
  });
});
```

### 3️⃣ 성능 테스트

```typescript
// tests/e2e/performance.spec.ts
import { test, expect } from '@playwright/test';

test.describe('성능 테스트', () => {
  test('페이지 로딩 성능', async ({ page }) => {
    const startTime = Date.now();

    await page.goto('/dashboard');

    // 메인 콘텐츠 로딩 대기
    await page.waitForSelector('[data-testid="dashboard-content"]');

    const loadTime = Date.now() - startTime;

    // 3초 이내 로딩 검증
    expect(loadTime).toBeLessThan(3000);
  });

  test('페이지 전환 성능', async ({ page }) => {
    await page.goto('/dashboard');

    const startTime = Date.now();
    await page.click('[data-testid="team-management-link"]');
    await page.waitForSelector('[data-testid="team-list"]');

    const transitionTime = Date.now() - startTime;

    // 1초 이내 전환 검증
    expect(transitionTime).toBeLessThan(1000);
  });

  test('번들 크기 검증', async ({ page }) => {
    const response = await page.goto('/');

    // 메인 JS 번들 크기 확인
    const jsResponses = [];
    page.on('response', response => {
      if (response.url().includes('.js') && response.status() === 200) {
        jsResponses.push(response);
      }
    });

    await page.reload();

    // 번들 크기 임계값 검증 (예: 500KB 이하)
    for (const response of jsResponses) {
      const contentLength = parseInt(response.headers()['content-length'] || '0');
      expect(contentLength).toBeLessThan(500 * 1024); // 500KB
    }
  });
});
```

### 4️⃣ 접근성 테스트

```typescript
// tests/e2e/accessibility.spec.ts
import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

test.describe('접근성 테스트', () => {
  test('메인 페이지 접근성 검사', async ({ page }) => {
    await page.goto('/');

    const accessibilityScanResults = await new AxeBuilder({ page }).analyze();

    expect(accessibilityScanResults.violations).toEqual([]);
  });

  test('키보드 네비게이션', async ({ page }) => {
    await page.goto('/login');

    // Tab 키로 요소 간 이동
    await page.press('body', 'Tab');
    await expect(page.locator('[data-testid="email-input"]')).toBeFocused();

    await page.press('body', 'Tab');
    await expect(page.locator('[data-testid="password-input"]')).toBeFocused();

    await page.press('body', 'Tab');
    await expect(page.locator('[data-testid="login-button"]')).toBeFocused();

    // Enter 키로 로그인 버튼 클릭
    await page.press('[data-testid="login-button"]', 'Enter');
  });

  test('스크린 리더 지원', async ({ page }) => {
    await page.goto('/dashboard');

    // ARIA 라벨 확인
    await expect(page.locator('[data-testid="main-content"]')).toHaveAttribute('aria-label');
    await expect(page.locator('[data-testid="sidebar"]')).toHaveAttribute('aria-label');

    // 제목 구조 확인
    const headings = page.locator('h1, h2, h3, h4, h5, h6');
    await expect(headings.first()).toHaveText(/대시보드/);
  });
});
```

---

## 📊 코드 커버리지 전략

### 1️⃣ 커버리지 설정

```typescript
// vitest.config.ts
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    coverage: {
      provider: 'c8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/',
        'src/test/',
        '**/*.d.ts',
        '**/*.config.*',
        '**/index.ts'
      ],
      thresholds: {
        global: {
          statements: 80,
          branches: 75,
          functions: 80,
          lines: 80
        }
      }
    }
  }
});
```

### 2️⃣ 우선순위별 커버리지 목표

| 영역 | 목표 커버리지 | 중요도 |
|------|-------------|-------|
| 상태 관리 (Zustand 스토어) | 95% | 🔴 Critical |
| API 서비스 함수 | 90% | 🔴 Critical |
| 핵심 UI 컴포넌트 | 85% | 🟡 High |
| 유틸리티 함수 | 90% | 🟡 High |
| 커스텀 훅 | 85% | 🟡 High |
| 레이아웃 컴포넌트 | 70% | 🟢 Medium |

### 3️⃣ 커버리지 리포트 자동화

```json
// package.json 스크립트
{
  "scripts": {
    "test": "vitest",
    "test:coverage": "vitest run --coverage",
    "test:ui": "vitest --ui",
    "test:e2e": "playwright test",
    "test:all": "npm run test:coverage && npm run test:e2e"
  }
}
```

---

## 🚀 테스트 실행 및 CI/CD 통합

### 1️⃣ 테스트 실행 계획

```bash
# 개발 중 빠른 테스트
npm run test

# 전체 테스트 스위트 (커버리지 포함)
npm run test:coverage

# E2E 테스트
npm run test:e2e

# 전체 테스트 (CI/CD용)
npm run test:all
```

### 2️⃣ GitHub Actions 워크플로우

```yaml
# .github/workflows/test.yml
name: Test Suite

on:
  push:
    branches: [ main, develop ]
  pull_request:
    branches: [ main ]

jobs:
  unit-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      - run: npm ci
      - run: npm run test:coverage
      - uses: codecov/codecov-action@v3

  e2e-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      - run: npm ci
      - run: npx playwright install
      - run: npm run test:e2e
```

---

## ✅ 품질 게이트 기준

### 🎯 테스트 통과 기준
- [ ] **단위 테스트**: 100% 통과
- [ ] **통합 테스트**: 100% 통과
- [ ] **E2E 테스트**: 100% 통과
- [ ] **코드 커버리지**: 80% 이상
- [ ] **성능 테스트**: 요구사항 충족 (로딩 < 3초, 전환 < 1초)
- [ ] **접근성 테스트**: axe 위반 사항 0개

### 🚨 차단 기준
- Critical/High 우선순위 테스트 실패
- 코드 커버리지 80% 미달
- 접근성 Critical 위반 사항 존재
- 성능 요구사항 50% 이상 초과

---

## 📋 테스트 체크리스트

### 🔍 개발 단계별 체크리스트

#### Phase 1: 프로젝트 설정 (3.5시간)
- [ ] Vitest 설정 및 기본 테스트 실행
- [ ] React Testing Library 설정
- [ ] Playwright 설정 및 기본 E2E 테스트
- [ ] 커버리지 리포팅 설정

#### Phase 2: 컴포넌트 개발 (6시간)
- [ ] Button 컴포넌트 + 테스트
- [ ] Modal 컴포넌트 + 테스트
- [ ] Input 컴포넌트 + 테스트
- [ ] Loading 컴포넌트 + 테스트

#### Phase 3: 레이아웃 개발 (4.5시간)
- [ ] Header 컴포넌트 + 테스트
- [ ] Sidebar 컴포넌트 + 테스트
- [ ] MainLayout 컴포넌트 + 테스트
- [ ] 반응형 E2E 테스트

#### Phase 4: 상태 관리 (2시간)
- [ ] useAuth 훅 + 테스트
- [ ] Zustand 스토어 + 테스트
- [ ] TanStack Query 설정 + 테스트
- [ ] 통합 테스트

### 🎯 최종 검증 체크리스트
- [ ] 모든 단위 테스트 통과
- [ ] 코드 커버리지 80% 달성
- [ ] E2E 시나리오 100% 통과
- [ ] 성능 요구사항 충족
- [ ] 접근성 기준 준수
- [ ] 크로스 브라우저 호환성 확인

이 테스트 전략은 Issue #12의 모든 구현 기능에 대해 체계적이고 포괄적인 품질 보증을 제공하며, 80% 이상의 코드 커버리지 목표 달성을 지원합니다.