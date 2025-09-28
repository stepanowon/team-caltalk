// src/test/mocks/browser.ts
import { setupWorker } from 'msw';
import { handlers } from './handlers';

// 브라우저 환경용 MSW 워커 설정
export const worker = setupWorker(...handlers);

// 개발 모드에서만 MSW 활성화
if (process.env.NODE_ENV === 'development') {
  worker.start({
    onUnhandledRequest: 'warn',
    serviceWorker: {
      url: '/mockServiceWorker.js',
    },
  });
}