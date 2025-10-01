const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const compression = require('compression');
require('express-async-errors');

const config = require('./config/environment');
const logger = require('./config/logger');
const db = require('./config/database');
const { specs, swaggerUi, swaggerUiOptions } = require('./config/swagger');

const {
  securityHeaders,
  corsOptions,
  requestLogger,
  suspiciousActivityDetector,
  requestSizeLimit,
} = require('./middleware/security');

// 라우터 임포트
const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/users');
const teamRoutes = require('./routes/teams');
const scheduleRoutes = require('./routes/schedules');
const chatRoutes = require('./routes/chat');
const pollRoutes = require('./routes/poll');
const activitiesRoutes = require('./routes/activities');

/**
 * Express 애플리케이션 생성 및 설정
 */
const createApp = async () => {
  const app = express();

  // 기본 미들웨어 설정
  app.set('trust proxy', 1); // Reverse proxy 신뢰 설정

  // 보안 헤더 설정
  app.use(securityHeaders);

  // CORS 설정
  app.use(cors(corsOptions));

  // 요청 크기 제한
  app.use(requestSizeLimit);

  // Body 파서 설정
  app.use(express.json({ limit: config.performance.maxPayloadSize }));
  app.use(express.urlencoded({ extended: true, limit: config.performance.maxPayloadSize }));

  // 압축 설정
  app.use(compression({
    threshold: config.performance.compressionThreshold,
    level: 6,
    memLevel: 8,
  }));

  // HTTP 요청 로깅 (개발환경에서만 콘솔 출력)
  if (config.app.env === 'development') {
    app.use(morgan('dev'));
  }

  // 커스텀 요청 로거
  app.use(requestLogger);

  // 의심스러운 활동 감지
  app.use(suspiciousActivityDetector);

  // 헬스 체크 엔드포인트
  app.get('/health', (req, res) => {
    const healthStatus = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      environment: config.app.env,
      version: config.app.version,
      database: db.getPoolStatus(),
    };

    res.json(healthStatus);
  });

  // Swagger API 문서 엔드포인트
  if (config.api.documentation.enabled) {
    app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(specs, swaggerUiOptions));

    // Swagger JSON 스펙 제공
    app.get('/api/docs.json', (req, res) => {
      res.setHeader('Content-Type', 'application/json');
      res.send(specs);
    });

    logger.info(`Swagger UI 문서가 활성화되었습니다: http://${config.app.host}:${config.app.port}/api/docs`);
  }

  // API 정보 엔드포인트
  app.get('/api', (req, res) => {
    res.json({
      name: config.app.name,
      version: config.app.version,
      environment: config.app.env,
      apiVersion: config.api.version,
      documentation: config.api.documentation.enabled ? {
        swagger: '/api/docs',
        json: '/api/docs.json'
      } : null,
      endpoints: {
        auth: '/api/auth',
        users: '/api/users',
        teams: '/api/teams',
        schedules: '/api/schedules',
        chat: '/api/chat',
        poll: '/api/poll',
        activities: '/api/activities',
        health: '/health',
      },
    });
  });

  // API 라우터 등록
  app.use('/api/auth', authRoutes);
  app.use('/api/users', userRoutes);
  app.use('/api/teams', teamRoutes);
  app.use('/api/schedules', scheduleRoutes);
  app.use('/api/chat', chatRoutes);
  app.use('/api/poll', pollRoutes);
  app.use('/api/activities', activitiesRoutes);

  // 404 처리
  app.use('*', (req, res) => {
    logger.warn('404 요청:', {
      method: req.method,
      url: req.originalUrl,
      ip: req.ip,
      userAgent: req.get('User-Agent'),
    });

    res.status(404).json({
      success: false,
      error: '요청한 리소스를 찾을 수 없습니다',
      code: 'NOT_FOUND',
      path: req.originalUrl,
    });
  });

  // 글로벌 에러 핸들러
  app.use((error, req, res, next) => {
    logger.error('애플리케이션 오류:', {
      error: error.message,
      stack: error.stack,
      method: req.method,
      url: req.originalUrl,
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      userId: req.user?.id,
    });

    // 개발 환경에서는 스택 트레이스 포함
    const errorResponse = {
      success: false,
      error: config.app.env === 'production'
        ? '서버 내부 오류가 발생했습니다'
        : error.message,
      code: 'INTERNAL_SERVER_ERROR',
    };

    if (config.app.env === 'development') {
      errorResponse.stack = error.stack;
    }

    res.status(500).json(errorResponse);
  });

  return app;
};

/**
 * 데이터베이스 연결 및 애플리케이션 초기화
 */
const initializeApp = async () => {
  try {
    // 데이터베이스 연결 초기화
    await db.initialize();
    logger.info('데이터베이스 연결 완료');

    // Express 앱 생성
    const app = await createApp();
    logger.info('Express 애플리케이션 초기화 완료');

    return app;
  } catch (error) {
    logger.error('애플리케이션 초기화 실패:', error);
    throw error;
  }
};

/**
 * 애플리케이션 종료 처리
 */
const gracefulShutdown = async (signal) => {
  logger.info(`${signal} 신호 수신, 애플리케이션 종료 시작`);

  try {
    // 데이터베이스 연결 종료
    await db.close();
    logger.info('데이터베이스 연결 종료 완료');

    logger.info('애플리케이션이 정상적으로 종료되었습니다');
    process.exit(0);
  } catch (error) {
    logger.error('애플리케이션 종료 중 오류:', error);
    process.exit(1);
  }
};

// 프로세스 신호 처리
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// 처리되지 않은 Promise rejection 처리
process.on('unhandledRejection', (reason, promise) => {
  logger.error('처리되지 않은 Promise rejection:', {
    reason,
    promise,
  });
});

// 처리되지 않은 예외 처리
process.on('uncaughtException', (error) => {
  logger.error('처리되지 않은 예외:', error);
  process.exit(1);
});

module.exports = {
  createApp,
  initializeApp,
  gracefulShutdown,
};