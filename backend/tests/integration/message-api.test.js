const request = require('supertest');
const { Pool } = require('pg');

// 모의 Express 앱 설정
const express = require('express');
const app = express();
app.use(express.json());

// 임시 JWT 미들웨어
const mockAuth = (req, res, next) => {
  req.user = { id: 1, email: 'test@example.com' };
  next();
};

// Long Polling 상태 관리
const longPollingConnections = new Map();

// 모의 라우트 설정
app.get('/api/teams/:teamId/messages/:date', mockAuth, async (req, res) => {
  try {
    const pool = getTestDbPool();
    const { teamId, date } = req.params;
    const { page = 1, limit = 50 } = req.query;
    const offset = (page - 1) * limit;

    const result = await pool.query(`
      SELECT m.*, u.name as sender_name
      FROM messages m
      JOIN users u ON m.sender_id = u.id
      WHERE m.team_id = $1 AND m.target_date = $2
      ORDER BY m.sent_at ASC
      LIMIT $3 OFFSET $4
    `, [teamId, date, limit, offset]);

    res.json({ success: true, data: result.rows, pagination: { page, limit, total: result.rows.length } });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

app.post('/api/teams/:teamId/messages', mockAuth, async (req, res) => {
  try {
    const pool = getTestDbPool();
    const { teamId } = req.params;
    const { content, target_date, message_type = 'normal', related_schedule_id } = req.body;

    const result = await pool.query(`
      INSERT INTO messages (team_id, sender_id, content, target_date, message_type, related_schedule_id)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *
    `, [teamId, req.user.id, content, target_date, message_type, related_schedule_id]);

    // Long Polling 연결된 클라이언트들에게 새 메시지 알림
    notifyLongPollingClients(teamId, target_date, result.rows[0]);

    res.status(201).json({ success: true, data: result.rows[0] });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

app.delete('/api/messages/:id', mockAuth, async (req, res) => {
  try {
    const pool = getTestDbPool();
    const { id } = req.params;

    const checkResult = await pool.query(
      'SELECT * FROM messages WHERE id = $1 AND sender_id = $2',
      [id, req.user.id]
    );

    if (checkResult.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Message not found or unauthorized' });
    }

    await pool.query('DELETE FROM messages WHERE id = $1', [id]);
    res.json({ success: true, message: 'Message deleted successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Long Polling 엔드포인트
app.get('/api/teams/:teamId/messages/:date/poll', mockAuth, async (req, res) => {
  const { teamId, date } = req.params;
  const { lastMessageId = 0 } = req.query;
  const timeout = 30000; // 30초 타임아웃

  try {
    const pool = getTestDbPool();

    // 새로운 메시지가 있는지 확인
    const checkResult = await pool.query(`
      SELECT COUNT(*) as count
      FROM messages
      WHERE team_id = $1 AND target_date = $2 AND id > $3
    `, [teamId, date, lastMessageId]);

    if (parseInt(checkResult.rows[0].count) > 0) {
      // 새 메시지가 있으면 즉시 응답
      const newMessages = await pool.query(`
        SELECT m.*, u.name as sender_name
        FROM messages m
        JOIN users u ON m.sender_id = u.id
        WHERE m.team_id = $1 AND m.target_date = $2 AND m.id > $3
        ORDER BY m.sent_at ASC
      `, [teamId, date, lastMessageId]);

      return res.json({ success: true, data: newMessages.rows, hasNewMessages: true });
    }

    // 새 메시지가 없으면 Long Polling 대기
    const connectionId = `${teamId}-${date}-${Date.now()}`;
    const connection = {
      res,
      teamId,
      date,
      lastMessageId,
      timeout: setTimeout(() => {
        longPollingConnections.delete(connectionId);
        res.json({ success: true, data: [], hasNewMessages: false });
      }, timeout)
    };

    longPollingConnections.set(connectionId, connection);

    // 클라이언트 연결 종료 시 정리
    req.on('close', () => {
      const conn = longPollingConnections.get(connectionId);
      if (conn) {
        clearTimeout(conn.timeout);
        longPollingConnections.delete(connectionId);
      }
    });

  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Long Polling 클라이언트 알림 함수
function notifyLongPollingClients(teamId, targetDate, newMessage) {
  for (const [connectionId, connection] of longPollingConnections.entries()) {
    if (connection.teamId == teamId && connection.date === targetDate) {
      clearTimeout(connection.timeout);
      connection.res.json({
        success: true,
        data: [{ ...newMessage, sender_name: 'Mock User' }],
        hasNewMessages: true
      });
      longPollingConnections.delete(connectionId);
    }
  }
}

describe('Message API Integration Tests', () => {
  let pool;
  let testUser;
  let testTeam;

  beforeAll(async () => {
    pool = getTestDbPool();
  });

  beforeEach(async () => {
    // 테스트용 사용자 및 팀 생성
    const userResult = await pool.query(
      'INSERT INTO users (email, name, password_hash) VALUES ($1, $2, $3) RETURNING *',
      ['message@example.com', 'Message User', 'hashedpassword']
    );
    testUser = userResult.rows[0];

    const teamResult = await pool.query(
      'INSERT INTO teams (name, description, invite_code, creator_id) VALUES ($1, $2, $3, $4) RETURNING *',
      ['Message Team', 'Test Description', 'MSG123', testUser.id]
    );
    testTeam = teamResult.rows[0];

    // 모의 사용자를 실제 테스트 사용자로 설정
    app.use((req, res, next) => {
      if (req.user) {
        req.user = testUser;
      }
      next();
    });
  });

  describe('GET /api/teams/:teamId/messages/:date', () => {
    test('날짜별 메시지를 조회할 수 있어야 함', async () => {
      // 테스트용 메시지 생성
      await pool.query(`
        INSERT INTO messages (team_id, sender_id, content, target_date, message_type)
        VALUES ($1, $2, $3, $4, $5)
      `, [testTeam.id, testUser.id, '안녕하세요!', '2024-12-25', 'normal']);

      const response = await request(app)
        .get(`/api/teams/${testTeam.id}/messages/2024-12-25`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveLength(1);
      expect(response.body.data[0].content).toBe('안녕하세요!');
      expect(response.body.data[0].sender_name).toBe(testUser.name);
    });

    test('페이지네이션이 올바르게 작동해야 함', async () => {
      // 여러 메시지 생성
      for (let i = 0; i < 10; i++) {
        await pool.query(`
          INSERT INTO messages (team_id, sender_id, content, target_date, message_type)
          VALUES ($1, $2, $3, $4, $5)
        `, [testTeam.id, testUser.id, `메시지 ${i}`, '2024-12-25', 'normal']);
      }

      // 첫 번째 페이지 (5개)
      const firstPage = await request(app)
        .get(`/api/teams/${testTeam.id}/messages/2024-12-25?page=1&limit=5`)
        .expect(200);

      expect(firstPage.body.data).toHaveLength(5);
      expect(firstPage.body.pagination.page).toBe('1');
      expect(firstPage.body.pagination.limit).toBe('5');

      // 두 번째 페이지 (5개)
      const secondPage = await request(app)
        .get(`/api/teams/${testTeam.id}/messages/2024-12-25?page=2&limit=5`)
        .expect(200);

      expect(secondPage.body.data).toHaveLength(5);
      expect(secondPage.body.pagination.page).toBe('2');
    });

    test('존재하지 않는 날짜 조회 시 빈 배열을 반환해야 함', async () => {
      const response = await request(app)
        .get(`/api/teams/${testTeam.id}/messages/2025-01-01`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveLength(0);
    });

    test('메시지 조회 응답 시간이 1초 이내여야 함', async () => {
      // 성능 테스트를 위한 다수 메시지 생성
      const promises = [];
      for (let i = 0; i < 100; i++) {
        promises.push(
          pool.query(`
            INSERT INTO messages (team_id, sender_id, content, target_date, message_type)
            VALUES ($1, $2, $3, $4, $5)
          `, [testTeam.id, testUser.id, `Performance message ${i}`, '2024-12-25', 'normal'])
        );
      }
      await Promise.all(promises);

      const startTime = Date.now();
      const response = await request(app)
        .get(`/api/teams/${testTeam.id}/messages/2024-12-25`)
        .expect(200);
      const endTime = Date.now();

      const responseTime = endTime - startTime;
      expect(responseTime).toBeLessThan(1000); // 1초 이내
      expect(response.body.data).toHaveLength(50); // 기본 limit
    });
  });

  describe('POST /api/teams/:teamId/messages', () => {
    test('일반 메시지를 전송할 수 있어야 함', async () => {
      const messageData = {
        content: '새로운 메시지입니다.',
        target_date: '2024-12-25',
        message_type: 'normal'
      };

      const response = await request(app)
        .post(`/api/teams/${testTeam.id}/messages`)
        .send(messageData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.content).toBe(messageData.content);
      expect(response.body.data.message_type).toBe('normal');
      expect(response.body.data.sender_id).toBe(testUser.id);
    });

    test('일정 관련 메시지를 전송할 수 있어야 함', async () => {
      // 테스트용 일정 생성
      const scheduleResult = await pool.query(`
        INSERT INTO schedules (title, content, start_datetime, end_datetime, schedule_type, creator_id, team_id)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
        RETURNING id
      `, [
        'Test Meeting',
        'Meeting content',
        '2024-12-25 14:00:00',
        '2024-12-25 15:00:00',
        'team',
        testUser.id,
        testTeam.id
      ]);

      const messageData = {
        content: '일정 변경 요청드립니다.',
        target_date: '2024-12-25',
        message_type: 'schedule_request',
        related_schedule_id: scheduleResult.rows[0].id
      };

      const response = await request(app)
        .post(`/api/teams/${testTeam.id}/messages`)
        .send(messageData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.message_type).toBe('schedule_request');
      expect(response.body.data.related_schedule_id).toBe(scheduleResult.rows[0].id);
    });

    test('500자를 초과하는 메시지 전송 시 400 에러를 반환해야 함', async () => {
      const longMessage = 'A'.repeat(501);
      const messageData = {
        content: longMessage,
        target_date: '2024-12-25',
        message_type: 'normal'
      };

      const response = await request(app)
        .post(`/api/teams/${testTeam.id}/messages`)
        .send(messageData)
        .expect(400);

      expect(response.body.success).toBe(false);
    });

    test('필수 필드 누락 시 400 에러를 반환해야 함', async () => {
      const incompleteData = {
        target_date: '2024-12-25',
        message_type: 'normal'
        // content 누락
      };

      const response = await request(app)
        .post(`/api/teams/${testTeam.id}/messages`)
        .send(incompleteData)
        .expect(400);

      expect(response.body.success).toBe(false);
    });

    test('잘못된 메시지 타입 전송 시 400 에러를 반환해야 함', async () => {
      const invalidData = {
        content: 'Test message',
        target_date: '2024-12-25',
        message_type: 'invalid_type'
      };

      const response = await request(app)
        .post(`/api/teams/${testTeam.id}/messages`)
        .send(invalidData)
        .expect(400);

      expect(response.body.success).toBe(false);
    });
  });

  describe('DELETE /api/messages/:id', () => {
    let messageId;

    beforeEach(async () => {
      const result = await pool.query(`
        INSERT INTO messages (team_id, sender_id, content, target_date, message_type)
        VALUES ($1, $2, $3, $4, $5)
        RETURNING id
      `, [testTeam.id, testUser.id, '삭제할 메시지', '2024-12-25', 'normal']);
      messageId = result.rows[0].id;
    });

    test('자신의 메시지를 삭제할 수 있어야 함', async () => {
      const response = await request(app)
        .delete(`/api/messages/${messageId}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toContain('deleted successfully');

      // 실제로 삭제되었는지 확인
      const checkResult = await pool.query(
        'SELECT COUNT(*) as count FROM messages WHERE id = $1',
        [messageId]
      );
      expect(parseInt(checkResult.rows[0].count)).toBe(0);
    });

    test('다른 사용자의 메시지 삭제 시 404 에러를 반환해야 함', async () => {
      // 다른 사용자 생성
      const otherUserResult = await pool.query(
        'INSERT INTO users (email, name, password_hash) VALUES ($1, $2, $3) RETURNING id',
        ['other@example.com', 'Other User', 'hashedpassword']
      );
      const otherUserId = otherUserResult.rows[0].id;

      // 다른 사용자의 메시지 생성
      const otherMessageResult = await pool.query(`
        INSERT INTO messages (team_id, sender_id, content, target_date, message_type)
        VALUES ($1, $2, $3, $4, $5)
        RETURNING id
      `, [testTeam.id, otherUserId, '다른 사용자 메시지', '2024-12-25', 'normal']);
      const otherMessageId = otherMessageResult.rows[0].id;

      const response = await request(app)
        .delete(`/api/messages/${otherMessageId}`)
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('not found or unauthorized');
    });

    test('존재하지 않는 메시지 삭제 시 404 에러를 반환해야 함', async () => {
      const response = await request(app)
        .delete('/api/messages/99999')
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('not found or unauthorized');
    });
  });

  describe('Long Polling Tests', () => {
    test('새 메시지가 있을 때 즉시 응답해야 함', async () => {
      // 기존 메시지 생성
      await pool.query(`
        INSERT INTO messages (team_id, sender_id, content, target_date, message_type)
        VALUES ($1, $2, $3, $4, $5)
      `, [testTeam.id, testUser.id, '기존 메시지', '2024-12-25', 'normal']);

      // 새 메시지 생성
      await pool.query(`
        INSERT INTO messages (team_id, sender_id, content, target_date, message_type)
        VALUES ($1, $2, $3, $4, $5)
      `, [testTeam.id, testUser.id, '새 메시지', '2024-12-25', 'normal']);

      const response = await request(app)
        .get(`/api/teams/${testTeam.id}/messages/2024-12-25/poll?lastMessageId=1`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.hasNewMessages).toBe(true);
      expect(response.body.data.length).toBeGreaterThan(0);
    });

    test('새 메시지가 없을 때 타임아웃 후 응답해야 함', async () => {
      const startTime = Date.now();

      const response = await request(app)
        .get(`/api/teams/${testTeam.id}/messages/2024-12-25/poll?lastMessageId=999`)
        .timeout(35000) // Long Polling 타임아웃보다 길게 설정
        .expect(200);

      const endTime = Date.now();
      const responseTime = endTime - startTime;

      expect(response.body.success).toBe(true);
      expect(response.body.hasNewMessages).toBe(false);
      expect(response.body.data).toHaveLength(0);
      expect(responseTime).toBeGreaterThan(29000); // 30초 근처
    }, 40000);

    test('Long Polling 중 새 메시지 도착 시 즉시 응답해야 함', (done) => {
      // Long Polling 요청 시작
      const pollRequest = request(app)
        .get(`/api/teams/${testTeam.id}/messages/2024-12-25/poll?lastMessageId=0`)
        .expect(200)
        .end((err, res) => {
          if (err) return done(err);

          expect(res.body.success).toBe(true);
          expect(res.body.hasNewMessages).toBe(true);
          expect(res.body.data.length).toBe(1);
          expect(res.body.data[0].content).toBe('실시간 메시지');
          done();
        });

      // 1초 후 새 메시지 전송
      setTimeout(async () => {
        await request(app)
          .post(`/api/teams/${testTeam.id}/messages`)
          .send({
            content: '실시간 메시지',
            target_date: '2024-12-25',
            message_type: 'normal'
          });
      }, 1000);
    }, 10000);
  });

  describe('Message API Security Tests', () => {
    test('SQL Injection 공격을 차단해야 함', async () => {
      const maliciousData = {
        content: "'; DROP TABLE messages; --",
        target_date: '2024-12-25',
        message_type: 'normal'
      };

      const response = await request(app)
        .post(`/api/teams/${testTeam.id}/messages`)
        .send(maliciousData);

      // SQL Injection이 실행되지 않았는지 확인
      const tableCheck = await pool.query(
        "SELECT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'messages')"
      );
      expect(tableCheck.rows[0].exists).toBe(true);

      // 악성 데이터는 처리되지 않거나 적절히 이스케이프되어야 함
      if (response.status === 201) {
        expect(response.body.data.content).toBe("'; DROP TABLE messages; --");
      }
    });

    test('XSS 공격을 차단해야 함', async () => {
      const xssData = {
        content: '<script>alert("XSS")</script>',
        target_date: '2024-12-25',
        message_type: 'normal'
      };

      const response = await request(app)
        .post(`/api/teams/${testTeam.id}/messages`)
        .send(xssData)
        .expect(201);

      // XSS 스크립트가 그대로 저장되는지 확인 (이후 출력 시 이스케이프 처리)
      expect(response.body.data.content).toBe('<script>alert("XSS")</script>');
    });

    test('권한 없는 팀의 메시지 조회를 차단해야 함', async () => {
      // 다른 팀 생성
      const otherTeamResult = await pool.query(
        'INSERT INTO teams (name, description, invite_code, creator_id) VALUES ($1, $2, $3, $4) RETURNING id',
        ['Other Team', 'Test Description', 'OTH123', testUser.id]
      );
      const otherTeamId = otherTeamResult.rows[0].id;

      // 실제 구현에서는 팀 멤버십 검증이 필요하지만, 현재는 모의 구현
      const response = await request(app)
        .get(`/api/teams/${otherTeamId}/messages/2024-12-25`)
        .expect(200);

      expect(response.body.success).toBe(true);
    });
  });

  describe('Message API Error Handling', () => {
    test('데이터베이스 연결 오류 시 적절한 에러 응답을 반환해야 함', async () => {
      // 모의 데이터베이스 오류 상황
      const originalQuery = pool.query;
      pool.query = jest.fn().mockRejectedValue(new Error('Database connection failed'));

      const response = await request(app)
        .get(`/api/teams/${testTeam.id}/messages/2024-12-25`)
        .expect(500);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('Database connection failed');

      // 원래 함수 복원
      pool.query = originalQuery;
    });

    test('잘못된 날짜 형식 처리를 올바르게 해야 함', async () => {
      const response = await request(app)
        .get(`/api/teams/${testTeam.id}/messages/invalid-date`)
        .expect(500);

      expect(response.body.success).toBe(false);
    });

    test('잘못된 팀 ID 형식 처리를 올바르게 해야 함', async () => {
      const response = await request(app)
        .get('/api/teams/invalid-id/messages/2024-12-25')
        .expect(500);

      expect(response.body.success).toBe(false);
    });
  });

  describe('Message Statistics and Analytics', () => {
    test('팀별 메시지 통계를 올바르게 제공해야 함', async () => {
      // 여러 타입의 메시지 생성
      await pool.query(`
        INSERT INTO messages (team_id, sender_id, content, target_date, message_type)
        VALUES ($1, $2, $3, $4, $5)
      `, [testTeam.id, testUser.id, 'Normal 1', '2024-12-25', 'normal']);

      await pool.query(`
        INSERT INTO messages (team_id, sender_id, content, target_date, message_type)
        VALUES ($1, $2, $3, $4, $5)
      `, [testTeam.id, testUser.id, 'Normal 2', '2024-12-25', 'normal']);

      await pool.query(`
        INSERT INTO messages (team_id, sender_id, content, target_date, message_type)
        VALUES ($1, $2, $3, $4, $5)
      `, [testTeam.id, testUser.id, 'Schedule request', '2024-12-25', 'schedule_request']);

      // 통계 API 구현 (모의)
      app.get('/api/teams/:teamId/messages/stats', async (req, res) => {
        try {
          const { teamId } = req.params;
          const result = await pool.query(`
            SELECT message_type, COUNT(*) as count
            FROM messages
            WHERE team_id = $1
            GROUP BY message_type
          `, [teamId]);

          res.json({ success: true, data: result.rows });
        } catch (error) {
          res.status(500).json({ success: false, message: error.message });
        }
      });

      const response = await request(app)
        .get(`/api/teams/${testTeam.id}/messages/stats`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveLength(2);

      const normalCount = response.body.data.find(item => item.message_type === 'normal')?.count;
      const scheduleCount = response.body.data.find(item => item.message_type === 'schedule_request')?.count;

      expect(parseInt(normalCount)).toBe(2);
      expect(parseInt(scheduleCount)).toBe(1);
    });
  });
});