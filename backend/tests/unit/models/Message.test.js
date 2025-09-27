const { Pool } = require('pg');

describe('Message Model Tests', () => {
  let pool;

  beforeAll(() => {
    pool = getTestDbPool();
  });

  describe('Message Creation', () => {
    test('일반 메시지를 올바르게 생성해야 함', async () => {
      const client = await pool.connect();

      try {
        // 테스트용 사용자 및 팀 생성
        const userResult = await client.query(
          'INSERT INTO users (email, name, password_hash) VALUES ($1, $2, $3) RETURNING id',
          ['sender@example.com', 'Sender User', 'hashedpassword']
        );
        const userId = userResult.rows[0].id;

        const teamResult = await client.query(
          'INSERT INTO teams (name, description, invite_code, creator_id) VALUES ($1, $2, $3, $4) RETURNING id',
          ['Test Team', 'Test Description', 'MSG123', userId]
        );
        const teamId = teamResult.rows[0].id;

        // 일반 메시지 생성
        const messageResult = await client.query(`
          INSERT INTO messages (team_id, sender_id, content, target_date, message_type)
          VALUES ($1, $2, $3, $4, $5)
          RETURNING *
        `, [
          teamId,
          userId,
          '안녕하세요! 팀 채팅입니다.',
          '2024-12-25',
          'normal'
        ]);

        const message = messageResult.rows[0];

        expect(message.id).toBeDefined();
        expect(message.team_id).toBe(teamId);
        expect(message.sender_id).toBe(userId);
        expect(message.content).toBe('안녕하세요! 팀 채팅입니다.');
        expect(message.target_date).toEqual(new Date('2024-12-25'));
        expect(message.message_type).toBe('normal');
        expect(message.sent_at).toBeDefined();
        expect(message.related_schedule_id).toBeNull();
      } finally {
        client.release();
      }
    });

    test('일정 관련 메시지를 올바르게 생성해야 함', async () => {
      const client = await pool.connect();

      try {
        // 테스트용 사용자, 팀, 일정 생성
        const userResult = await client.query(
          'INSERT INTO users (email, name, password_hash) VALUES ($1, $2, $3) RETURNING id',
          ['schedule@example.com', 'Schedule User', 'hashedpassword']
        );
        const userId = userResult.rows[0].id;

        const teamResult = await client.query(
          'INSERT INTO teams (name, description, invite_code, creator_id) VALUES ($1, $2, $3, $4) RETURNING id',
          ['Schedule Team', 'Test Description', 'SCH123', userId]
        );
        const teamId = teamResult.rows[0].id;

        const scheduleResult = await client.query(`
          INSERT INTO schedules (title, content, start_datetime, end_datetime, schedule_type, creator_id, team_id)
          VALUES ($1, $2, $3, $4, $5, $6, $7)
          RETURNING id
        `, [
          'Team Meeting',
          'Important meeting',
          '2024-12-25 14:00:00',
          '2024-12-25 15:00:00',
          'team',
          userId,
          teamId
        ]);
        const scheduleId = scheduleResult.rows[0].id;

        // 일정 요청 메시지 생성
        const messageResult = await client.query(`
          INSERT INTO messages (team_id, sender_id, content, target_date, message_type, related_schedule_id)
          VALUES ($1, $2, $3, $4, $5, $6)
          RETURNING *
        `, [
          teamId,
          userId,
          '내일 미팅 시간을 변경할 수 있을까요?',
          '2024-12-25',
          'schedule_request',
          scheduleId
        ]);

        const message = messageResult.rows[0];

        expect(message.message_type).toBe('schedule_request');
        expect(message.related_schedule_id).toBe(scheduleId);
        expect(message.content).toBe('내일 미팅 시간을 변경할 수 있을까요?');
      } finally {
        client.release();
      }
    });

    test('메시지 길이 제한을 검증해야 함', async () => {
      const client = await pool.connect();

      try {
        const userResult = await client.query(
          'INSERT INTO users (email, name, password_hash) VALUES ($1, $2, $3) RETURNING id',
          ['long@example.com', 'Long User', 'hashedpassword']
        );
        const userId = userResult.rows[0].id;

        const teamResult = await client.query(
          'INSERT INTO teams (name, description, invite_code, creator_id) VALUES ($1, $2, $3, $4) RETURNING id',
          ['Long Team', 'Test Description', 'LNG123', userId]
        );
        const teamId = teamResult.rows[0].id;

        // 500자를 초과하는 메시지
        const longMessage = 'A'.repeat(501);

        await expect(
          client.query(`
            INSERT INTO messages (team_id, sender_id, content, target_date, message_type)
            VALUES ($1, $2, $3, $4, $5)
          `, [
            teamId,
            userId,
            longMessage,
            '2024-12-25',
            'normal'
          ])
        ).rejects.toThrow();

        // 정확히 500자인 메시지는 성공해야 함
        const validMessage = 'B'.repeat(500);
        const validResult = await client.query(`
          INSERT INTO messages (team_id, sender_id, content, target_date, message_type)
          VALUES ($1, $2, $3, $4, $5)
          RETURNING id
        `, [
          teamId,
          userId,
          validMessage,
          '2024-12-25',
          'normal'
        ]);

        expect(validResult.rows[0].id).toBeDefined();
      } finally {
        client.release();
      }
    });

    test('잘못된 메시지 타입을 거부해야 함', async () => {
      const client = await pool.connect();

      try {
        const userResult = await client.query(
          'INSERT INTO users (email, name, password_hash) VALUES ($1, $2, $3) RETURNING id',
          ['type@example.com', 'Type User', 'hashedpassword']
        );
        const userId = userResult.rows[0].id;

        const teamResult = await client.query(
          'INSERT INTO teams (name, description, invite_code, creator_id) VALUES ($1, $2, $3, $4) RETURNING id',
          ['Type Team', 'Test Description', 'TYP123', userId]
        );
        const teamId = teamResult.rows[0].id;

        // 잘못된 메시지 타입
        await expect(
          client.query(`
            INSERT INTO messages (team_id, sender_id, content, target_date, message_type)
            VALUES ($1, $2, $3, $4, $5)
          `, [
            teamId,
            userId,
            'Test message',
            '2024-12-25',
            'invalid_type'
          ])
        ).rejects.toThrow();
      } finally {
        client.release();
      }
    });
  });

  describe('Message Queries', () => {
    test('날짜별 메시지 조회가 올바르게 작동해야 함', async () => {
      const client = await pool.connect();

      try {
        const userResult = await client.query(
          'INSERT INTO users (email, name, password_hash) VALUES ($1, $2, $3) RETURNING id',
          ['query@example.com', 'Query User', 'hashedpassword']
        );
        const userId = userResult.rows[0].id;

        const teamResult = await client.query(
          'INSERT INTO teams (name, description, invite_code, creator_id) VALUES ($1, $2, $3, $4) RETURNING id',
          ['Query Team', 'Test Description', 'QRY123', userId]
        );
        const teamId = teamResult.rows[0].id;

        // 여러 날짜의 메시지 생성
        const dates = ['2024-12-24', '2024-12-25', '2024-12-26'];
        for (let i = 0; i < dates.length; i++) {
          for (let j = 0; j < 2; j++) {
            await client.query(`
              INSERT INTO messages (team_id, sender_id, content, target_date, message_type)
              VALUES ($1, $2, $3, $4, $5)
            `, [
              teamId,
              userId,
              `Message ${i}-${j} for ${dates[i]}`,
              dates[i],
              'normal'
            ]);
          }
        }

        // 특정 날짜 메시지 조회
        const result = await client.query(`
          SELECT * FROM messages
          WHERE team_id = $1 AND target_date = $2
          ORDER BY sent_at
        `, [teamId, '2024-12-25']);

        expect(result.rows).toHaveLength(2);
        expect(result.rows[0].content).toBe('Message 1-0 for 2024-12-25');
        expect(result.rows[1].content).toBe('Message 1-1 for 2024-12-25');
      } finally {
        client.release();
      }
    });

    test('팀별 메시지 조회가 올바르게 작동해야 함', async () => {
      const client = await pool.connect();

      try {
        const userResult = await client.query(
          'INSERT INTO users (email, name, password_hash) VALUES ($1, $2, $3) RETURNING id',
          ['team@example.com', 'Team User', 'hashedpassword']
        );
        const userId = userResult.rows[0].id;

        // 두 개의 팀 생성
        const team1Result = await client.query(
          'INSERT INTO teams (name, description, invite_code, creator_id) VALUES ($1, $2, $3, $4) RETURNING id',
          ['Team 1', 'Test Description', 'TM1123', userId]
        );
        const team1Id = team1Result.rows[0].id;

        const team2Result = await client.query(
          'INSERT INTO teams (name, description, invite_code, creator_id) VALUES ($1, $2, $3, $4) RETURNING id',
          ['Team 2', 'Test Description', 'TM2123', userId]
        );
        const team2Id = team2Result.rows[0].id;

        // 각 팀에 메시지 생성
        await client.query(`
          INSERT INTO messages (team_id, sender_id, content, target_date, message_type)
          VALUES ($1, $2, $3, $4, $5)
        `, [team1Id, userId, 'Team 1 message', '2024-12-25', 'normal']);

        await client.query(`
          INSERT INTO messages (team_id, sender_id, content, target_date, message_type)
          VALUES ($1, $2, $3, $4, $5)
        `, [team2Id, userId, 'Team 2 message', '2024-12-25', 'normal']);

        // Team 1의 메시지만 조회
        const team1Messages = await client.query(
          'SELECT * FROM messages WHERE team_id = $1',
          [team1Id]
        );

        expect(team1Messages.rows).toHaveLength(1);
        expect(team1Messages.rows[0].content).toBe('Team 1 message');
        expect(team1Messages.rows[0].team_id).toBe(team1Id);
      } finally {
        client.release();
      }
    });

    test('사용자별 메시지 조회가 올바르게 작동해야 함', async () => {
      const client = await pool.connect();

      try {
        // 두 명의 사용자 생성
        const user1Result = await client.query(
          'INSERT INTO users (email, name, password_hash) VALUES ($1, $2, $3) RETURNING id',
          ['user1@example.com', 'User 1', 'hashedpassword']
        );
        const user1Id = user1Result.rows[0].id;

        const user2Result = await client.query(
          'INSERT INTO users (email, name, password_hash) VALUES ($1, $2, $3) RETURNING id',
          ['user2@example.com', 'User 2', 'hashedpassword']
        );
        const user2Id = user2Result.rows[0].id;

        const teamResult = await client.query(
          'INSERT INTO teams (name, description, invite_code, creator_id) VALUES ($1, $2, $3, $4) RETURNING id',
          ['User Team', 'Test Description', 'USR123', user1Id]
        );
        const teamId = teamResult.rows[0].id;

        // 각 사용자가 메시지 전송
        await client.query(`
          INSERT INTO messages (team_id, sender_id, content, target_date, message_type)
          VALUES ($1, $2, $3, $4, $5)
        `, [teamId, user1Id, 'Message from user 1', '2024-12-25', 'normal']);

        await client.query(`
          INSERT INTO messages (team_id, sender_id, content, target_date, message_type)
          VALUES ($1, $2, $3, $4, $5)
        `, [teamId, user2Id, 'Message from user 2', '2024-12-25', 'normal']);

        // User 1이 보낸 메시지만 조회
        const user1Messages = await client.query(
          'SELECT * FROM messages WHERE sender_id = $1',
          [user1Id]
        );

        expect(user1Messages.rows).toHaveLength(1);
        expect(user1Messages.rows[0].content).toBe('Message from user 1');
        expect(user1Messages.rows[0].sender_id).toBe(user1Id);
      } finally {
        client.release();
      }
    });

    test('일정 관련 메시지 조회가 올바르게 작동해야 함', async () => {
      const client = await pool.connect();

      try {
        const userResult = await client.query(
          'INSERT INTO users (email, name, password_hash) VALUES ($1, $2, $3) RETURNING id',
          ['schedule@example.com', 'Schedule User', 'hashedpassword']
        );
        const userId = userResult.rows[0].id;

        const teamResult = await client.query(
          'INSERT INTO teams (name, description, invite_code, creator_id) VALUES ($1, $2, $3, $4) RETURNING id',
          ['Schedule Team', 'Test Description', 'SCH123', userId]
        );
        const teamId = teamResult.rows[0].id;

        const scheduleResult = await client.query(`
          INSERT INTO schedules (title, content, start_datetime, end_datetime, schedule_type, creator_id, team_id)
          VALUES ($1, $2, $3, $4, $5, $6, $7)
          RETURNING id
        `, [
          'Test Meeting',
          'Meeting content',
          '2024-12-25 14:00:00',
          '2024-12-25 15:00:00',
          'team',
          userId,
          teamId
        ]);
        const scheduleId = scheduleResult.rows[0].id;

        // 일반 메시지와 일정 관련 메시지 생성
        await client.query(`
          INSERT INTO messages (team_id, sender_id, content, target_date, message_type)
          VALUES ($1, $2, $3, $4, $5)
        `, [teamId, userId, 'General message', '2024-12-25', 'normal']);

        await client.query(`
          INSERT INTO messages (team_id, sender_id, content, target_date, message_type, related_schedule_id)
          VALUES ($1, $2, $3, $4, $5, $6)
        `, [teamId, userId, 'Schedule change request', '2024-12-25', 'schedule_request', scheduleId]);

        // 일정 관련 메시지만 조회
        const scheduleMessages = await client.query(`
          SELECT m.*, s.title as schedule_title
          FROM messages m
          JOIN schedules s ON m.related_schedule_id = s.id
          WHERE m.team_id = $1 AND m.related_schedule_id = $2
        `, [teamId, scheduleId]);

        expect(scheduleMessages.rows).toHaveLength(1);
        expect(scheduleMessages.rows[0].content).toBe('Schedule change request');
        expect(scheduleMessages.rows[0].schedule_title).toBe('Test Meeting');
        expect(scheduleMessages.rows[0].message_type).toBe('schedule_request');
      } finally {
        client.release();
      }
    });
  });

  describe('Message Updates and Deletion', () => {
    test('메시지 삭제가 올바르게 작동해야 함', async () => {
      const client = await pool.connect();

      try {
        const userResult = await client.query(
          'INSERT INTO users (email, name, password_hash) VALUES ($1, $2, $3) RETURNING id',
          ['delete@example.com', 'Delete User', 'hashedpassword']
        );
        const userId = userResult.rows[0].id;

        const teamResult = await client.query(
          'INSERT INTO teams (name, description, invite_code, creator_id) VALUES ($1, $2, $3, $4) RETURNING id',
          ['Delete Team', 'Test Description', 'DEL123', userId]
        );
        const teamId = teamResult.rows[0].id;

        const messageResult = await client.query(`
          INSERT INTO messages (team_id, sender_id, content, target_date, message_type)
          VALUES ($1, $2, $3, $4, $5)
          RETURNING id
        `, [teamId, userId, 'Message to delete', '2024-12-25', 'normal']);
        const messageId = messageResult.rows[0].id;

        // 메시지 삭제
        await client.query('DELETE FROM messages WHERE id = $1', [messageId]);

        // 삭제 확인
        const deletedCheck = await client.query(
          'SELECT COUNT(*) as count FROM messages WHERE id = $1',
          [messageId]
        );

        expect(parseInt(deletedCheck.rows[0].count)).toBe(0);
      } finally {
        client.release();
      }
    });

    test('일정 삭제 시 관련 메시지의 schedule_id가 NULL로 설정되어야 함', async () => {
      const client = await pool.connect();

      try {
        const userResult = await client.query(
          'INSERT INTO users (email, name, password_hash) VALUES ($1, $2, $3) RETURNING id',
          ['cascade@example.com', 'Cascade User', 'hashedpassword']
        );
        const userId = userResult.rows[0].id;

        const teamResult = await client.query(
          'INSERT INTO teams (name, description, invite_code, creator_id) VALUES ($1, $2, $3, $4) RETURNING id',
          ['Cascade Team', 'Test Description', 'CAS123', userId]
        );
        const teamId = teamResult.rows[0].id;

        const scheduleResult = await client.query(`
          INSERT INTO schedules (title, content, start_datetime, end_datetime, schedule_type, creator_id, team_id)
          VALUES ($1, $2, $3, $4, $5, $6, $7)
          RETURNING id
        `, [
          'Cascade Test',
          'Test content',
          '2024-12-25 16:00:00',
          '2024-12-25 17:00:00',
          'team',
          userId,
          teamId
        ]);
        const scheduleId = scheduleResult.rows[0].id;

        const messageResult = await client.query(`
          INSERT INTO messages (team_id, sender_id, content, target_date, message_type, related_schedule_id)
          VALUES ($1, $2, $3, $4, $5, $6)
          RETURNING id
        `, [teamId, userId, 'Related to schedule', '2024-12-25', 'schedule_request', scheduleId]);
        const messageId = messageResult.rows[0].id;

        // 일정 삭제
        await client.query('DELETE FROM schedules WHERE id = $1', [scheduleId]);

        // 메시지의 related_schedule_id가 NULL로 설정되었는지 확인
        const messageCheck = await client.query(
          'SELECT related_schedule_id FROM messages WHERE id = $1',
          [messageId]
        );

        expect(messageCheck.rows[0].related_schedule_id).toBeNull();
      } finally {
        client.release();
      }
    });
  });

  describe('Message Ordering and Pagination', () => {
    test('메시지가 시간순으로 정렬되어야 함', async () => {
      const client = await pool.connect();

      try {
        const userResult = await client.query(
          'INSERT INTO users (email, name, password_hash) VALUES ($1, $2, $3) RETURNING id',
          ['order@example.com', 'Order User', 'hashedpassword']
        );
        const userId = userResult.rows[0].id;

        const teamResult = await client.query(
          'INSERT INTO teams (name, description, invite_code, creator_id) VALUES ($1, $2, $3, $4) RETURNING id',
          ['Order Team', 'Test Description', 'ORD123', userId]
        );
        const teamId = teamResult.rows[0].id;

        // 여러 메시지를 다른 시간에 생성
        const messages = [];
        for (let i = 0; i < 5; i++) {
          const messageResult = await client.query(`
            INSERT INTO messages (team_id, sender_id, content, target_date, message_type, sent_at)
            VALUES ($1, $2, $3, $4, $5, $6)
            RETURNING id, sent_at
          `, [
            teamId,
            userId,
            `Message ${i}`,
            '2024-12-25',
            'normal',
            new Date(Date.now() + i * 1000)
          ]);
          messages.push(messageResult.rows[0]);
        }

        // 시간순 정렬 조회
        const orderedResult = await client.query(`
          SELECT * FROM messages
          WHERE team_id = $1 AND target_date = $2
          ORDER BY sent_at ASC
        `, [teamId, '2024-12-25']);

        expect(orderedResult.rows).toHaveLength(5);
        for (let i = 0; i < 5; i++) {
          expect(orderedResult.rows[i].content).toBe(`Message ${i}`);
        }
      } finally {
        client.release();
      }
    });

    test('메시지 페이지네이션이 올바르게 작동해야 함', async () => {
      const client = await pool.connect();

      try {
        const userResult = await client.query(
          'INSERT INTO users (email, name, password_hash) VALUES ($1, $2, $3) RETURNING id',
          ['page@example.com', 'Page User', 'hashedpassword']
        );
        const userId = userResult.rows[0].id;

        const teamResult = await client.query(
          'INSERT INTO teams (name, description, invite_code, creator_id) VALUES ($1, $2, $3, $4) RETURNING id',
          ['Page Team', 'Test Description', 'PAG123', userId]
        );
        const teamId = teamResult.rows[0].id;

        // 10개의 메시지 생성
        for (let i = 0; i < 10; i++) {
          await client.query(`
            INSERT INTO messages (team_id, sender_id, content, target_date, message_type)
            VALUES ($1, $2, $3, $4, $5)
          `, [teamId, userId, `Paginated message ${i}`, '2024-12-25', 'normal']);
        }

        // 첫 번째 페이지 (5개)
        const firstPage = await client.query(`
          SELECT * FROM messages
          WHERE team_id = $1 AND target_date = $2
          ORDER BY sent_at ASC
          LIMIT 5 OFFSET 0
        `, [teamId, '2024-12-25']);

        // 두 번째 페이지 (5개)
        const secondPage = await client.query(`
          SELECT * FROM messages
          WHERE team_id = $1 AND target_date = $2
          ORDER BY sent_at ASC
          LIMIT 5 OFFSET 5
        `, [teamId, '2024-12-25']);

        expect(firstPage.rows).toHaveLength(5);
        expect(secondPage.rows).toHaveLength(5);
        expect(firstPage.rows[0].content).toBe('Paginated message 0');
        expect(secondPage.rows[0].content).toBe('Paginated message 5');
      } finally {
        client.release();
      }
    });
  });

  describe('Message Statistics', () => {
    test('팀별 메시지 통계를 올바르게 계산해야 함', async () => {
      const client = await pool.connect();

      try {
        const userResult = await client.query(
          'INSERT INTO users (email, name, password_hash) VALUES ($1, $2, $3) RETURNING id',
          ['stats@example.com', 'Stats User', 'hashedpassword']
        );
        const userId = userResult.rows[0].id;

        const teamResult = await client.query(
          'INSERT INTO teams (name, description, invite_code, creator_id) VALUES ($1, $2, $3, $4) RETURNING id',
          ['Stats Team', 'Test Description', 'STA123', userId]
        );
        const teamId = teamResult.rows[0].id;

        // 여러 타입의 메시지 생성
        await client.query(`
          INSERT INTO messages (team_id, sender_id, content, target_date, message_type)
          VALUES ($1, $2, $3, $4, $5)
        `, [teamId, userId, 'Normal 1', '2024-12-25', 'normal']);

        await client.query(`
          INSERT INTO messages (team_id, sender_id, content, target_date, message_type)
          VALUES ($1, $2, $3, $4, $5)
        `, [teamId, userId, 'Normal 2', '2024-12-25', 'normal']);

        await client.query(`
          INSERT INTO messages (team_id, sender_id, content, target_date, message_type)
          VALUES ($1, $2, $3, $4, $5)
        `, [teamId, userId, 'Schedule request', '2024-12-25', 'schedule_request']);

        // 메시지 타입별 통계
        const statsResult = await client.query(`
          SELECT message_type, COUNT(*) as count
          FROM messages
          WHERE team_id = $1
          GROUP BY message_type
          ORDER BY message_type
        `, [teamId]);

        expect(statsResult.rows).toHaveLength(2);
        expect(statsResult.rows[0].message_type).toBe('normal');
        expect(parseInt(statsResult.rows[0].count)).toBe(2);
        expect(statsResult.rows[1].message_type).toBe('schedule_request');
        expect(parseInt(statsResult.rows[1].count)).toBe(1);
      } finally {
        client.release();
      }
    });

    test('날짜별 메시지 통계를 올바르게 계산해야 함', async () => {
      const client = await pool.connect();

      try {
        const userResult = await client.query(
          'INSERT INTO users (email, name, password_hash) VALUES ($1, $2, $3) RETURNING id',
          ['date@example.com', 'Date User', 'hashedpassword']
        );
        const userId = userResult.rows[0].id;

        const teamResult = await client.query(
          'INSERT INTO teams (name, description, invite_code, creator_id) VALUES ($1, $2, $3, $4) RETURNING id',
          ['Date Team', 'Test Description', 'DAT123', userId]
        );
        const teamId = teamResult.rows[0].id;

        // 여러 날짜에 메시지 생성
        const dates = ['2024-12-24', '2024-12-25', '2024-12-26'];
        const messageCounts = [3, 5, 2];

        for (let i = 0; i < dates.length; i++) {
          for (let j = 0; j < messageCounts[i]; j++) {
            await client.query(`
              INSERT INTO messages (team_id, sender_id, content, target_date, message_type)
              VALUES ($1, $2, $3, $4, $5)
            `, [teamId, userId, `Message ${j}`, dates[i], 'normal']);
          }
        }

        // 날짜별 통계
        const dateStatsResult = await client.query(`
          SELECT target_date, COUNT(*) as count
          FROM messages
          WHERE team_id = $1
          GROUP BY target_date
          ORDER BY target_date
        `, [teamId]);

        expect(dateStatsResult.rows).toHaveLength(3);
        expect(parseInt(dateStatsResult.rows[0].count)).toBe(3);
        expect(parseInt(dateStatsResult.rows[1].count)).toBe(5);
        expect(parseInt(dateStatsResult.rows[2].count)).toBe(2);
      } finally {
        client.release();
      }
    });
  });
});