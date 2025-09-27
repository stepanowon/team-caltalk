/**
 * API 응답 헬퍼 유틸리티
 * 일관된 응답 형식 제공
 */

/**
 * 성공 응답 생성
 * @param {Object} res - Express response 객체
 * @param {Object} data - 응답 데이터
 * @param {string} message - 성공 메시지
 * @param {number} statusCode - HTTP 상태 코드
 */
const success = (res, data = null, message = 'Success', statusCode = 200) => {
  const response = {
    success: true,
    message,
  };

  if (data !== null) {
    response.data = data;
  }

  return res.status(statusCode).json(response);
};

/**
 * 에러 응답 생성
 * @param {Object} res - Express response 객체
 * @param {string} error - 에러 메시지
 * @param {string} code - 에러 코드
 * @param {number} statusCode - HTTP 상태 코드
 * @param {Object} details - 추가 상세 정보
 */
const error = (res, error = 'Internal Server Error', code = 'INTERNAL_ERROR', statusCode = 500, details = null) => {
  const response = {
    success: false,
    error,
    code,
  };

  if (details !== null) {
    response.details = details;
  }

  return res.status(statusCode).json(response);
};

/**
 * 페이지네이션 응답 생성
 * @param {Object} res - Express response 객체
 * @param {Array} items - 데이터 배열
 * @param {Object} pagination - 페이지네이션 정보
 * @param {string} message - 성공 메시지
 */
const paginated = (res, items, pagination, message = 'Success') => {
  return res.json({
    success: true,
    message,
    data: {
      items,
      pagination: {
        page: pagination.page,
        limit: pagination.limit,
        total: pagination.total,
        pages: Math.ceil(pagination.total / pagination.limit),
        hasNext: pagination.page < Math.ceil(pagination.total / pagination.limit),
        hasPrev: pagination.page > 1,
      },
    },
  });
};

/**
 * 생성 성공 응답
 * @param {Object} res - Express response 객체
 * @param {Object} data - 생성된 데이터
 * @param {string} message - 성공 메시지
 */
const created = (res, data, message = 'Created successfully') => {
  return success(res, data, message, 201);
};

/**
 * 업데이트 성공 응답
 * @param {Object} res - Express response 객체
 * @param {Object} data - 업데이트된 데이터
 * @param {string} message - 성공 메시지
 */
const updated = (res, data, message = 'Updated successfully') => {
  return success(res, data, message, 200);
};

/**
 * 삭제 성공 응답
 * @param {Object} res - Express response 객체
 * @param {string} message - 성공 메시지
 */
const deleted = (res, message = 'Deleted successfully') => {
  return success(res, null, message, 200);
};

/**
 * 404 Not Found 응답
 * @param {Object} res - Express response 객체
 * @param {string} message - 에러 메시지
 */
const notFound = (res, message = 'Resource not found') => {
  return error(res, message, 'NOT_FOUND', 404);
};

/**
 * 400 Bad Request 응답
 * @param {Object} res - Express response 객체
 * @param {string} message - 에러 메시지
 * @param {Object} details - 상세 정보
 */
const badRequest = (res, message = 'Bad request', details = null) => {
  return error(res, message, 'BAD_REQUEST', 400, details);
};

/**
 * 401 Unauthorized 응답
 * @param {Object} res - Express response 객체
 * @param {string} message - 에러 메시지
 */
const unauthorized = (res, message = 'Unauthorized') => {
  return error(res, message, 'UNAUTHORIZED', 401);
};

/**
 * 403 Forbidden 응답
 * @param {Object} res - Express response 객체
 * @param {string} message - 에러 메시지
 */
const forbidden = (res, message = 'Forbidden') => {
  return error(res, message, 'FORBIDDEN', 403);
};

/**
 * 409 Conflict 응답
 * @param {Object} res - Express response 객체
 * @param {string} message - 에러 메시지
 */
const conflict = (res, message = 'Conflict') => {
  return error(res, message, 'CONFLICT', 409);
};

/**
 * 422 Unprocessable Entity 응답 (검증 오류)
 * @param {Object} res - Express response 객체
 * @param {string} message - 에러 메시지
 * @param {Object} details - 검증 오류 상세 정보
 */
const validationError = (res, message = 'Validation failed', details = null) => {
  return error(res, message, 'VALIDATION_ERROR', 422, details);
};

/**
 * 500 Internal Server Error 응답
 * @param {Object} res - Express response 객체
 * @param {string} message - 에러 메시지
 */
const internalError = (res, message = 'Internal server error') => {
  return error(res, message, 'INTERNAL_ERROR', 500);
};

module.exports = {
  success,
  error,
  paginated,
  created,
  updated,
  deleted,
  notFound,
  badRequest,
  unauthorized,
  forbidden,
  conflict,
  validationError,
  internalError,
};