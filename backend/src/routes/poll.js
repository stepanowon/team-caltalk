const express = require('express');
const eventService = require('../services/EventService');
const Team = require('../models/Team');
const { authenticateToken } = require('../middleware/auth');
const { query, validationResult } = require('express-validator');
const logger = require('../config/logger');

const router = express.Router();

// 모든 Long Polling 라우트에 인증 적용
router.use(authenticateToken);

/**
 * Long Polling 검증 규칙
 */
const validatePolling = [
  query('lastEventId')
    .optional()
    .isString()
    .withMessage('마지막 이벤트 ID는 문자열이어야 합니다'),

  query('teamIds')
    .optional()
    .isString()
    .withMessage('팀 ID 목록은 문자열이어야 합니다')
    .custom((teamIds) => {
      if (teamIds) {
        const ids = teamIds.split(',').map(id => parseInt(id.trim()));
        if (ids.some(id => isNaN(id) || id < 1)) {
          throw new Error('팀 ID는 양의 정수여야 합니다');
        }
      }
      return true;
    }),

  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      const errorDetails = errors.array().map(error => ({
        field: error.param,
        message: error.msg,
        value: error.value,
      }));

      return res.status(400).json({
        success: false,
        error: '입력 데이터가 올바르지 않습니다',
        code: 'VALIDATION_ERROR',
        details: errorDetails,
      });
    }
    next();
  },
];

/**
 * @route   GET /api/poll
 * @desc    Long Polling 연결 시작
 * @access  Private
 */
router.get('/', validatePolling, async (req, res) => {
  try {
    const { lastEventId, teamIds } = req.query;

    // 팀 ID 파싱 및 검증
    let validatedTeamIds = [];
    if (teamIds) {
      const parsedTeamIds = teamIds.split(',').map(id => parseInt(id.trim()));

      // 사용자가 속한 팀만 필터링
      for (const teamId of parsedTeamIds) {
        const isTeamMember = await Team.isTeamMember(teamId, req.user.id);
        if (isTeamMember) {
          validatedTeamIds.push(teamId);
        } else {
          logger.warn('권한 없는 팀 ID 접근 시도:', {
            userId: req.user.id,
            teamId,
          });
        }
      }
    }

    // 클라이언트 연결 해제 시 정리
    req.on('close', () => {
      eventService.closeConnection(req.user.id);
    });

    req.on('error', () => {
      eventService.closeConnection(req.user.id);
    });

    // Long Polling 연결 등록
    await eventService.registerConnection(req.user.id, res, {
      lastEventId,
      teamIds: validatedTeamIds,
    });

  } catch (error) {
    logger.error('Long Polling 연결 오류:', {
      error: error.message,
      userId: req.user.id,
      query: req.query,
    });

    if (!res.headersSent) {
      res.status(500).json({
        success: false,
        error: 'Long Polling 연결 중 오류가 발생했습니다',
        code: 'POLLING_CONNECTION_FAILED',
      });
    }
  }
});

/**
 * @route   POST /api/poll/disconnect
 * @desc    Long Polling 연결 해제
 * @access  Private
 */
router.post('/disconnect', async (req, res) => {
  try {
    eventService.closeConnection(req.user.id);

    res.json({
      success: true,
      message: 'Long Polling 연결이 해제되었습니다',
    });
  } catch (error) {
    logger.error('Long Polling 연결 해제 오류:', {
      error: error.message,
      userId: req.user.id,
    });

    res.status(500).json({
      success: false,
      error: 'Long Polling 연결 해제 중 오류가 발생했습니다',
      code: 'POLLING_DISCONNECT_FAILED',
    });
  }
});

/**
 * @route   GET /api/poll/stats
 * @desc    Long Polling 연결 상태 조회 (개발/디버깅용)
 * @access  Private
 */
router.get('/stats', async (req, res) => {
  try {
    const stats = eventService.getConnectionStats();

    res.json({
      success: true,
      data: {
        stats,
        timestamp: new Date().toISOString(),
      },
    });
  } catch (error) {
    logger.error('Long Polling 상태 조회 오류:', {
      error: error.message,
      userId: req.user.id,
    });

    res.status(500).json({
      success: false,
      error: 'Long Polling 상태 조회 중 오류가 발생했습니다',
      code: 'POLLING_STATS_FAILED',
    });
  }
});

/**
 * @route   DELETE /api/poll/events
 * @desc    사용자 이벤트 큐 삭제 (개발/디버깅용)
 * @access  Private
 */
router.delete('/events', async (req, res) => {
  try {
    const cleared = eventService.clearUserEventQueue(req.user.id);

    res.json({
      success: true,
      message: cleared ? '이벤트 큐가 삭제되었습니다' : '삭제할 이벤트 큐가 없습니다',
      data: {
        cleared,
      },
    });
  } catch (error) {
    logger.error('이벤트 큐 삭제 오류:', {
      error: error.message,
      userId: req.user.id,
    });

    res.status(500).json({
      success: false,
      error: '이벤트 큐 삭제 중 오류가 발생했습니다',
      code: 'EVENT_QUEUE_DELETE_FAILED',
    });
  }
});

module.exports = router;