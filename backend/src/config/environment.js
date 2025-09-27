require('dotenv').config();

/**
 * 환경 변수 설정 및 검증
 * 애플리케이션 전반에서 사용되는 설정값들을 중앙 관리
 */

// 필수 환경 변수 검증
const requiredEnvVars = [
  'DB_CONNECTION_STRING',
  'JWT_SECRET',
  'JWT_REFRESH_SECRET',
];

for (const envVar of requiredEnvVars) {
  if (!process.env[envVar]) {
    throw new Error(`필수 환경변수가 설정되지 않았습니다: ${envVar}`);
  }
}

const config = {
  // 애플리케이션 설정
  app: {
    name: 'Team CalTalk Backend',
    version: '1.0.0',
    env: process.env.NODE_ENV || 'development',
    port: parseInt(process.env.PORT) || 3000,
    host: process.env.HOST || 'localhost',
  },

  // 데이터베이스 설정
  database: {
    connectionString: process.env.DB_CONNECTION_STRING,
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT) || 5432,
    name: process.env.DB_NAME || 'team_caltalk',
    user: process.env.DB_USER || 'team_caltalk_user',
    password: process.env.DB_PASSWORD,
    pool: {
      min: parseInt(process.env.DB_POOL_MIN) || 2,
      max: parseInt(process.env.DB_POOL_MAX) || 20,
      idleTimeout: parseInt(process.env.DB_IDLE_TIMEOUT) || 10000,
      connectionTimeout: parseInt(process.env.DB_CONNECTION_TIMEOUT) || 2000,
    },
  },

  // JWT 설정
  jwt: {
    secret: process.env.JWT_SECRET,
    refreshSecret: process.env.JWT_REFRESH_SECRET,
    expiresIn: process.env.JWT_EXPIRE || '24h',
    refreshExpiresIn: process.env.JWT_REFRESH_EXPIRE || '7d',
    issuer: 'team-caltalk',
    audience: 'team-caltalk-users',
  },

  // 보안 설정
  security: {
    bcryptRounds: parseInt(process.env.BCRYPT_ROUNDS) || 12,
    sessionSecret: process.env.SESSION_SECRET || 'team-caltalk-session-secret',
    maxLoginAttempts: 5,
    lockoutDuration: 15 * 60 * 1000, // 15분
  },

  // Rate Limiting 설정
  rateLimit: {
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000, // 15분
    maxRequests: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100,
    standardLimitRequests: 100, // 일반 API
    authLimitRequests: 10, // 인증 API
    messageLimitRequests: 200, // 메시지 API
  },

  // CORS 설정
  cors: {
    origin: process.env.CORS_ORIGIN?.split(',') || ['http://localhost:3000', 'http://localhost:3001'],
    credentials: process.env.CORS_CREDENTIALS === 'true',
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
    exposedHeaders: ['X-Total-Count', 'X-Page-Count'],
  },

  // 로깅 설정
  logging: {
    level: process.env.LOG_LEVEL || 'info',
    file: process.env.LOG_FILE || 'logs/app.log',
    maxSize: '5m',
    maxFiles: 10,
  },

  // 비즈니스 규칙 설정
  business: {
    maxTeamMembers: 100,
    maxTeamsPerUser: 10,
    maxScheduleDuration: 7 * 24 * 60 * 60 * 1000, // 7일
    maxMessageLength: 500,
    maxScheduleTitle: 100,
    maxScheduleContent: 1000,
    maxUserNameLength: 30,
    minUserNameLength: 2,
    maxTeamNameLength: 30,
    minTeamNameLength: 2,
    inviteCodeLength: 10,
    scheduleReminderMinutes: [5, 15, 30, 60], // 알림 시간 옵션
  },

  // 성능 설정
  performance: {
    requestTimeout: 30000, // 30초
    slowQueryThreshold: 100, // 100ms
    maxPayloadSize: '10mb',
    compressionThreshold: 1024, // 1KB
  },

  // 기능 플래그
  features: {
    enableRealTimeMessaging: true,
    enableScheduleConflictDetection: true,
    enableAuditLogging: true,
    enablePerformanceMonitoring: true,
    enableAutoBackup: process.env.NODE_ENV === 'production',
  },

  // API 버전 설정
  api: {
    version: 'v1',
    prefix: '/api/v1',
    documentation: {
      enabled: process.env.NODE_ENV !== 'production',
      path: '/api/docs',
    },
  },
};

// 환경별 설정 오버라이드
if (config.app.env === 'test') {
  config.database.name = process.env.DB_TEST_NAME || 'team_caltalk_test';
  config.logging.level = 'error';
  config.rateLimit.maxRequests = 1000; // 테스트에서는 제한 완화
}

if (config.app.env === 'production') {
  config.logging.level = 'info';
  config.features.enableAutoBackup = true;
  // 프로덕션에서는 더 엄격한 보안 설정
  config.security.maxLoginAttempts = 3;
  config.rateLimit.maxRequests = 50;
}

// 설정 검증 함수
config.validate = () => {
  const errors = [];

  // JWT secret 길이 검증
  if (config.jwt.secret.length < 32) {
    errors.push('JWT_SECRET은 최소 32자 이상이어야 합니다');
  }

  // 포트 범위 검증
  if (config.app.port < 1000 || config.app.port > 65535) {
    errors.push('PORT는 1000-65535 범위여야 합니다');
  }

  // 데이터베이스 풀 설정 검증
  if (config.database.pool.min >= config.database.pool.max) {
    errors.push('DB_POOL_MIN은 DB_POOL_MAX보다 작아야 합니다');
  }

  if (errors.length > 0) {
    throw new Error(`설정 검증 오류:\n${errors.join('\n')}`);
  }

  return true;
};

// 설정 검증 실행
config.validate();

module.exports = config;