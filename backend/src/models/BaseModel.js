const db = require('../config/database');
const logger = require('../config/logger');

/**
 * 기본 모델 클래스
 * 모든 모델이 상속받는 공통 기능 제공
 */
class BaseModel {
  constructor(tableName) {
    this.tableName = tableName;
    this.db = db;
  }

  /**
   * ID로 단일 레코드 조회
   * @param {number} id - 조회할 ID
   * @param {string[]} columns - 조회할 컬럼 목록 (기본: 모든 컬럼)
   */
  async findById(id, columns = ['*']) {
    const start = Date.now();
    try {
      const columnList = Array.isArray(columns) ? columns.join(', ') : columns;
      const query = `SELECT ${columnList} FROM ${this.tableName} WHERE id = $1`;
      const result = await this.db.query(query, [id]);

      logger.performance(`${this.tableName}.findById`, Date.now() - start, {
        id,
        found: result.rows.length > 0,
      });

      return result.rows[0] || null;
    } catch (error) {
      logger.error(`${this.tableName}.findById 오류:`, { id, error: error.message });
      throw error;
    }
  }

  /**
   * 조건에 맞는 레코드들 조회
   * @param {Object} conditions - 조회 조건
   * @param {Object} options - 추가 옵션 (limit, offset, orderBy)
   */
  async findWhere(conditions = {}, options = {}) {
    const start = Date.now();
    try {
      const { limit, offset = 0, orderBy = 'id DESC', columns = ['*'] } = options;

      let query = `SELECT ${Array.isArray(columns) ? columns.join(', ') : columns} FROM ${this.tableName}`;
      const params = [];
      let paramIndex = 1;

      // WHERE 조건 구성
      if (Object.keys(conditions).length > 0) {
        const whereConditions = [];
        for (const [key, value] of Object.entries(conditions)) {
          if (value === null) {
            whereConditions.push(`${key} IS NULL`);
          } else if (Array.isArray(value)) {
            const placeholders = value.map(() => `$${paramIndex++}`).join(', ');
            whereConditions.push(`${key} IN (${placeholders})`);
            params.push(...value);
          } else {
            whereConditions.push(`${key} = $${paramIndex++}`);
            params.push(value);
          }
        }
        query += ` WHERE ${whereConditions.join(' AND ')}`;
      }

      // ORDER BY 추가
      if (orderBy) {
        query += ` ORDER BY ${orderBy}`;
      }

      // LIMIT과 OFFSET 추가
      if (limit) {
        query += ` LIMIT $${paramIndex++}`;
        params.push(limit);
      }
      if (offset > 0) {
        query += ` OFFSET $${paramIndex++}`;
        params.push(offset);
      }

      const result = await this.db.query(query, params);

      logger.performance(`${this.tableName}.findWhere`, Date.now() - start, {
        conditions,
        rowCount: result.rows.length,
        limit,
        offset,
      });

      return result.rows;
    } catch (error) {
      logger.error(`${this.tableName}.findWhere 오류:`, { conditions, error: error.message });
      throw error;
    }
  }

  /**
   * 조건에 맞는 단일 레코드 조회
   * @param {Object} conditions - 조회 조건
   */
  async findOne(conditions) {
    const results = await this.findWhere(conditions, { limit: 1 });
    return results[0] || null;
  }

  /**
   * 새 레코드 생성
   * @param {Object} data - 생성할 데이터
   * @param {string[]} returning - 반환받을 컬럼 목록
   */
  async create(data, returning = ['*']) {
    const start = Date.now();
    try {
      const keys = Object.keys(data);
      const values = Object.values(data);
      const placeholders = keys.map((_, index) => `$${index + 1}`).join(', ');
      const returningClause = Array.isArray(returning) ? returning.join(', ') : returning;

      const query = `
        INSERT INTO ${this.tableName} (${keys.join(', ')})
        VALUES (${placeholders})
        RETURNING ${returningClause}
      `;

      const result = await this.db.query(query, values);

      logger.performance(`${this.tableName}.create`, Date.now() - start, {
        id: result.rows[0]?.id,
      });

      logger.audit('RECORD_CREATED', {
        table: this.tableName,
        id: result.rows[0]?.id,
        data: { ...data, password_hash: data.password_hash ? '[MASKED]' : undefined },
      });

      return result.rows[0];
    } catch (error) {
      logger.error(`${this.tableName}.create 오류:`, { data, error: error.message });
      throw error;
    }
  }

  /**
   * 레코드 업데이트
   * @param {number} id - 업데이트할 레코드 ID
   * @param {Object} data - 업데이트할 데이터
   * @param {string[]} returning - 반환받을 컬럼 목록
   */
  async update(id, data, returning = ['*']) {
    const start = Date.now();
    try {
      const keys = Object.keys(data);
      const values = Object.values(data);
      const setClause = keys.map((key, index) => `${key} = $${index + 2}`).join(', ');
      const returningClause = Array.isArray(returning) ? returning.join(', ') : returning;

      const query = `
        UPDATE ${this.tableName}
        SET ${setClause}, updated_at = CURRENT_TIMESTAMP
        WHERE id = $1
        RETURNING ${returningClause}
      `;

      const result = await this.db.query(query, [id, ...values]);

      logger.performance(`${this.tableName}.update`, Date.now() - start, {
        id,
        found: result.rows.length > 0,
      });

      if (result.rows.length > 0) {
        logger.audit('RECORD_UPDATED', {
          table: this.tableName,
          id,
          data: { ...data, password_hash: data.password_hash ? '[MASKED]' : undefined },
        });
      }

      return result.rows[0] || null;
    } catch (error) {
      logger.error(`${this.tableName}.update 오류:`, { id, data, error: error.message });
      throw error;
    }
  }

  /**
   * 레코드 삭제 (소프트 삭제)
   * @param {number} id - 삭제할 레코드 ID
   */
  async delete(id) {
    const start = Date.now();
    try {
      // deleted_at 컬럼이 있으면 소프트 삭제, 없으면 물리적 삭제
      const tableInfo = await this.db.query(`
        SELECT column_name
        FROM information_schema.columns
        WHERE table_name = $1 AND column_name = 'deleted_at'
      `, [this.tableName]);

      let query;
      let result;

      if (tableInfo.rows.length > 0) {
        // 소프트 삭제
        query = `
          UPDATE ${this.tableName}
          SET deleted_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
          WHERE id = $1 AND deleted_at IS NULL
          RETURNING id
        `;
        result = await this.db.query(query, [id]);
      } else {
        // 물리적 삭제
        query = `DELETE FROM ${this.tableName} WHERE id = $1 RETURNING id`;
        result = await this.db.query(query, [id]);
      }

      logger.performance(`${this.tableName}.delete`, Date.now() - start, {
        id,
        found: result.rows.length > 0,
        soft: tableInfo.rows.length > 0,
      });

      if (result.rows.length > 0) {
        logger.audit('RECORD_DELETED', {
          table: this.tableName,
          id,
          softDelete: tableInfo.rows.length > 0,
        });
      }

      return result.rows.length > 0;
    } catch (error) {
      logger.error(`${this.tableName}.delete 오류:`, { id, error: error.message });
      throw error;
    }
  }

  /**
   * 레코드 개수 조회
   * @param {Object} conditions - 조회 조건
   */
  async count(conditions = {}) {
    const start = Date.now();
    try {
      let query = `SELECT COUNT(*) as count FROM ${this.tableName}`;
      const params = [];
      let paramIndex = 1;

      if (Object.keys(conditions).length > 0) {
        const whereConditions = [];
        for (const [key, value] of Object.entries(conditions)) {
          if (value === null) {
            whereConditions.push(`${key} IS NULL`);
          } else {
            whereConditions.push(`${key} = $${paramIndex++}`);
            params.push(value);
          }
        }
        query += ` WHERE ${whereConditions.join(' AND ')}`;
      }

      const result = await this.db.query(query, params);

      logger.performance(`${this.tableName}.count`, Date.now() - start, {
        conditions,
        count: result.rows[0].count,
      });

      return parseInt(result.rows[0].count);
    } catch (error) {
      logger.error(`${this.tableName}.count 오류:`, { conditions, error: error.message });
      throw error;
    }
  }

  /**
   * 레코드 존재 여부 확인
   * @param {Object} conditions - 조회 조건
   */
  async exists(conditions) {
    const count = await this.count(conditions);
    return count > 0;
  }

  /**
   * 트랜잭션 내에서 작업 실행
   * @param {Function} callback - 트랜잭션 내에서 실행할 함수
   */
  async transaction(callback) {
    return await this.db.transaction(callback);
  }
}

module.exports = BaseModel;