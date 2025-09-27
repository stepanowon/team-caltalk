const express = require('express');
const Team = require('../models/Team');
const { authenticateToken, requireTeamMembership, requireTeamLeadership } = require('../middleware/auth');
const { generalRateLimit } = require('../middleware/security');
const {
  validateTeamCreation,
  validateTeamUpdate,
  validateId,
  validateInviteCode,
  validatePagination,
} = require('../middleware/validation');
const logger = require('../config/logger');

const router = express.Router();

// 모든 팀 라우트에 인증 및 Rate Limiting 적용
router.use(authenticateToken);
router.use(generalRateLimit);

/**
 * @route   POST /api/v1/teams
 * @desc    새 팀 생성
 * @access  Private
 */
router.post('/', validateTeamCreation, async (req, res) => {
  try {
    const { name, description } = req.body;

    const team = await Team.createTeam({
      name,
      description,
      creatorId: req.user.id,
    });

    res.status(201).json({
      success: true,
      message: '팀이 생성되었습니다',
      data: {
        team,
      },
    });
  } catch (error) {
    logger.error('팀 생성 오류:', {
      error: error.message,
      userId: req.user.id,
      teamData: req.body,
    });

    res.status(400).json({
      success: false,
      error: error.message,
      code: 'TEAM_CREATION_FAILED',
    });
  }
});

/**
 * @route   GET /api/v1/teams
 * @desc    사용자가 속한 팀 목록 조회
 * @access  Private
 */
router.get('/', validatePagination, async (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const offset = (page - 1) * limit;

    const query = `
      SELECT
        t.id,
        t.name,
        t.description,
        t.invite_code,
        t.creator_id,
        t.created_at,
        t.updated_at,
        tm.role,
        tm.joined_at,
        (SELECT COUNT(*) FROM team_members WHERE team_id = t.id) as member_count
      FROM teams t
      JOIN team_members tm ON t.id = tm.team_id
      WHERE tm.user_id = $1
      ORDER BY tm.joined_at DESC
      LIMIT $2 OFFSET $3
    `;

    const result = await Team.db.query(query, [req.user.id, limit, offset]);

    // 총 개수 조회
    const countQuery = `
      SELECT COUNT(*) as total
      FROM team_members
      WHERE user_id = $1
    `;
    const countResult = await Team.db.query(countQuery, [req.user.id]);
    const total = parseInt(countResult.rows[0].total);

    res.json({
      success: true,
      data: {
        teams: result.rows,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit),
        },
      },
    });
  } catch (error) {
    logger.error('팀 목록 조회 오류:', {
      error: error.message,
      userId: req.user.id,
    });

    res.status(500).json({
      success: false,
      error: '팀 목록 조회 중 오류가 발생했습니다',
      code: 'TEAMS_FETCH_FAILED',
    });
  }
});

/**
 * @route   GET /api/v1/teams/:id
 * @desc    특정 팀 정보 조회
 * @access  Private (팀 멤버만)
 */
router.get('/:id', validateId('id'), requireTeamMembership('id'), async (req, res) => {
  try {
    const teamId = req.params.id;

    const team = await Team.findById(teamId);
    const members = await Team.getMembers(teamId);

    res.json({
      success: true,
      data: {
        team: {
          ...team,
          members,
          memberCount: members.length,
        },
      },
    });
  } catch (error) {
    logger.error('팀 정보 조회 오류:', {
      error: error.message,
      teamId: req.params.id,
      userId: req.user.id,
    });

    res.status(500).json({
      success: false,
      error: '팀 정보 조회 중 오류가 발생했습니다',
      code: 'TEAM_FETCH_FAILED',
    });
  }
});

/**
 * @route   PUT /api/v1/teams/:id
 * @desc    팀 정보 업데이트
 * @access  Private (팀 리더만)
 */
router.put('/:id', validateId('id'), requireTeamLeadership('id'), validateTeamUpdate, async (req, res) => {
  try {
    const teamId = req.params.id;
    const { name, description } = req.body;

    const updateData = {};
    if (name !== undefined) updateData.name = name;
    if (description !== undefined) updateData.description = description;

    if (Object.keys(updateData).length === 0) {
      return res.status(400).json({
        success: false,
        error: '업데이트할 데이터가 없습니다',
        code: 'NO_UPDATE_DATA',
      });
    }

    const updatedTeam = await Team.update(teamId, updateData);

    res.json({
      success: true,
      message: '팀 정보가 업데이트되었습니다',
      data: {
        team: updatedTeam,
      },
    });
  } catch (error) {
    logger.error('팀 정보 업데이트 오류:', {
      error: error.message,
      teamId: req.params.id,
      userId: req.user.id,
      updateData: req.body,
    });

    res.status(400).json({
      success: false,
      error: error.message,
      code: 'TEAM_UPDATE_FAILED',
    });
  }
});

/**
 * @route   DELETE /api/v1/teams/:id
 * @desc    팀 삭제
 * @access  Private (팀 생성자만)
 */
router.delete('/:id', validateId('id'), async (req, res) => {
  try {
    const teamId = req.params.id;

    const team = await Team.findById(teamId);
    if (!team) {
      return res.status(404).json({
        success: false,
        error: '팀을 찾을 수 없습니다',
        code: 'TEAM_NOT_FOUND',
      });
    }

    // 팀 생성자만 삭제 가능
    if (team.creator_id !== req.user.id) {
      return res.status(403).json({
        success: false,
        error: '팀 생성자만 팀을 삭제할 수 있습니다',
        code: 'NOT_TEAM_CREATOR',
      });
    }

    await Team.delete(teamId);

    res.json({
      success: true,
      message: '팀이 삭제되었습니다',
    });
  } catch (error) {
    logger.error('팀 삭제 오류:', {
      error: error.message,
      teamId: req.params.id,
      userId: req.user.id,
    });

    res.status(500).json({
      success: false,
      error: '팀 삭제 중 오류가 발생했습니다',
      code: 'TEAM_DELETE_FAILED',
    });
  }
});

/**
 * @route   POST /api/v1/teams/join
 * @desc    초대 코드로 팀 가입
 * @access  Private
 */
router.post('/join', validateInviteCode, async (req, res) => {
  try {
    const { inviteCode } = req.body;

    const team = await Team.findByInviteCode(inviteCode);
    if (!team) {
      return res.status(404).json({
        success: false,
        error: '유효하지 않은 초대 코드입니다',
        code: 'INVALID_INVITE_CODE',
      });
    }

    // 이미 팀 멤버인지 확인
    const isMember = await Team.isTeamMember(team.id, req.user.id);
    if (isMember) {
      return res.status(400).json({
        success: false,
        error: '이미 팀의 멤버입니다',
        code: 'ALREADY_TEAM_MEMBER',
      });
    }

    await Team.addMember(team.id, req.user.id, 'member');

    res.status(201).json({
      success: true,
      message: '팀에 가입되었습니다',
      data: {
        team,
      },
    });
  } catch (error) {
    logger.error('팀 가입 오류:', {
      error: error.message,
      inviteCode: req.body.inviteCode,
      userId: req.user.id,
    });

    res.status(400).json({
      success: false,
      error: error.message,
      code: 'TEAM_JOIN_FAILED',
    });
  }
});

/**
 * @route   POST /api/v1/teams/:id/leave
 * @desc    팀 탈퇴
 * @access  Private (팀 멤버만, 생성자 제외)
 */
router.post('/:id/leave', validateId('id'), requireTeamMembership('id'), async (req, res) => {
  try {
    const teamId = req.params.id;

    await Team.removeMember(teamId, req.user.id);

    res.json({
      success: true,
      message: '팀에서 탈퇴되었습니다',
    });
  } catch (error) {
    logger.error('팀 탈퇴 오류:', {
      error: error.message,
      teamId: req.params.id,
      userId: req.user.id,
    });

    res.status(400).json({
      success: false,
      error: error.message,
      code: 'TEAM_LEAVE_FAILED',
    });
  }
});

/**
 * @route   GET /api/v1/teams/:id/members
 * @desc    팀 멤버 목록 조회
 * @access  Private (팀 멤버만)
 */
router.get('/:id/members', validateId('id'), requireTeamMembership('id'), async (req, res) => {
  try {
    const teamId = req.params.id;

    const members = await Team.getMembers(teamId);

    res.json({
      success: true,
      data: {
        members,
        total: members.length,
      },
    });
  } catch (error) {
    logger.error('팀 멤버 조회 오류:', {
      error: error.message,
      teamId: req.params.id,
      userId: req.user.id,
    });

    res.status(500).json({
      success: false,
      error: '팀 멤버 조회 중 오류가 발생했습니다',
      code: 'TEAM_MEMBERS_FETCH_FAILED',
    });
  }
});

/**
 * @route   DELETE /api/v1/teams/:id/members/:userId
 * @desc    팀 멤버 제거
 * @access  Private (팀 리더만)
 */
router.delete('/:id/members/:userId', validateId('id'), validateId('userId'), requireTeamLeadership('id'), async (req, res) => {
  try {
    const teamId = req.params.id;
    const userId = parseInt(req.params.userId);

    // 자신을 제거할 수 없음
    if (userId === req.user.id) {
      return res.status(400).json({
        success: false,
        error: '자신을 팀에서 제거할 수 없습니다',
        code: 'CANNOT_REMOVE_SELF',
      });
    }

    await Team.removeMember(teamId, userId);

    res.json({
      success: true,
      message: '팀 멤버가 제거되었습니다',
    });
  } catch (error) {
    logger.error('팀 멤버 제거 오류:', {
      error: error.message,
      teamId: req.params.id,
      targetUserId: req.params.userId,
      userId: req.user.id,
    });

    res.status(400).json({
      success: false,
      error: error.message,
      code: 'TEAM_MEMBER_REMOVE_FAILED',
    });
  }
});

/**
 * @route   POST /api/v1/teams/:id/regenerate-code
 * @desc    팀 초대 코드 재생성
 * @access  Private (팀 리더만)
 */
router.post('/:id/regenerate-code', validateId('id'), requireTeamLeadership('id'), async (req, res) => {
  try {
    const teamId = req.params.id;

    const updatedTeam = await Team.regenerateInviteCode(teamId);

    res.json({
      success: true,
      message: '초대 코드가 재생성되었습니다',
      data: {
        inviteCode: updatedTeam.invite_code,
      },
    });
  } catch (error) {
    logger.error('초대 코드 재생성 오류:', {
      error: error.message,
      teamId: req.params.id,
      userId: req.user.id,
    });

    res.status(500).json({
      success: false,
      error: '초대 코드 재생성 중 오류가 발생했습니다',
      code: 'INVITE_CODE_REGENERATE_FAILED',
    });
  }
});

module.exports = router;