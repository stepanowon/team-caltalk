const express = require('express');
const AuthService = require('../services/AuthService');
const { authenticateToken } = require('../middleware/auth');
const { authRateLimit } = require('../middleware/security');
const {
  validateUserRegistration,
  validateUserLogin,
  validatePasswordChange,
  validateRefreshToken,
} = require('../middleware/validation');
const logger = require('../config/logger');

const router = express.Router();

/**
 * @route   POST /api/v1/auth/register
 * @desc    사용자 회원가입
 * @access  Public
 */
router.post('/register', authRateLimit, validateUserRegistration, async (req, res) => {
  try {
    const { email, name, password } = req.body;

    const result = await AuthService.register({ email, name, password });

    res.status(201).json({
      success: true,
      message: '회원가입이 완료되었습니다',
      data: {
        user: result.user,
        tokens: result.tokens,
      },
    });
  } catch (error) {
    logger.error('회원가입 오류:', {
      error: error.message,
      email: req.body.email,
    });

    res.status(400).json({
      success: false,
      error: error.message,
      code: 'REGISTRATION_FAILED',
    });
  }
});

/**
 * @route   POST /api/v1/auth/login
 * @desc    사용자 로그인
 * @access  Public
 */
router.post('/login', authRateLimit, validateUserLogin, async (req, res) => {
  try {
    const { email, password } = req.body;

    const result = await AuthService.login(email, password);

    res.json({
      success: true,
      message: '로그인이 완료되었습니다',
      data: {
        user: result.user,
        tokens: result.tokens,
      },
    });
  } catch (error) {
    logger.error('로그인 오류:', {
      error: error.message,
      email: req.body.email,
    });

    res.status(401).json({
      success: false,
      error: error.message,
      code: 'LOGIN_FAILED',
    });
  }
});

/**
 * @route   POST /api/v1/auth/logout
 * @desc    사용자 로그아웃
 * @access  Private
 */
router.post('/logout', authenticateToken, async (req, res) => {
  try {
    await AuthService.logout(req.user.id);

    res.json({
      success: true,
      message: '로그아웃이 완료되었습니다',
    });
  } catch (error) {
    logger.error('로그아웃 오류:', {
      error: error.message,
      userId: req.user?.id,
    });

    res.status(500).json({
      success: false,
      error: '로그아웃 처리 중 오류가 발생했습니다',
      code: 'LOGOUT_FAILED',
    });
  }
});

/**
 * @route   POST /api/v1/auth/refresh
 * @desc    토큰 갱신
 * @access  Public
 */
router.post('/refresh', authRateLimit, validateRefreshToken, async (req, res) => {
  try {
    const { refreshToken } = req.body;

    const result = await AuthService.refreshTokens(refreshToken);

    res.json({
      success: true,
      message: '토큰이 갱신되었습니다',
      data: result,
    });
  } catch (error) {
    logger.error('토큰 갱신 오류:', {
      error: error.message,
    });

    res.status(401).json({
      success: false,
      error: error.message,
      code: 'TOKEN_REFRESH_FAILED',
    });
  }
});

/**
 * @route   POST /api/v1/auth/change-password
 * @desc    비밀번호 변경
 * @access  Private
 */
router.post('/change-password', authenticateToken, validatePasswordChange, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    await AuthService.changePassword(req.user.id, currentPassword, newPassword);

    res.json({
      success: true,
      message: '비밀번호가 변경되었습니다',
    });
  } catch (error) {
    logger.error('비밀번호 변경 오류:', {
      error: error.message,
      userId: req.user?.id,
    });

    res.status(400).json({
      success: false,
      error: error.message,
      code: 'PASSWORD_CHANGE_FAILED',
    });
  }
});

/**
 * @route   GET /api/v1/auth/me
 * @desc    현재 사용자 정보 조회
 * @access  Private
 */
router.get('/me', authenticateToken, async (req, res) => {
  try {
    res.json({
      success: true,
      data: {
        user: req.user,
      },
    });
  } catch (error) {
    logger.error('사용자 정보 조회 오류:', {
      error: error.message,
      userId: req.user?.id,
    });

    res.status(500).json({
      success: false,
      error: '사용자 정보 조회 중 오류가 발생했습니다',
      code: 'USER_INFO_FAILED',
    });
  }
});

/**
 * @route   GET /api/v1/auth/verify
 * @desc    토큰 유효성 검증
 * @access  Private
 */
router.get('/verify', authenticateToken, async (req, res) => {
  try {
    // 토큰 만료 임박 여부 확인
    const isExpiringSoon = AuthService.isTokenExpiringSoon(req.token);

    res.json({
      success: true,
      message: '토큰이 유효합니다',
      data: {
        user: req.user,
        tokenExpiringSoon: isExpiringSoon,
      },
    });
  } catch (error) {
    logger.error('토큰 검증 오류:', {
      error: error.message,
      userId: req.user?.id,
    });

    res.status(500).json({
      success: false,
      error: '토큰 검증 중 오류가 발생했습니다',
      code: 'TOKEN_VERIFY_FAILED',
    });
  }
});

module.exports = router;