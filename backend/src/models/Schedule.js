const BaseModel = require('./BaseModel');
const config = require('../config/environment');
const logger = require('../config/logger');
const eventService = require('../services/EventService');

/**
 * 일정 모델
 * 개인 및 팀 일정 관리 기능 제공
 */
class Schedule extends BaseModel {
  constructor() {
    super('schedules');
  }

  /**
   * 새 일정 생성
   * @param {Object} scheduleData - 일정 데이터
   * @param {string} scheduleData.title - 일정 제목
   * @param {string} scheduleData.content - 일정 내용
   * @param {Date} scheduleData.startDatetime - 시작 시간
   * @param {Date} scheduleData.endDatetime - 종료 시간
   * @param {string} scheduleData.scheduleType - 일정 유형 (personal, team)
   * @param {number} scheduleData.creatorId - 생성자 ID
   * @param {number} scheduleData.teamId - 팀 ID (팀 일정인 경우)
   * @param {number[]} scheduleData.participantIds - 참가자 ID 목록
   */
  async createSchedule(scheduleData) {
    const start = Date.now();
    try {
      const {
        title,
        content,
        startDatetime,
        endDatetime,
        scheduleType,
        creatorId,
        teamId,
        participantIds = []
      } = scheduleData;

      // 입력 검증
      this.validateScheduleData(scheduleData);

      // 일정 기간 검증 (최대 7일)
      const duration = new Date(endDatetime) - new Date(startDatetime);
      if (duration > config.business.maxScheduleDuration) {
        throw new Error('일정 기간은 최대 7일을 초과할 수 없습니다');
      }

      // 팀 일정인 경우 팀 ID 필수
      if (scheduleType === 'team' && !teamId) {
        throw new Error('팀 일정은 팀 ID가 필요합니다');
      }

      // 참가자가 지정된 경우에만 충돌 검사
      if (participantIds.length > 0) {
        const conflicts = await this.checkScheduleConflicts(
          participantIds,
          startDatetime,
          endDatetime
        );

        if (conflicts.length > 0) {
          const conflictError = new Error('일정 충돌이 발생했습니다');
          conflictError.code = 'SCHEDULE_CONFLICT';
          conflictError.conflicts = conflicts;
          throw conflictError;
        }
      }

      // 참가자 목록 생성 (지정된 참가자만 포함, 생성자는 자동 포함하지 않음)
      const allParticipants = [...new Set(participantIds)];

      // 트랜잭션으로 일정과 참가자 생성
      const result = await this.transaction(async (client) => {
        // 일정 생성
        const scheduleResult = await client.query(`
          INSERT INTO schedules (
            title, content, start_datetime, end_datetime,
            schedule_type, creator_id, team_id
          )
          VALUES ($1, $2, $3, $4, $5, $6, $7)
          RETURNING *
        `, [
          title.trim(),
          content?.trim() || null,
          startDatetime,
          endDatetime,
          scheduleType,
          creatorId,
          teamId || null
        ]);

        const schedule = scheduleResult.rows[0];

        // 참가자 추가 (참가자가 지정된 경우에만)
        if (allParticipants.length > 0) {
          for (const participantId of allParticipants) {
            await client.query(`
              INSERT INTO schedule_participants (schedule_id, user_id, participation_status)
              VALUES ($1, $2, 'confirmed')
            `, [schedule.id, participantId]);
          }
        }

        return schedule;
      });

      logger.performance('Schedule.createSchedule', Date.now() - start, {
        scheduleId: result.id,
        creatorId,
        scheduleType,
        participantCount: allParticipants.length,
      });

      logger.audit('SCHEDULE_CREATED', {
        scheduleId: result.id,
        title: title.trim(),
        creatorId,
        scheduleType,
        teamId,
        startDatetime,
        endDatetime,
        participantIds,
      });

      // 실시간 이벤트 발생
      if (teamId && allParticipants.length > 0) {
        try {
          await eventService.broadcastEvent({
            eventType: 'schedule_created',
            teamId,
            data: {
              schedule: {
                id: result.id,
                title: result.title,
                startDatetime: result.start_datetime,
                endDatetime: result.end_datetime,
                scheduleType: result.schedule_type,
                creatorId: result.creator_id,
              },
            },
            affectedUserIds: allParticipants,
          });
        } catch (eventError) {
          logger.error('일정 생성 이벤트 발생 오류:', eventError);
        }
      }

      return result;
    } catch (error) {
      logger.error('Schedule.createSchedule 오류:', {
        scheduleData,
        error: error.message
      });
      throw error;
    }
  }

  /**
   * 사용자의 일정 목록 조회
   * @param {number} userId - 사용자 ID
   * @param {Object} filters - 필터 조건
   * @param {Date} filters.startDate - 조회 시작 날짜
   * @param {Date} filters.endDate - 조회 종료 날짜
   * @param {number} filters.teamId - 특정 팀 필터
   * @param {string} filters.scheduleType - 일정 유형 필터
   */
  async getUserSchedules(userId, filters = {}) {
    const start = Date.now();
    try {
      const { startDate, endDate, teamId, scheduleType } = filters;

      let query = `
        SELECT DISTINCT
          s.*,
          u.name as creator_name,
          t.name as team_name,
          (
            SELECT COUNT(*)
            FROM schedule_participants sp2
            WHERE sp2.schedule_id = s.id
          ) as participant_count
        FROM schedules s
        LEFT JOIN users u ON s.creator_id = u.id
        LEFT JOIN teams t ON s.team_id = t.id
        LEFT JOIN schedule_participants sp ON s.id = sp.schedule_id
        WHERE (sp.user_id = $1 OR s.team_id IN (
          SELECT team_id FROM team_members WHERE user_id = $1
        ))
      `;

      const params = [userId];
      let paramIndex = 2;

      // 날짜 범위 필터
      if (startDate) {
        query += ` AND s.start_datetime >= $${paramIndex++}`;
        params.push(startDate);
      }
      if (endDate) {
        query += ` AND s.start_datetime <= $${paramIndex++}`;
        params.push(endDate);
      }

      // 팀 필터
      if (teamId) {
        query += ` AND s.team_id = $${paramIndex++}`;
        params.push(teamId);
      }

      // 일정 유형 필터
      if (scheduleType) {
        query += ` AND s.schedule_type = $${paramIndex++}`;
        params.push(scheduleType);
      }

      query += ` ORDER BY s.start_datetime ASC`;

      const result = await this.db.query(query, params);

      // 각 일정에 대한 participants 정보 추가
      const schedules = await Promise.all(
        result.rows.map(async (schedule) => {
          const participantsQuery = `
            SELECT
              sp.id,
              sp.schedule_id,
              sp.user_id,
              sp.participation_status as status,
              sp.created_at,
              u.name as user_name,
              u.email as user_email
            FROM schedule_participants sp
            JOIN users u ON sp.user_id = u.id
            WHERE sp.schedule_id = $1
            ORDER BY sp.created_at ASC
          `;
          const participantsResult = await this.db.query(participantsQuery, [schedule.id]);

          return {
            ...schedule,
            participants: participantsResult.rows
          };
        })
      );

      logger.performance('Schedule.getUserSchedules', Date.now() - start, {
        userId,
        scheduleCount: schedules.length,
        filters,
      });

      return schedules;
    } catch (error) {
      logger.error('Schedule.getUserSchedules 오류:', {
        userId,
        filters,
        error: error.message
      });
      throw error;
    }
  }

  /**
   * 일정 상세 정보 조회 (참가자 포함)
   * @param {number} scheduleId - 일정 ID
   */
  async getScheduleWithParticipants(scheduleId) {
    const start = Date.now();
    try {
      // 일정 기본 정보
      const scheduleQuery = `
        SELECT
          s.*,
          u.name as creator_name,
          u.email as creator_email,
          t.name as team_name,
          t.description as team_description
        FROM schedules s
        LEFT JOIN users u ON s.creator_id = u.id
        LEFT JOIN teams t ON s.team_id = t.id
        WHERE s.id = $1
      `;

      const scheduleResult = await this.db.query(scheduleQuery, [scheduleId]);

      if (scheduleResult.rows.length === 0) {
        return null;
      }

      const schedule = scheduleResult.rows[0];

      // 참가자 정보
      const participantsQuery = `
        SELECT
          sp.user_id,
          sp.participation_status,
          u.name,
          u.email
        FROM schedule_participants sp
        JOIN users u ON sp.user_id = u.id
        WHERE sp.schedule_id = $1
        ORDER BY u.name
      `;

      const participantsResult = await this.db.query(participantsQuery, [scheduleId]);

      schedule.participants = participantsResult.rows;

      // recurrence 필드가 JSON 문자열이면 파싱
      if (schedule.recurrence && typeof schedule.recurrence === 'string') {
        try {
          schedule.recurrence = JSON.parse(schedule.recurrence);
        } catch (e) {
          schedule.recurrence = null;
        }
      }

      logger.performance('Schedule.getScheduleWithParticipants', Date.now() - start, {
        scheduleId,
        participantCount: participantsResult.rows.length,
      });

      return schedule;
    } catch (error) {
      logger.error('Schedule.getScheduleWithParticipants 오류:', {
        scheduleId,
        error: error.message
      });
      throw error;
    }
  }

  /**
   * 일정 수정
   * @param {number} scheduleId - 일정 ID
   * @param {Object} updateData - 수정할 데이터
   */
  async updateSchedule(scheduleId, updateData) {
    const start = Date.now();
    try {
      const {
        title,
        content,
        startDatetime,
        endDatetime,
        participantIds,
        category,
        priority
      } = updateData;

      // 기존 일정 조회
      const existingSchedule = await this.findById(scheduleId);
      if (!existingSchedule) {
        throw new Error('일정을 찾을 수 없습니다');
      }

      // 시간 변경이 있는 경우 충돌 검사
      if (startDatetime || endDatetime) {
        const newStartDatetime = startDatetime || existingSchedule.start_datetime;
        const newEndDatetime = endDatetime || existingSchedule.end_datetime;

        // 일정 기간 검증
        const duration = new Date(newEndDatetime) - new Date(newStartDatetime);
        if (duration > config.business.maxScheduleDuration) {
          throw new Error('일정 기간은 최대 7일을 초과할 수 없습니다');
        }

        // 현재 참가자 목록 조회
        const currentParticipants = await this.getScheduleParticipants(scheduleId);
        const participantUserIds = participantIds || currentParticipants.map(p => p.user_id);

        // 충돌 검사 (현재 일정 제외)
        const conflicts = await this.checkScheduleConflicts(
          participantUserIds,
          newStartDatetime,
          newEndDatetime,
          scheduleId
        );

        if (conflicts.length > 0) {
          const conflictError = new Error('일정 충돌이 발생했습니다');
          conflictError.code = 'SCHEDULE_CONFLICT';
          conflictError.conflicts = conflicts;
          throw conflictError;
        }
      }

      // 트랜잭션으로 일정과 참가자 업데이트
      const result = await this.transaction(async (client) => {
        // 일정 업데이트
        const updateFields = {};
        if (title !== undefined) updateFields.title = title.trim();
        if (content !== undefined) updateFields.content = content?.trim() || null;
        if (startDatetime !== undefined) updateFields.start_datetime = startDatetime;
        if (endDatetime !== undefined) updateFields.end_datetime = endDatetime;
        if (category !== undefined) updateFields.category = category;
        if (priority !== undefined) updateFields.priority = priority;

        let updatedSchedule = existingSchedule;
        if (Object.keys(updateFields).length > 0) {
          updatedSchedule = await this.update(scheduleId, updateFields);
        }

        // 참가자 업데이트
        if (participantIds !== undefined) {
          // 기존 참가자 모두 삭제
          await client.query(`
            DELETE FROM schedule_participants
            WHERE schedule_id = $1
          `, [scheduleId]);

          // 새 참가자 추가 (중복 제거)
          const uniqueParticipants = [...new Set(participantIds)];

          if (uniqueParticipants.length > 0) {
            for (const participantId of uniqueParticipants) {
              await client.query(`
                INSERT INTO schedule_participants (schedule_id, user_id, participation_status)
                VALUES ($1, $2, 'confirmed')
                ON CONFLICT (schedule_id, user_id) DO NOTHING
              `, [scheduleId, participantId]);
            }
          }
        }

        return updatedSchedule;
      });

      logger.performance('Schedule.updateSchedule', Date.now() - start, {
        scheduleId,
        updateFields: Object.keys(updateData),
      });

      logger.audit('SCHEDULE_UPDATED', {
        scheduleId,
        updateData: { ...updateData, participantIds: participantIds?.length },
      });

      // 실시간 이벤트 발생
      if (existingSchedule.team_id) {
        try {
          const currentParticipants = await this.getScheduleParticipants(scheduleId);
          const affectedUserIds = currentParticipants.map(p => p.user_id);

          await eventService.broadcastEvent({
            eventType: 'schedule_updated',
            teamId: existingSchedule.team_id,
            data: {
              schedule: {
                id: scheduleId,
                title: result.title,
                startDatetime: result.start_datetime,
                endDatetime: result.end_datetime,
                scheduleType: result.schedule_type,
                updatedFields: Object.keys(updateData).filter(key => key !== 'participantIds'),
              },
            },
            affectedUserIds,
          });
        } catch (eventError) {
          logger.error('일정 수정 이벤트 발생 오류:', eventError);
        }
      }

      return result;
    } catch (error) {
      logger.error('Schedule.updateSchedule 오류:', {
        scheduleId,
        updateData,
        error: error.message
      });
      throw error;
    }
  }

  /**
   * 일정 충돌 검사
   * @param {number[]} userIds - 검사할 사용자 ID 목록
   * @param {Date} startDatetime - 시작 시간
   * @param {Date} endDatetime - 종료 시간
   * @param {number} excludeScheduleId - 제외할 일정 ID (수정 시)
   */
  async checkScheduleConflicts(userIds, startDatetime, endDatetime, excludeScheduleId = null) {
    const start = Date.now();
    try {
      if (!userIds || userIds.length === 0) {
        return [];
      }

      const query = `
        SELECT
          s.id,
          s.title,
          s.start_datetime,
          s.end_datetime,
          sp.user_id,
          u.name as user_name,
          EXTRACT(EPOCH FROM (
            LEAST(s.end_datetime, $3) - GREATEST(s.start_datetime, $2)
          )) / 60 as overlap_minutes
        FROM schedules s
        JOIN schedule_participants sp ON s.id = sp.schedule_id
        JOIN users u ON sp.user_id = u.id
        WHERE sp.user_id = ANY($1)
          AND s.start_datetime < $3
          AND s.end_datetime > $2
          ${excludeScheduleId ? 'AND s.id != $4' : ''}
        ORDER BY sp.user_id, s.start_datetime
      `;

      const params = [userIds, startDatetime, endDatetime];
      if (excludeScheduleId) {
        params.push(excludeScheduleId);
      }

      const result = await this.db.query(query, params);

      const conflicts = result.rows.map(row => ({
        userId: row.user_id,
        userName: row.user_name,
        conflictingSchedule: {
          id: row.id,
          title: row.title,
          startDatetime: row.start_datetime,
          endDatetime: row.end_datetime,
        },
        overlapMinutes: Math.round(row.overlap_minutes),
      }));

      logger.performance('Schedule.checkScheduleConflicts', Date.now() - start, {
        userCount: userIds.length,
        conflictCount: conflicts.length,
      });

      return conflicts;
    } catch (error) {
      logger.error('Schedule.checkScheduleConflicts 오류:', {
        userIds,
        startDatetime,
        endDatetime,
        excludeScheduleId,
        error: error.message
      });
      throw error;
    }
  }

  /**
   * 일정 참가자 목록 조회
   * @param {number} scheduleId - 일정 ID
   */
  async getScheduleParticipants(scheduleId) {
    const start = Date.now();
    try {
      const query = `
        SELECT
          sp.user_id,
          sp.participation_status,
          u.name,
          u.email
        FROM schedule_participants sp
        JOIN users u ON sp.user_id = u.id
        WHERE sp.schedule_id = $1
        ORDER BY u.name
      `;

      const result = await this.db.query(query, [scheduleId]);

      logger.performance('Schedule.getScheduleParticipants', Date.now() - start, {
        scheduleId,
        participantCount: result.rows.length,
      });

      return result.rows;
    } catch (error) {
      logger.error('Schedule.getScheduleParticipants 오류:', {
        scheduleId,
        error: error.message
      });
      throw error;
    }
  }

  /**
   * 사용자가 일정에 접근 권한이 있는지 확인
   * @param {number} scheduleId - 일정 ID
   * @param {number} userId - 사용자 ID
   */
  async hasScheduleAccess(scheduleId, userId) {
    const query = `
      SELECT 1
      FROM schedule_participants sp
      WHERE sp.schedule_id = $1 AND sp.user_id = $2
      LIMIT 1
    `;

    const result = await this.db.query(query, [scheduleId, userId]);
    return result.rows.length > 0;
  }

  /**
   * 사용자가 일정을 수정할 권한이 있는지 확인
   * @param {number} scheduleId - 일정 ID
   * @param {number} userId - 사용자 ID
   */
  async canEditSchedule(scheduleId, userId) {
    const query = `
      SELECT
        s.creator_id,
        s.team_id,
        tm.role
      FROM schedules s
      LEFT JOIN team_members tm ON s.team_id = tm.team_id AND tm.user_id = $2
      WHERE s.id = $1
    `;

    const result = await this.db.query(query, [scheduleId, userId]);
    if (result.rows.length === 0) {
      return false;
    }

    const schedule = result.rows[0];

    // 생성자이거나 팀 리더인 경우 수정 가능
    return schedule.creator_id === userId || schedule.role === 'leader';
  }

  /**
   * 일정 데이터 검증
   * @param {Object} scheduleData - 검증할 일정 데이터
   */
  validateScheduleData(scheduleData) {
    const { title, content, startDatetime, endDatetime, scheduleType } = scheduleData;

    // 제목 검증
    if (!title || title.trim().length < 2 || title.trim().length > config.business.maxScheduleTitle) {
      throw new Error(`일정 제목은 2-${config.business.maxScheduleTitle}자여야 합니다`);
    }

    // 내용 검증
    if (content && content.length > config.business.maxScheduleContent) {
      throw new Error(`일정 내용은 ${config.business.maxScheduleContent}자를 초과할 수 없습니다`);
    }

    // 시간 검증
    const start = new Date(startDatetime);
    const end = new Date(endDatetime);

    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      throw new Error('올바른 날짜 시간 형식이 아닙니다');
    }

    if (end <= start) {
      throw new Error('종료 시간은 시작 시간보다 늦어야 합니다');
    }

    // 일정 유형 검증
    if (!['personal', 'team'].includes(scheduleType)) {
      throw new Error('일정 유형은 personal 또는 team이어야 합니다');
    }
  }
}

module.exports = new Schedule();