const express = require('express');
const eventService = require('../services/EventService');
const Team = require('../models/Team');
const { authenticateToken } = require('../middleware/auth');
const { query, validationResult } = require('express-validator');
const logger = require('../config/logger');

const router = express.Router();

/**
 * @swagger
 * components:
 *   schemas:
 *     Event:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *           example: evt_1695734400123_abc123
 *           description: 유니크 이벤트 ID
 *         type:
 *           type: string
 *           enum: [message, schedule_update, team_update, user_join, user_leave]
 *           example: message
 *           description: 이벤트 유형
 *         teamId:
 *           type: integer
 *           format: int64
 *           example: 1
 *           description: 이벤트가 발생한 팀 ID
 *         userId:
 *           type: integer
 *           format: int64
 *           example: 2
 *           description: 이벤트를 발생시킨 사용자 ID
 *         timestamp:
 *           type: string
 *           format: date-time
 *           example: 2025-09-23T10:30:00Z
 *           description: 이벤트 발생 시각
 *         data:
 *           type: object
 *           description: 이벤트별 추가 데이터
 *           example:
 *             messageId: 123
 *             content: 새로운 메시지가 도착했습니다
 *     EventResponse:
 *       type: object
 *       properties:
 *         success:
 *           type: boolean
 *           example: true
 *         events:
 *           type: array
 *           items:
 *             $ref: '#/components/schemas/Event'
 *           description: 수신된 이벤트 목록
 *         lastEventId:
 *           type: string
 *           example: evt_1695734400123_abc123
 *           description: 마지막 이벤트 ID
 *         totalEvents:
 *           type: integer
 *           example: 5
 *           description: 수신된 이벤트 개수
 *     ConnectionStats:
 *       type: object
 *       properties:
 *         activeConnections:
 *           type: integer
 *           example: 15
 *           description: 활성 연결 수
 *         totalUsers:
 *           type: integer
 *           example: 12
 *           description: 연결된 사용자 수
 *         averageQueueSize:
 *           type: number
 *           format: float
 *           example: 2.5
 *           description: 평균 이벤트 큐 크기
 *         maxQueueSize:
 *           type: integer
 *           example: 10
 *           description: 최대 큐 크기
 */

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
 * @swagger
 * /api/poll:
 *   get:
 *     tags: [실시간]
 *     summary: Long Polling 연결 시작
 *     description: 실시간 이벤트 수신을 위한 Long Polling 연결을 시작합니다. 새로운 메시지, 일정 업데이트, 팀 변경 등의 이벤트를 실시간으로 수신할 수 있습니다
 *     parameters:
 *       - name: lastEventId
 *         in: query
 *         schema:
 *           type: string
 *         description: 마지막으로 수신한 이벤트 ID. 지정하면 이후 이벤트만 수신
 *         example: evt_1695734400123_abc123
 *       - name: teamIds
 *         in: query
 *         schema:
 *           type: string
 *         description: 수신할 팀 ID 목록 (콤마로 구분). 지정하지 않으면 소속된 모든 팀의 이벤트 수신
 *         example: "1,2,3"
 *     responses:
 *       200:
 *         description: 새로운 이벤트 수신 성공 (Long Polling 응답)
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/EventResponse'
 *       204:
 *         description: 새로운 이벤트 없음 (연결 유지)
 *       400:
 *         description: 잘못된 요청 데이터
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *             example:
 *               success: false
 *               error: 팀 ID는 양의 정수여야 합니다
 *               code: VALIDATION_ERROR
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
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
 * @swagger
 * /api/poll/disconnect:
 *   post:
 *     tags: [실시간]
 *     summary: Long Polling 연결 해제
 *     description: 현재 사용자의 Long Polling 연결을 명시적으로 해제합니다. 연결이 지속적으로 유지되지 않도록 합니다
 *     responses:
 *       200:
 *         description: 연결 해제 성공
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
 *                   example: Long Polling 연결이 해제되었습니다
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
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
 * @swagger
 * /api/poll/stats:
 *   get:
 *     tags: [실시간]
 *     summary: Long Polling 연결 상태 조회
 *     description: Long Polling 연결 상태와 통계 정보를 조회합니다. 개발 및 디버깅 목적으로 사용합니다
 *     responses:
 *       200:
 *         description: 연결 상태 조회 성공
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
 *                       $ref: '#/components/schemas/ConnectionStats'
 *                     timestamp:
 *                       type: string
 *                       format: date-time
 *                       example: 2025-09-23T10:30:00Z
 *                       description: 조회 시점
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
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
 * @swagger
 * /api/poll/events:
 *   delete:
 *     tags: [실시간]
 *     summary: 사용자 이벤트 큐 삭제
 *     description: 현재 사용자의 이벤트 큐를 완전히 삭제합니다. 개발 및 디버깅 목적으로 사용합니다
 *     responses:
 *       200:
 *         description: 이벤트 큐 삭제 성공
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
 *                   example: 이벤트 큐가 삭제되었습니다
 *                 data:
 *                   type: object
 *                   properties:
 *                     cleared:
 *                       type: boolean
 *                       example: true
 *                       description: 삭제 수행 여부
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
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