const express = require('express');
const router = express.Router();
const db = require('../config/database');
const { authenticateToken } = require('../middleware/auth');
const logger = require('../config/logger');

/**
 * GET /api/activities
 * 사용자의 최근 활동 내역 조회
 * - 일정 생성/수정/삭제
 * - 일정 변경 요청 (생성/승인/거절)
 * - 팀원 가입
 */
router.get('/', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const { teamId, limit = 10 } = req.query;

    // 사용자가 속한 팀들의 ID 조회
    let teamIds = [];
    if (teamId) {
      teamIds = [parseInt(teamId)];
    } else {
      const teamsResult = await db.query(
        'SELECT team_id FROM team_members WHERE user_id = $1',
        [userId]
      );
      teamIds = teamsResult.rows.map(row => row.team_id);
    }

    if (teamIds.length === 0) {
      return res.json({
        success: true,
        data: { activities: [] }
      });
    }

    const activities = [];

    // 1. 일정 관련 활동 (최근 1개월 내 생성/수정/삭제)
    const schedulesQuery = `
      SELECT
        s.id,
        s.title,
        s.start_datetime,
        s.end_datetime,
        s.created_at,
        s.updated_at,
        s.team_id,
        t.name as team_name,
        u.name as creator_name,
        CASE
          WHEN s.created_at = s.updated_at THEN 'schedule_created'
          ELSE 'schedule_updated'
        END as activity_type
      FROM schedules s
      JOIN teams t ON s.team_id = t.id
      JOIN users u ON s.creator_id = u.id
      WHERE s.team_id = ANY($1)
        AND s.updated_at >= NOW() - INTERVAL '1 month'
      ORDER BY s.updated_at DESC
      LIMIT $2
    `;

    const schedulesResult = await db.query(schedulesQuery, [teamIds, limit]);

    schedulesResult.rows.forEach(row => {
      const isCreated = row.activity_type === 'schedule_created';
      activities.push({
        id: `schedule_${row.id}_${row.updated_at}`,
        type: row.activity_type,
        icon: isCreated ? '📅' : '✏️',
        title: isCreated ? '일정 생성' : '일정 수정',
        description: `"${row.title}" 일정이 ${isCreated ? '생성' : '수정'}되었습니다`,
        actor: row.creator_name,
        teamName: row.team_name,
        timestamp: isCreated ? row.created_at : row.updated_at,
        metadata: {
          scheduleId: row.id,
          scheduleTitle: row.title,
          startDatetime: row.start_datetime,
          endDatetime: row.end_datetime
        }
      });
    });

    // 2. 일정 변경 요청 관련 활동 (최근 1개월)
    const requestsQuery = `
      SELECT
        m.id,
        m.content,
        m.message_type,
        m.sent_at,
        m.team_id,
        m.related_schedule_id,
        t.name as team_name,
        sender.name as sender_name,
        s.title as schedule_title
      FROM messages m
      JOIN teams t ON m.team_id = t.id
      JOIN users sender ON m.sender_id = sender.id
      LEFT JOIN schedules s ON m.related_schedule_id = s.id
      WHERE m.team_id = ANY($1)
        AND m.message_type IN ('schedule_request', 'schedule_approved', 'schedule_rejected')
        AND m.sent_at >= NOW() - INTERVAL '1 month'
      ORDER BY m.sent_at DESC
      LIMIT $2
    `;

    const requestsResult = await db.query(requestsQuery, [teamIds, limit]);

    requestsResult.rows.forEach(row => {
      let icon, title, description;

      switch (row.message_type) {
        case 'schedule_request':
          icon = '🔔';
          title = '일정 변경 요청';
          description = `${row.sender_name}님이 "${row.content}" 요청을 보냈습니다`;
          break;
        case 'schedule_approved':
          icon = '✅';
          title = '일정 변경 승인';
          description = `"${row.content}" 요청이 승인되었습니다`;
          break;
        case 'schedule_rejected':
          icon = '❌';
          title = '일정 변경 거절';
          description = `"${row.content}" 요청이 거절되었습니다`;
          break;
      }

      activities.push({
        id: `message_${row.id}`,
        type: row.message_type,
        icon,
        title,
        description,
        actor: row.sender_name,
        teamName: row.team_name,
        timestamp: row.sent_at,
        metadata: {
          messageId: row.id,
          scheduleId: row.related_schedule_id,
          scheduleTitle: row.schedule_title
        }
      });
    });

    // 3. 팀 활동 (최근 1개월 내 새 팀원 가입)
    const membersQuery = `
      SELECT
        tm.id,
        tm.joined_at,
        tm.team_id,
        t.name as team_name,
        u.name as user_name,
        u.id as user_id
      FROM team_members tm
      JOIN teams t ON tm.team_id = t.id
      JOIN users u ON tm.user_id = u.id
      WHERE tm.team_id = ANY($1)
        AND tm.user_id != $2
        AND tm.joined_at >= NOW() - INTERVAL '1 month'
      ORDER BY tm.joined_at DESC
      LIMIT $3
    `;

    const membersResult = await db.query(membersQuery, [teamIds, userId, limit]);

    membersResult.rows.forEach(row => {
      activities.push({
        id: `member_${row.id}`,
        type: 'member_joined',
        icon: '👤',
        title: '새 팀원',
        description: `${row.user_name}님이 팀에 합류했습니다`,
        actor: row.user_name,
        teamName: row.team_name,
        timestamp: row.joined_at,
        metadata: {
          userId: row.user_id,
          teamId: row.team_id
        }
      });
    });

    // 모든 활동을 시간순으로 정렬하고 limit 적용
    activities.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
    const limitedActivities = activities.slice(0, parseInt(limit));

    logger.info('활동 내역 조회 성공', {
      userId,
      teamIds,
      activityCount: limitedActivities.length
    });

    res.json({
      success: true,
      data: {
        activities: limitedActivities,
        total: limitedActivities.length
      }
    });

  } catch (error) {
    logger.error('활동 내역 조회 오류:', error);
    res.status(500).json({
      success: false,
      error: '활동 내역 조회 중 오류가 발생했습니다',
      code: 'ACTIVITIES_FETCH_ERROR'
    });
  }
});

module.exports = router;