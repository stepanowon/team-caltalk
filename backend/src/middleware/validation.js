const { body, param, query, validationResult } = require('express-validator');
const logger = require('../config/logger');
const config = require('../config/environment');

/**
 * 검증 오류 처리 미들웨어
 */
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);

  if (!errors.isEmpty()) {
    const errorDetails = errors.array().map(error => ({
      field: error.path,
      message: error.msg,
      value: error.value,
    }));

    logger.warn('입력 검증 오류:', {
      path: req.path,
      method: req.method,
      errors: errorDetails,
      userId: req.user?.id,
    });

    return res.status(400).json({
      success: false,
      error: '입력 데이터가 올바르지 않습니다',
      code: 'VALIDATION_ERROR',
      details: errorDetails,
    });
  }

  next();
};

/**
 * 사용자 등록 검증 규칙
 */
const validateUserRegistration = [
  body('email')
    .isEmail()
    .withMessage('올바른 이메일 형식이 아닙니다')
    .isLength({ max: 255 })
    .withMessage('이메일은 255자를 초과할 수 없습니다')
    .normalizeEmail(),

  body('name')
    .trim()
    .isLength({ min: config.business.minUserNameLength, max: config.business.maxUserNameLength })
    .withMessage(`이름은 ${config.business.minUserNameLength}-${config.business.maxUserNameLength}자여야 합니다`)
    .matches(/^[가-힣a-zA-Z0-9\s]+$/)
    .withMessage('이름에는 한글, 영문, 숫자, 공백만 사용할 수 있습니다'),

  body('password')
    .isLength({ min: 8, max: 100 })
    .withMessage('비밀번호는 8-100자여야 합니다')
    .matches(/^(?=.*[a-zA-Z])(?=.*[0-9!@#$%^&*(),.?":{}|<>]).*$/)
    .withMessage('비밀번호는 영문, 숫자 또는 특수문자를 포함해야 합니다'),

  handleValidationErrors,
];

/**
 * 사용자 로그인 검증 규칙
 */
const validateUserLogin = [
  body('email')
    .isEmail()
    .withMessage('올바른 이메일 형식이 아닙니다')
    .normalizeEmail(),

  body('password')
    .notEmpty()
    .withMessage('비밀번호를 입력해주세요'),

  handleValidationErrors,
];

/**
 * 비밀번호 변경 검증 규칙
 */
const validatePasswordChange = [
  body('currentPassword')
    .notEmpty()
    .withMessage('현재 비밀번호를 입력해주세요'),

  body('newPassword')
    .isLength({ min: 8, max: 100 })
    .withMessage('새 비밀번호는 8-100자여야 합니다')
    .matches(/^(?=.*[a-zA-Z])(?=.*[0-9!@#$%^&*(),.?":{}|<>]).*$/)
    .withMessage('새 비밀번호는 영문, 숫자 또는 특수문자를 포함해야 합니다'),

  handleValidationErrors,
];

/**
 * 사용자 프로필 업데이트 검증 규칙
 */
const validateUserProfileUpdate = [
  body('name')
    .optional()
    .trim()
    .isLength({ min: config.business.minUserNameLength, max: config.business.maxUserNameLength })
    .withMessage(`이름은 ${config.business.minUserNameLength}-${config.business.maxUserNameLength}자여야 합니다`)
    .matches(/^[가-힣a-zA-Z0-9\s]+$/)
    .withMessage('이름에는 한글, 영문, 숫자, 공백만 사용할 수 있습니다'),

  body('email')
    .optional()
    .isEmail()
    .withMessage('올바른 이메일 형식이 아닙니다')
    .isLength({ max: 255 })
    .withMessage('이메일은 255자를 초과할 수 없습니다')
    .normalizeEmail(),

  handleValidationErrors,
];

/**
 * 팀 생성 검증 규칙
 */
const validateTeamCreation = [
  body('name')
    .trim()
    .isLength({ min: config.business.minTeamNameLength, max: config.business.maxTeamNameLength })
    .withMessage(`팀 이름은 ${config.business.minTeamNameLength}-${config.business.maxTeamNameLength}자여야 합니다`)
    .matches(/^[가-힣a-zA-Z0-9\s\-_()]+$/)
    .withMessage('팀 이름에는 한글, 영문, 숫자, 공백, 하이픈, 언더스코어, 괄호만 사용할 수 있습니다'),

  body('description')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('팀 설명은 500자를 초과할 수 없습니다'),

  handleValidationErrors,
];

/**
 * 팀 업데이트 검증 규칙
 */
const validateTeamUpdate = [
  body('name')
    .optional()
    .trim()
    .isLength({ min: config.business.minTeamNameLength, max: config.business.maxTeamNameLength })
    .withMessage(`팀 이름은 ${config.business.minTeamNameLength}-${config.business.maxTeamNameLength}자여야 합니다`)
    .matches(/^[가-힣a-zA-Z0-9\s\-_()]+$/)
    .withMessage('팀 이름에는 한글, 영문, 숫자, 공백, 하이픈, 언더스코어, 괄호만 사용할 수 있습니다'),

  body('description')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('팀 설명은 500자를 초과할 수 없습니다'),

  handleValidationErrors,
];

/**
 * 일정 생성 검증 규칙
 */
const validateScheduleCreation = [
  body('title')
    .trim()
    .isLength({ min: 2, max: config.business.maxScheduleTitle })
    .withMessage(`일정 제목은 2-${config.business.maxScheduleTitle}자여야 합니다`),

  body('content')
    .optional()
    .trim()
    .isLength({ max: config.business.maxScheduleContent })
    .withMessage(`일정 내용은 ${config.business.maxScheduleContent}자를 초과할 수 없습니다`),

  body('startDatetime')
    .isISO8601()
    .withMessage('올바른 시작 시간 형식이 아닙니다')
    .toDate(),

  body('endDatetime')
    .isISO8601()
    .withMessage('올바른 종료 시간 형식이 아닙니다')
    .toDate()
    .custom((endDatetime, { req }) => {
      const startDatetime = new Date(req.body.startDatetime);
      const endDate = new Date(endDatetime);

      if (endDate <= startDatetime) {
        throw new Error('종료 시간은 시작 시간보다 늦어야 합니다');
      }

      const maxDuration = config.business.maxScheduleDuration;
      if (endDate.getTime() - startDatetime.getTime() > maxDuration) {
        throw new Error('일정 기간은 최대 7일을 초과할 수 없습니다');
      }

      return true;
    }),

  body('scheduleType')
    .isIn(['personal', 'team'])
    .withMessage('일정 유형은 personal 또는 team이어야 합니다'),

  body('teamId')
    .optional()
    .isInt({ min: 1 })
    .withMessage('팀 ID는 양의 정수여야 합니다')
    .toInt(),

  body('participants')
    .optional()
    .isArray()
    .withMessage('참가자는 배열 형태여야 합니다')
    .custom((participants) => {
      if (participants.some(id => !Number.isInteger(id) || id < 1)) {
        throw new Error('참가자 ID는 양의 정수여야 합니다');
      }
      return true;
    }),

  handleValidationErrors,
];

/**
 * 메시지 생성 검증 규칙
 */
const validateMessageCreation = [
  body('content')
    .trim()
    .isLength({ min: 1, max: config.business.maxMessageLength })
    .withMessage(`메시지 내용은 1-${config.business.maxMessageLength}자여야 합니다`),

  body('messageDate')
    .isISO8601()
    .withMessage('올바른 날짜 형식이 아닙니다')
    .toDate(),

  handleValidationErrors,
];

/**
 * ID 파라미터 검증 규칙
 */
const validateId = (paramName = 'id') => [
  param(paramName)
    .isInt({ min: 1 })
    .withMessage(`${paramName}는 양의 정수여야 합니다`)
    .toInt(),

  handleValidationErrors,
];

/**
 * 초대 코드 검증 규칙
 */
const validateInviteCode = [
  body('inviteCode')
    .isLength({ min: config.business.inviteCodeLength, max: config.business.inviteCodeLength })
    .withMessage(`초대 코드는 ${config.business.inviteCodeLength}자여야 합니다`)
    .matches(/^[A-Z0-9]+$/)
    .withMessage('초대 코드는 영문 대문자와 숫자만 포함할 수 있습니다'),

  handleValidationErrors,
];

/**
 * 페이지네이션 검증 규칙
 */
const validatePagination = [
  query('page')
    .optional()
    .isInt({ min: 1, max: 1000 })
    .withMessage('페이지는 1-1000 범위의 정수여야 합니다')
    .toInt(),

  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('제한 개수는 1-100 범위의 정수여야 합니다')
    .toInt(),

  handleValidationErrors,
];

/**
 * 날짜 범위 검증 규칙
 */
const validateDateRange = [
  query('startDate')
    .optional()
    .isISO8601()
    .withMessage('올바른 시작 날짜 형식이 아닙니다')
    .toDate(),

  query('endDate')
    .optional()
    .isISO8601()
    .withMessage('올바른 종료 날짜 형식이 아닙니다')
    .toDate()
    .custom((endDate, { req }) => {
      if (req.query.startDate) {
        const startDate = new Date(req.query.startDate);
        if (endDate <= startDate) {
          throw new Error('종료 날짜는 시작 날짜보다 늦어야 합니다');
        }
      }
      return true;
    }),

  handleValidationErrors,
];

/**
 * Refresh Token 검증 규칙
 */
const validateRefreshToken = [
  body('refreshToken')
    .notEmpty()
    .withMessage('Refresh Token이 필요합니다')
    .isJWT()
    .withMessage('올바른 JWT 토큰 형식이 아닙니다'),

  handleValidationErrors,
];

module.exports = {
  handleValidationErrors,
  validateUserRegistration,
  validateUserLogin,
  validatePasswordChange,
  validateUserProfileUpdate,
  validateTeamCreation,
  validateTeamUpdate,
  validateScheduleCreation,
  validateMessageCreation,
  validateId,
  validateInviteCode,
  validatePagination,
  validateDateRange,
  validateRefreshToken,
};