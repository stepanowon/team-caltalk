const express = require('express');
const User = require('../models/User');
const { authenticateToken } = require('../middleware/auth');
const { generalRateLimit } = require('../middleware/security');
const {
  validateUserProfileUpdate,
  validateId,
  validatePagination,
} = require('../middleware/validation');
const logger = require('../config/logger');

const router = express.Router();

/**
 * @swagger
 * components:
 *   schemas:
 *     UserProfile:
 *       type: object
 *       properties:
 *         id:
 *           type: integer
 *           format: int64
 *           example: 1
 *         name:
 *           type: string
 *           example: 김개발
 *         email:
 *           type: string
 *           format: email
 *           example: user@example.com
 *         createdAt:
 *           type: string
 *           format: date-time
 *           example: 2025-09-23T10:30:00Z
 *     UserStats:
 *       type: object
 *       properties:
 *         teams:
 *           type: integer
 *           example: 3
 *           description: 소속된 팀 수
 *         schedules:
 *           type: integer
 *           example: 25
 *           description: 생성한 일정 수
 *         messages:
 *           type: integer
 *           example: 127
 *           description: 전송한 메시지 수
 *     UserTeam:
 *       allOf:
 *         - $ref: '#/components/schemas/Team'
 *         - type: object
 *           properties:
 *             role:
 *               type: string
 *               enum: [leader, member]
 *               example: member
 *               description: 팀에서의 역할
 *             joinedAt:
 *               type: string
 *               format: date-time
 *               example: 2025-09-20T14:00:00Z
 *               description: 팀 가입 일시
 */

// 모든 사용자 라우트에 인증 및 Rate Limiting 적용
router.use(authenticateToken);
router.use(generalRateLimit);

/**
 * @swagger
 * /api/users/profile:
 *   get:
 *     tags: [사용자]
 *     summary: 현재 사용자 프로필 조회
 *     description: 로그인된 사용자의 프로필 정보를 조회합니다
 *     responses:
 *       200:
 *         description: 프로필 조회 성공
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: object
 *                   properties:
 *                     user:
 *                       $ref: '#/components/schemas/UserProfile'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
router.get('/profile', async (req, res) => {
  try {
    res.json({
      success: true,
      data: {
        user: req.user,
      },
    });
  } catch (error) {
    logger.error('프로필 조회 오류:', {
      error: error.message,
      userId: req.user.id,
    });

    res.status(500).json({
      success: false,
      error: '프로필 조회 중 오류가 발생했습니다',
      code: 'PROFILE_FETCH_FAILED',
    });
  }
});

/**
 * @swagger
 * /api/users/profile:
 *   put:
 *     tags: [사용자]
 *     summary: 현재 사용자 프로필 업데이트
 *     description: 로그인된 사용자의 이름과 이메일을 업데이트합니다
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *                 minLength: 2
 *                 maxLength: 30
 *                 example: 김개발
 *                 description: 새로운 사용자 이름
 *               email:
 *                 type: string
 *                 format: email
 *                 example: newuser@example.com
 *                 description: 새로운 이메일 주소
 *     responses:
 *       200:
 *         description: 프로필 업데이트 성공
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
 *                   example: 프로필이 업데이트되었습니다
 *                 data:
 *                   type: object
 *                   properties:
 *                     user:
 *                       $ref: '#/components/schemas/UserProfile'
 *       400:
 *         description: 이미 사용 중인 이메일이거나 잘못된 데이터
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 */
router.put('/profile', validateUserProfileUpdate, async (req, res) => {
  try {
    const { name, email } = req.body;

    const updatedUser = await User.updateProfile(req.user.id, { name, email });

    res.json({
      success: true,
      message: '프로필이 업데이트되었습니다',
      data: {
        user: updatedUser,
      },
    });
  } catch (error) {
    logger.error('프로필 업데이트 오류:', {
      error: error.message,
      userId: req.user.id,
      updateData: req.body,
    });

    res.status(400).json({
      success: false,
      error: error.message,
      code: 'PROFILE_UPDATE_FAILED',
    });
  }
});

/**
 * @swagger
 * /api/users/teams:
 *   get:
 *     tags: [사용자]
 *     summary: 현재 사용자가 속한 팀 목록 조회
 *     description: 로그인된 사용자가 속한 모든 팀의 목록과 역할 정보를 조회합니다
 *     responses:
 *       200:
 *         description: 팀 목록 조회 성공
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: object
 *                   properties:
 *                     teams:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/UserTeam'
 *                     total:
 *                       type: integer
 *                       example: 3
 *                       description: 속한 팀의 총 개수
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
router.get('/teams', validatePagination, async (req, res) => {
  try {
    const teams = await User.getUserTeams(req.user.id);

    res.json({
      success: true,
      data: {
        teams,
        total: teams.length,
      },
    });
  } catch (error) {
    logger.error('사용자 팀 목록 조회 오류:', {
      error: error.message,
      userId: req.user.id,
    });

    res.status(500).json({
      success: false,
      error: '팀 목록 조회 중 오류가 발생했습니다',
      code: 'USER_TEAMS_FETCH_FAILED',
    });
  }
});

/**
 * @swagger
 * /api/users/{userId}:
 *   get:
 *     tags: [사용자]
 *     summary: 특정 사용자 정보 조회
 *     description: 특정 사용자의 공개 정보(이름, 이메일, 가입일)를 조회합니다
 *     parameters:
 *       - $ref: '#/components/parameters/userId'
 *     responses:
 *       200:
 *         description: 사용자 조회 성공
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: object
 *                   properties:
 *                     user:
 *                       $ref: '#/components/schemas/UserProfile'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       404:
 *         $ref: '#/components/responses/NotFound'
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
router.get('/:id', validateId('id'), async (req, res) => {
  try {
    const userId = req.params.id;

    const user = await User.findById(userId, ['id', 'name', 'email', 'created_at']);

    if (!user) {
      return res.status(404).json({
        success: false,
        error: '사용자를 찾을 수 없습니다',
        code: 'USER_NOT_FOUND',
      });
    }

    res.json({
      success: true,
      data: {
        user,
      },
    });
  } catch (error) {
    logger.error('사용자 조회 오류:', {
      error: error.message,
      requestedUserId: req.params.id,
      requesterId: req.user.id,
    });

    res.status(500).json({
      success: false,
      error: '사용자 조회 중 오류가 발생했습니다',
      code: 'USER_FETCH_FAILED',
    });
  }
});

/**
 * @swagger
 * /api/users/search/{query}:
 *   get:
 *     tags: [사용자]
 *     summary: 사용자 검색
 *     description: 이름 또는 이메일로 사용자를 검색합니다. 대소문자를 구분하지 않으며 부분 매칭을 지원합니다
 *     parameters:
 *       - name: query
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *           minLength: 2
 *         description: 검색할 사용자 이름 또는 이메일 (2자 이상)
 *         example: 김개발
 *       - $ref: '#/components/parameters/page'
 *       - name: limit
 *         in: query
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *           default: 20
 *         description: 페이지당 사용자 수
 *         example: 20
 *     responses:
 *       200:
 *         description: 사용자 검색 성공
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: object
 *                   properties:
 *                     users:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/UserProfile'
 *                     pagination:
 *                       type: object
 *                       properties:
 *                         page:
 *                           type: integer
 *                           example: 1
 *                         limit:
 *                           type: integer
 *                           example: 20
 *                         total:
 *                           type: integer
 *                           example: 45
 *                         pages:
 *                           type: integer
 *                           example: 3
 *       400:
 *         description: 잘못된 검색어
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *             example:
 *               success: false
 *               error: 검색어는 최소 2자 이상이어야 합니다
 *               code: INVALID_SEARCH_QUERY
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
router.get('/search/:query', validatePagination, async (req, res) => {
  try {
    const { query } = req.params;
    const { page = 1, limit = 20 } = req.query;

    if (!query || query.length < 2) {
      return res.status(400).json({
        success: false,
        error: '검색어는 최소 2자 이상이어야 합니다',
        code: 'INVALID_SEARCH_QUERY',
      });
    }

    const offset = (page - 1) * limit;

    // 이름 또는 이메일로 검색 (대소문자 구분 없음)
    const searchQuery = `
      SELECT id, name, email, created_at
      FROM users
      WHERE (
        LOWER(name) LIKE LOWER($1) OR
        LOWER(email) LIKE LOWER($1)
      )
      ORDER BY name
      LIMIT $2 OFFSET $3
    `;

    const searchPattern = `%${query}%`;
    const result = await User.db.query(searchQuery, [searchPattern, limit, offset]);

    // 총 개수 조회
    const countQuery = `
      SELECT COUNT(*) as total
      FROM users
      WHERE (
        LOWER(name) LIKE LOWER($1) OR
        LOWER(email) LIKE LOWER($1)
      )
    `;
    const countResult = await User.db.query(countQuery, [searchPattern]);
    const total = parseInt(countResult.rows[0].total);

    res.json({
      success: true,
      data: {
        users: result.rows,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit),
        },
      },
    });
  } catch (error) {
    logger.error('사용자 검색 오류:', {
      error: error.message,
      query: req.params.query,
      userId: req.user.id,
    });

    res.status(500).json({
      success: false,
      error: '사용자 검색 중 오류가 발생했습니다',
      code: 'USER_SEARCH_FAILED',
    });
  }
});

/**
 * @swagger
 * /api/users/account:
 *   delete:
 *     tags: [사용자]
 *     summary: 현재 사용자 계정 삭제
 *     description: 로그인된 사용자의 계정을 삭제합니다. 팀 생성자인 경우 팀을 먼저 삭제하거나 다른 사람에게 양도해야 합니다
 *     responses:
 *       200:
 *         description: 계정 삭제 성공
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
 *                   example: 계정이 삭제되었습니다
 *       400:
 *         description: 팀 생성자는 계정 삭제 불가
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 error:
 *                   type: string
 *                   example: 생성한 팀이 있는 사용자는 계정을 삭제할 수 없습니다
 *                 code:
 *                   type: string
 *                   example: CANNOT_DELETE_TEAM_OWNER
 *                 data:
 *                   type: object
 *                   properties:
 *                     ownedTeams:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           id:
 *                             type: integer
 *                             example: 1
 *                           name:
 *                             type: string
 *                             example: 개발팀
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
router.delete('/account', async (req, res) => {
  try {
    // 팀 생성자인 경우 삭제 불가
    const userTeams = await User.getUserTeams(req.user.id);
    const ownedTeams = userTeams.filter(team => team.creator_id === req.user.id);

    if (ownedTeams.length > 0) {
      return res.status(400).json({
        success: false,
        error: '생성한 팀이 있는 사용자는 계정을 삭제할 수 없습니다. 먼저 팀을 삭제하거나 다른 사용자에게 양도하세요.',
        code: 'CANNOT_DELETE_TEAM_OWNER',
        data: {
          ownedTeams: ownedTeams.map(team => ({
            id: team.id,
            name: team.name,
          })),
        },
      });
    }

    // 소프트 삭제 수행 (실제로는 deleted_at 컬럼 업데이트)
    // 현재 스키마에는 deleted_at이 없으므로 물리적 삭제
    await User.delete(req.user.id);

    logger.audit('USER_ACCOUNT_DELETED', {
      userId: req.user.id,
      email: req.user.email,
    });

    res.json({
      success: true,
      message: '계정이 삭제되었습니다',
    });
  } catch (error) {
    logger.error('계정 삭제 오류:', {
      error: error.message,
      userId: req.user.id,
    });

    res.status(500).json({
      success: false,
      error: '계정 삭제 중 오류가 발생했습니다',
      code: 'ACCOUNT_DELETE_FAILED',
    });
  }
});

/**
 * @swagger
 * /api/users/stats:
 *   get:
 *     tags: [사용자]
 *     summary: 현재 사용자 통계 정보
 *     description: 로그인된 사용자의 활동 통계(속한 팀 수, 생성한 일정 수, 전송한 메시지 수)를 조회합니다
 *     responses:
 *       200:
 *         description: 사용자 통계 조회 성공
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: object
 *                   properties:
 *                     stats:
 *                       $ref: '#/components/schemas/UserStats'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
router.get('/stats', async (req, res) => {
  try {
    const userId = req.user.id;

    // 병렬로 통계 데이터 조회
    const [teamsResult, schedulesResult, messagesResult] = await Promise.all([
      User.db.query(`
        SELECT COUNT(*) as count
        FROM team_members
        WHERE user_id = $1
      `, [userId]),

      User.db.query(`
        SELECT COUNT(*) as count
        FROM schedules
        WHERE creator_id = $1
      `, [userId]),

      User.db.query(`
        SELECT COUNT(*) as count
        FROM messages
        WHERE sender_id = $1
      `, [userId]),
    ]);

    const stats = {
      teams: parseInt(teamsResult.rows[0].count),
      schedules: parseInt(schedulesResult.rows[0].count),
      messages: parseInt(messagesResult.rows[0].count),
    };

    res.json({
      success: true,
      data: {
        stats,
      },
    });
  } catch (error) {
    logger.error('사용자 통계 조회 오류:', {
      error: error.message,
      userId: req.user.id,
    });

    res.status(500).json({
      success: false,
      error: '통계 조회 중 오류가 발생했습니다',
      code: 'USER_STATS_FAILED',
    });
  }
});

module.exports = router;