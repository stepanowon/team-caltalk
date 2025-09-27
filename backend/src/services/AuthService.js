const jwt = require('jsonwebtoken');
const User = require('../models/User');
const config = require('../config/environment');
const logger = require('../config/logger');

/**
 * 인증 서비스
 * JWT 토큰 관리 및 사용자 인증 처리
 */
class AuthService {
  /**
   * JWT 토큰 생성
   * @param {Object} payload - 토큰에 포함할 데이터
   * @param {string} secret - JWT secret
   * @param {string} expiresIn - 만료 시간
   */
  generateToken(payload, secret = config.jwt.secret, expiresIn = config.jwt.expiresIn) {
    try {
      const token = jwt.sign(
        {
          ...payload,
          iat: Math.floor(Date.now() / 1000),
        },
        secret,
        {
          expiresIn,
          issuer: config.jwt.issuer,
          audience: config.jwt.audience,
        }
      );

      return token;
    } catch (error) {
      logger.error('JWT 토큰 생성 오류:', { error: error.message, payload });
      throw new Error('토큰 생성에 실패했습니다');
    }
  }

  /**
   * Access Token 생성
   * @param {Object} user - 사용자 객체
   */
  generateAccessToken(user) {
    const payload = {
      userId: user.id,
      email: user.email,
      name: user.name,
      type: 'access',
    };

    return this.generateToken(payload);
  }

  /**
   * Refresh Token 생성
   * @param {Object} user - 사용자 객체
   */
  generateRefreshToken(user) {
    const payload = {
      userId: user.id,
      email: user.email,
      type: 'refresh',
    };

    return this.generateToken(
      payload,
      config.jwt.refreshSecret,
      config.jwt.refreshExpiresIn
    );
  }

  /**
   * 토큰 검증
   * @param {string} token - 검증할 토큰
   * @param {string} secret - JWT secret
   */
  verifyToken(token, secret = config.jwt.secret) {
    try {
      const decoded = jwt.verify(token, secret, {
        issuer: config.jwt.issuer,
        audience: config.jwt.audience,
      });

      return decoded;
    } catch (error) {
      if (error.name === 'TokenExpiredError') {
        throw new Error('토큰이 만료되었습니다');
      } else if (error.name === 'JsonWebTokenError') {
        throw new Error('유효하지 않은 토큰입니다');
      } else {
        logger.error('토큰 검증 오류:', { error: error.message });
        throw new Error('토큰 검증에 실패했습니다');
      }
    }
  }

  /**
   * Access Token 검증
   * @param {string} token - Access Token
   */
  verifyAccessToken(token) {
    const decoded = this.verifyToken(token);

    if (decoded.type !== 'access') {
      throw new Error('Access Token이 아닙니다');
    }

    return decoded;
  }

  /**
   * Refresh Token 검증
   * @param {string} token - Refresh Token
   */
  verifyRefreshToken(token) {
    const decoded = this.verifyToken(token, config.jwt.refreshSecret);

    if (decoded.type !== 'refresh') {
      throw new Error('Refresh Token이 아닙니다');
    }

    return decoded;
  }

  /**
   * 사용자 로그인
   * @param {string} email - 이메일
   * @param {string} password - 비밀번호
   */
  async login(email, password) {
    const start = Date.now();
    try {
      // 입력 검증
      if (!email || !password) {
        throw new Error('이메일과 비밀번호를 입력해주세요');
      }

      // 사용자 인증
      const user = await User.authenticate(email, password);
      if (!user) {
        throw new Error('이메일 또는 비밀번호가 올바르지 않습니다');
      }

      // 토큰 생성
      const accessToken = this.generateAccessToken(user);
      const refreshToken = this.generateRefreshToken(user);

      logger.performance('AuthService.login', Date.now() - start, {
        userId: user.id,
      });

      logger.audit('USER_LOGIN', {
        userId: user.id,
        email,
      });

      return {
        user,
        tokens: {
          accessToken,
          refreshToken,
          expiresIn: config.jwt.expiresIn,
        },
      };
    } catch (error) {
      logger.error('AuthService.login 오류:', {
        email,
        error: error.message
      });
      throw error;
    }
  }

  /**
   * 사용자 회원가입
   * @param {Object} userData - 사용자 데이터
   */
  async register(userData) {
    const start = Date.now();
    try {
      const { email, name, password } = userData;

      // 사용자 생성
      const user = await User.createUser({ email, name, password });

      // 토큰 생성
      const accessToken = this.generateAccessToken(user);
      const refreshToken = this.generateRefreshToken(user);

      logger.performance('AuthService.register', Date.now() - start, {
        userId: user.id,
      });

      logger.audit('USER_REGISTER', {
        userId: user.id,
        email,
      });

      return {
        user,
        tokens: {
          accessToken,
          refreshToken,
          expiresIn: config.jwt.expiresIn,
        },
      };
    } catch (error) {
      logger.error('AuthService.register 오류:', {
        email: userData.email,
        error: error.message
      });
      throw error;
    }
  }

  /**
   * 토큰 갱신
   * @param {string} refreshToken - Refresh Token
   */
  async refreshTokens(refreshToken) {
    const start = Date.now();
    try {
      // Refresh Token 검증
      const decoded = this.verifyRefreshToken(refreshToken);

      // 사용자 조회 (유효성 확인)
      const user = await User.findById(decoded.userId);
      if (!user) {
        throw new Error('사용자를 찾을 수 없습니다');
      }

      // 새 토큰 생성
      const newAccessToken = this.generateAccessToken(user);
      const newRefreshToken = this.generateRefreshToken(user);

      logger.performance('AuthService.refreshTokens', Date.now() - start, {
        userId: user.id,
      });

      logger.audit('TOKEN_REFRESHED', {
        userId: user.id,
      });

      return {
        tokens: {
          accessToken: newAccessToken,
          refreshToken: newRefreshToken,
          expiresIn: config.jwt.expiresIn,
        },
      };
    } catch (error) {
      logger.error('AuthService.refreshTokens 오류:', {
        error: error.message
      });
      throw error;
    }
  }

  /**
   * 사용자 로그아웃
   * @param {number} userId - 사용자 ID
   */
  async logout(userId) {
    const start = Date.now();
    try {
      // 실제로는 블랙리스트나 토큰 무효화 로직이 들어갈 수 있음
      // 현재는 클라이언트에서 토큰 삭제로 처리

      logger.performance('AuthService.logout', Date.now() - start, {
        userId,
      });

      logger.audit('USER_LOGOUT', {
        userId,
      });

      return { success: true };
    } catch (error) {
      logger.error('AuthService.logout 오류:', {
        userId,
        error: error.message
      });
      throw error;
    }
  }

  /**
   * 토큰에서 사용자 정보 추출
   * @param {string} token - JWT 토큰
   */
  async getUserFromToken(token) {
    try {
      const decoded = this.verifyAccessToken(token);

      // 사용자 정보 재조회 (최신 정보 보장)
      const user = await User.findById(decoded.userId);
      if (!user) {
        throw new Error('사용자를 찾을 수 없습니다');
      }

      return user;
    } catch (error) {
      logger.error('AuthService.getUserFromToken 오류:', {
        error: error.message
      });
      throw error;
    }
  }

  /**
   * 비밀번호 변경
   * @param {number} userId - 사용자 ID
   * @param {string} currentPassword - 현재 비밀번호
   * @param {string} newPassword - 새 비밀번호
   */
  async changePassword(userId, currentPassword, newPassword) {
    const start = Date.now();
    try {
      const result = await User.changePassword(userId, currentPassword, newPassword);

      logger.performance('AuthService.changePassword', Date.now() - start, {
        userId,
      });

      return result;
    } catch (error) {
      logger.error('AuthService.changePassword 오류:', {
        userId,
        error: error.message
      });
      throw error;
    }
  }

  /**
   * 토큰 만료 시간 확인
   * @param {string} token - JWT 토큰
   */
  getTokenExpiration(token) {
    try {
      const decoded = jwt.decode(token);
      if (!decoded || !decoded.exp) {
        return null;
      }

      return new Date(decoded.exp * 1000);
    } catch (error) {
      logger.error('토큰 만료 시간 확인 오류:', { error: error.message });
      return null;
    }
  }

  /**
   * 토큰이 곧 만료되는지 확인
   * @param {string} token - JWT 토큰
   * @param {number} thresholdMinutes - 임계값 (분)
   */
  isTokenExpiringSoon(token, thresholdMinutes = 5) {
    const expiration = this.getTokenExpiration(token);
    if (!expiration) {
      return true;
    }

    const now = new Date();
    const threshold = thresholdMinutes * 60 * 1000; // 밀리초로 변환

    return (expiration.getTime() - now.getTime()) < threshold;
  }
}

module.exports = new AuthService();