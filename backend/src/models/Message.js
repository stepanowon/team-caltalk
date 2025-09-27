const BaseModel = require('./BaseModel');
const config = require('../config/environment');
const logger = require('../config/logger');
const eventService = require('../services/EventService');

/**
 * 메시지 모델
 * 팀 채팅 메시지 관리 기능 제공
 */
class Message extends BaseModel {
  constructor() {
    super('messages');
  }

  /**
   * 새 메시지 전송
   * @param {Object} messageData - 메시지 데이터
   * @param {number} messageData.teamId - 팀 ID
   * @param {number} messageData.senderId - 발신자 ID
   * @param {string} messageData.content - 메시지 내용
   * @param {Date} messageData.targetDate - 대상 날짜
   * @param {number} messageData.relatedScheduleId - 관련 일정 ID (선택)
   * @param {string} messageData.messageType - 메시지 유형
   */
  async sendMessage(messageData) {
    const start = Date.now();
    try {
      const {
        teamId,
        senderId,
        content,
        targetDate,
        relatedScheduleId = null,
        messageType = 'normal'
      } = messageData;

      // 입력 검증
      this.validateMessageData(messageData);

      // 메시지 전송
      const message = await this.create({
        team_id: teamId,
        sender_id: senderId,
        content: content.trim(),
        target_date: targetDate,
        related_schedule_id: relatedScheduleId,
        message_type: messageType,
        sent_at: new Date(),
      });

      logger.performance('Message.sendMessage', Date.now() - start, {
        messageId: message.id,
        teamId,
        senderId,
        messageType,
      });

      logger.audit('MESSAGE_SENT', {
        messageId: message.id,
        teamId,
        senderId,
        targetDate,
        messageType,
        contentLength: content.length,
      });

      // 실시간 이벤트 발생
      try {
        // 팀 멤버들 조회
        const Team = require('./Team');
        const teamMembers = await Team.getMembers(teamId);
        const affectedUserIds = teamMembers.map(member => member.user_id);

        await eventService.broadcastEvent({
          eventType: 'message_sent',
          teamId,
          data: {
            message: {
              id: message.id,
              content: message.content,
              targetDate: message.target_date,
              messageType: message.message_type,
              sentAt: message.sent_at,
              senderId: message.sender_id,
              relatedScheduleId: message.related_schedule_id,
            },
          },
          affectedUserIds,
        });
      } catch (eventError) {
        logger.error('메시지 전송 이벤트 발생 오류:', eventError);
      }

      return message;
    } catch (error) {
      logger.error('Message.sendMessage 오류:', {
        messageData,
        error: error.message
      });
      throw error;
    }
  }

  /**
   * 팀의 메시지 목록 조회 (날짜별)
   * @param {number} teamId - 팀 ID
   * @param {number} userId - 요청 사용자 ID
   * @param {Object} filters - 필터 조건
   * @param {Date} filters.targetDate - 대상 날짜
   * @param {number} filters.page - 페이지 번호
   * @param {number} filters.limit - 페이지당 개수
   */
  async getTeamMessages(teamId, userId, filters = {}) {
    const start = Date.now();
    try {
      const { targetDate, page = 1, limit = 50 } = filters;
      const offset = (page - 1) * limit;

      let query = `
        SELECT
          m.*,
          u.name as sender_name,
          u.email as sender_email,
          s.title as related_schedule_title,
          (
            SELECT COUNT(*)
            FROM message_reads mr
            WHERE mr.message_id = m.id
          ) as read_count,
          (
            SELECT EXISTS(
              SELECT 1
              FROM message_reads mr
              WHERE mr.message_id = m.id AND mr.user_id = $2
            )
          ) as is_read
        FROM messages m
        JOIN users u ON m.sender_id = u.id
        LEFT JOIN schedules s ON m.related_schedule_id = s.id
        WHERE m.team_id = $1
      `;

      const params = [teamId, userId];
      let paramIndex = 3;

      // 날짜 필터
      if (targetDate) {
        query += ` AND m.target_date = $${paramIndex++}`;
        params.push(targetDate);
      }

      query += ` ORDER BY m.sent_at DESC LIMIT $${paramIndex++} OFFSET $${paramIndex++}`;
      params.push(limit, offset);

      const result = await this.db.query(query, params);

      // 총 개수 조회
      let countQuery = `
        SELECT COUNT(*) as total
        FROM messages
        WHERE team_id = $1
      `;
      const countParams = [teamId];

      if (targetDate) {
        countQuery += ` AND target_date = $2`;
        countParams.push(targetDate);
      }

      const countResult = await this.db.query(countQuery, countParams);
      const total = parseInt(countResult.rows[0].total);

      logger.performance('Message.getTeamMessages', Date.now() - start, {
        teamId,
        userId,
        messageCount: result.rows.length,
        total,
        targetDate,
      });

      return {
        messages: result.rows,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
          hasNext: page * limit < total,
          hasPrev: page > 1,
        },
      };
    } catch (error) {
      logger.error('Message.getTeamMessages 오류:', {
        teamId,
        userId,
        filters,
        error: error.message
      });
      throw error;
    }
  }

  /**
   * 메시지를 읽음으로 표시
   * @param {number} messageId - 메시지 ID
   * @param {number} userId - 사용자 ID
   */
  async markAsRead(messageId, userId) {
    const start = Date.now();
    try {
      // 이미 읽음 표시된 경우 스킵
      const existingRead = await this.db.query(`
        SELECT 1 FROM message_reads
        WHERE message_id = $1 AND user_id = $2
        LIMIT 1
      `, [messageId, userId]);

      if (existingRead.rows.length > 0) {
        return false; // 이미 읽음
      }

      // 읽음 표시 추가
      await this.db.query(`
        INSERT INTO message_reads (message_id, user_id, read_at)
        VALUES ($1, $2, CURRENT_TIMESTAMP)
      `, [messageId, userId]);

      logger.performance('Message.markAsRead', Date.now() - start, {
        messageId,
        userId,
      });

      logger.audit('MESSAGE_READ', {
        messageId,
        userId,
      });

      return true;
    } catch (error) {
      logger.error('Message.markAsRead 오류:', {
        messageId,
        userId,
        error: error.message
      });
      throw error;
    }
  }

  /**
   * 메시지 삭제 (소프트 삭제)
   * @param {number} messageId - 메시지 ID
   * @param {number} userId - 요청 사용자 ID (본인만 삭제 가능)
   */
  async deleteMessage(messageId, userId) {
    const start = Date.now();
    try {
      // 메시지 소유자 확인
      const message = await this.findById(messageId);
      if (!message) {
        throw new Error('메시지를 찾을 수 없습니다');
      }

      if (message.sender_id !== userId) {
        throw new Error('자신이 보낸 메시지만 삭제할 수 있습니다');
      }

      // 소프트 삭제
      const result = await this.update(messageId, {
        deleted_at: new Date(),
        content: '[삭제된 메시지]',
      });

      logger.performance('Message.deleteMessage', Date.now() - start, {
        messageId,
        userId,
      });

      logger.audit('MESSAGE_DELETED', {
        messageId,
        userId,
        teamId: message.team_id,
      });

      return result;
    } catch (error) {
      logger.error('Message.deleteMessage 오류:', {
        messageId,
        userId,
        error: error.message
      });
      throw error;
    }
  }

  /**
   * 특정 일정에 관련된 메시지 조회
   * @param {number} scheduleId - 일정 ID
   * @param {number} userId - 요청 사용자 ID
   */
  async getScheduleRelatedMessages(scheduleId, userId) {
    const start = Date.now();
    try {
      const query = `
        SELECT
          m.*,
          u.name as sender_name,
          u.email as sender_email,
          (
            SELECT EXISTS(
              SELECT 1
              FROM message_reads mr
              WHERE mr.message_id = m.id AND mr.user_id = $2
            )
          ) as is_read
        FROM messages m
        JOIN users u ON m.sender_id = u.id
        WHERE m.related_schedule_id = $1
          AND m.deleted_at IS NULL
        ORDER BY m.sent_at ASC
      `;

      const result = await this.db.query(query, [scheduleId, userId]);

      logger.performance('Message.getScheduleRelatedMessages', Date.now() - start, {
        scheduleId,
        userId,
        messageCount: result.rows.length,
      });

      return result.rows;
    } catch (error) {
      logger.error('Message.getScheduleRelatedMessages 오류:', {
        scheduleId,
        userId,
        error: error.message
      });
      throw error;
    }
  }

  /**
   * 사용자가 메시지에 접근 권한이 있는지 확인
   * @param {number} messageId - 메시지 ID
   * @param {number} userId - 사용자 ID
   */
  async hasMessageAccess(messageId, userId) {
    const query = `
      SELECT 1
      FROM messages m
      JOIN team_members tm ON m.team_id = tm.team_id
      WHERE m.id = $1 AND tm.user_id = $2
      LIMIT 1
    `;

    const result = await this.db.query(query, [messageId, userId]);
    return result.rows.length > 0;
  }

  /**
   * 팀의 읽지 않은 메시지 개수 조회
   * @param {number} teamId - 팀 ID
   * @param {number} userId - 사용자 ID
   */
  async getUnreadMessageCount(teamId, userId) {
    const start = Date.now();
    try {
      const query = `
        SELECT COUNT(*) as unread_count
        FROM messages m
        WHERE m.team_id = $1
          AND m.sender_id != $2
          AND m.deleted_at IS NULL
          AND NOT EXISTS (
            SELECT 1
            FROM message_reads mr
            WHERE mr.message_id = m.id AND mr.user_id = $2
          )
      `;

      const result = await this.db.query(query, [teamId, userId]);
      const count = parseInt(result.rows[0].unread_count);

      logger.performance('Message.getUnreadMessageCount', Date.now() - start, {
        teamId,
        userId,
        unreadCount: count,
      });

      return count;
    } catch (error) {
      logger.error('Message.getUnreadMessageCount 오류:', {
        teamId,
        userId,
        error: error.message
      });
      throw error;
    }
  }

  /**
   * 시스템 메시지 생성 (일정 변경 알림 등)
   * @param {Object} systemMessageData - 시스템 메시지 데이터
   */
  async createSystemMessage(systemMessageData) {
    const start = Date.now();
    try {
      const {
        teamId,
        content,
        targetDate,
        relatedScheduleId = null,
        messageType = 'system'
      } = systemMessageData;

      const message = await this.create({
        team_id: teamId,
        sender_id: null, // 시스템 메시지는 발신자 없음
        content: content.trim(),
        target_date: targetDate,
        related_schedule_id: relatedScheduleId,
        message_type: messageType,
        sent_at: new Date(),
      });

      logger.performance('Message.createSystemMessage', Date.now() - start, {
        messageId: message.id,
        teamId,
        messageType,
      });

      logger.audit('SYSTEM_MESSAGE_CREATED', {
        messageId: message.id,
        teamId,
        messageType,
        relatedScheduleId,
      });

      return message;
    } catch (error) {
      logger.error('Message.createSystemMessage 오류:', {
        systemMessageData,
        error: error.message
      });
      throw error;
    }
  }

  /**
   * 메시지 데이터 검증
   * @param {Object} messageData - 검증할 메시지 데이터
   */
  validateMessageData(messageData) {
    const { teamId, senderId, content, targetDate, messageType = 'normal' } = messageData;

    // 팀 ID 검증
    if (!teamId || !Number.isInteger(teamId) || teamId < 1) {
      throw new Error('올바른 팀 ID가 필요합니다');
    }

    // 발신자 ID 검증 (시스템 메시지 제외)
    if (messageType !== 'system' && (!senderId || !Number.isInteger(senderId) || senderId < 1)) {
      throw new Error('올바른 발신자 ID가 필요합니다');
    }

    // 내용 검증
    if (!content || content.trim().length === 0) {
      throw new Error('메시지 내용은 필수입니다');
    }

    if (content.length > config.business.maxMessageLength) {
      throw new Error(`메시지 내용은 ${config.business.maxMessageLength}자를 초과할 수 없습니다`);
    }

    // 대상 날짜 검증
    if (!targetDate) {
      throw new Error('대상 날짜는 필수입니다');
    }

    const date = new Date(targetDate);
    if (isNaN(date.getTime())) {
      throw new Error('올바른 날짜 형식이 아닙니다');
    }

    // 메시지 유형 검증
    if (!['normal', 'schedule_request', 'schedule_notification', 'system'].includes(messageType)) {
      throw new Error('올바르지 않은 메시지 유형입니다');
    }
  }
}

module.exports = new Message();