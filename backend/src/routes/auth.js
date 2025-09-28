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
 * @swagger
 * components:
 *   schemas:
 *     User:
 *       type: object
 *       properties:
 *         id:
 *           type: integer
 *           format: int64
 *           example: 1
 *         email:
 *           type: string
 *           format: email
 *           example: user@example.com
 *         name:
 *           type: string
 *           example: 김개발
 *         createdAt:
 *           type: string
 *           format: date-time
 *           example: 2025-09-23T10:30:00Z
 *         updatedAt:
 *           type: string
 *           format: date-time
 *           example: 2025-09-23T10:30:00Z
 *     AuthTokens:
 *       type: object
 *       properties:
 *         accessToken:
 *           type: string
 *           example: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
 *           description: JWT 액세스 토큰
 *         refreshToken:
 *           type: string
 *           example: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
 *           description: JWT 리프레시 토큰
 *         expiresIn:
 *           type: integer
 *           example: 86400
 *           description: 액세스 토큰 만료 시간 (초)
 */

/**
 * @swagger
 * /api/auth/register:
 *   post:
 *     tags: [인증]
 *     summary: 사용자 회원가입
 *     description: 새로운 사용자 계정을 생성합니다
 *     security: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email, name, password]
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *                 example: user@example.com
 *                 description: 사용자 이메일 주소
 *               name:
 *                 type: string
 *                 minLength: 2
 *                 maxLength: 30
 *                 example: 김개발
 *                 description: 사용자 이름
 *               password:
 *                 type: string
 *                 minLength: 8
 *                 pattern: '^(?=.*[A-Za-z])(?=.*\\d)[A-Za-z\\d@$!%*#?&]{8,}$'
 *                 example: Password123!
 *                 description: 비밀번호 (영문, 숫자 포함 8자 이상)
 *     responses:
 *       201:
 *         description: 회원가입 성공
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: 회원가입이 완료되었습니다
 *                 data:
 *                   type: object
 *                   properties:
 *                     user:
 *                       $ref: '#/components/schemas/User'
 *                     tokens:
 *                       $ref: '#/components/schemas/AuthTokens'
 *       400:
 *         $ref: '#/components/responses/BadRequest'
 *       409:
 *         description: 이미 존재하는 이메일
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       429:
 *         $ref: '#/components/responses/TooManyRequests'
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
 * @swagger
 * /api/auth/login:
 *   post:
 *     tags: [인증]
 *     summary: 사용자 로그인
 *     description: 이메일과 비밀번호로 로그인하여 JWT 토큰을 발급받습니다
 *     security: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email, password]
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *                 example: user@example.com
 *               password:
 *                 type: string
 *                 example: Password123!
 *     responses:
 *       200:
 *         description: 로그인 성공
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: 로그인되었습니다
 *                 data:
 *                   type: object
 *                   properties:
 *                     user:
 *                       $ref: '#/components/schemas/User'
 *                     tokens:
 *                       $ref: '#/components/schemas/AuthTokens'
 *       400:
 *         $ref: '#/components/responses/BadRequest'
 *       401:
 *         description: 인증 실패
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       429:
 *         $ref: '#/components/responses/TooManyRequests'
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