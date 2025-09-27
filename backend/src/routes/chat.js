const express = require('express');
const Message = require('../models/Message');
const Team = require('../models/Team');
const { authenticateToken, requireTeamMembership } = require('../middleware/auth');
const { generalRateLimit } = require('../middleware/security');
const {
  validateId,
  validatePagination,
} = require('../middleware/validation');
const { body, query, validationResult } = require('express-validator');
const logger = require('../config/logger');

const router = express.Router();

// 모든 채팅 라우트에 인증 및 Rate Limiting 적용
router.use(authenticateToken);
router.use(generalRateLimit);

/**
 * 메시지 전송 검증 규칙
 */
const validateMessageSend = [
  body('content')
    .trim()
    .isLength({ min: 1, max: 500 })
    .withMessage('메시지 내용은 1-500자여야 합니다'),

  body('targetDate')
    .isISO8601()
    .withMessage('올바른 날짜 형식이 아닙니다')
    .toDate(),

  body('relatedScheduleId')
    .optional()
    .isInt({ min: 1 })
    .withMessage('관련 일정 ID는 양의 정수여야 합니다')
    .toInt(),

  body('messageType')
    .optional()
    .isIn(['normal', 'schedule_request'])
    .withMessage('메시지 유형은 normal 또는 schedule_request여야 합니다'),

  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      const errorDetails = errors.array().map(error => ({
        field: error.path,
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
 * 메시지 목록 조회 검증 규칙
 */
const validateMessageList = [
  query('targetDate')
    .optional()
    .isISO8601()
    .withMessage('올바른 날짜 형식이 아닙니다')
    .toDate(),

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

  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      const errorDetails = errors.array().map(error => ({
        field: error.path,
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
 * @route   POST /api/chat/teams/:teamId/messages
 * @desc    팀 채팅방에 메시지 전송
 * @access  Private (팀 멤버만)
 */
router.post('/teams/:teamId/messages',
  validateId('teamId'),
  requireTeamMembership('teamId'),
  validateMessageSend,
  async (req, res) => {
    try {
      const teamId = req.params.teamId;
      const { content, targetDate, relatedScheduleId, messageType = 'normal' } = req.body;

      // 관련 일정이 있는 경우 일정 접근 권한 확인
      if (relatedScheduleId) {
        const Schedule = require('../models/Schedule');
        const hasAccess = await Schedule.hasScheduleAccess(relatedScheduleId, req.user.id);
        if (!hasAccess) {
          return res.status(403).json({
            success: false,
            error: '관련 일정에 접근할 권한이 없습니다',
            code: 'NO_SCHEDULE_ACCESS',
          });
        }
      }

      const message = await Message.sendMessage({
        teamId,
        senderId: req.user.id,
        content,
        targetDate,
        relatedScheduleId,
        messageType,
      });

      // 메시지 상세 정보 조회 (발신자 정보 포함)
      const messageWithDetails = await Message.db.query(`
        SELECT
          m.*,
          u.name as sender_name,
          u.email as sender_email,
          s.title as related_schedule_title
        FROM messages m
        JOIN users u ON m.sender_id = u.id
        LEFT JOIN schedules s ON m.related_schedule_id = s.id
        WHERE m.id = $1
      `, [message.id]);

      res.status(201).json({
        success: true,
        message: '메시지가 전송되었습니다',
        data: {
          message: {
            ...messageWithDetails.rows[0],
            readCount: 0,
            isRead: false,
          },
        },
      });
    } catch (error) {
      logger.error('메시지 전송 오류:', {
        error: error.message,
        teamId: req.params.teamId,
        userId: req.user.id,
        messageData: req.body,
      });

      res.status(400).json({
        success: false,
        error: error.message,
        code: 'MESSAGE_SEND_FAILED',
      });
    }
  }
);

/**
 * @route   GET /api/chat/teams/:teamId/messages
 * @desc    팀 채팅방 메시지 목록 조회
 * @access  Private (팀 멤버만)
 */
router.get('/teams/:teamId/messages',
  validateId('teamId'),
  requireTeamMembership('teamId'),
  validateMessageList,
  async (req, res) => {
    try {
      const teamId = req.params.teamId;
      const { targetDate, page = 1, limit = 50 } = req.query;

      const result = await Message.getTeamMessages(teamId, req.user.id, {
        targetDate: targetDate ? new Date(targetDate) : null,
        page: parseInt(page),
        limit: parseInt(limit),
      });

      res.json({
        success: true,
        data: result,
      });
    } catch (error) {
      logger.error('메시지 목록 조회 오류:', {
        error: error.message,
        teamId: req.params.teamId,
        userId: req.user.id,
        query: req.query,
      });

      res.status(500).json({
        success: false,
        error: '메시지 목록 조회 중 오류가 발생했습니다',
        code: 'MESSAGES_FETCH_FAILED',
      });
    }
  }
);

/**
 * @route   DELETE /api/chat/messages/:messageId
 * @desc    메시지 삭제
 * @access  Private (작성자만)
 */
router.delete('/messages/:messageId', validateId('messageId'), async (req, res) => {
  try {
    const messageId = req.params.messageId;

    // 메시지 접근 권한 확인
    const hasAccess = await Message.hasMessageAccess(messageId, req.user.id);
    if (!hasAccess) {
      return res.status(403).json({
        success: false,
        error: '메시지에 접근할 권한이 없습니다',
        code: 'NO_MESSAGE_ACCESS',
      });
    }

    await Message.deleteMessage(messageId, req.user.id);

    res.json({
      success: true,
      message: '메시지가 삭제되었습니다',
    });
  } catch (error) {
    logger.error('메시지 삭제 오류:', {
      error: error.message,
      messageId: req.params.messageId,
      userId: req.user.id,
    });

    res.status(400).json({
      success: false,
      error: error.message,
      code: 'MESSAGE_DELETE_FAILED',
    });
  }
});

/**
 * @route   POST /api/chat/teams/:teamId/messages/:messageId/read
 * @desc    메시지 읽음 처리
 * @access  Private (팀 멤버만)
 */
router.post('/teams/:teamId/messages/:messageId/read',
  validateId('teamId'),
  validateId('messageId'),
  requireTeamMembership('teamId'),
  async (req, res) => {
    try {
      const messageId = req.params.messageId;

      // 메시지가 해당 팀의 메시지인지 확인
      const messageCheck = await Message.db.query(`
        SELECT team_id FROM messages WHERE id = $1
      `, [messageId]);

      if (messageCheck.rows.length === 0) {
        return res.status(404).json({
          success: false,
          error: '메시지를 찾을 수 없습니다',
          code: 'MESSAGE_NOT_FOUND',
        });
      }

      if (messageCheck.rows[0].team_id !== parseInt(req.params.teamId)) {
        return res.status(400).json({
          success: false,
          error: '메시지가 해당 팀에 속하지 않습니다',
          code: 'MESSAGE_TEAM_MISMATCH',
        });
      }

      const marked = await Message.markAsRead(messageId, req.user.id);

      res.json({
        success: true,
        message: marked ? '메시지를 읽음으로 표시했습니다' : '이미 읽은 메시지입니다',
        data: {
          wasAlreadyRead: !marked,
        },
      });
    } catch (error) {
      logger.error('메시지 읽음 처리 오류:', {
        error: error.message,
        teamId: req.params.teamId,
        messageId: req.params.messageId,
        userId: req.user.id,
      });

      res.status(500).json({
        success: false,
        error: '메시지 읽음 처리 중 오류가 발생했습니다',
        code: 'MESSAGE_READ_FAILED',
      });
    }
  }
);

/**
 * @route   GET /api/chat/teams/:teamId/unread-count
 * @desc    팀의 읽지 않은 메시지 개수 조회
 * @access  Private (팀 멤버만)
 */
router.get('/teams/:teamId/unread-count',
  validateId('teamId'),
  requireTeamMembership('teamId'),
  async (req, res) => {
    try {
      const teamId = req.params.teamId;

      const unreadCount = await Message.getUnreadMessageCount(teamId, req.user.id);

      res.json({
        success: true,
        data: {
          unreadCount,
        },
      });
    } catch (error) {
      logger.error('읽지 않은 메시지 개수 조회 오류:', {
        error: error.message,
        teamId: req.params.teamId,
        userId: req.user.id,
      });

      res.status(500).json({
        success: false,
        error: '읽지 않은 메시지 개수 조회 중 오류가 발생했습니다',
        code: 'UNREAD_COUNT_FETCH_FAILED',
      });
    }
  }
);

/**
 * @route   GET /api/chat/schedules/:scheduleId/messages
 * @desc    특정 일정에 관련된 메시지 조회
 * @access  Private
 */
router.get('/schedules/:scheduleId/messages', validateId('scheduleId'), async (req, res) => {
  try {
    const scheduleId = req.params.scheduleId;

    // 일정 접근 권한 확인
    const Schedule = require('../models/Schedule');
    const hasAccess = await Schedule.hasScheduleAccess(scheduleId, req.user.id);
    if (!hasAccess) {
      return res.status(403).json({
        success: false,
        error: '일정에 접근할 권한이 없습니다',
        code: 'NO_SCHEDULE_ACCESS',
      });
    }

    const messages = await Message.getScheduleRelatedMessages(scheduleId, req.user.id);

    res.json({
      success: true,
      data: {
        messages,
        total: messages.length,
      },
    });
  } catch (error) {
    logger.error('일정 관련 메시지 조회 오류:', {
      error: error.message,
      scheduleId: req.params.scheduleId,
      userId: req.user.id,
    });

    res.status(500).json({
      success: false,
      error: '일정 관련 메시지 조회 중 오류가 발생했습니다',
      code: 'SCHEDULE_MESSAGES_FETCH_FAILED',
    });
  }
});

module.exports = router;