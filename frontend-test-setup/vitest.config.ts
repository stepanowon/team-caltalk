// vitest.config.ts
/// <reference types="vitest" />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    css: true,
    coverage: {
      provider: 'c8',
      reporter: ['text', 'json', 'html', 'lcov'],
      reportsDirectory: './coverage',
      exclude: [
        'node_modules/',
        'src/test/',
        '**/*.d.ts',
        '**/*.config.*',
        '**/index.ts',
        '**/*.stories.*',
        '**/vite.config.*',
        'dist/',
        'build/',
        'public/'
      ],
      include: ['src/**/*.{ts,tsx}'],
      // 커버리지 임계값 설정
      thresholds: {
        global: {
          statements: 80,
          branches: 75,
          functions: 80,
          lines: 80
        },
        // 중요한 모듈에 대한 더 높은 임계값
        'src/stores/': {
          statements: 95,
          branches: 90,
          functions: 95,
          lines: 95
        },
        'src/services/': {
          statements: 90,
          branches: 85,
          functions: 90,
          lines: 90
        },
        'src/utils/': {
          statements: 90,
          branches: 85,
          functions: 90,
          lines: 90
        }
      }
    },
    // 테스트 매처 설정
    testTimeout: 10000,
    hookTimeout: 10000,
    // 병렬 실행 설정
    threads: true,
    maxThreads: 4,
    minThreads: 1,
    // 파일 패턴
    include: [
      'src/**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}'
    ],
    exclude: [
      'node_modules/',
      'dist/',
      '.idea/',
      '.git/',
      '.cache/'
    ]
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, './src'),
      '@components': resolve(__dirname, './src/components'),
      '@pages': resolve(__dirname, './src/pages'),
      '@hooks': resolve(__dirname, './src/hooks'),
      '@stores': resolve(__dirname, './src/stores'),
      '@services': resolve(__dirname, './src/services'),
      '@utils': resolve(__dirname, './src/utils'),
      '@types': resolve(__dirname, './src/types')
    }
  }
});