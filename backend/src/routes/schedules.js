const express = require('express');
const Schedule = require('../models/Schedule');
const Team = require('../models/Team');
const { authenticateToken, requireTeamMembership } = require('../middleware/auth');
const { generalRateLimit } = require('../middleware/security');
const {
  validateScheduleCreation,
  validateId,
  validatePagination,
  validateDateRange,
} = require('../middleware/validation');
const { body, validationResult } = require('express-validator');
const logger = require('../config/logger');

const router = express.Router();

// 모든 일정 라우트에 인증 및 Rate Limiting 적용
router.use(authenticateToken);
router.use(generalRateLimit);

/**
 * 일정 수정 검증 규칙
 */
const validateScheduleUpdate = [
  body('title')
    .optional()
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('일정 제목은 2-100자여야 합니다'),

  body('content')
    .optional()
    .trim()
    .isLength({ max: 1000 })
    .withMessage('일정 내용은 1000자를 초과할 수 없습니다'),

  body('startDatetime')
    .optional()
    .isISO8601()
    .withMessage('올바른 시작 시간 형식이 아닙니다')
    .toDate(),

  body('endDatetime')
    .optional()
    .isISO8601()
    .withMessage('올바른 종료 시간 형식이 아닙니다')
    .toDate(),

  body('participantIds')
    .optional()
    .isArray()
    .withMessage('참가자는 배열 형태여야 합니다')
    .custom((participants) => {
      if (participants.some(id => !Number.isInteger(id) || id < 1)) {
        throw new Error('참가자 ID는 양의 정수여야 합니다');
      }
      return true;
    }),

  body('category')
    .optional()
    .isIn(['meeting', 'deadline', 'personal', 'other'])
    .withMessage('올바르지 않은 카테고리입니다'),

  body('priority')
    .optional()
    .isIn(['high', 'medium', 'low'])
    .withMessage('올바르지 않은 우선순위입니다'),

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
 * 충돌 검사 검증 규칙
 */
const validateConflictCheck = [
  body('startDatetime')
    .isISO8601()
    .withMessage('올바른 시작 시간 형식이 아닙니다')
    .toDate(),

  body('endDatetime')
    .isISO8601()
    .withMessage('올바른 종료 시간 형식이 아닙니다')
    .toDate()
    .custom((endDatetime, { req }) => {
      const startDatetime = new Date(req.body.startDatetime);
      const endDate = new Date(endDatetime);

      if (endDate <= startDatetime) {
        throw new Error('종료 시간은 시작 시간보다 늦어야 합니다');
      }
      return true;
    }),

  body('participantIds')
    .isArray()
    .withMessage('참가자는 배열 형태여야 합니다')
    .custom((participants) => {
      if (participants.length === 0) {
        throw new Error('최소 1명의 참가자가 필요합니다');
      }
      if (participants.some(id => !Number.isInteger(id) || id < 1)) {
        throw new Error('참가자 ID는 양의 정수여야 합니다');
      }
      return true;
    }),

  body('excludeScheduleId')
    .optional()
    .isInt({ min: 1 })
    .withMessage('제외할 일정 ID는 양의 정수여야 합니다')
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
 * @route   POST /api/schedules
 * @desc    새 일정 생성
 * @access  Private
 */
router.post('/', validateScheduleCreation, async (req, res) => {
  try {
    const {
      title,
      content,
      startDatetime,
      endDatetime,
      scheduleType,
      teamId,
      participantIds = [],
      category = 'other',
      priority = 'medium',
      recurrence
    } = req.body;

    // 팀 일정인 경우 팀 멤버십 확인
    if (scheduleType === 'team') {
      if (!teamId) {
        return res.status(400).json({
          success: false,
          error: '팀 일정은 팀 ID가 필요합니다',
          code: 'TEAM_ID_REQUIRED',
        });
      }

      const isTeamMember = await Team.isTeamMember(teamId, req.user.id);
      if (!isTeamMember) {
        return res.status(403).json({
          success: false,
          error: '팀의 멤버만 팀 일정을 생성할 수 있습니다',
          code: 'NOT_TEAM_MEMBER',
        });
      }

      // 팀 일정의 경우 팀장만 생성 가능
      const isTeamLeader = await Team.isTeamLeader(teamId, req.user.id);
      if (!isTeamLeader) {
        return res.status(403).json({
          success: false,
          error: '팀장만 팀 일정을 생성할 수 있습니다',
          code: 'NOT_TEAM_LEADER',
        });
      }
    }

    const schedule = await Schedule.createSchedule({
      title,
      content,
      startDatetime,
      endDatetime,
      scheduleType,
      creatorId: req.user.id,
      teamId: scheduleType === 'team' ? teamId : null,
      participantIds,
      category,
      priority,
      recurrence,
    });

    res.status(201).json({
      success: true,
      message: '일정이 생성되었습니다',
      data: {
        schedule,
      },
    });
  } catch (error) {
    logger.error('일정 생성 오류:', {
      error: error.message,
      userId: req.user.id,
      scheduleData: req.body,
    });

    // 충돌 오류인 경우 특별 처리
    if (error.code === 'SCHEDULE_CONFLICT') {
      return res.status(409).json({
        success: false,
        error: error.message,
        code: 'SCHEDULE_CONFLICT',
        conflicts: error.conflicts,
      });
    }

    res.status(400).json({
      success: false,
      error: error.message,
      code: 'SCHEDULE_CREATION_FAILED',
    });
  }
});

/**
 * @route   GET /api/schedules
 * @desc    일정 목록 조회
 * @access  Private
 */
router.get('/', validateDateRange, async (req, res) => {
  try {
    const { startDate, endDate, teamId, scheduleType } = req.query;

    // 팀 필터가 있는 경우 팀 멤버십 확인
    if (teamId) {
      const isTeamMember = await Team.isTeamMember(parseInt(teamId), req.user.id);
      if (!isTeamMember) {
        return res.status(403).json({
          success: false,
          error: '팀의 멤버만 해당 팀 일정을 조회할 수 있습니다',
          code: 'NOT_TEAM_MEMBER',
        });
      }
    }

    const schedules = await Schedule.getUserSchedules(req.user.id, {
      startDate: startDate ? new Date(startDate) : null,
      endDate: endDate ? new Date(endDate) : null,
      teamId: teamId ? parseInt(teamId) : null,
      scheduleType,
    });

    res.json({
      success: true,
      data: {
        schedules,
        total: schedules.length,
      },
    });
  } catch (error) {
    logger.error('일정 목록 조회 오류:', {
      error: error.message,
      userId: req.user.id,
      query: req.query,
    });

    res.status(500).json({
      success: false,
      error: '일정 목록 조회 중 오류가 발생했습니다',
      code: 'SCHEDULES_FETCH_FAILED',
    });
  }
});

/**
 * @route   GET /api/schedules/:id
 * @desc    일정 상세 정보 조회
 * @access  Private
 */
router.get('/:id', validateId('id'), async (req, res) => {
  try {
    const scheduleId = req.params.id;

    // 일정 접근 권한 확인
    const hasAccess = await Schedule.hasScheduleAccess(scheduleId, req.user.id);
    if (!hasAccess) {
      return res.status(403).json({
        success: false,
        error: '일정에 접근할 권한이 없습니다',
        code: 'NO_SCHEDULE_ACCESS',
      });
    }

    const schedule = await Schedule.getScheduleWithParticipants(scheduleId);
    if (!schedule) {
      return res.status(404).json({
        success: false,
        error: '일정을 찾을 수 없습니다',
        code: 'SCHEDULE_NOT_FOUND',
      });
    }

    res.json({
      success: true,
      data: {
        schedule,
      },
    });
  } catch (error) {
    logger.error('일정 상세 조회 오류:', {
      error: error.message,
      scheduleId: req.params.id,
      userId: req.user.id,
    });

    res.status(500).json({
      success: false,
      error: '일정 상세 조회 중 오류가 발생했습니다',
      code: 'SCHEDULE_FETCH_FAILED',
    });
  }
});

/**
 * @route   PUT /api/schedules/:id
 * @desc    일정 수정
 * @access  Private
 */
router.put('/:id', validateId('id'), validateScheduleUpdate, async (req, res) => {
  try {
    const scheduleId = req.params.id;

    // 일정 수정 권한 확인
    const canEdit = await Schedule.canEditSchedule(scheduleId, req.user.id);
    if (!canEdit) {
      return res.status(403).json({
        success: false,
        error: '일정을 수정할 권한이 없습니다',
        code: 'NO_EDIT_PERMISSION',
      });
    }

    const { title, content, startDatetime, endDatetime, participantIds, category, priority } = req.body;

    // 시간 변경 시 유효성 검사
    if (startDatetime && endDatetime) {
      const start = new Date(startDatetime);
      const end = new Date(endDatetime);

      if (end <= start) {
        return res.status(400).json({
          success: false,
          error: '종료 시간은 시작 시간보다 늦어야 합니다',
          code: 'INVALID_TIME_RANGE',
        });
      }
    }

    const updateData = {};
    if (title !== undefined) updateData.title = title;
    if (content !== undefined) updateData.content = content;
    if (startDatetime !== undefined) updateData.startDatetime = startDatetime;
    if (endDatetime !== undefined) updateData.endDatetime = endDatetime;
    if (participantIds !== undefined) updateData.participantIds = participantIds;
    if (category !== undefined) updateData.category = category;
    if (priority !== undefined) updateData.priority = priority;

    if (Object.keys(updateData).length === 0) {
      return res.status(400).json({
        success: false,
        error: '업데이트할 데이터가 없습니다',
        code: 'NO_UPDATE_DATA',
      });
    }

    const updatedSchedule = await Schedule.updateSchedule(scheduleId, updateData);

    res.json({
      success: true,
      message: '일정이 수정되었습니다',
      data: {
        schedule: updatedSchedule,
      },
    });
  } catch (error) {
    logger.error('일정 수정 오류:', {
      error: error.message,
      scheduleId: req.params.id,
      userId: req.user.id,
      updateData: req.body,
    });

    // 충돌 오류인 경우 특별 처리
    if (error.code === 'SCHEDULE_CONFLICT') {
      return res.status(409).json({
        success: false,
        error: error.message,
        code: 'SCHEDULE_CONFLICT',
        conflicts: error.conflicts,
      });
    }

    res.status(400).json({
      success: false,
      error: error.message,
      code: 'SCHEDULE_UPDATE_FAILED',
    });
  }
});

/**
 * @route   DELETE /api/schedules/:id
 * @desc    일정 삭제
 * @access  Private
 */
router.delete('/:id', validateId('id'), async (req, res) => {
  try {
    const scheduleId = req.params.id;

    // 일정 수정 권한 확인 (삭제도 동일한 권한)
    const canEdit = await Schedule.canEditSchedule(scheduleId, req.user.id);
    if (!canEdit) {
      return res.status(403).json({
        success: false,
        error: '일정을 삭제할 권한이 없습니다',
        code: 'NO_DELETE_PERMISSION',
      });
    }

    const deleted = await Schedule.delete(scheduleId);
    if (!deleted) {
      return res.status(404).json({
        success: false,
        error: '일정을 찾을 수 없습니다',
        code: 'SCHEDULE_NOT_FOUND',
      });
    }

    res.json({
      success: true,
      message: '일정이 삭제되었습니다',
    });
  } catch (error) {
    logger.error('일정 삭제 오류:', {
      error: error.message,
      scheduleId: req.params.id,
      userId: req.user.id,
    });

    res.status(500).json({
      success: false,
      error: '일정 삭제 중 오류가 발생했습니다',
      code: 'SCHEDULE_DELETE_FAILED',
    });
  }
});

/**
 * @route   POST /api/schedules/check-conflict
 * @desc    일정 충돌 확인
 * @access  Private
 */
router.post('/check-conflict', validateConflictCheck, async (req, res) => {
  try {
    const { startDatetime, endDatetime, participantIds, excludeScheduleId } = req.body;

    // 모든 참가자가 접근 가능한지 확인 (향후 확장 가능)
    // 현재는 요청자 포함 여부만 확인
    if (!participantIds.includes(req.user.id)) {
      return res.status(400).json({
        success: false,
        error: '참가자 목록에 본인이 포함되어야 합니다',
        code: 'SELF_NOT_INCLUDED',
      });
    }

    const conflicts = await Schedule.checkScheduleConflicts(
      participantIds,
      startDatetime,
      endDatetime,
      excludeScheduleId
    );

    res.json({
      success: true,
      data: {
        hasConflict: conflicts.length > 0,
        conflicts,
      },
    });
  } catch (error) {
    logger.error('일정 충돌 확인 오류:', {
      error: error.message,
      userId: req.user.id,
      checkData: req.body,
    });

    res.status(500).json({
      success: false,
      error: '일정 충돌 확인 중 오류가 발생했습니다',
      code: 'CONFLICT_CHECK_FAILED',
    });
  }
});

module.exports = router;