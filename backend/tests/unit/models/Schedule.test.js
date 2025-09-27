const { Pool } = require('pg');

describe('Schedule Model Tests', () => {
  let pool;

  beforeAll(() => {
    pool = getTestDbPool();
  });

  describe('Schedule Creation', () => {
    test('개인 일정을 올바르게 생성해야 함', async () => {
      const client = await pool.connect();

      try {
        // 테스트용 사용자 생성
        const userResult = await client.query(
          'INSERT INTO users (email, name, password_hash) VALUES ($1, $2, $3) RETURNING id',
          ['test@example.com', 'Test User', 'hashedpassword']
        );
        const userId = userResult.rows[0].id;

        // 개인 일정 생성
        const scheduleData = await createTestSchedule({
          title: '개인 회의',
          content: '중요한 개인 회의',
          schedule_type: 'personal',
          creator_id: userId,
          team_id: null
        });

        const result = await client.query(`
          INSERT INTO schedules (title, content, start_datetime, end_datetime, schedule_type, creator_id, team_id)
          VALUES ($1, $2, $3, $4, $5, $6, $7)
          RETURNING *
        `, [
          scheduleData.title,
          scheduleData.content,
          scheduleData.start_datetime,
          scheduleData.end_datetime,
          scheduleData.schedule_type,
          scheduleData.creator_id,
          scheduleData.team_id
        ]);

        const schedule = result.rows[0];

        expect(schedule.id).toBeDefined();
        expect(schedule.title).toBe('개인 회의');
        expect(schedule.schedule_type).toBe('personal');
        expect(schedule.creator_id).toBe(userId);
        expect(schedule.team_id).toBeNull();
        expect(schedule.created_at).toBeDefined();
      } finally {
        client.release();
      }
    });

    test('팀 일정을 올바르게 생성해야 함', async () => {
      const client = await pool.connect();

      try {
        // 테스트용 사용자 및 팀 생성
        const userResult = await client.query(
          'INSERT INTO users (email, name, password_hash) VALUES ($1, $2, $3) RETURNING id',
          ['leader@example.com', 'Team Leader', 'hashedpassword']
        );
        const userId = userResult.rows[0].id;

        const teamResult = await client.query(
          'INSERT INTO teams (name, description, invite_code, creator_id) VALUES ($1, $2, $3, $4) RETURNING id',
          ['Test Team', 'Test Description', 'ABC123', userId]
        );
        const teamId = teamResult.rows[0].id;

        // 팀 일정 생성
        const scheduleData = await createTestSchedule({
          title: '팀 스프린트 미팅',
          content: '주간 스프린트 리뷰',
          schedule_type: 'team',
          creator_id: userId,
          team_id: teamId
        });

        const result = await client.query(`
          INSERT INTO schedules (title, content, start_datetime, end_datetime, schedule_type, creator_id, team_id)
          VALUES ($1, $2, $3, $4, $5, $6, $7)
          RETURNING *
        `, [
          scheduleData.title,
          scheduleData.content,
          scheduleData.start_datetime,
          scheduleData.end_datetime,
          scheduleData.schedule_type,
          scheduleData.creator_id,
          scheduleData.team_id
        ]);

        const schedule = result.rows[0];

        expect(schedule.id).toBeDefined();
        expect(schedule.title).toBe('팀 스프린트 미팅');
        expect(schedule.schedule_type).toBe('team');
        expect(schedule.creator_id).toBe(userId);
        expect(schedule.team_id).toBe(teamId);
      } finally {
        client.release();
      }
    });

    test('잘못된 일정 데이터 검증을 수행해야 함', async () => {
      const client = await pool.connect();

      try {
        const userResult = await client.query(
          'INSERT INTO users (email, name, password_hash) VALUES ($1, $2, $3) RETURNING id',
          ['test@example.com', 'Test User', 'hashedpassword']
        );
        const userId = userResult.rows[0].id;

        // 종료 시간이 시작 시간보다 빠른 경우
        await expect(
          client.query(`
            INSERT INTO schedules (title, content, start_datetime, end_datetime, schedule_type, creator_id)
            VALUES ($1, $2, $3, $4, $5, $6)
          `, [
            'Invalid Schedule',
            'Test content',
            '2024-12-25 14:00:00',
            '2024-12-25 13:00:00', // 시작 시간보다 빠름
            'personal',
            userId
          ])
        ).rejects.toThrow();

        // 7일을 초과하는 일정
        await expect(
          client.query(`
            INSERT INTO schedules (title, content, start_datetime, end_datetime, schedule_type, creator_id)
            VALUES ($1, $2, $3, $4, $5, $6)
          `, [
            'Too Long Schedule',
            'Test content',
            '2024-12-25 09:00:00',
            '2025-01-02 10:00:00', // 8일 넘음
            'personal',
            userId
          ])
        ).rejects.toThrow();

        // 팀 일정인데 team_id가 없는 경우
        await expect(
          client.query(`
            INSERT INTO schedules (title, content, start_datetime, end_datetime, schedule_type, creator_id, team_id)
            VALUES ($1, $2, $3, $4, $5, $6, $7)
          `, [
            'Team Schedule',
            'Test content',
            '2024-12-25 09:00:00',
            '2024-12-25 10:00:00',
            'team',
            userId,
            null // team_id가 없음
          ])
        ).rejects.toThrow();
      } finally {
        client.release();
      }
    });
  });

  describe('Schedule Conflict Detection', () => {
    test('일정 충돌을 올바르게 감지해야 함', async () => {
      const client = await pool.connect();

      try {
        // 테스트용 사용자 생성
        const userResult = await client.query(
          'INSERT INTO users (email, name, password_hash) VALUES ($1, $2, $3) RETURNING id',
          ['conflict@example.com', 'Conflict User', 'hashedpassword']
        );
        const userId = userResult.rows[0].id;

        // 첫 번째 일정 생성
        const schedule1Result = await client.query(`
          INSERT INTO schedules (title, content, start_datetime, end_datetime, schedule_type, creator_id)
          VALUES ($1, $2, $3, $4, $5, $6)
          RETURNING id
        `, [
          'First Meeting',
          'Test content',
          '2024-12-25 09:00:00',
          '2024-12-25 10:00:00',
          'personal',
          userId
        ]);
        const schedule1Id = schedule1Result.rows[0].id;

        // 첫 번째 일정에 참가자 추가
        await client.query(
          'INSERT INTO schedule_participants (schedule_id, user_id, participation_status) VALUES ($1, $2, $3)',
          [schedule1Id, userId, 'confirmed']
        );

        // 충돌하는 시간대 확인
        const conflictResult = await client.query(
          'SELECT check_schedule_conflict($1, $2, $3) as has_conflict',
          [userId, '2024-12-25 09:30:00', '2024-12-25 10:30:00']
        );

        expect(conflictResult.rows[0].has_conflict).toBe(true);

        // 충돌하지 않는 시간대 확인
        const noConflictResult = await client.query(
          'SELECT check_schedule_conflict($1, $2, $3) as has_conflict',
          [userId, '2024-12-25 10:30:00', '2024-12-25 11:30:00']
        );

        expect(noConflictResult.rows[0].has_conflict).toBe(false);
      } finally {
        client.release();
      }
    });

    test('일정 수정 시 자기 자신 제외하고 충돌 검사해야 함', async () => {
      const client = await pool.connect();

      try {
        const userResult = await client.query(
          'INSERT INTO users (email, name, password_hash) VALUES ($1, $2, $3) RETURNING id',
          ['modify@example.com', 'Modify User', 'hashedpassword']
        );
        const userId = userResult.rows[0].id;

        const scheduleResult = await client.query(`
          INSERT INTO schedules (title, content, start_datetime, end_datetime, schedule_type, creator_id)
          VALUES ($1, $2, $3, $4, $5, $6)
          RETURNING id
        `, [
          'Original Meeting',
          'Test content',
          '2024-12-25 09:00:00',
          '2024-12-25 10:00:00',
          'personal',
          userId
        ]);
        const scheduleId = scheduleResult.rows[0].id;

        await client.query(
          'INSERT INTO schedule_participants (schedule_id, user_id, participation_status) VALUES ($1, $2, $3)',
          [scheduleId, userId, 'confirmed']
        );

        // 자기 자신을 제외하고 충돌 검사 (충돌 없음)
        const result = await client.query(
          'SELECT check_schedule_conflict($1, $2, $3, $4) as has_conflict',
          [userId, '2024-12-25 09:30:00', '2024-12-25 10:30:00', scheduleId]
        );

        expect(result.rows[0].has_conflict).toBe(false);
      } finally {
        client.release();
      }
    });
  });

  describe('Schedule Queries', () => {
    test('사용자별 일정 조회가 올바르게 작동해야 함', async () => {
      const client = await pool.connect();

      try {
        const userResult = await client.query(
          'INSERT INTO users (email, name, password_hash) VALUES ($1, $2, $3) RETURNING id',
          ['query@example.com', 'Query User', 'hashedpassword']
        );
        const userId = userResult.rows[0].id;

        // 여러 일정 생성
        const schedules = [];
        for (let i = 0; i < 3; i++) {
          const scheduleResult = await client.query(`
            INSERT INTO schedules (title, content, start_datetime, end_datetime, schedule_type, creator_id)
            VALUES ($1, $2, $3, $4, $5, $6)
            RETURNING id
          `, [
            `Schedule ${i + 1}`,
            'Test content',
            `2024-12-2${5 + i} 09:00:00`,
            `2024-12-2${5 + i} 10:00:00`,
            'personal',
            userId
          ]);

          const scheduleId = scheduleResult.rows[0].id;
          schedules.push(scheduleId);

          await client.query(
            'INSERT INTO schedule_participants (schedule_id, user_id, participation_status) VALUES ($1, $2, $3)',
            [scheduleId, userId, 'confirmed']
          );
        }

        // 사용자 일정 조회
        const result = await client.query(`
          SELECT s.*, sp.participation_status
          FROM schedules s
          JOIN schedule_participants sp ON s.id = sp.schedule_id
          WHERE sp.user_id = $1
          ORDER BY s.start_datetime
        `, [userId]);

        expect(result.rows).toHaveLength(3);
        expect(result.rows[0].title).toBe('Schedule 1');
        expect(result.rows[1].title).toBe('Schedule 2');
        expect(result.rows[2].title).toBe('Schedule 3');
      } finally {
        client.release();
      }
    });

    test('팀별 일정 조회가 올바르게 작동해야 함', async () => {
      const client = await pool.connect();

      try {
        const userResult = await client.query(
          'INSERT INTO users (email, name, password_hash) VALUES ($1, $2, $3) RETURNING id',
          ['team@example.com', 'Team User', 'hashedpassword']
        );
        const userId = userResult.rows[0].id;

        const teamResult = await client.query(
          'INSERT INTO teams (name, description, invite_code, creator_id) VALUES ($1, $2, $3, $4) RETURNING id',
          ['Query Team', 'Test Description', 'QRY123', userId]
        );
        const teamId = teamResult.rows[0].id;

        // 팀 일정 생성
        const scheduleResult = await client.query(`
          INSERT INTO schedules (title, content, start_datetime, end_datetime, schedule_type, creator_id, team_id)
          VALUES ($1, $2, $3, $4, $5, $6, $7)
          RETURNING id
        `, [
          'Team Meeting',
          'Team content',
          '2024-12-25 14:00:00',
          '2024-12-25 15:00:00',
          'team',
          userId,
          teamId
        ]);

        // 팀 일정 조회
        const result = await client.query(`
          SELECT * FROM schedules
          WHERE team_id = $1 AND schedule_type = 'team'
          ORDER BY start_datetime
        `, [teamId]);

        expect(result.rows).toHaveLength(1);
        expect(result.rows[0].title).toBe('Team Meeting');
        expect(result.rows[0].team_id).toBe(teamId);
      } finally {
        client.release();
      }
    });
  });

  describe('Schedule Participants', () => {
    test('일정 참가자 추가/제거가 올바르게 작동해야 함', async () => {
      const client = await pool.connect();

      try {
        // 테스트용 사용자들 생성
        const users = [];
        for (let i = 0; i < 3; i++) {
          const userResult = await client.query(
            'INSERT INTO users (email, name, password_hash) VALUES ($1, $2, $3) RETURNING id',
            [`user${i}@example.com`, `User ${i}`, 'hashedpassword']
          );
          users.push(userResult.rows[0].id);
        }

        // 일정 생성
        const scheduleResult = await client.query(`
          INSERT INTO schedules (title, content, start_datetime, end_datetime, schedule_type, creator_id)
          VALUES ($1, $2, $3, $4, $5, $6)
          RETURNING id
        `, [
          'Group Meeting',
          'Test content',
          '2024-12-25 16:00:00',
          '2024-12-25 17:00:00',
          'personal',
          users[0]
        ]);
        const scheduleId = scheduleResult.rows[0].id;

        // 참가자 추가
        for (const userId of users) {
          await client.query(
            'INSERT INTO schedule_participants (schedule_id, user_id, participation_status) VALUES ($1, $2, $3)',
            [scheduleId, userId, 'confirmed']
          );
        }

        // 참가자 조회
        const participantsResult = await client.query(`
          SELECT sp.*, u.name as participant_name
          FROM schedule_participants sp
          JOIN users u ON sp.user_id = u.id
          WHERE sp.schedule_id = $1
          ORDER BY u.name
        `, [scheduleId]);

        expect(participantsResult.rows).toHaveLength(3);
        expect(participantsResult.rows[0].participant_name).toBe('User 0');
        expect(participantsResult.rows[1].participant_name).toBe('User 1');
        expect(participantsResult.rows[2].participant_name).toBe('User 2');

        // 참가자 제거
        await client.query(
          'DELETE FROM schedule_participants WHERE schedule_id = $1 AND user_id = $2',
          [scheduleId, users[1]]
        );

        const remainingResult = await client.query(
          'SELECT COUNT(*) as count FROM schedule_participants WHERE schedule_id = $1',
          [scheduleId]
        );

        expect(parseInt(remainingResult.rows[0].count)).toBe(2);
      } finally {
        client.release();
      }
    });

    test('참가 상태 변경이 올바르게 작동해야 함', async () => {
      const client = await pool.connect();

      try {
        const userResult = await client.query(
          'INSERT INTO users (email, name, password_hash) VALUES ($1, $2, $3) RETURNING id',
          ['status@example.com', 'Status User', 'hashedpassword']
        );
        const userId = userResult.rows[0].id;

        const scheduleResult = await client.query(`
          INSERT INTO schedules (title, content, start_datetime, end_datetime, schedule_type, creator_id)
          VALUES ($1, $2, $3, $4, $5, $6)
          RETURNING id
        `, [
          'Status Test Meeting',
          'Test content',
          '2024-12-25 18:00:00',
          '2024-12-25 19:00:00',
          'personal',
          userId
        ]);
        const scheduleId = scheduleResult.rows[0].id;

        // 대기 상태로 참가자 추가
        await client.query(
          'INSERT INTO schedule_participants (schedule_id, user_id, participation_status) VALUES ($1, $2, $3)',
          [scheduleId, userId, 'pending']
        );

        // 확정 상태로 변경
        await client.query(
          'UPDATE schedule_participants SET participation_status = $1 WHERE schedule_id = $2 AND user_id = $3',
          ['confirmed', scheduleId, userId]
        );

        const result = await client.query(
          'SELECT participation_status FROM schedule_participants WHERE schedule_id = $1 AND user_id = $2',
          [scheduleId, userId]
        );

        expect(result.rows[0].participation_status).toBe('confirmed');
      } finally {
        client.release();
      }
    });
  });

  describe('Schedule Update Operations', () => {
    test('일정 정보 수정이 올바르게 작동해야 함', async () => {
      const client = await pool.connect();

      try {
        const userResult = await client.query(
          'INSERT INTO users (email, name, password_hash) VALUES ($1, $2, $3) RETURNING id',
          ['update@example.com', 'Update User', 'hashedpassword']
        );
        const userId = userResult.rows[0].id;

        const scheduleResult = await client.query(`
          INSERT INTO schedules (title, content, start_datetime, end_datetime, schedule_type, creator_id)
          VALUES ($1, $2, $3, $4, $5, $6)
          RETURNING id, created_at
        `, [
          'Original Title',
          'Original content',
          '2024-12-25 20:00:00',
          '2024-12-25 21:00:00',
          'personal',
          userId
        ]);
        const scheduleId = scheduleResult.rows[0].id;
        const createdAt = scheduleResult.rows[0].created_at;

        // 일정 정보 수정
        await client.query(`
          UPDATE schedules
          SET title = $1, content = $2, start_datetime = $3, end_datetime = $4
          WHERE id = $5
        `, [
          'Updated Title',
          'Updated content',
          '2024-12-25 21:00:00',
          '2024-12-25 22:00:00',
          scheduleId
        ]);

        const updatedResult = await client.query(
          'SELECT * FROM schedules WHERE id = $1',
          [scheduleId]
        );

        const updatedSchedule = updatedResult.rows[0];
        expect(updatedSchedule.title).toBe('Updated Title');
        expect(updatedSchedule.content).toBe('Updated content');
        expect(updatedSchedule.updated_at).not.toEqual(createdAt);
      } finally {
        client.release();
      }
    });

    test('일정 삭제가 올바르게 작동해야 함', async () => {
      const client = await pool.connect();

      try {
        const userResult = await client.query(
          'INSERT INTO users (email, name, password_hash) VALUES ($1, $2, $3) RETURNING id',
          ['delete@example.com', 'Delete User', 'hashedpassword']
        );
        const userId = userResult.rows[0].id;

        const scheduleResult = await client.query(`
          INSERT INTO schedules (title, content, start_datetime, end_datetime, schedule_type, creator_id)
          VALUES ($1, $2, $3, $4, $5, $6)
          RETURNING id
        `, [
          'To Delete',
          'Test content',
          '2024-12-25 22:00:00',
          '2024-12-25 23:00:00',
          'personal',
          userId
        ]);
        const scheduleId = scheduleResult.rows[0].id;

        // 참가자 추가
        await client.query(
          'INSERT INTO schedule_participants (schedule_id, user_id, participation_status) VALUES ($1, $2, $3)',
          [scheduleId, userId, 'confirmed']
        );

        // 일정 삭제 (CASCADE로 참가자도 함께 삭제됨)
        await client.query('DELETE FROM schedules WHERE id = $1', [scheduleId]);

        // 일정이 삭제되었는지 확인
        const scheduleCheck = await client.query(
          'SELECT COUNT(*) as count FROM schedules WHERE id = $1',
          [scheduleId]
        );
        expect(parseInt(scheduleCheck.rows[0].count)).toBe(0);

        // 참가자도 삭제되었는지 확인
        const participantCheck = await client.query(
          'SELECT COUNT(*) as count FROM schedule_participants WHERE schedule_id = $1',
          [scheduleId]
        );
        expect(parseInt(participantCheck.rows[0].count)).toBe(0);
      } finally {
        client.release();
      }
    });
  });
});