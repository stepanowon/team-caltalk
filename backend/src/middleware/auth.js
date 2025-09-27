const AuthService = require('../services/AuthService');
const logger = require('../config/logger');

/**
 * JWT 인증 미들웨어
 * Authorization 헤더에서 토큰을 추출하고 검증
 */
const authenticateToken = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader) {
      return res.status(401).json({
        success: false,
        error: 'Authorization 헤더가 없습니다',
        code: 'MISSING_AUTH_HEADER',
      });
    }

    if (!authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        error: 'Bearer 토큰 형식이 아닙니다',
        code: 'INVALID_AUTH_FORMAT',
      });
    }

    const token = authHeader.substring(7); // 'Bearer ' 제거

    if (!token) {
      return res.status(401).json({
        success: false,
        error: '토큰이 제공되지 않았습니다',
        code: 'MISSING_TOKEN',
      });
    }

    // 토큰 검증 및 사용자 정보 조회
    const user = await AuthService.getUserFromToken(token);

    // req 객체에 사용자 정보 추가
    req.user = user;
    req.token = token;

    // 토큰 만료 임박 시 헤더에 알림
    if (AuthService.isTokenExpiringSoon(token)) {
      res.set('X-Token-Expiring', 'true');
    }

    next();
  } catch (error) {
    logger.error('인증 미들웨어 오류:', {
      error: error.message,
      ip: req.ip,
      userAgent: req.get('User-Agent'),
    });

    let statusCode = 401;
    let errorCode = 'AUTH_FAILED';

    if (error.message.includes('만료')) {
      errorCode = 'TOKEN_EXPIRED';
    } else if (error.message.includes('유효하지 않은')) {
      errorCode = 'INVALID_TOKEN';
    } else if (error.message.includes('찾을 수 없습니다')) {
      errorCode = 'USER_NOT_FOUND';
    }

    return res.status(statusCode).json({
      success: false,
      error: error.message,
      code: errorCode,
    });
  }
};

/**
 * 선택적 인증 미들웨어
 * 토큰이 있으면 검증하고, 없어도 다음으로 진행
 */
const optionalAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7);

      if (token) {
        try {
          const user = await AuthService.getUserFromToken(token);
          req.user = user;
          req.token = token;
        } catch (error) {
          // 선택적 인증에서는 토큰 오류 시에도 계속 진행
          logger.warn('선택적 인증 토큰 오류:', { error: error.message });
        }
      }
    }

    next();
  } catch (error) {
    logger.error('선택적 인증 미들웨어 오류:', { error: error.message });
    next(); // 오류가 있어도 계속 진행
  }
};

/**
 * 팀 권한 확인 미들웨어
 * 사용자가 특정 팀의 멤버인지 확인
 */
const requireTeamMembership = (paramName = 'teamId') => {
  return async (req, res, next) => {
    try {
      if (!req.user) {
        return res.status(401).json({
          success: false,
          error: '인증이 필요합니다',
          code: 'AUTH_REQUIRED',
        });
      }

      const teamId = parseInt(req.params[paramName]);

      if (!teamId) {
        return res.status(400).json({
          success: false,
          error: '유효한 팀 ID가 필요합니다',
          code: 'INVALID_TEAM_ID',
        });
      }

      const Team = require('../models/Team');
      const isMember = await Team.isTeamMember(teamId, req.user.id);

      if (!isMember) {
        logger.audit('UNAUTHORIZED_TEAM_ACCESS', {
          userId: req.user.id,
          teamId,
          action: req.method + ' ' + req.path,
        });

        return res.status(403).json({
          success: false,
          error: '팀 멤버만 접근할 수 있습니다',
          code: 'NOT_TEAM_MEMBER',
        });
      }

      req.teamId = teamId;
      next();
    } catch (error) {
      logger.error('팀 멤버십 확인 오류:', {
        error: error.message,
        userId: req.user?.id,
        teamId: req.params[paramName],
      });

      return res.status(500).json({
        success: false,
        error: '팀 권한 확인 중 오류가 발생했습니다',
        code: 'TEAM_AUTH_ERROR',
      });
    }
  };
};

/**
 * 팀 리더 권한 확인 미들웨어
 * 사용자가 특정 팀의 리더인지 확인
 */
const requireTeamLeadership = (paramName = 'teamId') => {
  return async (req, res, next) => {
    try {
      if (!req.user) {
        return res.status(401).json({
          success: false,
          error: '인증이 필요합니다',
          code: 'AUTH_REQUIRED',
        });
      }

      const teamId = parseInt(req.params[paramName]);

      if (!teamId) {
        return res.status(400).json({
          success: false,
          error: '유효한 팀 ID가 필요합니다',
          code: 'INVALID_TEAM_ID',
        });
      }

      const Team = require('../models/Team');
      const isLeader = await Team.isTeamLeader(teamId, req.user.id);

      if (!isLeader) {
        logger.audit('UNAUTHORIZED_TEAM_LEADER_ACCESS', {
          userId: req.user.id,
          teamId,
          action: req.method + ' ' + req.path,
        });

        return res.status(403).json({
          success: false,
          error: '팀 리더만 접근할 수 있습니다',
          code: 'NOT_TEAM_LEADER',
        });
      }

      req.teamId = teamId;
      next();
    } catch (error) {
      logger.error('팀 리더십 확인 오류:', {
        error: error.message,
        userId: req.user?.id,
        teamId: req.params[paramName],
      });

      return res.status(500).json({
        success: false,
        error: '팀 리더 권한 확인 중 오류가 발생했습니다',
        code: 'TEAM_LEADER_AUTH_ERROR',
      });
    }
  };
};

/**
 * 관리자 권한 확인 미들웨어
 * 향후 관리자 기능 추가시 사용
 */
const requireAdmin = async (req, res, next) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: '인증이 필요합니다',
        code: 'AUTH_REQUIRED',
      });
    }

    // 현재는 모든 사용자가 관리자 권한이 없다고 가정
    // 향후 users 테이블에 role 컬럼 추가시 수정
    return res.status(403).json({
      success: false,
      error: '관리자 권한이 필요합니다',
      code: 'ADMIN_REQUIRED',
    });
  } catch (error) {
    logger.error('관리자 권한 확인 오류:', {
      error: error.message,
      userId: req.user?.id,
    });

    return res.status(500).json({
      success: false,
      error: '관리자 권한 확인 중 오류가 발생했습니다',
      code: 'ADMIN_AUTH_ERROR',
    });
  }
};

module.exports = {
  authenticateToken,
  optionalAuth,
  requireTeamMembership,
  requireTeamLeadership,
  requireAdmin,
};