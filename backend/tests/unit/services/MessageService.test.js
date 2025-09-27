const { Pool } = require('pg');

// 모의 MessageService 클래스
class MessageService {
  constructor(pool) {
    this.pool = pool;
  }

  async sendMessage(messageData) {
    const {
      team_id,
      sender_id,
      content,
      target_date,
      message_type = 'normal',
      related_schedule_id = null
    } = messageData;

    // 메시지 길이 검증
    if (content.length > 500) {
      throw new Error('Message content exceeds maximum length of 500 characters');
    }

    // 메시지 타입 검증
    const validTypes = ['normal', 'schedule_request'];
    if (!validTypes.includes(message_type)) {
      throw new Error('Invalid message type');
    }

    // 팀 멤버십 검증
    const membershipCheck = await this.pool.query(
      'SELECT id FROM team_members WHERE team_id = $1 AND user_id = $2',
      [team_id, sender_id]
    );

    if (membershipCheck.rows.length === 0) {
      throw new Error('User is not a member of this team');
    }

    // 일정 관련 메시지인 경우 일정 존재 확인
    if (related_schedule_id) {
      const scheduleCheck = await this.pool.query(
        'SELECT id FROM schedules WHERE id = $1 AND team_id = $2',
        [related_schedule_id, team_id]
      );

      if (scheduleCheck.rows.length === 0) {
        throw new Error('Related schedule not found or does not belong to this team');
      }
    }

    const result = await this.pool.query(`
      INSERT INTO messages (team_id, sender_id, content, target_date, message_type, related_schedule_id)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *
    `, [team_id, sender_id, content, target_date, message_type, related_schedule_id]);

    return result.rows[0];
  }

  async getMessages(teamId, targetDate, options = {}) {
    const { page = 1, limit = 50, messageType = null } = options;
    const offset = (page - 1) * limit;

    let typeCondition = '';
    let queryParams = [teamId, targetDate, limit, offset];
    let paramIndex = 5;

    if (messageType) {
      typeCondition = `AND m.message_type = $${paramIndex}`;
      queryParams.push(messageType);
      paramIndex++;
    }

    const result = await this.pool.query(`
      SELECT
        m.*,
        u.name as sender_name,
        s.title as related_schedule_title
      FROM messages m
      JOIN users u ON m.sender_id = u.id
      LEFT JOIN schedules s ON m.related_schedule_id = s.id
      WHERE m.team_id = $1 AND m.target_date = $2
      ${typeCondition}
      ORDER BY m.sent_at ASC
      LIMIT $3 OFFSET $4
    `, queryParams);

    return result.rows;
  }

  async getMessageById(messageId) {
    const result = await this.pool.query(`
      SELECT
        m.*,
        u.name as sender_name,
        s.title as related_schedule_title
      FROM messages m
      JOIN users u ON m.sender_id = u.id
      LEFT JOIN schedules s ON m.related_schedule_id = s.id
      WHERE m.id = $1
    `, [messageId]);

    return result.rows[0] || null;
  }

  async deleteMessage(messageId, userId) {
    // 메시지 존재 및 권한 확인
    const messageCheck = await this.pool.query(
      'SELECT sender_id FROM messages WHERE id = $1',
      [messageId]
    );

    if (messageCheck.rows.length === 0) {
      throw new Error('Message not found');
    }

    if (messageCheck.rows[0].sender_id !== userId) {
      throw new Error('Insufficient permissions to delete this message');
    }

    const result = await this.pool.query(
      'DELETE FROM messages WHERE id = $1 RETURNING *',
      [messageId]
    );

    return { success: true, message: 'Message deleted successfully' };
  }

  async getMessagesByUser(userId, teamId = null, startDate = null, endDate = null) {
    let whereConditions = ['m.sender_id = $1'];
    let queryParams = [userId];
    let paramIndex = 2;

    if (teamId) {
      whereConditions.push(`m.team_id = $${paramIndex}`);
      queryParams.push(teamId);
      paramIndex++;
    }

    if (startDate) {
      whereConditions.push(`m.target_date >= $${paramIndex}`);
      queryParams.push(startDate);
      paramIndex++;
    }

    if (endDate) {
      whereConditions.push(`m.target_date <= $${paramIndex}`);
      queryParams.push(endDate);
      paramIndex++;
    }

    const whereClause = whereConditions.join(' AND ');

    const result = await this.pool.query(`
      SELECT
        m.*,
        t.name as team_name,
        s.title as related_schedule_title
      FROM messages m
      JOIN teams t ON m.team_id = t.id
      LEFT JOIN schedules s ON m.related_schedule_id = s.id
      WHERE ${whereClause}
      ORDER BY m.sent_at DESC
    `, queryParams);

    return result.rows;
  }

  async getNewMessages(teamId, targetDate, lastMessageId) {
    const result = await this.pool.query(`
      SELECT
        m.*,
        u.name as sender_name,
        s.title as related_schedule_title
      FROM messages m
      JOIN users u ON m.sender_id = u.id
      LEFT JOIN schedules s ON m.related_schedule_id = s.id
      WHERE m.team_id = $1
        AND m.target_date = $2
        AND m.id > $3
      ORDER BY m.sent_at ASC
    `, [teamId, targetDate, lastMessageId]);

    return result.rows;
  }

  async getMessageStatistics(teamId, startDate = null, endDate = null) {
    let dateCondition = '';
    let queryParams = [teamId];
    let paramIndex = 2;

    if (startDate && endDate) {
      dateCondition = `AND m.target_date BETWEEN $${paramIndex} AND $${paramIndex + 1}`;
      queryParams.push(startDate, endDate);
      paramIndex += 2;
    }

    const result = await this.pool.query(`
      SELECT
        COUNT(*) as total_messages,
        COUNT(CASE WHEN message_type = 'normal' THEN 1 END) as normal_messages,
        COUNT(CASE WHEN message_type = 'schedule_request' THEN 1 END) as schedule_request_messages,
        COUNT(DISTINCT sender_id) as unique_senders,
        COUNT(DISTINCT target_date) as active_days,
        AVG(LENGTH(content)) as avg_message_length
      FROM messages m
      WHERE m.team_id = $1
      ${dateCondition}
    `, queryParams);

    return result.rows[0];
  }

  async searchMessages(teamId, keyword, options = {}) {
    const { limit = 100, messageType = null, startDate = null, endDate = null } = options;

    let conditions = ['m.team_id = $1', "to_tsvector('english', m.content) @@ plainto_tsquery('english', $2)"];
    let queryParams = [teamId, keyword, limit];
    let paramIndex = 4;

    if (messageType) {
      conditions.push(`m.message_type = $${paramIndex}`);
      queryParams.splice(-1, 0, messageType);
      paramIndex++;
    }

    if (startDate) {
      conditions.push(`m.target_date >= $${paramIndex}`);
      queryParams.splice(-1, 0, startDate);
      paramIndex++;
    }

    if (endDate) {
      conditions.push(`m.target_date <= $${paramIndex}`);
      queryParams.splice(-1, 0, endDate);
      paramIndex++;
    }

    const whereClause = conditions.join(' AND ');

    const result = await this.pool.query(`
      SELECT
        m.*,
        u.name as sender_name,
        s.title as related_schedule_title,
        ts_rank(to_tsvector('english', m.content), plainto_tsquery('english', $2)) as relevance_score
      FROM messages m
      JOIN users u ON m.sender_id = u.id
      LEFT JOIN schedules s ON m.related_schedule_id = s.id
      WHERE ${whereClause}
      ORDER BY relevance_score DESC, m.sent_at DESC
      LIMIT $${paramIndex - 1}
    `, queryParams);

    return result.rows;
  }

  async getMessagesByDate(teamId, dates) {
    if (!Array.isArray(dates) || dates.length === 0) {
      throw new Error('Dates must be a non-empty array');
    }

    const placeholders = dates.map((_, index) => `$${index + 2}`).join(',');

    const result = await this.pool.query(`
      SELECT
        m.*,
        u.name as sender_name,
        s.title as related_schedule_title
      FROM messages m
      JOIN users u ON m.sender_id = u.id
      LEFT JOIN schedules s ON m.related_schedule_id = s.id
      WHERE m.team_id = $1 AND m.target_date IN (${placeholders})
      ORDER BY m.target_date ASC, m.sent_at ASC
    `, [teamId, ...dates]);

    return result.rows;
  }

  async updateMessageContent(messageId, newContent, userId) {
    // 내용 길이 검증
    if (newContent.length > 500) {
      throw new Error('Message content exceeds maximum length of 500 characters');
    }

    // 메시지 존재 및 권한 확인
    const messageCheck = await this.pool.query(
      'SELECT sender_id, sent_at FROM messages WHERE id = $1',
      [messageId]
    );

    if (messageCheck.rows.length === 0) {
      throw new Error('Message not found');
    }

    if (messageCheck.rows[0].sender_id !== userId) {
      throw new Error('Insufficient permissions to edit this message');
    }

    // 메시지가 5분 이내에 전송된 경우만 수정 허용
    const sentAt = new Date(messageCheck.rows[0].sent_at);
    const now = new Date();
    const timeDiff = (now - sentAt) / 1000 / 60; // 분 단위

    if (timeDiff > 5) {
      throw new Error('Message can only be edited within 5 minutes of sending');
    }

    const result = await this.pool.query(
      'UPDATE messages SET content = $1 WHERE id = $2 RETURNING *',
      [newContent, messageId]
    );

    return result.rows[0];
  }

  async markMessagesAsRead(teamId, userId, targetDate) {
    // 읽음 표시 기능은 실제 구현에서는 별도 테이블이 필요하지만
    // 여기서는 간단히 로그만 기록
    console.log(`User ${userId} marked messages as read for team ${teamId} on ${targetDate}`);
    return { success: true, message: 'Messages marked as read' };
  }

  async getUnreadMessageCount(teamId, userId, targetDate) {
    // 실제 구현에서는 읽음 상태 테이블을 조회해야 하지만
    // 여기서는 간단히 전체 메시지 수를 반환
    const result = await this.pool.query(
      'SELECT COUNT(*) as count FROM messages WHERE team_id = $1 AND target_date = $2',
      [teamId, targetDate]
    );

    return parseInt(result.rows[0].count);
  }

  async getRecentMessages(teamId, limit = 10) {
    const result = await this.pool.query(`
      SELECT
        m.*,
        u.name as sender_name,
        s.title as related_schedule_title
      FROM messages m
      JOIN users u ON m.sender_id = u.id
      LEFT JOIN schedules s ON m.related_schedule_id = s.id
      WHERE m.team_id = $1
      ORDER BY m.sent_at DESC
      LIMIT $2
    `, [teamId, limit]);

    return result.rows;
  }

  async validateTeamAccess(teamId, userId) {
    const memberCheck = await this.pool.query(
      'SELECT role FROM team_members WHERE team_id = $1 AND user_id = $2',
      [teamId, userId]
    );

    if (memberCheck.rows.length === 0) {
      throw new Error('User is not a member of this team');
    }

    return memberCheck.rows[0].role;
  }
}

describe('MessageService Unit Tests', () => {
  let pool;
  let messageService;
  let testUser;
  let testTeam;
  let memberUser;
  let testSchedule;

  beforeAll(() => {
    pool = getTestDbPool();
    messageService = new MessageService(pool);
  });

  beforeEach(async () => {
    // 테스트용 사용자들 생성
    const userResult = await pool.query(
      'INSERT INTO users (email, name, password_hash) VALUES ($1, $2, $3) RETURNING *',
      ['msg_service@example.com', 'Message Service User', 'hashedpassword']
    );
    testUser = userResult.rows[0];

    const memberResult = await pool.query(
      'INSERT INTO users (email, name, password_hash) VALUES ($1, $2, $3) RETURNING *',
      ['msg_member@example.com', 'Message Member User', 'hashedpassword']
    );
    memberUser = memberResult.rows[0];

    // 테스트용 팀 생성
    const teamResult = await pool.query(
      'INSERT INTO teams (name, description, invite_code, creator_id) VALUES ($1, $2, $3, $4) RETURNING *',
      ['Message Team', 'Test Description', 'MSG123', testUser.id]
    );
    testTeam = teamResult.rows[0];

    // 팀 멤버십 설정
    await pool.query(
      'INSERT INTO team_members (team_id, user_id, role) VALUES ($1, $2, $3)',
      [testTeam.id, testUser.id, 'leader']
    );

    await pool.query(
      'INSERT INTO team_members (team_id, user_id, role) VALUES ($1, $2, $3)',
      [testTeam.id, memberUser.id, 'member']
    );

    // 테스트용 일정 생성
    const scheduleResult = await pool.query(`
      INSERT INTO schedules (title, content, start_datetime, end_datetime, schedule_type, creator_id, team_id)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *
    `, [
      'Test Schedule',
      'Test schedule content',
      '2024-12-25 14:00:00',
      '2024-12-25 15:00:00',
      'team',
      testUser.id,
      testTeam.id
    ]);
    testSchedule = scheduleResult.rows[0];
  });

  describe('sendMessage', () => {
    test('일반 메시지를 올바르게 전송해야 함', async () => {
      const messageData = {
        team_id: testTeam.id,
        sender_id: testUser.id,
        content: '안녕하세요! 팀 채팅입니다.',
        target_date: '2024-12-25',
        message_type: 'normal'
      };

      const result = await messageService.sendMessage(messageData);

      expect(result).toBeDefined();
      expect(result.content).toBe(messageData.content);
      expect(result.sender_id).toBe(testUser.id);
      expect(result.team_id).toBe(testTeam.id);
      expect(result.message_type).toBe('normal');
      expect(result.sent_at).toBeDefined();
    });

    test('일정 관련 메시지를 올바르게 전송해야 함', async () => {
      const messageData = {
        team_id: testTeam.id,
        sender_id: testUser.id,
        content: '일정 시간을 변경해 주세요.',
        target_date: '2024-12-25',
        message_type: 'schedule_request',
        related_schedule_id: testSchedule.id
      };

      const result = await messageService.sendMessage(messageData);

      expect(result.message_type).toBe('schedule_request');
      expect(result.related_schedule_id).toBe(testSchedule.id);
    });

    test('500자를 초과하는 메시지 전송 시 오류가 발생해야 함', async () => {
      const longContent = 'A'.repeat(501);
      const messageData = {
        team_id: testTeam.id,
        sender_id: testUser.id,
        content: longContent,
        target_date: '2024-12-25',
        message_type: 'normal'
      };

      await expect(messageService.sendMessage(messageData)).rejects.toThrow(
        'Message content exceeds maximum length of 500 characters'
      );
    });

    test('잘못된 메시지 타입 전송 시 오류가 발생해야 함', async () => {
      const messageData = {
        team_id: testTeam.id,
        sender_id: testUser.id,
        content: 'Test message',
        target_date: '2024-12-25',
        message_type: 'invalid_type'
      };

      await expect(messageService.sendMessage(messageData)).rejects.toThrow('Invalid message type');
    });

    test('팀 멤버가 아닌 사용자가 메시지 전송 시 오류가 발생해야 함', async () => {
      // 비멤버 사용자 생성
      const nonMemberResult = await pool.query(
        'INSERT INTO users (email, name, password_hash) VALUES ($1, $2, $3) RETURNING *',
        ['nonmember@example.com', 'Non Member', 'hashedpassword']
      );
      const nonMember = nonMemberResult.rows[0];

      const messageData = {
        team_id: testTeam.id,
        sender_id: nonMember.id,
        content: 'Unauthorized message',
        target_date: '2024-12-25',
        message_type: 'normal'
      };

      await expect(messageService.sendMessage(messageData)).rejects.toThrow(
        'User is not a member of this team'
      );
    });

    test('존재하지 않는 일정과 연관된 메시지 전송 시 오류가 발생해야 함', async () => {
      const messageData = {
        team_id: testTeam.id,
        sender_id: testUser.id,
        content: 'Related to non-existent schedule',
        target_date: '2024-12-25',
        message_type: 'schedule_request',
        related_schedule_id: 99999
      };

      await expect(messageService.sendMessage(messageData)).rejects.toThrow(
        'Related schedule not found or does not belong to this team'
      );
    });
  });

  describe('getMessages', () => {
    beforeEach(async () => {
      // 테스트용 메시지들 생성
      for (let i = 0; i < 10; i++) {
        await messageService.sendMessage({
          team_id: testTeam.id,
          sender_id: i % 2 === 0 ? testUser.id : memberUser.id,
          content: `Test message ${i}`,
          target_date: '2024-12-25',
          message_type: 'normal'
        });
      }

      // 일정 관련 메시지 추가
      await messageService.sendMessage({
        team_id: testTeam.id,
        sender_id: testUser.id,
        content: 'Schedule related message',
        target_date: '2024-12-25',
        message_type: 'schedule_request',
        related_schedule_id: testSchedule.id
      });
    });

    test('날짜별 메시지를 올바르게 조회해야 함', async () => {
      const messages = await messageService.getMessages(testTeam.id, '2024-12-25');

      expect(messages).toHaveLength(11); // 10개 일반 + 1개 일정 관련
      expect(messages[0].sender_name).toBeDefined();
      expect(messages[0].content).toBe('Test message 0');
    });

    test('페이지네이션이 올바르게 작동해야 함', async () => {
      const page1 = await messageService.getMessages(testTeam.id, '2024-12-25', {
        page: 1,
        limit: 5
      });

      const page2 = await messageService.getMessages(testTeam.id, '2024-12-25', {
        page: 2,
        limit: 5
      });

      expect(page1).toHaveLength(5);
      expect(page2).toHaveLength(5);
      expect(page1[0].content).toBe('Test message 0');
      expect(page2[0].content).toBe('Test message 5');
    });

    test('메시지 타입별 필터링이 작동해야 함', async () => {
      const normalMessages = await messageService.getMessages(testTeam.id, '2024-12-25', {
        messageType: 'normal'
      });

      const scheduleMessages = await messageService.getMessages(testTeam.id, '2024-12-25', {
        messageType: 'schedule_request'
      });

      expect(normalMessages).toHaveLength(10);
      expect(scheduleMessages).toHaveLength(1);
      expect(scheduleMessages[0].message_type).toBe('schedule_request');
      expect(scheduleMessages[0].related_schedule_title).toBe('Test Schedule');
    });

    test('존재하지 않는 날짜 조회 시 빈 배열을 반환해야 함', async () => {
      const messages = await messageService.getMessages(testTeam.id, '2025-01-01');
      expect(messages).toHaveLength(0);
    });
  });

  describe('getMessageById', () => {
    let messageId;

    beforeEach(async () => {
      const message = await messageService.sendMessage({
        team_id: testTeam.id,
        sender_id: testUser.id,
        content: 'Test message for ID lookup',
        target_date: '2024-12-25',
        message_type: 'normal'
      });
      messageId = message.id;
    });

    test('존재하는 메시지를 올바르게 조회해야 함', async () => {
      const message = await messageService.getMessageById(messageId);

      expect(message).toBeDefined();
      expect(message.id).toBe(messageId);
      expect(message.content).toBe('Test message for ID lookup');
      expect(message.sender_name).toBe(testUser.name);
    });

    test('존재하지 않는 메시지 조회 시 null을 반환해야 함', async () => {
      const message = await messageService.getMessageById(99999);
      expect(message).toBeNull();
    });
  });

  describe('deleteMessage', () => {
    let messageId;

    beforeEach(async () => {
      const message = await messageService.sendMessage({
        team_id: testTeam.id,
        sender_id: testUser.id,
        content: 'Message to delete',
        target_date: '2024-12-25',
        message_type: 'normal'
      });
      messageId = message.id;
    });

    test('메시지 작성자가 메시지를 삭제할 수 있어야 함', async () => {
      const result = await messageService.deleteMessage(messageId, testUser.id);

      expect(result.success).toBe(true);
      expect(result.message).toContain('deleted successfully');

      // 실제로 삭제되었는지 확인
      const deletedMessage = await messageService.getMessageById(messageId);
      expect(deletedMessage).toBeNull();
    });

    test('다른 사용자가 메시지 삭제 시 오류가 발생해야 함', async () => {
      await expect(
        messageService.deleteMessage(messageId, memberUser.id)
      ).rejects.toThrow('Insufficient permissions to delete this message');
    });

    test('존재하지 않는 메시지 삭제 시 오류가 발생해야 함', async () => {
      await expect(
        messageService.deleteMessage(99999, testUser.id)
      ).rejects.toThrow('Message not found');
    });
  });

  describe('getNewMessages', () => {
    beforeEach(async () => {
      // 기존 메시지들 생성
      for (let i = 0; i < 5; i++) {
        await messageService.sendMessage({
          team_id: testTeam.id,
          sender_id: testUser.id,
          content: `Old message ${i}`,
          target_date: '2024-12-25',
          message_type: 'normal'
        });
      }
    });

    test('지정된 ID 이후의 새 메시지를 조회해야 함', async () => {
      // 새 메시지 추가
      const newMessage1 = await messageService.sendMessage({
        team_id: testTeam.id,
        sender_id: testUser.id,
        content: 'New message 1',
        target_date: '2024-12-25',
        message_type: 'normal'
      });

      const newMessage2 = await messageService.sendMessage({
        team_id: testTeam.id,
        sender_id: testUser.id,
        content: 'New message 2',
        target_date: '2024-12-25',
        message_type: 'normal'
      });

      const newMessages = await messageService.getNewMessages(
        testTeam.id,
        '2024-12-25',
        newMessage1.id - 1
      );

      expect(newMessages).toHaveLength(2);
      expect(newMessages[0].content).toBe('New message 1');
      expect(newMessages[1].content).toBe('New message 2');
    });

    test('새 메시지가 없을 때 빈 배열을 반환해야 함', async () => {
      const newMessages = await messageService.getNewMessages(
        testTeam.id,
        '2024-12-25',
        999999
      );

      expect(newMessages).toHaveLength(0);
    });
  });

  describe('getMessageStatistics', () => {
    beforeEach(async () => {
      // 통계용 메시지들 생성
      for (let i = 0; i < 8; i++) {
        await messageService.sendMessage({
          team_id: testTeam.id,
          sender_id: i % 2 === 0 ? testUser.id : memberUser.id,
          content: `Statistics message ${i}`,
          target_date: '2024-12-25',
          message_type: 'normal'
        });
      }

      // 일정 관련 메시지 2개 추가
      for (let i = 0; i < 2; i++) {
        await messageService.sendMessage({
          team_id: testTeam.id,
          sender_id: testUser.id,
          content: `Schedule request ${i}`,
          target_date: '2024-12-25',
          message_type: 'schedule_request',
          related_schedule_id: testSchedule.id
        });
      }
    });

    test('메시지 통계를 올바르게 계산해야 함', async () => {
      const stats = await messageService.getMessageStatistics(testTeam.id);

      expect(parseInt(stats.total_messages)).toBe(10);
      expect(parseInt(stats.normal_messages)).toBe(8);
      expect(parseInt(stats.schedule_request_messages)).toBe(2);
      expect(parseInt(stats.unique_senders)).toBe(2);
      expect(parseInt(stats.active_days)).toBe(1);
      expect(parseFloat(stats.avg_message_length)).toBeGreaterThan(0);
    });

    test('날짜 범위별 통계를 올바르게 계산해야 함', async () => {
      const stats = await messageService.getMessageStatistics(
        testTeam.id,
        '2024-12-25',
        '2024-12-25'
      );

      expect(parseInt(stats.total_messages)).toBe(10);
    });

    test('메시지가 없는 팀의 통계를 올바르게 처리해야 함', async () => {
      // 다른 팀 생성
      const otherTeamResult = await pool.query(
        'INSERT INTO teams (name, description, invite_code, creator_id) VALUES ($1, $2, $3, $4) RETURNING *',
        ['Empty Team', 'No messages', 'EMP123', testUser.id]
      );

      const stats = await messageService.getMessageStatistics(otherTeamResult.rows[0].id);

      expect(parseInt(stats.total_messages)).toBe(0);
      expect(parseInt(stats.normal_messages)).toBe(0);
      expect(parseInt(stats.schedule_request_messages)).toBe(0);
    });
  });

  describe('searchMessages', () => {
    beforeEach(async () => {
      // 검색용 메시지들 생성
      const searchMessages = [
        'JavaScript 개발 관련 질문이 있습니다',
        'React 컴포넌트 구조 논의',
        'Node.js 백엔드 API 설계',
        '데이터베이스 스키마 검토',
        '프론트엔드 UI 개선 방안'
      ];

      for (let i = 0; i < searchMessages.length; i++) {
        await messageService.sendMessage({
          team_id: testTeam.id,
          sender_id: testUser.id,
          content: searchMessages[i],
          target_date: '2024-12-25',
          message_type: 'normal'
        });
      }
    });

    test('키워드로 메시지를 검색할 수 있어야 함', async () => {
      const results = await messageService.searchMessages(testTeam.id, 'React');

      expect(results.length).toBeGreaterThan(0);
      expect(results[0].content).toContain('React');
      expect(results[0].relevance_score).toBeDefined();
    });

    test('여러 키워드가 포함된 메시지를 검색할 수 있어야 함', async () => {
      const results = await messageService.searchMessages(testTeam.id, 'JavaScript 개발');

      expect(results.length).toBeGreaterThan(0);
      expect(results[0].content).toContain('JavaScript');
    });

    test('검색 결과가 없을 때 빈 배열을 반환해야 함', async () => {
      const results = await messageService.searchMessages(testTeam.id, 'NonExistentKeyword');
      expect(results).toHaveLength(0);
    });

    test('메시지 타입별 검색 필터링이 작동해야 함', async () => {
      // 일정 관련 메시지 추가
      await messageService.sendMessage({
        team_id: testTeam.id,
        sender_id: testUser.id,
        content: 'React 미팅 일정 변경 요청',
        target_date: '2024-12-25',
        message_type: 'schedule_request',
        related_schedule_id: testSchedule.id
      });

      const normalResults = await messageService.searchMessages(testTeam.id, 'React', {
        messageType: 'normal'
      });

      const scheduleResults = await messageService.searchMessages(testTeam.id, 'React', {
        messageType: 'schedule_request'
      });

      expect(normalResults.length).toBe(1);
      expect(scheduleResults.length).toBe(1);
      expect(scheduleResults[0].message_type).toBe('schedule_request');
    });
  });

  describe('updateMessageContent', () => {
    let messageId;

    beforeEach(async () => {
      const message = await messageService.sendMessage({
        team_id: testTeam.id,
        sender_id: testUser.id,
        content: 'Original message content',
        target_date: '2024-12-25',
        message_type: 'normal'
      });
      messageId = message.id;
    });

    test('메시지 내용을 올바르게 수정해야 함', async () => {
      const newContent = 'Updated message content';
      const result = await messageService.updateMessageContent(messageId, newContent, testUser.id);

      expect(result.content).toBe(newContent);
      expect(result.id).toBe(messageId);
    });

    test('500자를 초과하는 내용으로 수정 시 오류가 발생해야 함', async () => {
      const longContent = 'A'.repeat(501);

      await expect(
        messageService.updateMessageContent(messageId, longContent, testUser.id)
      ).rejects.toThrow('Message content exceeds maximum length of 500 characters');
    });

    test('다른 사용자가 메시지 수정 시 오류가 발생해야 함', async () => {
      await expect(
        messageService.updateMessageContent(messageId, 'Unauthorized update', memberUser.id)
      ).rejects.toThrow('Insufficient permissions to edit this message');
    });
  });

  describe('validateTeamAccess', () => {
    test('팀 멤버의 접근을 허용해야 함', async () => {
      const role = await messageService.validateTeamAccess(testTeam.id, testUser.id);
      expect(role).toBe('leader');

      const memberRole = await messageService.validateTeamAccess(testTeam.id, memberUser.id);
      expect(memberRole).toBe('member');
    });

    test('비멤버의 접근을 거부해야 함', async () => {
      const nonMemberResult = await pool.query(
        'INSERT INTO users (email, name, password_hash) VALUES ($1, $2, $3) RETURNING *',
        ['nonmember@example.com', 'Non Member', 'hashedpassword']
      );
      const nonMember = nonMemberResult.rows[0];

      await expect(
        messageService.validateTeamAccess(testTeam.id, nonMember.id)
      ).rejects.toThrow('User is not a member of this team');
    });
  });

  describe('getMessagesByUser', () => {
    beforeEach(async () => {
      // 사용자별 메시지 생성
      for (let i = 0; i < 3; i++) {
        await messageService.sendMessage({
          team_id: testTeam.id,
          sender_id: testUser.id,
          content: `User message ${i}`,
          target_date: '2024-12-25',
          message_type: 'normal'
        });
      }

      for (let i = 0; i < 2; i++) {
        await messageService.sendMessage({
          team_id: testTeam.id,
          sender_id: memberUser.id,
          content: `Member message ${i}`,
          target_date: '2024-12-25',
          message_type: 'normal'
        });
      }
    });

    test('특정 사용자의 메시지를 조회할 수 있어야 함', async () => {
      const userMessages = await messageService.getMessagesByUser(testUser.id);
      expect(userMessages).toHaveLength(3);
      expect(userMessages[0].content).toContain('User message');

      const memberMessages = await messageService.getMessagesByUser(memberUser.id);
      expect(memberMessages).toHaveLength(2);
      expect(memberMessages[0].content).toContain('Member message');
    });

    test('팀별 필터링이 작동해야 함', async () => {
      const teamMessages = await messageService.getMessagesByUser(testUser.id, testTeam.id);
      expect(teamMessages).toHaveLength(3);
    });
  });

  describe('getRecentMessages', () => {
    beforeEach(async () => {
      // 최근 메시지들 생성
      for (let i = 0; i < 15; i++) {
        await messageService.sendMessage({
          team_id: testTeam.id,
          sender_id: testUser.id,
          content: `Recent message ${i}`,
          target_date: '2024-12-25',
          message_type: 'normal'
        });
      }
    });

    test('최근 메시지를 제한된 수량으로 조회해야 함', async () => {
      const recentMessages = await messageService.getRecentMessages(testTeam.id, 5);

      expect(recentMessages).toHaveLength(5);
      // 최근 순서대로 정렬되어야 함
      expect(recentMessages[0].content).toBe('Recent message 14');
      expect(recentMessages[4].content).toBe('Recent message 10');
    });

    test('기본 제한 수량이 적용되어야 함', async () => {
      const recentMessages = await messageService.getRecentMessages(testTeam.id);
      expect(recentMessages).toHaveLength(10); // 기본값
    });
  });
});