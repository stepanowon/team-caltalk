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

/**
 * @swagger
 * components:
 *   schemas:
 *     Team:
 *       type: object
 *       properties:
 *         id:
 *           type: integer
 *           format: int64
 *           example: 1
 *         name:
 *           type: string
 *           example: 백엔드 개발팀
 *         description:
 *           type: string
 *           example: Node.js 백엔드 API 개발팀
 *         inviteCode:
 *           type: string
 *           example: ABC123
 *           description: 팀 참여용 초대 코드
 *         creatorId:
 *           type: integer
 *           format: int64
 *           example: 1
 *         memberCount:
 *           type: integer
 *           example: 5
 *         createdAt:
 *           type: string
 *           format: date-time
 *           example: 2025-09-23T10:30:00Z
 *         updatedAt:
 *           type: string
 *           format: date-time
 *           example: 2025-09-23T10:30:00Z
 *     TeamMember:
 *       type: object
 *       properties:
 *         userId:
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
 *         role:
 *           type: string
 *           enum: [leader, member]
 *           example: member
 *         joinedAt:
 *           type: string
 *           format: date-time
 *           example: 2025-09-23T10:30:00Z
 */

// 모든 팀 라우트에 인증 및 Rate Limiting 적용
router.use(authenticateToken);
router.use(generalRateLimit);

/**
 * @swagger
 * /api/teams:
 *   post:
 *     tags: [팀]
 *     summary: 새 팀 생성
 *     description: 새로운 팀을 생성하고 생성자가 팀장 권한을 받습니다
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name]
 *             properties:
 *               name:
 *                 type: string
 *                 minLength: 2
 *                 maxLength: 30
 *                 example: 백엔드 개발팀
 *                 description: 팀 이름
 *               teamDescription:
 *                 type: string
 *                 maxLength: 1000
 *                 example: Node.js 백엔드 API 개발팀
 *                 description: 팀 설명 (선택사항)
 *     responses:
 *       201:
 *         description: 팀 생성 성공
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
 *                   example: 팀이 생성되었습니다
 *                 data:
 *                   type: object
 *                   properties:
 *                     team:
 *                       $ref: '#/components/schemas/Team'
 *       400:
 *         $ref: '#/components/responses/BadRequest'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       429:
 *         $ref: '#/components/responses/TooManyRequests'
 *   get:
 *     tags: [팀]
 *     summary: 사용자 소속 팀 목록 조회
 *     description: 현재 사용자가 소속된 모든 팀 목록을 조회합니다
 *     parameters:
 *       - $ref: '#/components/parameters/page'
 *       - $ref: '#/components/parameters/limit'
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
 *                         $ref: '#/components/schemas/Team'
 *                     pagination:
 *                       type: object
 *                       properties:
 *                         page:
 *                           type: integer
 *                           example: 1
 *                         limit:
 *                           type: integer
 *                           example: 50
 *                         totalItems:
 *                           type: integer
 *                           example: 25
 *                         totalPages:
 *                           type: integer
 *                           example: 3
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
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
 * @swagger
 * /api/teams/{teamId}:
 *   get:
 *     tags: [팀]
 *     summary: 특정 팀 정보 조회
 *     description: 팀 ID로 특정 팀의 상세 정보와 멤버 목록을 조회합니다
 *     parameters:
 *       - $ref: '#/components/parameters/teamId'
 *     responses:
 *       200:
 *         description: 팀 정보 조회 성공
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
 *                     team:
 *                       allOf:
 *                         - $ref: '#/components/schemas/Team'
 *                         - type: object
 *                           properties:
 *                             members:
 *                               type: array
 *                               items:
 *                                 $ref: '#/components/schemas/TeamMember'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 *       404:
 *         $ref: '#/components/responses/NotFound'
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
 * @swagger
 * /api/teams/{teamId}:
 *   put:
 *     tags: [팀]
 *     summary: 팀 정보 업데이트
 *     description: 팀장만 팀의 이름과 설명을 수정할 수 있습니다
 *     parameters:
 *       - $ref: '#/components/parameters/teamId'
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
 *                 example: 백엔드 개발팀 (수정)
 *                 description: 새로운 팀 이름
 *               teamDescription:
 *                 type: string
 *                 maxLength: 1000
 *                 example: Node.js 백엔드 API 개발팀 (수정된 설명)
 *                 description: 새로운 팀 설명
 *     responses:
 *       200:
 *         description: 팀 정보 업데이트 성공
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
 *                   example: 팀 정보가 업데이트되었습니다
 *                 data:
 *                   type: object
 *                   properties:
 *                     team:
 *                       $ref: '#/components/schemas/Team'
 *       400:
 *         $ref: '#/components/responses/BadRequest'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 *       404:
 *         $ref: '#/components/responses/NotFound'
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
 * @swagger
 * /api/teams/{teamId}:
 *   delete:
 *     tags: [팀]
 *     summary: 팀 삭제
 *     description: 팀 생성자만 팀을 삭제할 수 있습니다. 삭제 시 모든 관련 데이터가 함께 삭제됩니다
 *     parameters:
 *       - $ref: '#/components/parameters/teamId'
 *     responses:
 *       200:
 *         description: 팀 삭제 성공
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
 *                   example: 팀이 삭제되었습니다
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       403:
 *         description: 팀 생성자가 아님
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *             example:
 *               success: false
 *               error: 팀 생성자만 팀을 삭제할 수 있습니다
 *               code: NOT_TEAM_CREATOR
 *       404:
 *         $ref: '#/components/responses/NotFound'
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
 * @swagger
 * /api/teams/join:
 *   post:
 *     tags: [팀]
 *     summary: 초대 코드로 팀 가입
 *     description: 팀의 초대 코드를 사용하여 팀에 가입합니다
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [inviteCode]
 *             properties:
 *               inviteCode:
 *                 type: string
 *                 pattern: '^[A-Z0-9]{6}$'
 *                 example: ABC123
 *                 description: 6자리 영문 대문자 및 숫자 조합의 초대 코드
 *     responses:
 *       201:
 *         description: 팀 가입 성공
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
 *                   example: 팀에 가입되었습니다
 *                 data:
 *                   type: object
 *                   properties:
 *                     team:
 *                       $ref: '#/components/schemas/Team'
 *       400:
 *         description: 이미 팀 멤버이거나 잘못된 요청
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *             examples:
 *               already_member:
 *                 summary: 이미 팀 멤버인 경우
 *                 value:
 *                   success: false
 *                   error: 이미 팀의 멤버입니다
 *                   code: ALREADY_TEAM_MEMBER
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       404:
 *         description: 유효하지 않은 초대 코드
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *             example:
 *               success: false
 *               error: 유효하지 않은 초대 코드입니다
 *               code: INVALID_INVITE_CODE
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
 * @swagger
 * /api/teams/{teamId}/leave:
 *   post:
 *     tags: [팀]
 *     summary: 팀 탈퇴
 *     description: 현재 사용자가 팀에서 탈퇴합니다. 팀 생성자는 탈퇴할 수 없습니다
 *     parameters:
 *       - $ref: '#/components/parameters/teamId'
 *     responses:
 *       200:
 *         description: 팀 탈퇴 성공
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
 *                   example: 팀에서 탈퇴되었습니다
 *       400:
 *         description: 팀 생성자는 탈퇴 불가
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 *       404:
 *         $ref: '#/components/responses/NotFound'
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
 * @swagger
 * /api/teams/{teamId}/members:
 *   get:
 *     tags: [팀]
 *     summary: 팀 멤버 목록 조회
 *     description: 팀에 속한 모든 멤버들의 정보를 조회합니다
 *     parameters:
 *       - $ref: '#/components/parameters/teamId'
 *     responses:
 *       200:
 *         description: 팀 멤버 목록 조회 성공
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
 *                     members:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/TeamMember'
 *                     total:
 *                       type: integer
 *                       example: 5
 *                       description: 전체 멤버 수
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 *       404:
 *         $ref: '#/components/responses/NotFound'
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
 * @swagger
 * /api/teams/{teamId}/members/{userId}:
 *   delete:
 *     tags: [팀]
 *     summary: 팀 멤버 제거
 *     description: 팀장이 특정 멤버를 팀에서 제거합니다. 자신은 제거할 수 없습니다
 *     parameters:
 *       - $ref: '#/components/parameters/teamId'
 *       - $ref: '#/components/parameters/userId'
 *     responses:
 *       200:
 *         description: 팀 멤버 제거 성공
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
 *                   example: 팀 멤버가 제거되었습니다
 *       400:
 *         description: 자신을 제거하려고 시도하거나 잘못된 요청
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *             example:
 *               success: false
 *               error: 자신을 팀에서 제거할 수 없습니다
 *               code: CANNOT_REMOVE_SELF
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 *       404:
 *         $ref: '#/components/responses/NotFound'
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
 * @swagger
 * /api/teams/{teamId}/regenerate-code:
 *   post:
 *     tags: [팀]
 *     summary: 팀 초대 코드 재생성
 *     description: 팀장이 팀의 초대 코드를 새로 생성합니다. 기존 코드는 사용할 수 없게 됩니다
 *     parameters:
 *       - $ref: '#/components/parameters/teamId'
 *     responses:
 *       200:
 *         description: 초대 코드 재생성 성공
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
 *                   example: 초대 코드가 재생성되었습니다
 *                 data:
 *                   type: object
 *                   properties:
 *                     inviteCode:
 *                       type: string
 *                       pattern: '^[A-Z0-9]{6}$'
 *                       example: XYZ789
 *                       description: 새로 생성된 6자리 초대 코드
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 *       404:
 *         $ref: '#/components/responses/NotFound'
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
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