// src/test/utils/test-utils.tsx
import React, { ReactElement } from 'react';
import { render, RenderOptions } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { vi } from 'vitest';

/**
 * 테스트용 QueryClient 생성 함수
 */
export const createTestQueryClient = () => {
  return new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        cacheTime: 0,
        staleTime: 0,
      },
      mutations: {
        retry: false,
      },
    },
    logger: {
      log: console.log,
      warn: console.warn,
      error: () => {}, // 테스트에서 에러 로그 무시
    },
  });
};

/**
 * 모든 Provider로 감싸는 래퍼 컴포넌트
 */
interface AllTheProvidersProps {
  children: React.ReactNode;
  queryClient?: QueryClient;
  initialEntries?: string[];
}

const AllTheProviders = ({
  children,
  queryClient = createTestQueryClient(),
  initialEntries = ['/']
}: AllTheProvidersProps) => {
  return (
    <BrowserRouter>
      <QueryClientProvider client={queryClient}>
        {children}
      </QueryClientProvider>
    </BrowserRouter>
  );
};

/**
 * 커스텀 render 함수
 */
interface CustomRenderOptions extends Omit<RenderOptions, 'wrapper'> {
  queryClient?: QueryClient;
  initialEntries?: string[];
}

const customRender = (
  ui: ReactElement,
  {
    queryClient,
    initialEntries,
    ...renderOptions
  }: CustomRenderOptions = {}
) => {
  const Wrapper = ({ children }: { children: React.ReactNode }) => (
    <AllTheProviders queryClient={queryClient} initialEntries={initialEntries}>
      {children}
    </AllTheProviders>
  );

  return render(ui, { wrapper: Wrapper, ...renderOptions });
};

/**
 * Router만 사용하는 간단한 render 함수
 */
export const renderWithRouter = (
  ui: ReactElement,
  { initialEntries = ['/'] } = {}
) => {
  const Wrapper = ({ children }: { children: React.ReactNode }) => (
    <BrowserRouter>{children}</BrowserRouter>
  );

  return render(ui, { wrapper: Wrapper });
};

/**
 * QueryClient만 사용하는 render 함수
 */
export const renderWithQueryClient = (
  ui: ReactElement,
  queryClient = createTestQueryClient()
) => {
  const Wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );

  return render(ui, { wrapper: Wrapper });
};

/**
 * Mock 함수들
 */
export const mockAuthUser = {
  id: 1,
  name: '김테스트',
  email: 'test@example.com',
  role: 'member'
};

export const mockTeam = {
  id: 1,
  name: '개발팀',
  inviteCode: 'DEV123',
  memberCount: 5
};

export const mockSchedule = {
  id: 1,
  title: '팀 미팅',
  description: '주간 팀 미팅',
  startTime: '2024-03-15T09:00:00Z',
  endTime: '2024-03-15T10:00:00Z',
  teamId: 1,
  createdBy: 1
};

/**
 * localStorage 모킹 헬퍼
 */
export const mockLocalStorage = () => {
  const store: Record<string, string> = {};

  return {
    getItem: vi.fn((key: string) => store[key] || null),
    setItem: vi.fn((key: string, value: string) => {
      store[key] = String(value);
    }),
    removeItem: vi.fn((key: string) => {
      delete store[key];
    }),
    clear: vi.fn(() => {
      Object.keys(store).forEach(key => delete store[key]);
    }),
  };
};

/**
 * 지연된 Promise 생성 헬퍼
 */
export const createDelayedPromise = <T>(value: T, delay = 100): Promise<T> => {
  return new Promise(resolve => {
    setTimeout(() => resolve(value), delay);
  });
};

/**
 * 에러 Promise 생성 헬퍼
 */
export const createRejectedPromise = (error: string, delay = 100): Promise<never> => {
  return new Promise((_, reject) => {
    setTimeout(() => reject(new Error(error)), delay);
  });
};

/**
 * 폼 이벤트 헬퍼
 */
export const createFormEvent = (formData: Record<string, string>) => {
  const form = document.createElement('form');
  Object.entries(formData).forEach(([key, value]) => {
    const input = document.createElement('input');
    input.name = key;
    input.value = value;
    form.appendChild(input);
  });

  return {
    preventDefault: vi.fn(),
    target: form,
    currentTarget: form
  };
};

/**
 * 이벤트 헬퍼
 */
export const createEvent = (type: string, eventInit: Partial<Event> = {}) => {
  return new Event(type, { bubbles: true, cancelable: true, ...eventInit });
};

// re-export everything
export * from '@testing-library/react';

// override render method
export { customRender as render };