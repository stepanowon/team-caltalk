// src/test/mocks/server.ts
import { setupServer } from 'msw/node';
import { handlers } from './handlers';

// Node.js 환경(테스트)용 MSW 서버 설정
export const server = setupServer(...handlers);

// 테스트 환경에서 서버 설정
beforeAll(() => {
  server.listen({
    onUnhandledRequest: 'error',
  });
});

afterEach(() => {
  server.resetHandlers();
});

afterAll(() => {
  server.close();
});