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

// 모든 사용자 라우트에 인증 및 Rate Limiting 적용
router.use(authenticateToken);
router.use(generalRateLimit);

/**
 * @route   GET /api/v1/users/profile
 * @desc    현재 사용자 프로필 조회
 * @access  Private
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
 * @route   PUT /api/v1/users/profile
 * @desc    현재 사용자 프로필 업데이트
 * @access  Private
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
 * @route   GET /api/v1/users/teams
 * @desc    현재 사용자가 속한 팀 목록 조회
 * @access  Private
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
 * @route   GET /api/v1/users/:id
 * @desc    특정 사용자 정보 조회 (공개 정보만)
 * @access  Private
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
 * @route   GET /api/v1/users/search
 * @desc    사용자 검색 (이름 또는 이메일)
 * @access  Private
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
 * @route   DELETE /api/v1/users/account
 * @desc    현재 사용자 계정 삭제 (소프트 삭제)
 * @access  Private
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
 * @route   GET /api/v1/users/stats
 * @desc    현재 사용자 통계 정보
 * @access  Private
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