const request = require('supertest');
const { Pool } = require('pg');

// 모의 Express 앱 설정
const express = require('express');
const app = express();
app.use(express.json());

// 임시 JWT 미들웨어 (실제 구현 전까지)
const mockAuth = (req, res, next) => {
  req.user = { id: 1, email: 'test@example.com' };
  next();
};

// 모의 라우트 설정 (실제 라우터 구현 전까지)
app.get('/api/schedules', mockAuth, async (req, res) => {
  try {
    const pool = getTestDbPool();
    const result = await pool.query('SELECT * FROM schedules ORDER BY start_datetime');
    res.json({ success: true, data: result.rows });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

app.post('/api/schedules', mockAuth, async (req, res) => {
  try {
    const pool = getTestDbPool();
    const { title, content, start_datetime, end_datetime, schedule_type, team_id } = req.body;

    const result = await pool.query(`
      INSERT INTO schedules (title, content, start_datetime, end_datetime, schedule_type, creator_id, team_id)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *
    `, [title, content, start_datetime, end_datetime, schedule_type, req.user.id, team_id]);

    res.status(201).json({ success: true, data: result.rows[0] });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

app.put('/api/schedules/:id', mockAuth, async (req, res) => {
  try {
    const pool = getTestDbPool();
    const { id } = req.params;
    const { title, content, start_datetime, end_datetime } = req.body;

    const result = await pool.query(`
      UPDATE schedules
      SET title = $1, content = $2, start_datetime = $3, end_datetime = $4
      WHERE id = $5 AND creator_id = $6
      RETURNING *
    `, [title, content, start_datetime, end_datetime, id, req.user.id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Schedule not found or unauthorized' });
    }

    res.json({ success: true, data: result.rows[0] });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

app.delete('/api/schedules/:id', mockAuth, async (req, res) => {
  try {
    const pool = getTestDbPool();
    const { id } = req.params;

    const result = await pool.query(
      'DELETE FROM schedules WHERE id = $1 AND creator_id = $2 RETURNING id',
      [id, req.user.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Schedule not found or unauthorized' });
    }

    res.json({ success: true, message: 'Schedule deleted successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

app.post('/api/schedules/:id/conflict-check', mockAuth, async (req, res) => {
  try {
    const pool = getTestDbPool();
    const { id } = req.params;
    const { user_id, start_datetime, end_datetime } = req.body;

    const result = await pool.query(
      'SELECT check_schedule_conflict($1, $2, $3, $4) as has_conflict',
      [user_id, start_datetime, end_datetime, id]
    );

    res.json({ success: true, has_conflict: result.rows[0].has_conflict });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

describe('Schedule API Integration Tests', () => {
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
      ['api@example.com', 'API User', 'hashedpassword']
    );
    testUser = userResult.rows[0];

    const teamResult = await pool.query(
      'INSERT INTO teams (name, description, invite_code, creator_id) VALUES ($1, $2, $3, $4) RETURNING *',
      ['API Team', 'Test Description', 'API123', testUser.id]
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

  describe('GET /api/schedules', () => {
    test('모든 일정을 조회할 수 있어야 함', async () => {
      // 테스트용 일정 생성
      await pool.query(`
        INSERT INTO schedules (title, content, start_datetime, end_datetime, schedule_type, creator_id)
        VALUES ($1, $2, $3, $4, $5, $6)
      `, [
        'Test Schedule',
        'Test content',
        '2024-12-25 10:00:00',
        '2024-12-25 11:00:00',
        'personal',
        testUser.id
      ]);

      const response = await request(app)
        .get('/api/schedules')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveLength(1);
      expect(response.body.data[0].title).toBe('Test Schedule');
    });

    test('일정이 없을 때 빈 배열을 반환해야 함', async () => {
      const response = await request(app)
        .get('/api/schedules')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveLength(0);
    });

    test('응답 시간이 2초 이내여야 함', async () => {
      // 성능 테스트를 위한 다수 일정 생성
      const promises = [];
      for (let i = 0; i < 100; i++) {
        promises.push(
          pool.query(`
            INSERT INTO schedules (title, content, start_datetime, end_datetime, schedule_type, creator_id)
            VALUES ($1, $2, $3, $4, $5, $6)
          `, [
            `Performance Test ${i}`,
            'Test content',
            `2024-12-${25 + (i % 5)} 10:00:00`,
            `2024-12-${25 + (i % 5)} 11:00:00`,
            'personal',
            testUser.id
          ])
        );
      }
      await Promise.all(promises);

      const startTime = Date.now();
      const response = await request(app)
        .get('/api/schedules')
        .expect(200);
      const endTime = Date.now();

      const responseTime = endTime - startTime;
      expect(responseTime).toBeLessThan(2000); // 2초 이내
      expect(response.body.data).toHaveLength(100);
    });
  });

  describe('POST /api/schedules', () => {
    test('개인 일정을 생성할 수 있어야 함', async () => {
      const scheduleData = {
        title: 'New Personal Schedule',
        content: 'Personal schedule content',
        start_datetime: '2024-12-25 14:00:00',
        end_datetime: '2024-12-25 15:00:00',
        schedule_type: 'personal',
        team_id: null
      };

      const response = await request(app)
        .post('/api/schedules')
        .send(scheduleData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.title).toBe(scheduleData.title);
      expect(response.body.data.schedule_type).toBe('personal');
      expect(response.body.data.creator_id).toBe(testUser.id);
    });

    test('팀 일정을 생성할 수 있어야 함', async () => {
      const scheduleData = {
        title: 'New Team Schedule',
        content: 'Team schedule content',
        start_datetime: '2024-12-25 16:00:00',
        end_datetime: '2024-12-25 17:00:00',
        schedule_type: 'team',
        team_id: testTeam.id
      };

      const response = await request(app)
        .post('/api/schedules')
        .send(scheduleData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.title).toBe(scheduleData.title);
      expect(response.body.data.schedule_type).toBe('team');
      expect(response.body.data.team_id).toBe(testTeam.id);
    });

    test('잘못된 데이터로 일정 생성 시 400 에러를 반환해야 함', async () => {
      const invalidScheduleData = {
        title: 'Invalid Schedule',
        content: 'Test content',
        start_datetime: '2024-12-25 15:00:00',
        end_datetime: '2024-12-25 14:00:00', // 종료 시간이 시작 시간보다 빠름
        schedule_type: 'personal',
        team_id: null
      };

      const response = await request(app)
        .post('/api/schedules')
        .send(invalidScheduleData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBeDefined();
    });

    test('필수 필드 누락 시 400 에러를 반환해야 함', async () => {
      const incompleteData = {
        content: 'Test content',
        start_datetime: '2024-12-25 14:00:00',
        end_datetime: '2024-12-25 15:00:00'
        // title 누락
      };

      const response = await request(app)
        .post('/api/schedules')
        .send(incompleteData)
        .expect(400);

      expect(response.body.success).toBe(false);
    });
  });

  describe('PUT /api/schedules/:id', () => {
    let scheduleId;

    beforeEach(async () => {
      const result = await pool.query(`
        INSERT INTO schedules (title, content, start_datetime, end_datetime, schedule_type, creator_id)
        VALUES ($1, $2, $3, $4, $5, $6)
        RETURNING id
      `, [
        'Original Schedule',
        'Original content',
        '2024-12-25 18:00:00',
        '2024-12-25 19:00:00',
        'personal',
        testUser.id
      ]);
      scheduleId = result.rows[0].id;
    });

    test('일정을 수정할 수 있어야 함', async () => {
      const updateData = {
        title: 'Updated Schedule',
        content: 'Updated content',
        start_datetime: '2024-12-25 19:00:00',
        end_datetime: '2024-12-25 20:00:00'
      };

      const response = await request(app)
        .put(`/api/schedules/${scheduleId}`)
        .send(updateData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.title).toBe(updateData.title);
      expect(response.body.data.content).toBe(updateData.content);
    });

    test('존재하지 않는 일정 수정 시 404 에러를 반환해야 함', async () => {
      const updateData = {
        title: 'Updated Schedule',
        content: 'Updated content',
        start_datetime: '2024-12-25 19:00:00',
        end_datetime: '2024-12-25 20:00:00'
      };

      const response = await request(app)
        .put('/api/schedules/99999')
        .send(updateData)
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('not found');
    });

    test('잘못된 시간 범위로 수정 시 400 에러를 반환해야 함', async () => {
      const invalidUpdateData = {
        title: 'Updated Schedule',
        content: 'Updated content',
        start_datetime: '2024-12-25 20:00:00',
        end_datetime: '2024-12-25 19:00:00' // 종료 시간이 시작 시간보다 빠름
      };

      const response = await request(app)
        .put(`/api/schedules/${scheduleId}`)
        .send(invalidUpdateData)
        .expect(400);

      expect(response.body.success).toBe(false);
    });
  });

  describe('DELETE /api/schedules/:id', () => {
    let scheduleId;

    beforeEach(async () => {
      const result = await pool.query(`
        INSERT INTO schedules (title, content, start_datetime, end_datetime, schedule_type, creator_id)
        VALUES ($1, $2, $3, $4, $5, $6)
        RETURNING id
      `, [
        'To Delete Schedule',
        'Test content',
        '2024-12-25 21:00:00',
        '2024-12-25 22:00:00',
        'personal',
        testUser.id
      ]);
      scheduleId = result.rows[0].id;
    });

    test('일정을 삭제할 수 있어야 함', async () => {
      const response = await request(app)
        .delete(`/api/schedules/${scheduleId}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toContain('deleted successfully');

      // 실제로 삭제되었는지 확인
      const checkResult = await pool.query(
        'SELECT COUNT(*) as count FROM schedules WHERE id = $1',
        [scheduleId]
      );
      expect(parseInt(checkResult.rows[0].count)).toBe(0);
    });

    test('존재하지 않는 일정 삭제 시 404 에러를 반환해야 함', async () => {
      const response = await request(app)
        .delete('/api/schedules/99999')
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('not found');
    });
  });

  describe('POST /api/schedules/:id/conflict-check', () => {
    let scheduleId;

    beforeEach(async () => {
      const result = await pool.query(`
        INSERT INTO schedules (title, content, start_datetime, end_datetime, schedule_type, creator_id)
        VALUES ($1, $2, $3, $4, $5, $6)
        RETURNING id
      `, [
        'Conflict Test Schedule',
        'Test content',
        '2024-12-25 10:00:00',
        '2024-12-25 11:00:00',
        'personal',
        testUser.id
      ]);
      scheduleId = result.rows[0].id;

      // 참가자 추가
      await pool.query(
        'INSERT INTO schedule_participants (schedule_id, user_id, participation_status) VALUES ($1, $2, $3)',
        [scheduleId, testUser.id, 'confirmed']
      );
    });

    test('일정 충돌을 감지할 수 있어야 함', async () => {
      const conflictData = {
        user_id: testUser.id,
        start_datetime: '2024-12-25 10:30:00',
        end_datetime: '2024-12-25 11:30:00'
      };

      const response = await request(app)
        .post(`/api/schedules/${scheduleId}/conflict-check`)
        .send(conflictData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.has_conflict).toBe(true);
    });

    test('충돌하지 않는 시간대를 올바르게 식별해야 함', async () => {
      const noConflictData = {
        user_id: testUser.id,
        start_datetime: '2024-12-25 12:00:00',
        end_datetime: '2024-12-25 13:00:00'
      };

      const response = await request(app)
        .post(`/api/schedules/${scheduleId}/conflict-check`)
        .send(noConflictData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.has_conflict).toBe(false);
    });

    test('자기 자신을 제외한 충돌 검사가 올바르게 작동해야 함', async () => {
      const selfCheckData = {
        user_id: testUser.id,
        start_datetime: '2024-12-25 10:30:00',
        end_datetime: '2024-12-25 11:30:00'
      };

      const response = await request(app)
        .post(`/api/schedules/${scheduleId}/conflict-check`)
        .send(selfCheckData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.has_conflict).toBe(false); // 자기 자신 제외하므로 충돌 없음
    });

    test('충돌 검사 성능이 10ms 이내여야 함', async () => {
      // 다수의 일정 생성으로 성능 테스트
      const promises = [];
      for (let i = 0; i < 50; i++) {
        promises.push(
          pool.query(`
            INSERT INTO schedules (title, content, start_datetime, end_datetime, schedule_type, creator_id)
            VALUES ($1, $2, $3, $4, $5, $6)
          `, [
            `Perf Test ${i}`,
            'Test content',
            `2024-12-${20 + (i % 10)} 09:00:00`,
            `2024-12-${20 + (i % 10)} 10:00:00`,
            'personal',
            testUser.id
          ])
        );
      }
      await Promise.all(promises);

      const conflictData = {
        user_id: testUser.id,
        start_datetime: '2024-12-25 09:30:00',
        end_datetime: '2024-12-25 10:30:00'
      };

      const startTime = Date.now();
      const response = await request(app)
        .post(`/api/schedules/${scheduleId}/conflict-check`)
        .send(conflictData)
        .expect(200);
      const endTime = Date.now();

      const responseTime = endTime - startTime;
      expect(responseTime).toBeLessThan(10); // 10ms 이내
      expect(response.body.success).toBe(true);
    });
  });

  describe('Schedule API Security Tests', () => {
    test('SQL Injection 공격을 차단해야 함', async () => {
      const maliciousData = {
        title: "'; DROP TABLE schedules; --",
        content: 'Malicious content',
        start_datetime: '2024-12-25 14:00:00',
        end_datetime: '2024-12-25 15:00:00',
        schedule_type: 'personal',
        team_id: null
      };

      const response = await request(app)
        .post('/api/schedules')
        .send(maliciousData);

      // SQL Injection이 실행되지 않았는지 확인
      const tableCheck = await pool.query(
        "SELECT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'schedules')"
      );
      expect(tableCheck.rows[0].exists).toBe(true);

      // 악성 데이터는 처리되지 않거나 적절히 이스케이프되어야 함
      if (response.status === 201) {
        expect(response.body.data.title).toBe("'; DROP TABLE schedules; --");
      }
    });

    test('XSS 공격을 차단해야 함', async () => {
      const xssData = {
        title: '<script>alert("XSS")</script>',
        content: '<img src="x" onerror="alert(\'XSS\')">',
        start_datetime: '2024-12-25 14:00:00',
        end_datetime: '2024-12-25 15:00:00',
        schedule_type: 'personal',
        team_id: null
      };

      const response = await request(app)
        .post('/api/schedules')
        .send(xssData)
        .expect(201);

      // XSS 스크립트가 그대로 저장되는지 확인 (이후 출력 시 이스케이프 처리)
      expect(response.body.data.title).toBe('<script>alert("XSS")</script>');
      expect(response.body.data.content).toBe('<img src="x" onerror="alert(\'XSS\')">');
    });

    test('권한 없는 일정 수정/삭제를 차단해야 함', async () => {
      // 다른 사용자의 일정 생성
      const otherUserResult = await pool.query(
        'INSERT INTO users (email, name, password_hash) VALUES ($1, $2, $3) RETURNING id',
        ['other@example.com', 'Other User', 'hashedpassword']
      );
      const otherUserId = otherUserResult.rows[0].id;

      const scheduleResult = await pool.query(`
        INSERT INTO schedules (title, content, start_datetime, end_datetime, schedule_type, creator_id)
        VALUES ($1, $2, $3, $4, $5, $6)
        RETURNING id
      `, [
        'Other User Schedule',
        'Test content',
        '2024-12-25 16:00:00',
        '2024-12-25 17:00:00',
        'personal',
        otherUserId
      ]);
      const otherScheduleId = scheduleResult.rows[0].id;

      // 다른 사용자의 일정 수정 시도
      const updateResponse = await request(app)
        .put(`/api/schedules/${otherScheduleId}`)
        .send({
          title: 'Unauthorized Update',
          content: 'Updated content',
          start_datetime: '2024-12-25 17:00:00',
          end_datetime: '2024-12-25 18:00:00'
        })
        .expect(404);

      expect(updateResponse.body.success).toBe(false);
      expect(updateResponse.body.message).toContain('not found or unauthorized');

      // 다른 사용자의 일정 삭제 시도
      const deleteResponse = await request(app)
        .delete(`/api/schedules/${otherScheduleId}`)
        .expect(404);

      expect(deleteResponse.body.success).toBe(false);
      expect(deleteResponse.body.message).toContain('not found or unauthorized');
    });
  });

  describe('Schedule API Error Handling', () => {
    test('데이터베이스 연결 오류 시 적절한 에러 응답을 반환해야 함', async () => {
      // 모의 데이터베이스 오류 상황
      const originalQuery = pool.query;
      pool.query = jest.fn().mockRejectedValue(new Error('Database connection failed'));

      const response = await request(app)
        .get('/api/schedules')
        .expect(500);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('Database connection failed');

      // 원래 함수 복원
      pool.query = originalQuery;
    });

    test('잘못된 JSON 데이터 처리를 올바르게 해야 함', async () => {
      const response = await request(app)
        .post('/api/schedules')
        .set('Content-Type', 'application/json')
        .send('{"invalid": json}')
        .expect(400);

      expect(response.body).toBeDefined();
    });
  });
});