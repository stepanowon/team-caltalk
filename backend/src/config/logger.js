const winston = require('winston');
const path = require('path');

/**
 * Winston 로거 설정
 * 환경별 로그 레벨 및 포맷 설정
 */

// 로그 포맷 정의
const logFormat = winston.format.combine(
  winston.format.timestamp({
    format: 'YYYY-MM-DD HH:mm:ss.SSS',
  }),
  winston.format.errors({ stack: true }),
  winston.format.printf(({ timestamp, level, message, stack, ...meta }) => {
    let logMessage = `${timestamp} [${level.toUpperCase()}]: ${message}`;

    // 메타데이터가 있으면 추가
    if (Object.keys(meta).length > 0) {
      logMessage += ` ${JSON.stringify(meta, null, 2)}`;
    }

    // 스택 트레이스가 있으면 추가
    if (stack) {
      logMessage += `\n${stack}`;
    }

    return logMessage;
  })
);

// 개발환경용 콘솔 포맷
const consoleFormat = winston.format.combine(
  winston.format.colorize(),
  winston.format.timestamp({
    format: 'HH:mm:ss',
  }),
  winston.format.printf(({ timestamp, level, message, ...meta }) => {
    let logMessage = `${timestamp} ${level}: ${message}`;

    if (Object.keys(meta).length > 0) {
      logMessage += ` ${JSON.stringify(meta)}`;
    }

    return logMessage;
  })
);

// 트랜스포트 설정
const transports = [];

// 콘솔 출력 (개발환경)
if (process.env.NODE_ENV !== 'production') {
  transports.push(
    new winston.transports.Console({
      format: consoleFormat,
      level: process.env.LOG_LEVEL || 'info',
    })
  );
}

// 파일 출력 (모든 환경)
const logDir = path.join(__dirname, '../../logs');

// 일반 로그 파일
transports.push(
  new winston.transports.File({
    filename: path.join(logDir, 'app.log'),
    format: logFormat,
    level: process.env.LOG_LEVEL || 'info',
    maxsize: 5242880, // 5MB
    maxFiles: 10,
    tailable: true,
  })
);

// 에러 로그 파일
transports.push(
  new winston.transports.File({
    filename: path.join(logDir, 'error.log'),
    format: logFormat,
    level: 'error',
    maxsize: 5242880, // 5MB
    maxFiles: 5,
    tailable: true,
  })
);

// 감사 로그 파일 (보안 관련)
transports.push(
  new winston.transports.File({
    filename: path.join(logDir, 'audit.log'),
    format: logFormat,
    level: 'warn',
    maxsize: 5242880, // 5MB
    maxFiles: 10,
    tailable: true,
  })
);

// 로거 생성
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: logFormat,
  transports,
  // 예외 처리
  exceptionHandlers: [
    new winston.transports.File({
      filename: path.join(logDir, 'exceptions.log'),
      format: logFormat,
    }),
  ],
  // rejection 처리
  rejectionHandlers: [
    new winston.transports.File({
      filename: path.join(logDir, 'rejections.log'),
      format: logFormat,
    }),
  ],
  exitOnError: false,
});

/**
 * 보안 감사 로그
 * @param {string} action - 수행된 액션
 * @param {Object} details - 상세 정보
 */
logger.audit = (action, details = {}) => {
  logger.warn('AUDIT', {
    action,
    timestamp: new Date().toISOString(),
    ...details,
  });
};

/**
 * 성능 모니터링 로그
 * @param {string} operation - 작업명
 * @param {number} duration - 소요시간 (ms)
 * @param {Object} details - 상세 정보
 */
logger.performance = (operation, duration, details = {}) => {
  const level = duration > 1000 ? 'warn' : 'info';
  logger[level]('PERFORMANCE', {
    operation,
    duration: `${duration}ms`,
    ...details,
  });
};

/**
 * API 요청 로그
 * @param {Object} req - Express request 객체
 * @param {Object} res - Express response 객체
 * @param {number} duration - 응답 시간
 */
logger.api = (req, res, duration) => {
  const logData = {
    method: req.method,
    url: req.originalUrl || req.url,
    status: res.statusCode,
    duration: `${duration}ms`,
    ip: req.ip || req.connection.remoteAddress,
    userAgent: req.get('User-Agent'),
    userId: req.user?.id || 'anonymous',
  };

  // 에러 상태코드는 warning으로
  const level = res.statusCode >= 400 ? 'warn' : 'info';
  logger[level]('API_REQUEST', logData);
};

/**
 * 데이터베이스 쿼리 로그
 * @param {string} query - SQL 쿼리
 * @param {number} duration - 실행 시간
 * @param {number} rowCount - 영향받은 행 수
 */
logger.query = (query, duration, rowCount = 0) => {
  const level = duration > 100 ? 'warn' : 'debug';
  logger[level]('DB_QUERY', {
    query: query.substring(0, 200) + (query.length > 200 ? '...' : ''),
    duration: `${duration}ms`,
    rowCount,
  });
};

module.exports = logger;