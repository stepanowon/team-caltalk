/**
 * SQL Injection 보안 테스트
 *
 * 테스트 범위:
 * - SQL Injection 공격 패턴 테스트
 * - 파라미터화된 쿼리 검증
 * - 입력 검증 및 이스케이핑
 * - 데이터베이스 보안 설정
 */

const { Pool } = require('pg');

describe('SQL Injection 보안 테스트', () => {
  let dbPool;

  beforeAll(async () => {
    dbPool = getTestDbPool();
  });

  beforeEach(async () => {
    // 테스트용 사용자 데이터 삽입
    const client = await dbPool.connect();
    try {
      await client.query(`
        INSERT INTO users (email, name, password_hash)
        VALUES ('victim@example.com', 'Victim User', '$2b$10$example.hash')
      `);
    } finally {
      client.release();
    }
  });

  describe('기본 SQL Injection 공격 패턴', () => {
    test('Union-based SQL Injection 방어', async () => {
      const maliciousInput = "'; UNION SELECT password_hash FROM users WHERE '1'='1";

      const client = await dbPool.connect();
      try {
        // 안전하지 않은 쿼리 (실제로는 사용하면 안됨)
        const unsafeQuery = `SELECT * FROM users WHERE email = '${maliciousInput}'`;

        // 파라미터화된 쿼리로 대체해야 함
        const safeQuery = 'SELECT * FROM users WHERE email = $1';
        const result = await client.query(safeQuery, [maliciousInput]);

        // 결과가 비어있어야 함 (SQL Injection이 차단됨)
        expect(result.rows).toHaveLength(0);

        // 사용자 테이블이 여전히 존재해야 함
        const userCheck = await client.query('SELECT COUNT(*) FROM users');
        expect(parseInt(userCheck.rows[0].count)).toBeGreaterThan(0);

      } finally {
        client.release();
      }
    });

    test('Boolean-based Blind SQL Injection 방어', async () => {
      const maliciousInputs = [
        "' OR '1'='1",
        "' OR 1=1 --",
        "' OR 'a'='a",
        "admin'--",
        "admin' #"
      ];

      const client = await dbPool.connect();
      try {
        for (const maliciousInput of maliciousInputs) {
          const safeQuery = 'SELECT * FROM users WHERE email = $1';
          const result = await client.query(safeQuery, [maliciousInput]);

          // 어떤 악의적 입력도 모든 사용자를 반환하면 안됨
          expect(result.rows).toHaveLength(0);
        }
      } finally {
        client.release();
      }
    });

    test('Time-based Blind SQL Injection 방어', async () => {
      const timeBasedPayloads = [
        "'; WAITFOR DELAY '00:00:05'--",
        "'; SELECT pg_sleep(5)--",
        "' OR pg_sleep(5)--"
      ];

      const client = await dbPool.connect();
      try {
        for (const payload of timeBasedPayloads) {
          const startTime = Date.now();

          const safeQuery = 'SELECT * FROM users WHERE email = $1';
          await client.query(safeQuery, [payload]);

          const endTime = Date.now();
          const executionTime = endTime - startTime;

          // 쿼리가 5초 이상 걸리면 안됨 (Sleep 공격 차단)
          expect(executionTime).toBeLessThan(1000); // 1초 미만
        }
      } finally {
        client.release();
      }
    });

    test('Error-based SQL Injection 방어', async () => {
      const errorBasedPayloads = [
        "' AND (SELECT COUNT(*) FROM (SELECT 1 UNION SELECT 2) x GROUP BY CONCAT(version(),0x3a,user(),0x3a,database())) #",
        "' AND ExtractValue(1, CONCAT(0x7e, (SELECT version()), 0x7e)) #",
        "' AND (SELECT * FROM (SELECT COUNT(*),CONCAT(version(),FLOOR(RAND(0)*2))x FROM information_schema.tables GROUP BY x)a) #"
      ];

      const client = await dbPool.connect();
      try {
        for (const payload of errorBasedPayloads) {
          const safeQuery = 'SELECT * FROM users WHERE email = $1';

          // 에러가 발생하더라도 민감한 정보가 노출되면 안됨
          const result = await client.query(safeQuery, [payload]);
          expect(result.rows).toHaveLength(0);
        }
      } finally {
        client.release();
      }
    });
  });

  describe('고급 SQL Injection 공격 패턴', () => {
    test('Stacked Queries 공격 방어', async () => {
      const stackedQueries = [
        "'; DROP TABLE users; --",
        "'; INSERT INTO users (email, name, password_hash) VALUES ('hacker@evil.com', 'Hacker', 'hash'); --",
        "'; UPDATE users SET email = 'hacked@evil.com' WHERE id = 1; --",
        "'; DELETE FROM users WHERE 1=1; --"
      ];

      const client = await dbPool.connect();
      try {
        for (const query of stackedQueries) {
          const safeQuery = 'SELECT * FROM users WHERE email = $1';
          await client.query(safeQuery, [query]);

          // users 테이블이 여전히 존재하고 데이터가 변경되지 않았는지 확인
          const userCheck = await client.query('SELECT * FROM users WHERE email = $1', ['victim@example.com']);
          expect(userCheck.rows).toHaveLength(1);
          expect(userCheck.rows[0].email).toBe('victim@example.com');
        }
      } finally {
        client.release();
      }
    });

    test('Second-order SQL Injection 방어', async () => {
      const client = await dbPool.connect();
      try {
        // 1단계: 악의적 데이터 삽입 시도
        const maliciousName = "'; DROP TABLE users; --";
        const insertQuery = 'INSERT INTO users (email, name, password_hash) VALUES ($1, $2, $3)';
        await client.query(insertQuery, ['secondorder@example.com', maliciousName, 'hash']);

        // 2단계: 저장된 데이터를 다른 쿼리에서 사용
        const selectQuery = 'SELECT name FROM users WHERE email = $1';
        const result = await client.query(selectQuery, ['secondorder@example.com']);

        // 악의적 데이터가 저장되었지만 실행되지 않아야 함
        expect(result.rows[0].name).toBe(maliciousName);

        // users 테이블이 여전히 존재해야 함
        const tableCheck = await client.query('SELECT COUNT(*) FROM users');
        expect(parseInt(tableCheck.rows[0].count)).toBeGreaterThan(0);

      } finally {
        client.release();
      }
    });

    test('NoSQL Injection 스타일 공격 방어', async () => {
      const noSQLPayloads = [
        "{ '$ne': null }",
        "{ '$gt': '' }",
        "{ '$regex': '.*' }",
        "{ '$where': 'this.password.match(/.*/)' }"
      ];

      const client = await dbPool.connect();
      try {
        for (const payload of noSQLPayloads) {
          const safeQuery = 'SELECT * FROM users WHERE email = $1';
          const result = await client.query(safeQuery, [payload]);

          // NoSQL 형태의 페이로드가 SQL에서 동작하면 안됨
          expect(result.rows).toHaveLength(0);
        }
      } finally {
        client.release();
      }
    });
  });

  describe('입력 검증 및 이스케이핑', () => {
    test('특수 문자 이스케이핑', async () => {
      const specialChars = [
        "'", '"', ';', '--', '/*', '*/',
        '\\', '\n', '\r', '\t', '\x00'
      ];

      const client = await dbPool.connect();
      try {
        for (const char of specialChars) {
          const testEmail = `test${char}@example.com`;
          const safeQuery = 'SELECT * FROM users WHERE email = $1';

          // 특수 문자가 포함된 입력도 안전하게 처리되어야 함
          await expect(client.query(safeQuery, [testEmail])).resolves.toBeDefined();
        }
      } finally {
        client.release();
      }
    });

    test('SQL 키워드 처리', async () => {
      const sqlKeywords = [
        'SELECT', 'INSERT', 'UPDATE', 'DELETE', 'DROP', 'CREATE',
        'ALTER', 'UNION', 'WHERE', 'ORDER', 'GROUP', 'HAVING'
      ];

      const client = await dbPool.connect();
      try {
        for (const keyword of sqlKeywords) {
          const testData = {
            email: `${keyword.toLowerCase()}@example.com`,
            name: `User ${keyword}`,
            password_hash: 'hash'
          };

          const insertQuery = 'INSERT INTO users (email, name, password_hash) VALUES ($1, $2, $3)';
          await client.query(insertQuery, [testData.email, testData.name, testData.password_hash]);

          const selectQuery = 'SELECT * FROM users WHERE email = $1';
          const result = await client.query(selectQuery, [testData.email]);

          expect(result.rows).toHaveLength(1);
          expect(result.rows[0].name).toBe(testData.name);
        }
      } finally {
        client.release();
      }
    });

    test('Unicode 및 멀티바이트 문자 처리', async () => {
      const unicodeInputs = [
        '한글이메일@example.com',
        'español@example.com',
        '日本語@example.com',
        'العربية@example.com',
        '🔒secure@example.com'
      ];

      const client = await dbPool.connect();
      try {
        for (const unicodeEmail of unicodeInputs) {
          const safeQuery = 'SELECT * FROM users WHERE email = $1';

          // Unicode 문자가 안전하게 처리되어야 함
          await expect(client.query(safeQuery, [unicodeEmail])).resolves.toBeDefined();
        }
      } finally {
        client.release();
      }
    });
  });

  describe('데이터베이스 권한 및 보안 설정', () => {
    test('데이터베이스 사용자 권한 확인', async () => {
      const client = await dbPool.connect();
      try {
        // 현재 사용자의 권한 확인
        const privilegeQuery = `
          SELECT
            table_name,
            privilege_type
          FROM information_schema.table_privileges
          WHERE grantee = current_user
        `;

        const result = await client.query(privilegeQuery);

        // 애플리케이션 사용자는 시스템 테이블에 대한 권한이 없어야 함
        const systemTables = result.rows.filter(row =>
          row.table_name.startsWith('pg_') ||
          row.table_name.includes('information_schema')
        );

        // 시스템 테이블에 대한 직접적인 권한이 제한되어야 함
        expect(systemTables.length).toBeLessThan(10);

      } finally {
        client.release();
      }
    });

    test('DDL 명령 실행 제한 확인', async () => {
      const ddlCommands = [
        'CREATE TABLE malicious_table (id INT)',
        'DROP TABLE users',
        'ALTER TABLE users ADD COLUMN malicious TEXT',
        'CREATE USER malicious_user',
        'GRANT ALL PRIVILEGES ON users TO malicious_user'
      ];

      const client = await dbPool.connect();
      try {
        for (const ddl of ddlCommands) {
          // DDL 명령은 파라미터화할 수 없으므로 실행 자체를 시도하지 않음
          // 실제 구현에서는 애플리케이션 레벨에서 차단되어야 함

          // 대신 사용자가 DDL 권한이 없는지 확인
          const privilegeCheck = await client.query(`
            SELECT has_table_privilege(current_user, 'users', 'CREATE')
          `);

          // 일반 애플리케이션 사용자는 CREATE 권한이 없어야 함
          expect(privilegeCheck.rows[0].has_table_privilege).toBe(false);
        }
      } catch (error) {
        // DDL 명령이 실행되지 않는 것이 정상
        expect(error.message).toContain('permission denied');
      } finally {
        client.release();
      }
    });

    test('INFORMATION_SCHEMA 접근 제한', async () => {
      const sensitiveQueries = [
        'SELECT * FROM information_schema.tables',
        'SELECT * FROM information_schema.columns WHERE table_name = \'users\'',
        'SELECT * FROM pg_stat_activity',
        'SELECT * FROM pg_user'
      ];

      const client = await dbPool.connect();
      try {
        for (const query of sensitiveQueries) {
          try {
            const result = await client.query(query);

            // 접근이 허용되더라도 민감한 정보가 노출되지 않아야 함
            if (result.rows.length > 0) {
              const firstRow = result.rows[0];

              // 비밀번호나 해시 정보가 노출되지 않아야 함
              const sensitiveFields = ['password', 'hash', 'secret', 'token'];
              Object.keys(firstRow).forEach(key => {
                const containsSensitiveInfo = sensitiveFields.some(field =>
                  key.toLowerCase().includes(field)
                );

                if (containsSensitiveInfo) {
                  expect(firstRow[key]).toBeNull();
                }
              });
            }
          } catch (error) {
            // 접근이 거부되는 것이 더 안전함
            expect(error.message).toContain('permission denied');
          }
        }
      } finally {
        client.release();
      }
    });
  });

  describe('쿼리 성능 및 DoS 방어', () => {
    test('느린 쿼리 방어 (Cartesian Product)', async () => {
      const client = await dbPool.connect();
      try {
        // 의도적으로 느린 쿼리 생성 시도
        const slowQuery = `
          SELECT u1.*, u2.*
          FROM users u1
          CROSS JOIN users u2
          WHERE $1 = $1
        `;

        const startTime = Date.now();
        await client.query(slowQuery, ['test']);
        const endTime = Date.now();

        // 쿼리가 너무 오래 걸리면 안됨 (DoS 방어)
        expect(endTime - startTime).toBeLessThan(5000); // 5초 미만

      } finally {
        client.release();
      }
    });

    test('메모리 소모 공격 방어', async () => {
      const client = await dbPool.connect();
      try {
        // 대량의 데이터를 반환하는 쿼리
        const memoryIntensiveQuery = `
          SELECT repeat('A', 1000) as large_text
          FROM generate_series(1, 10000)
          WHERE $1 = $1
        `;

        // 쿼리 실행 시 메모리 제한이나 타임아웃이 적용되어야 함
        await expect(
          client.query(memoryIntensiveQuery, ['test'])
        ).rejects.toThrow(); // 메모리 제한으로 실패해야 함

      } catch (error) {
        // 메모리 제한이나 타임아웃으로 인한 에러는 정상
        expect(error.message).toMatch(/(timeout|memory|limit)/i);
      } finally {
        client.release();
      }
    });
  });

  describe('로깅 및 모니터링', () => {
    test('의심스러운 쿼리 패턴 감지', async () => {
      const suspiciousPatterns = [
        "'; DROP TABLE",
        "UNION SELECT",
        "OR 1=1",
        "pg_sleep(",
        "--",
        "/*",
        "xp_cmdshell"
      ];

      // 실제 구현에서는 쿼리 로깅 및 모니터링 시스템에서 이러한 패턴을 감지해야 함
      suspiciousPatterns.forEach(pattern => {
        const isDetected = detectSuspiciousPattern(pattern);
        expect(isDetected).toBe(true);
      });
    });

    test('반복적인 공격 시도 감지', async () => {
      const attackAttempts = [];

      // 동일한 IP에서 반복적인 SQL Injection 시도 시뮬레이션
      for (let i = 0; i < 10; i++) {
        attackAttempts.push({
          ip: '192.168.1.100',
          query: `'; DROP TABLE users; --`,
          timestamp: Date.now(),
          blocked: true
        });
      }

      // 실제 구현에서는 Rate Limiting이나 IP 차단 로직이 있어야 함
      const suspiciousActivity = detectRepeatedAttacks(attackAttempts);
      expect(suspiciousActivity).toBe(true);
    });
  });
});

// 헬퍼 함수들 (실제 구현에서는 별도 모듈로 분리)
function detectSuspiciousPattern(input) {
  const suspiciousPatterns = [
    /';.*drop.*table/i,
    /union.*select/i,
    /or\s+1\s*=\s*1/i,
    /pg_sleep\s*\(/i,
    /--/,
    /\/\*/,
    /xp_cmdshell/i
  ];

  return suspiciousPatterns.some(pattern => pattern.test(input));
}

function detectRepeatedAttacks(attempts) {
  const ipCounts = {};
  const threshold = 5;
  const timeWindow = 60000; // 1분
  const now = Date.now();

  attempts.forEach(attempt => {
    if (now - attempt.timestamp < timeWindow) {
      ipCounts[attempt.ip] = (ipCounts[attempt.ip] || 0) + 1;
    }
  });

  return Object.values(ipCounts).some(count => count > threshold);
}