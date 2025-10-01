const { Pool } = require('pg');

const pool = new Pool({
  connectionString: 'postgresql://team_caltalk_user:team_caltalk_2024!@localhost:5432/team_caltalk'
});

async function testMessages() {
  try {
    // 팀 52의 메시지 개수 확인
    const totalResult = await pool.query('SELECT COUNT(*) as total FROM messages WHERE team_id = 52');
    console.log('Total messages for team 52:', totalResult.rows[0].total);

    // 모든 팀의 메시지 확인
    const allResult = await pool.query('SELECT team_id, COUNT(*) as count FROM messages GROUP BY team_id ORDER BY team_id');
    console.log('Messages by team:', allResult.rows);

    // 최근 메시지들 확인
    const recentResult = await pool.query(`
      SELECT m.*, u.name as sender_name
      FROM messages m
      JOIN users u ON m.sender_id = u.id
      WHERE m.team_id = 52
      ORDER BY m.sent_at DESC
      LIMIT 5
    `);
    console.log('Recent messages for team 52:', recentResult.rows);

    // 테스트 메시지 삽입
    const insertResult = await pool.query(`
      INSERT INTO messages (team_id, sender_id, content, target_date, sent_at)
      VALUES (52, 102, 'Test message for debugging', '2025-09-29', NOW())
      RETURNING *
    `);
    console.log('Inserted test message:', insertResult.rows[0]);

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await pool.end();
  }
}

testMessages();