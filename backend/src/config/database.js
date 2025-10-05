const { Pool } = require('pg');
const logger = require('./logger');

/**
 * PostgreSQL 데이터베이스 연결 풀 설정
 * 성능 최적화 및 연결 관리를 위한 커넥션 풀 구현
 */
class DatabaseConfig {
  constructor() {
    this.pool = null;
    this.isConnected = false;
  }

  /**
   * 데이터베이스 연결 풀 초기화
   */
  async initialize() {
    try {
      // 연결 문자열 디버깅 (비밀번호 마스킹)
      const connStr = process.env.DB_CONNECTION_STRING;
      if (connStr) {
        const maskedConnStr = connStr.replace(/:([^@]+)@/, ':****@');
        logger.info('데이터베이스 연결 시도:', { connectionString: maskedConnStr });
      } else {
        throw new Error('DB_CONNECTION_STRING 환경변수가 설정되지 않았습니다');
      }

      const config = {
        connectionString: process.env.DB_CONNECTION_STRING,
        min: parseInt(process.env.DB_POOL_MIN) || 2,
        max: parseInt(process.env.DB_POOL_MAX) || 20,
        idleTimeoutMillis: parseInt(process.env.DB_IDLE_TIMEOUT) || 10000,
        connectionTimeoutMillis: parseInt(process.env.DB_CONNECTION_TIMEOUT) || 2000,
        statement_timeout: 30000, // 30초 쿼리 타임아웃
        query_timeout: 30000,
        application_name: 'team-caltalk-backend',
        // SSL 설정 (프로덕션에서 필요시)
        ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
      };

      this.pool = new Pool(config);

      // 연결 이벤트 핸들링
      this.pool.on('connect', () => {
        logger.info('새로운 PostgreSQL 클라이언트 연결됨');
      });

      this.pool.on('error', (err) => {
        logger.error('PostgreSQL 풀 오류:', err);
        this.isConnected = false;
      });

      // 연결 테스트
      await this.testConnection();
      this.isConnected = true;

      logger.info('PostgreSQL 연결 풀 초기화 완료', {
        min: config.min,
        max: config.max,
        database: process.env.DB_NAME,
      });

      return this.pool;
    } catch (error) {
      logger.error('데이터베이스 연결 풀 초기화 실패:', error);
      throw new Error(`데이터베이스 연결 실패: ${error.message}`);
    }
  }

  /**
   * 데이터베이스 연결 테스트
   */
  async testConnection() {
    const client = await this.pool.connect();
    try {
      const result = await client.query('SELECT NOW() as current_time, version()');
      logger.info('데이터베이스 연결 테스트 성공:', {
        time: result.rows[0].current_time,
        version: result.rows[0].version.split(' ')[0] + ' ' + result.rows[0].version.split(' ')[1],
      });
    } finally {
      client.release();
    }
  }

  /**
   * 트랜잭션 실행
   * @param {Function} callback - 트랜잭션 내에서 실행할 함수
   */
  async transaction(callback) {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');
      const result = await callback(client);
      await client.query('COMMIT');
      return result;
    } catch (error) {
      await client.query('ROLLBACK');
      logger.error('트랜잭션 롤백:', error);
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * 단일 쿼리 실행
   * @param {string} text - SQL 쿼리
   * @param {Array} params - 쿼리 파라미터
   */
  async query(text, params = []) {
    const start = Date.now();
    try {
      const result = await this.pool.query(text, params);
      const duration = Date.now() - start;

      // 성능 모니터링 (느린 쿼리 로깅)
      if (duration > 100) {
        logger.warn('느린 쿼리 감지:', {
          duration: `${duration}ms`,
          query: text.substring(0, 100) + (text.length > 100 ? '...' : ''),
          rowCount: result.rowCount,
        });
      }

      return result;
    } catch (error) {
      logger.error('쿼리 실행 오류:', {
        error: error.message,
        query: text.substring(0, 100) + (text.length > 100 ? '...' : ''),
        params: params,
      });
      throw error;
    }
  }

  /**
   * 연결 풀 상태 조회
   */
  getPoolStatus() {
    if (!this.pool) {
      return { status: 'not_initialized' };
    }

    return {
      status: 'active',
      totalCount: this.pool.totalCount,
      idleCount: this.pool.idleCount,
      waitingCount: this.pool.waitingCount,
      isConnected: this.isConnected,
    };
  }

  /**
   * 연결 풀 종료
   */
  async close() {
    if (this.pool) {
      await this.pool.end();
      this.isConnected = false;
      logger.info('데이터베이스 연결 풀 종료됨');
    }
  }

  /**
   * 테스트용 pool 주입 (테스트 환경에서만 사용)
   */
  setTestPool(testPool) {
    if (process.env.NODE_ENV === 'test') {
      this.pool = testPool;
      this.isConnected = true;
      logger.info('테스트용 데이터베이스 풀 설정 완료');
    }
  }
}

// 싱글톤 인스턴스
const databaseConfig = new DatabaseConfig();

module.exports = databaseConfig;