const rateLimit = require('express-rate-limit');
const helmet = require('helmet');
const config = require('../config/environment');
const logger = require('../config/logger');

/**
 * 기본 Rate Limiting 설정
 */
const createRateLimiter = (options = {}) => {
  const defaultOptions = {
    windowMs: config.rateLimit.windowMs,
    max: config.rateLimit.maxRequests,
    message: {
      success: false,
      error: '너무 많은 요청이 발생했습니다. 잠시 후 다시 시도해주세요.',
      code: 'RATE_LIMIT_EXCEEDED',
    },
    standardHeaders: true,
    legacyHeaders: false,
    handler: (req, res) => {
      logger.audit('RATE_LIMIT_EXCEEDED', {
        ip: req.ip,
        userAgent: req.get('User-Agent'),
        path: req.path,
        method: req.method,
        userId: req.user?.id,
      });

      res.status(429).json(options.message || defaultOptions.message);
    },
    keyGenerator: (req) => {
      // 인증된 사용자는 사용자 ID 기준, 미인증은 IP 기준
      return req.user ? `user:${req.user.id}` : `ip:${req.ip}`;
    },
  };

  return rateLimit({
    ...defaultOptions,
    ...options,
  });
};

/**
 * 일반 API용 Rate Limiter (15분에 100회)
 */
const generalRateLimit = createRateLimiter({
  max: config.rateLimit.standardLimitRequests,
});

/**
 * 인증 API용 Rate Limiter (15분에 10회)
 */
const authRateLimit = createRateLimiter({
  max: config.rateLimit.authLimitRequests,
  message: {
    success: false,
    error: '로그인 시도가 너무 많습니다. 15분 후 다시 시도해주세요.',
    code: 'AUTH_RATE_LIMIT_EXCEEDED',
  },
});

/**
 * 메시지 API용 Rate Limiter (15분에 200회)
 */
const messageRateLimit = createRateLimiter({
  max: config.rateLimit.messageLimitRequests,
  message: {
    success: false,
    error: '메시지 전송이 너무 빠릅니다. 잠시 후 다시 시도해주세요.',
    code: 'MESSAGE_RATE_LIMIT_EXCEEDED',
  },
});

/**
 * 엄격한 Rate Limiter (보안이 중요한 엔드포인트용)
 */
const strictRateLimit = createRateLimiter({
  windowMs: 60 * 60 * 1000, // 1시간
  max: 5,
  message: {
    success: false,
    error: '보안상 제한된 요청입니다. 1시간 후 다시 시도해주세요.',
    code: 'STRICT_RATE_LIMIT_EXCEEDED',
  },
});

/**
 * Helmet 보안 설정
 */
const securityHeaders = helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'"],
      fontSrc: ["'self'"],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'"],
      frameSrc: ["'none'"],
    },
  },
  crossOriginEmbedderPolicy: false, // WebSocket 지원을 위해 비활성화
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true,
  },
});

/**
 * CORS 설정을 위한 미들웨어
 */
const corsOptions = {
  origin: (origin, callback) => {
    // 개발 환경에서는 모든 origin 허용
    if (config.app.env === 'development') {
      return callback(null, true);
    }

    // 허용된 origin 목록 정규화 (공백 제거)
    const allowedOrigins = config.cors.origin.map(o => o.trim());

    logger.info('[CORS] Request Origin:', origin, 'Allowed Origins:', allowedOrigins);

    // origin이 없거나(Postman 등) 허용된 목록에 포함되면 허용
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      logger.audit('CORS_VIOLATION', {
        origin,
        allowedOrigins,
        timestamp: new Date().toISOString(),
      });
      callback(new Error('CORS 정책에 의해 차단되었습니다'));
    }
  },
  credentials: config.cors.credentials,
  methods: config.cors.methods,
  allowedHeaders: config.cors.allowedHeaders,
  exposedHeaders: config.cors.exposedHeaders,
  optionsSuccessStatus: 200,
};

/**
 * 요청 로깅 미들웨어
 */
const requestLogger = (req, res, next) => {
  const startTime = Date.now();

  // 응답 완료 시 로깅
  res.on('finish', () => {
    const duration = Date.now() - startTime;

    logger.api(req, res, duration);

    // 보안 이벤트 감지
    if (res.statusCode === 401 || res.statusCode === 403) {
      logger.audit('SECURITY_EVENT', {
        type: res.statusCode === 401 ? 'UNAUTHORIZED_ACCESS' : 'FORBIDDEN_ACCESS',
        ip: req.ip,
        userAgent: req.get('User-Agent'),
        path: req.path,
        method: req.method,
        userId: req.user?.id,
      });
    }
  });

  next();
};

/**
 * IP 검증 미들웨어 (필요시 사용)
 */
const validateIP = (req, res, next) => {
  const clientIP = req.ip || req.connection.remoteAddress;

  // 개발 환경에서는 모든 IP 허용
  if (config.app.env === 'development') {
    return next();
  }

  // IP 차단 목록 확인 (실제 구현에서는 Redis나 DB에서 관리)
  const blockedIPs = [
    // 차단할 IP 목록
  ];

  if (blockedIPs.includes(clientIP)) {
    logger.audit('BLOCKED_IP_ACCESS', {
      ip: clientIP,
      userAgent: req.get('User-Agent'),
      path: req.path,
      method: req.method,
    });

    return res.status(403).json({
      success: false,
      error: '접근이 차단된 IP입니다',
      code: 'IP_BLOCKED',
    });
  }

  next();
};

/**
 * 요청 크기 제한 미들웨어
 */
const requestSizeLimit = (req, res, next) => {
  const contentLength = parseInt(req.get('Content-Length') || '0');
  const maxSize = 10 * 1024 * 1024; // 10MB

  if (contentLength > maxSize) {
    logger.audit('REQUEST_SIZE_EXCEEDED', {
      contentLength,
      maxSize,
      ip: req.ip,
      path: req.path,
      userId: req.user?.id,
    });

    return res.status(413).json({
      success: false,
      error: '요청 크기가 너무 큽니다',
      code: 'REQUEST_TOO_LARGE',
    });
  }

  next();
};

/**
 * 의심스러운 활동 감지 미들웨어
 */
const suspiciousActivityDetector = (req, res, next) => {
  const userAgent = req.get('User-Agent') || '';
  const path = req.path;

  // 봇이나 스크래퍼 감지
  const suspiciousBots = [
    'curl', 'wget', 'python-requests', 'scanner', 'bot',
    'crawler', 'spider', 'scraper'
  ];

  const isSuspiciousBot = suspiciousBots.some(bot =>
    userAgent.toLowerCase().includes(bot)
  );

  // 의심스러운 경로 패턴
  const suspiciousPaths = [
    '/admin', '/.env', '/config', '/backup',
    '/wp-admin', '/phpmyadmin', '/.git'
  ];

  const isSuspiciousPath = suspiciousPaths.some(pattern =>
    path.toLowerCase().includes(pattern)
  );

  if (isSuspiciousBot || isSuspiciousPath) {
    logger.audit('SUSPICIOUS_ACTIVITY', {
      type: isSuspiciousBot ? 'SUSPICIOUS_BOT' : 'SUSPICIOUS_PATH',
      ip: req.ip,
      userAgent,
      path,
      method: req.method,
    });

    // 의심스러운 활동은 차단하지 않고 로깅만 수행
    // 필요시 차단 로직 추가 가능
  }

  next();
};

/**
 * API 키 검증 미들웨어 (향후 사용 가능)
 */
const validateApiKey = (req, res, next) => {
  const apiKey = req.get('X-API-Key');

  if (!apiKey) {
    return res.status(401).json({
      success: false,
      error: 'API 키가 필요합니다',
      code: 'API_KEY_REQUIRED',
    });
  }

  // API 키 검증 로직 (실제로는 DB에서 확인)
  const validApiKeys = [
    // 유효한 API 키 목록
  ];

  if (!validApiKeys.includes(apiKey)) {
    logger.audit('INVALID_API_KEY', {
      apiKey: apiKey.substring(0, 8) + '...', // 일부만 로깅
      ip: req.ip,
      userAgent: req.get('User-Agent'),
    });

    return res.status(401).json({
      success: false,
      error: '유효하지 않은 API 키입니다',
      code: 'INVALID_API_KEY',
    });
  }

  next();
};

module.exports = {
  generalRateLimit,
  authRateLimit,
  messageRateLimit,
  strictRateLimit,
  securityHeaders,
  corsOptions,
  requestLogger,
  validateIP,
  requestSizeLimit,
  suspiciousActivityDetector,
  validateApiKey,
};