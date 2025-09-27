const { Pool } = require('pg');

// 모의 ScheduleService 클래스
class ScheduleService {
  constructor(pool) {
    this.pool = pool;
  }

  async createSchedule(scheduleData) {
    const {
      title,
      content,
      start_datetime,
      end_datetime,
      schedule_type,
      creator_id,
      team_id,
      participants = []
    } = scheduleData;

    const client = await this.pool.connect();

    try {
      await client.query('BEGIN');

      // 일정 생성
      const scheduleResult = await client.query(`
        INSERT INTO schedules (title, content, start_datetime, end_datetime, schedule_type, creator_id, team_id)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
        RETURNING *
      `, [title, content, start_datetime, end_datetime, schedule_type, creator_id, team_id]);

      const schedule = scheduleResult.rows[0];

      // 참가자 추가
      const participantPromises = participants.map(participant => {
        return client.query(
          'INSERT INTO schedule_participants (schedule_id, user_id, participation_status) VALUES ($1, $2, $3)',
          [schedule.id, participant.user_id, participant.status || 'confirmed']
        );
      });

      await Promise.all(participantPromises);

      await client.query('COMMIT');

      return await this.getScheduleById(schedule.id);
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  async getScheduleById(scheduleId) {
    const result = await this.pool.query(`
      SELECT
        s.*,
        u.name as creator_name,
        t.name as team_name,
        COALESCE(
          json_agg(
            json_build_object(
              'user_id', sp.user_id,
              'user_name', pu.name,
              'participation_status', sp.participation_status
            )
          ) FILTER (WHERE sp.user_id IS NOT NULL),
          '[]'::json
        ) as participants
      FROM schedules s
      LEFT JOIN users u ON s.creator_id = u.id
      LEFT JOIN teams t ON s.team_id = t.id
      LEFT JOIN schedule_participants sp ON s.id = sp.schedule_id
      LEFT JOIN users pu ON sp.user_id = pu.id
      WHERE s.id = $1
      GROUP BY s.id, u.name, t.name
    `, [scheduleId]);

    return result.rows[0] || null;
  }

  async getUserSchedules(userId, startDate, endDate, options = {}) {
    const { page = 1, limit = 50, includeDeclined = false } = options;
    const offset = (page - 1) * limit;

    let statusCondition = "sp.participation_status IN ('confirmed', 'pending')";
    if (includeDeclined) {
      statusCondition = "sp.participation_status IN ('confirmed', 'pending', 'declined')";
    }

    const result = await this.pool.query(`
      SELECT
        s.*,
        u.name as creator_name,
        t.name as team_name,
        sp.participation_status
      FROM schedules s
      JOIN schedule_participants sp ON s.id = sp.schedule_id
      LEFT JOIN users u ON s.creator_id = u.id
      LEFT JOIN teams t ON s.team_id = t.id
      WHERE sp.user_id = $1
        AND ${statusCondition}
        AND s.start_datetime >= $2
        AND s.start_datetime <= $3
      ORDER BY s.start_datetime ASC
      LIMIT $4 OFFSET $5
    `, [userId, startDate, endDate, limit, offset]);

    return result.rows;
  }

  async getTeamSchedules(teamId, startDate, endDate) {
    const result = await this.pool.query(`
      SELECT
        s.*,
        u.name as creator_name,
        COUNT(sp.user_id) as participant_count
      FROM schedules s
      LEFT JOIN users u ON s.creator_id = u.id
      LEFT JOIN schedule_participants sp ON s.id = sp.schedule_id AND sp.participation_status = 'confirmed'
      WHERE s.team_id = $1
        AND s.schedule_type = 'team'
        AND s.start_datetime >= $2
        AND s.start_datetime <= $3
      GROUP BY s.id, u.name
      ORDER BY s.start_datetime ASC
    `, [teamId, startDate, endDate]);

    return result.rows;
  }

  async updateSchedule(scheduleId, updateData, userId) {
    const { title, content, start_datetime, end_datetime } = updateData;

    const client = await this.pool.connect();

    try {
      await client.query('BEGIN');

      // 권한 확인
      const permissionCheck = await client.query(
        'SELECT creator_id, team_id FROM schedules WHERE id = $1',
        [scheduleId]
      );

      if (permissionCheck.rows.length === 0) {
        throw new Error('Schedule not found');
      }

      const schedule = permissionCheck.rows[0];

      // 개인 일정은 생성자만, 팀 일정은 팀장만 수정 가능
      if (schedule.team_id) {
        const teamRoleCheck = await client.query(
          'SELECT role FROM team_members WHERE team_id = $1 AND user_id = $2',
          [schedule.team_id, userId]
        );

        if (teamRoleCheck.rows.length === 0 || teamRoleCheck.rows[0].role !== 'leader') {
          throw new Error('Insufficient permissions');
        }
      } else {
        if (schedule.creator_id !== userId) {
          throw new Error('Insufficient permissions');
        }
      }

      // 일정 업데이트
      const updateResult = await client.query(`
        UPDATE schedules
        SET title = $1, content = $2, start_datetime = $3, end_datetime = $4, updated_at = CURRENT_TIMESTAMP
        WHERE id = $5
        RETURNING *
      `, [title, content, start_datetime, end_datetime, scheduleId]);

      await client.query('COMMIT');

      return await this.getScheduleById(scheduleId);
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  async deleteSchedule(scheduleId, userId) {
    const client = await this.pool.connect();

    try {
      await client.query('BEGIN');

      // 권한 확인
      const permissionCheck = await client.query(
        'SELECT creator_id, team_id FROM schedules WHERE id = $1',
        [scheduleId]
      );

      if (permissionCheck.rows.length === 0) {
        throw new Error('Schedule not found');
      }

      const schedule = permissionCheck.rows[0];

      if (schedule.team_id) {
        const teamRoleCheck = await client.query(
          'SELECT role FROM team_members WHERE team_id = $1 AND user_id = $2',
          [schedule.team_id, userId]
        );

        if (teamRoleCheck.rows.length === 0 || teamRoleCheck.rows[0].role !== 'leader') {
          throw new Error('Insufficient permissions');
        }
      } else {
        if (schedule.creator_id !== userId) {
          throw new Error('Insufficient permissions');
        }
      }

      // 일정 삭제 (CASCADE로 참가자도 함께 삭제)
      await client.query('DELETE FROM schedules WHERE id = $1', [scheduleId]);

      await client.query('COMMIT');

      return { success: true, message: 'Schedule deleted successfully' };
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  async checkScheduleConflict(userId, startDatetime, endDatetime, excludeScheduleId = null) {
    const result = await this.pool.query(
      'SELECT check_schedule_conflict($1, $2, $3, $4) as has_conflict',
      [userId, startDatetime, endDatetime, excludeScheduleId]
    );

    return result.rows[0].has_conflict;
  }

  async addParticipant(scheduleId, userId, participationStatus = 'confirmed') {
    const client = await this.pool.connect();

    try {
      await client.query('BEGIN');

      // 일정 존재 확인
      const scheduleCheck = await client.query(
        'SELECT id FROM schedules WHERE id = $1',
        [scheduleId]
      );

      if (scheduleCheck.rows.length === 0) {
        throw new Error('Schedule not found');
      }

      // 중복 참가 확인
      const participantCheck = await client.query(
        'SELECT id FROM schedule_participants WHERE schedule_id = $1 AND user_id = $2',
        [scheduleId, userId]
      );

      if (participantCheck.rows.length > 0) {
        throw new Error('User already participating in this schedule');
      }

      // 참가자 추가
      const result = await client.query(
        'INSERT INTO schedule_participants (schedule_id, user_id, participation_status) VALUES ($1, $2, $3) RETURNING *',
        [scheduleId, userId, participationStatus]
      );

      await client.query('COMMIT');

      return result.rows[0];
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  async updateParticipationStatus(scheduleId, userId, newStatus) {
    const validStatuses = ['confirmed', 'pending', 'declined'];
    if (!validStatuses.includes(newStatus)) {
      throw new Error('Invalid participation status');
    }

    const result = await this.pool.query(`
      UPDATE schedule_participants
      SET participation_status = $1
      WHERE schedule_id = $2 AND user_id = $3
      RETURNING *
    `, [newStatus, scheduleId, userId]);

    if (result.rows.length === 0) {
      throw new Error('Participant not found');
    }

    return result.rows[0];
  }

  async removeParticipant(scheduleId, userId) {
    const result = await this.pool.query(
      'DELETE FROM schedule_participants WHERE schedule_id = $1 AND user_id = $2 RETURNING *',
      [scheduleId, userId]
    );

    if (result.rows.length === 0) {
      throw new Error('Participant not found');
    }

    return { success: true, message: 'Participant removed successfully' };
  }

  async getScheduleStatistics(teamId = null, startDate = null, endDate = null) {
    let whereConditions = [];
    let queryParams = [];
    let paramIndex = 1;

    if (teamId) {
      whereConditions.push(`s.team_id = $${paramIndex}`);
      queryParams.push(teamId);
      paramIndex++;
    }

    if (startDate) {
      whereConditions.push(`s.start_datetime >= $${paramIndex}`);
      queryParams.push(startDate);
      paramIndex++;
    }

    if (endDate) {
      whereConditions.push(`s.start_datetime <= $${paramIndex}`);
      queryParams.push(endDate);
      paramIndex++;
    }

    const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';

    const result = await this.pool.query(`
      SELECT
        COUNT(*) as total_schedules,
        COUNT(CASE WHEN schedule_type = 'team' THEN 1 END) as team_schedules,
        COUNT(CASE WHEN schedule_type = 'personal' THEN 1 END) as personal_schedules,
        COUNT(CASE WHEN start_datetime > NOW() THEN 1 END) as upcoming_schedules,
        COUNT(CASE WHEN end_datetime < NOW() THEN 1 END) as past_schedules,
        COUNT(CASE WHEN start_datetime <= NOW() AND end_datetime >= NOW() THEN 1 END) as ongoing_schedules,
        AVG(EXTRACT(EPOCH FROM (end_datetime - start_datetime)) / 3600) as avg_duration_hours
      FROM schedules s
      ${whereClause}
    `, queryParams);

    return result.rows[0];
  }

  async searchSchedules(keyword, userId = null, limit = 50) {
    let userCondition = '';
    let queryParams = [keyword, limit];

    if (userId) {
      userCondition = `
        AND (
          s.creator_id = $3
          OR EXISTS (
            SELECT 1 FROM schedule_participants sp
            WHERE sp.schedule_id = s.id AND sp.user_id = $3
          )
        )
      `;
      queryParams.push(userId);
    }

    const result = await this.pool.query(`
      SELECT
        s.*,
        u.name as creator_name,
        t.name as team_name,
        ts_rank(
          to_tsvector('english', s.title || ' ' || COALESCE(s.content, '')),
          plainto_tsquery('english', $1)
        ) as relevance_score
      FROM schedules s
      LEFT JOIN users u ON s.creator_id = u.id
      LEFT JOIN teams t ON s.team_id = t.id
      WHERE to_tsvector('english', s.title || ' ' || COALESCE(s.content, ''))
            @@ plainto_tsquery('english', $1)
            ${userCondition}
      ORDER BY relevance_score DESC, s.start_datetime DESC
      LIMIT $2
    `, queryParams);

    return result.rows;
  }
}

describe('ScheduleService Unit Tests', () => {
  let pool;
  let scheduleService;
  let testUser;
  let testTeam;
  let memberUser;

  beforeAll(() => {
    pool = getTestDbPool();
    scheduleService = new ScheduleService(pool);
  });

  beforeEach(async () => {
    // 테스트용 사용자 및 팀 생성
    const userResult = await pool.query(
      'INSERT INTO users (email, name, password_hash) VALUES ($1, $2, $3) RETURNING *',
      ['service@example.com', 'Service User', 'hashedpassword']
    );
    testUser = userResult.rows[0];

    const memberResult = await pool.query(
      'INSERT INTO users (email, name, password_hash) VALUES ($1, $2, $3) RETURNING *',
      ['member@example.com', 'Member User', 'hashedpassword']
    );
    memberUser = memberResult.rows[0];

    const teamResult = await pool.query(
      'INSERT INTO teams (name, description, invite_code, creator_id) VALUES ($1, $2, $3, $4) RETURNING *',
      ['Service Team', 'Test Description', 'SRV123', testUser.id]
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
  });

  describe('createSchedule', () => {
    test('개인 일정을 올바르게 생성해야 함', async () => {
      const scheduleData = {
        title: 'Personal Meeting',
        content: 'Important personal meeting',
        start_datetime: '2024-12-25 10:00:00',
        end_datetime: '2024-12-25 11:00:00',
        schedule_type: 'personal',
        creator_id: testUser.id,
        team_id: null,
        participants: [{ user_id: testUser.id, status: 'confirmed' }]
      };

      const result = await scheduleService.createSchedule(scheduleData);

      expect(result).toBeDefined();
      expect(result.title).toBe(scheduleData.title);
      expect(result.schedule_type).toBe('personal');
      expect(result.creator_id).toBe(testUser.id);
      expect(result.team_id).toBeNull();
      expect(result.participants).toHaveLength(1);
      expect(result.participants[0].user_id).toBe(testUser.id);
    });

    test('팀 일정을 올바르게 생성해야 함', async () => {
      const scheduleData = {
        title: 'Team Meeting',
        content: 'Weekly team meeting',
        start_datetime: '2024-12-25 14:00:00',
        end_datetime: '2024-12-25 15:00:00',
        schedule_type: 'team',
        creator_id: testUser.id,
        team_id: testTeam.id,
        participants: [
          { user_id: testUser.id, status: 'confirmed' },
          { user_id: memberUser.id, status: 'pending' }
        ]
      };

      const result = await scheduleService.createSchedule(scheduleData);

      expect(result.title).toBe(scheduleData.title);
      expect(result.schedule_type).toBe('team');
      expect(result.team_id).toBe(testTeam.id);
      expect(result.participants).toHaveLength(2);
    });

    test('트랜잭션 실패 시 롤백되어야 함', async () => {
      const scheduleData = {
        title: 'Failed Schedule',
        content: 'This should fail',
        start_datetime: '2024-12-25 16:00:00',
        end_datetime: '2024-12-25 15:00:00', // 잘못된 시간 순서
        schedule_type: 'personal',
        creator_id: testUser.id,
        team_id: null
      };

      await expect(scheduleService.createSchedule(scheduleData)).rejects.toThrow();

      // 실패한 일정이 생성되지 않았는지 확인
      const checkResult = await pool.query(
        'SELECT COUNT(*) as count FROM schedules WHERE title = $1',
        ['Failed Schedule']
      );
      expect(parseInt(checkResult.rows[0].count)).toBe(0);
    });
  });

  describe('getScheduleById', () => {
    let scheduleId;

    beforeEach(async () => {
      const scheduleData = {
        title: 'Test Schedule',
        content: 'Test content',
        start_datetime: '2024-12-25 10:00:00',
        end_datetime: '2024-12-25 11:00:00',
        schedule_type: 'personal',
        creator_id: testUser.id,
        team_id: null,
        participants: [{ user_id: testUser.id }]
      };

      const result = await scheduleService.createSchedule(scheduleData);
      scheduleId = result.id;
    });

    test('존재하는 일정을 올바르게 조회해야 함', async () => {
      const result = await scheduleService.getScheduleById(scheduleId);

      expect(result).toBeDefined();
      expect(result.id).toBe(scheduleId);
      expect(result.title).toBe('Test Schedule');
      expect(result.creator_name).toBe(testUser.name);
      expect(result.participants).toHaveLength(1);
    });

    test('존재하지 않는 일정 조회 시 null을 반환해야 함', async () => {
      const result = await scheduleService.getScheduleById(99999);
      expect(result).toBeNull();
    });
  });

  describe('getUserSchedules', () => {
    beforeEach(async () => {
      // 여러 일정 생성
      for (let i = 0; i < 5; i++) {
        const scheduleData = {
          title: `User Schedule ${i}`,
          content: 'Test content',
          start_datetime: `2024-12-2${5 + i} 10:00:00`,
          end_datetime: `2024-12-2${5 + i} 11:00:00`,
          schedule_type: 'personal',
          creator_id: testUser.id,
          team_id: null,
          participants: [{ user_id: testUser.id }]
        };

        await scheduleService.createSchedule(scheduleData);
      }
    });

    test('사용자 일정을 올바르게 조회해야 함', async () => {
      const result = await scheduleService.getUserSchedules(
        testUser.id,
        '2024-12-20',
        '2024-12-31'
      );

      expect(result).toHaveLength(5);
      expect(result[0].title).toBe('User Schedule 0');
      expect(result[0].participation_status).toBe('confirmed');
    });

    test('페이지네이션이 올바르게 작동해야 함', async () => {
      const page1 = await scheduleService.getUserSchedules(
        testUser.id,
        '2024-12-20',
        '2024-12-31',
        { page: 1, limit: 3 }
      );

      const page2 = await scheduleService.getUserSchedules(
        testUser.id,
        '2024-12-20',
        '2024-12-31',
        { page: 2, limit: 3 }
      );

      expect(page1).toHaveLength(3);
      expect(page2).toHaveLength(2);
      expect(page1[0].title).toBe('User Schedule 0');
      expect(page2[0].title).toBe('User Schedule 3');
    });

    test('거절된 일정 포함 옵션이 작동해야 함', async () => {
      // 거절 상태 일정 추가
      const scheduleData = {
        title: 'Declined Schedule',
        content: 'Test content',
        start_datetime: '2024-12-30 10:00:00',
        end_datetime: '2024-12-30 11:00:00',
        schedule_type: 'personal',
        creator_id: testUser.id,
        team_id: null,
        participants: [{ user_id: testUser.id, status: 'declined' }]
      };

      await scheduleService.createSchedule(scheduleData);

      const withoutDeclined = await scheduleService.getUserSchedules(
        testUser.id,
        '2024-12-20',
        '2024-12-31'
      );

      const withDeclined = await scheduleService.getUserSchedules(
        testUser.id,
        '2024-12-20',
        '2024-12-31',
        { includeDeclined: true }
      );

      expect(withoutDeclined).toHaveLength(5);
      expect(withDeclined).toHaveLength(6);
    });
  });

  describe('updateSchedule', () => {
    let scheduleId;

    beforeEach(async () => {
      const scheduleData = {
        title: 'Original Schedule',
        content: 'Original content',
        start_datetime: '2024-12-25 10:00:00',
        end_datetime: '2024-12-25 11:00:00',
        schedule_type: 'personal',
        creator_id: testUser.id,
        team_id: null
      };

      const result = await scheduleService.createSchedule(scheduleData);
      scheduleId = result.id;
    });

    test('일정 생성자가 일정을 수정할 수 있어야 함', async () => {
      const updateData = {
        title: 'Updated Schedule',
        content: 'Updated content',
        start_datetime: '2024-12-25 14:00:00',
        end_datetime: '2024-12-25 15:00:00'
      };

      const result = await scheduleService.updateSchedule(scheduleId, updateData, testUser.id);

      expect(result.title).toBe(updateData.title);
      expect(result.content).toBe(updateData.content);
      expect(result.updated_at).toBeDefined();
    });

    test('권한 없는 사용자가 일정 수정 시 오류가 발생해야 함', async () => {
      const updateData = {
        title: 'Unauthorized Update',
        content: 'This should fail',
        start_datetime: '2024-12-25 16:00:00',
        end_datetime: '2024-12-25 17:00:00'
      };

      await expect(
        scheduleService.updateSchedule(scheduleId, updateData, memberUser.id)
      ).rejects.toThrow('Insufficient permissions');
    });

    test('팀장이 팀 일정을 수정할 수 있어야 함', async () => {
      // 팀 일정 생성
      const teamScheduleData = {
        title: 'Team Schedule',
        content: 'Team content',
        start_datetime: '2024-12-25 16:00:00',
        end_datetime: '2024-12-25 17:00:00',
        schedule_type: 'team',
        creator_id: testUser.id,
        team_id: testTeam.id
      };

      const teamSchedule = await scheduleService.createSchedule(teamScheduleData);

      const updateData = {
        title: 'Updated Team Schedule',
        content: 'Updated team content',
        start_datetime: '2024-12-25 18:00:00',
        end_datetime: '2024-12-25 19:00:00'
      };

      const result = await scheduleService.updateSchedule(teamSchedule.id, updateData, testUser.id);

      expect(result.title).toBe(updateData.title);
    });

    test('팀원이 팀 일정 수정 시 오류가 발생해야 함', async () => {
      // 팀 일정 생성
      const teamScheduleData = {
        title: 'Team Schedule',
        content: 'Team content',
        start_datetime: '2024-12-25 20:00:00',
        end_datetime: '2024-12-25 21:00:00',
        schedule_type: 'team',
        creator_id: testUser.id,
        team_id: testTeam.id
      };

      const teamSchedule = await scheduleService.createSchedule(teamScheduleData);

      const updateData = {
        title: 'Member Update Attempt',
        content: 'This should fail',
        start_datetime: '2024-12-25 22:00:00',
        end_datetime: '2024-12-25 23:00:00'
      };

      await expect(
        scheduleService.updateSchedule(teamSchedule.id, updateData, memberUser.id)
      ).rejects.toThrow('Insufficient permissions');
    });
  });

  describe('deleteSchedule', () => {
    let scheduleId;

    beforeEach(async () => {
      const scheduleData = {
        title: 'To Delete',
        content: 'This will be deleted',
        start_datetime: '2024-12-25 22:00:00',
        end_datetime: '2024-12-25 23:00:00',
        schedule_type: 'personal',
        creator_id: testUser.id,
        team_id: null,
        participants: [{ user_id: testUser.id }]
      };

      const result = await scheduleService.createSchedule(scheduleData);
      scheduleId = result.id;
    });

    test('일정 생성자가 일정을 삭제할 수 있어야 함', async () => {
      const result = await scheduleService.deleteSchedule(scheduleId, testUser.id);

      expect(result.success).toBe(true);
      expect(result.message).toContain('deleted successfully');

      // 실제로 삭제되었는지 확인
      const deletedSchedule = await scheduleService.getScheduleById(scheduleId);
      expect(deletedSchedule).toBeNull();
    });

    test('권한 없는 사용자가 일정 삭제 시 오류가 발생해야 함', async () => {
      await expect(
        scheduleService.deleteSchedule(scheduleId, memberUser.id)
      ).rejects.toThrow('Insufficient permissions');

      // 일정이 삭제되지 않았는지 확인
      const schedule = await scheduleService.getScheduleById(scheduleId);
      expect(schedule).toBeDefined();
    });
  });

  describe('checkScheduleConflict', () => {
    beforeEach(async () => {
      const scheduleData = {
        title: 'Conflict Test',
        content: 'For conflict testing',
        start_datetime: '2024-12-25 10:00:00',
        end_datetime: '2024-12-25 11:00:00',
        schedule_type: 'personal',
        creator_id: testUser.id,
        team_id: null,
        participants: [{ user_id: testUser.id }]
      };

      await scheduleService.createSchedule(scheduleData);
    });

    test('충돌하는 시간대를 올바르게 감지해야 함', async () => {
      const hasConflict = await scheduleService.checkScheduleConflict(
        testUser.id,
        '2024-12-25 10:30:00',
        '2024-12-25 11:30:00'
      );

      expect(hasConflict).toBe(true);
    });

    test('충돌하지 않는 시간대를 올바르게 식별해야 함', async () => {
      const hasConflict = await scheduleService.checkScheduleConflict(
        testUser.id,
        '2024-12-25 12:00:00',
        '2024-12-25 13:00:00'
      );

      expect(hasConflict).toBe(false);
    });
  });

  describe('Participant Management', () => {
    let scheduleId;

    beforeEach(async () => {
      const scheduleData = {
        title: 'Participant Test',
        content: 'For participant testing',
        start_datetime: '2024-12-25 14:00:00',
        end_datetime: '2024-12-25 15:00:00',
        schedule_type: 'personal',
        creator_id: testUser.id,
        team_id: null
      };

      const result = await scheduleService.createSchedule(scheduleData);
      scheduleId = result.id;
    });

    test('참가자를 추가할 수 있어야 함', async () => {
      const result = await scheduleService.addParticipant(scheduleId, memberUser.id, 'pending');

      expect(result.schedule_id).toBe(scheduleId);
      expect(result.user_id).toBe(memberUser.id);
      expect(result.participation_status).toBe('pending');
    });

    test('중복 참가자 추가 시 오류가 발생해야 함', async () => {
      await scheduleService.addParticipant(scheduleId, memberUser.id);

      await expect(
        scheduleService.addParticipant(scheduleId, memberUser.id)
      ).rejects.toThrow('User already participating');
    });

    test('참가 상태를 변경할 수 있어야 함', async () => {
      await scheduleService.addParticipant(scheduleId, memberUser.id, 'pending');

      const result = await scheduleService.updateParticipationStatus(
        scheduleId,
        memberUser.id,
        'confirmed'
      );

      expect(result.participation_status).toBe('confirmed');
    });

    test('잘못된 참가 상태 변경 시 오류가 발생해야 함', async () => {
      await scheduleService.addParticipant(scheduleId, memberUser.id);

      await expect(
        scheduleService.updateParticipationStatus(scheduleId, memberUser.id, 'invalid_status')
      ).rejects.toThrow('Invalid participation status');
    });

    test('참가자를 제거할 수 있어야 함', async () => {
      await scheduleService.addParticipant(scheduleId, memberUser.id);

      const result = await scheduleService.removeParticipant(scheduleId, memberUser.id);

      expect(result.success).toBe(true);
      expect(result.message).toContain('removed successfully');
    });
  });

  describe('Statistics and Search', () => {
    beforeEach(async () => {
      // 통계용 일정들 생성
      const schedules = [
        {
          title: 'Team Meeting 1',
          schedule_type: 'team',
          team_id: testTeam.id,
          start_datetime: '2024-12-20 10:00:00',
          end_datetime: '2024-12-20 11:00:00'
        },
        {
          title: 'Personal Task',
          schedule_type: 'personal',
          team_id: null,
          start_datetime: '2024-12-25 14:00:00',
          end_datetime: '2024-12-25 15:00:00'
        },
        {
          title: 'Future Team Meeting',
          schedule_type: 'team',
          team_id: testTeam.id,
          start_datetime: '2025-01-15 10:00:00',
          end_datetime: '2025-01-15 11:00:00'
        }
      ];

      for (const schedule of schedules) {
        await scheduleService.createSchedule({
          ...schedule,
          content: 'Test content',
          creator_id: testUser.id
        });
      }
    });

    test('일정 통계를 올바르게 계산해야 함', async () => {
      const stats = await scheduleService.getScheduleStatistics(
        testTeam.id,
        '2024-12-01',
        '2024-12-31'
      );

      expect(parseInt(stats.total_schedules)).toBe(2);
      expect(parseInt(stats.team_schedules)).toBe(1);
      expect(parseInt(stats.personal_schedules)).toBe(1);
      expect(parseFloat(stats.avg_duration_hours)).toBe(1);
    });

    test('일정 검색이 올바르게 작동해야 함', async () => {
      const results = await scheduleService.searchSchedules('Meeting', testUser.id);

      expect(results.length).toBeGreaterThan(0);
      expect(results[0].title).toContain('Meeting');
      expect(results[0].relevance_score).toBeDefined();
    });

    test('키워드가 없는 일정은 검색되지 않아야 함', async () => {
      const results = await scheduleService.searchSchedules('NonExistentKeyword', testUser.id);

      expect(results).toHaveLength(0);
    });
  });
});