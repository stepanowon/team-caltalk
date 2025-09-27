module.exports = {
  // 테스트 환경 설정
  testEnvironment: 'node',

  // 루트 디렉토리
  rootDir: '../',

  // 테스트 파일 패턴
  testMatch: [
    '<rootDir>/tests/**/*.test.js',
    '<rootDir>/tests/**/*.spec.js'
  ],

  // 테스트 설정 파일
  setupFilesAfterEnv: ['<rootDir>/tests/test-setup.js'],

  // 커버리지 설정
  collectCoverage: true,
  collectCoverageFrom: [
    'src/**/*.js',
    '!src/server.js', // 서버 시작 파일 제외
    '!src/config/*.js', // 설정 파일 제외
    '!**/node_modules/**',
    '!**/tests/**'
  ],
  coverageDirectory: '<rootDir>/coverage',
  coverageReporters: ['text', 'lcov', 'html'],
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80
    }
  },

  // 모듈 이름 매핑
  moduleNameMapping: {
    '^@/(.*)$': '<rootDir>/src/$1',
    '^@tests/(.*)$': '<rootDir>/tests/$1'
  },

  // 타임아웃 설정
  testTimeout: 10000,

  // 병렬 실행 설정
  maxWorkers: '50%',

  // 상세 출력
  verbose: true,

  // 테스트 결과 리포터
  reporters: [
    'default',
    ['jest-html-reporters', {
      publicPath: './coverage',
      filename: 'test-report.html',
      expand: true
    }]
  ],

  // 전역 변수
  globals: {
    'process.env.NODE_ENV': 'test'
  },

  // 캐시 비활성화 (DB 테스트 시 필요)
  cache: false,

  // 테스트 파일별 격리
  clearMocks: true,
  restoreMocks: true,
  resetMocks: true
};