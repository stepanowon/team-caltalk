const BaseModel = require('./BaseModel');
const config = require('../config/environment');
const logger = require('../config/logger');

/**
 * 팀 모델
 * 팀 정보 관리 및 팀원 관리 기능 제공
 */
class Team extends BaseModel {
  constructor() {
    super('teams');
  }

  /**
   * 초대 코드로 팀 조회
   * @param {string} inviteCode - 초대 코드
   */
  async findByInviteCode(inviteCode) {
    const start = Date.now();
    try {
      const result = await this.findOne({ invite_code: inviteCode });

      logger.performance('Team.findByInviteCode', Date.now() - start, {
        inviteCode,
        found: !!result,
      });

      return result;
    } catch (error) {
      logger.error('Team.findByInviteCode 오류:', { inviteCode, error: error.message });
      throw error;
    }
  }

  /**
   * 새 팀 생성
   * @param {Object} teamData - 팀 데이터
   * @param {string} teamData.name - 팀 이름
   * @param {string} teamData.description - 팀 설명
   * @param {number} teamData.creatorId - 생성자 ID
   */
  async createTeam(teamData) {
    const start = Date.now();
    try {
      const { name, description, creatorId } = teamData;

      // 입력 검증
      this.validateTeamData({ name, description });

      // 생성자가 이미 만든 팀 개수 확인
      const userTeamCount = await this.getUserTeamCount(creatorId);
      if (userTeamCount >= config.business.maxTeamsPerUser) {
        throw new Error(`사용자당 최대 ${config.business.maxTeamsPerUser}개의 팀만 생성할 수 있습니다`);
      }

      // 초대 코드 생성
      const inviteCode = await this.generateUniqueInviteCode();

      // 트랜잭션으로 팀과 팀원 생성
      const result = await this.transaction(async (client) => {
        // 팀 생성
        const teamResult = await client.query(`
          INSERT INTO teams (name, description, invite_code, creator_id)
          VALUES ($1, $2, $3, $4)
          RETURNING *
        `, [name.trim(), description?.trim() || null, inviteCode, creatorId]);

        const team = teamResult.rows[0];

        // 생성자를 팀장으로 추가
        await client.query(`
          INSERT INTO team_members (team_id, user_id, role)
          VALUES ($1, $2, 'leader')
        `, [team.id, creatorId]);

        return team;
      });

      logger.performance('Team.createTeam', Date.now() - start, {
        teamId: result.id,
        creatorId,
      });

      logger.audit('TEAM_CREATED', {
        teamId: result.id,
        teamName: name.trim(),
        creatorId,
        inviteCode,
      });

      return result;
    } catch (error) {
      logger.error('Team.createTeam 오류:', {
        teamData,
        error: error.message
      });
      throw error;
    }
  }

  /**
   * 팀에 멤버 추가
   * @param {number} teamId - 팀 ID
   * @param {number} userId - 사용자 ID
   * @param {string} role - 역할 (leader, member)
   */
  async addMember(teamId, userId, role = 'member') {
    const start = Date.now();
    try {
      // 팀 존재 확인
      const team = await this.findById(teamId);
      if (!team) {
        throw new Error('팀을 찾을 수 없습니다');
      }

      // 이미 팀원인지 확인
      const existingMember = await this.getMember(teamId, userId);
      if (existingMember) {
        throw new Error('이미 팀의 멤버입니다');
      }

      // 팀 최대 인원 확인
      const memberCount = await this.getMemberCount(teamId);
      if (memberCount >= config.business.maxTeamMembers) {
        throw new Error(`팀당 최대 ${config.business.maxTeamMembers}명까지만 가능합니다`);
      }

      // 역할 검증
      if (!['leader', 'member'].includes(role)) {
        throw new Error('올바르지 않은 역할입니다');
      }

      // 팀원 추가
      const result = await this.db.query(`
        INSERT INTO team_members (team_id, user_id, role)
        VALUES ($1, $2, $3)
        RETURNING *
      `, [teamId, userId, role]);

      logger.performance('Team.addMember', Date.now() - start, {
        teamId,
        userId,
        role,
      });

      logger.audit('TEAM_MEMBER_ADDED', {
        teamId,
        userId,
        role,
        addedBy: 'system', // 실제로는 요청한 사용자 ID가 들어가야 함
      });

      return result.rows[0];
    } catch (error) {
      logger.error('Team.addMember 오류:', {
        teamId,
        userId,
        role,
        error: error.message
      });
      throw error;
    }
  }

  /**
   * 팀에서 멤버 제거
   * @param {number} teamId - 팀 ID
   * @param {number} userId - 사용자 ID
   */
  async removeMember(teamId, userId) {
    const start = Date.now();
    try {
      // 팀 생성자는 제거할 수 없음
      const team = await this.findById(teamId);
      if (team.creator_id === userId) {
        throw new Error('팀 생성자는 팀에서 나갈 수 없습니다');
      }

      // 팀원 제거
      const result = await this.db.query(`
        DELETE FROM team_members
        WHERE team_id = $1 AND user_id = $2
        RETURNING *
      `, [teamId, userId]);

      if (result.rows.length === 0) {
        throw new Error('팀 멤버가 아닙니다');
      }

      logger.performance('Team.removeMember', Date.now() - start, {
        teamId,
        userId,
      });

      logger.audit('TEAM_MEMBER_REMOVED', {
        teamId,
        userId,
        removedBy: 'system', // 실제로는 요청한 사용자 ID가 들어가야 함
      });

      return true;
    } catch (error) {
      logger.error('Team.removeMember 오류:', {
        teamId,
        userId,
        error: error.message
      });
      throw error;
    }
  }

  /**
   * 팀 멤버 조회
   * @param {number} teamId - 팀 ID
   * @param {number} userId - 사용자 ID
   */
  async getMember(teamId, userId) {
    const start = Date.now();
    try {
      const result = await this.db.query(`
        SELECT tm.*, u.name, u.email
        FROM team_members tm
        JOIN users u ON tm.user_id = u.id
        WHERE tm.team_id = $1 AND tm.user_id = $2
      `, [teamId, userId]);

      logger.performance('Team.getMember', Date.now() - start, {
        teamId,
        userId,
        found: result.rows.length > 0,
      });

      return result.rows[0] || null;
    } catch (error) {
      logger.error('Team.getMember 오류:', {
        teamId,
        userId,
        error: error.message
      });
      throw error;
    }
  }

  /**
   * 팀의 모든 멤버 조회
   * @param {number} teamId - 팀 ID
   */
  async getMembers(teamId) {
    const start = Date.now();
    try {
      const result = await this.db.query(`
        SELECT
          tm.id,
          tm.user_id,
          tm.role,
          tm.joined_at,
          u.name,
          u.email
        FROM team_members tm
        JOIN users u ON tm.user_id = u.id
        WHERE tm.team_id = $1
        ORDER BY tm.role DESC, tm.joined_at ASC
      `, [teamId]);

      logger.performance('Team.getMembers', Date.now() - start, {
        teamId,
        memberCount: result.rows.length,
      });

      return result.rows;
    } catch (error) {
      logger.error('Team.getMembers 오류:', {
        teamId,
        error: error.message
      });
      throw error;
    }
  }

  /**
   * 팀 멤버 수 조회
   * @param {number} teamId - 팀 ID
   */
  async getMemberCount(teamId) {
    const start = Date.now();
    try {
      const result = await this.db.query(`
        SELECT COUNT(*) as count
        FROM team_members
        WHERE team_id = $1
      `, [teamId]);

      const count = parseInt(result.rows[0].count);

      logger.performance('Team.getMemberCount', Date.now() - start, {
        teamId,
        count,
      });

      return count;
    } catch (error) {
      logger.error('Team.getMemberCount 오류:', {
        teamId,
        error: error.message
      });
      throw error;
    }
  }

  /**
   * 사용자가 생성한 팀 개수 조회
   * @param {number} userId - 사용자 ID
   */
  async getUserTeamCount(userId) {
    const start = Date.now();
    try {
      const result = await this.db.query(`
        SELECT COUNT(*) as count
        FROM teams
        WHERE creator_id = $1
      `, [userId]);

      const count = parseInt(result.rows[0].count);

      logger.performance('Team.getUserTeamCount', Date.now() - start, {
        userId,
        count,
      });

      return count;
    } catch (error) {
      logger.error('Team.getUserTeamCount 오류:', {
        userId,
        error: error.message
      });
      throw error;
    }
  }

  /**
   * 사용자가 팀의 리더인지 확인
   * @param {number} teamId - 팀 ID
   * @param {number} userId - 사용자 ID
   */
  async isTeamLeader(teamId, userId) {
    const member = await this.getMember(teamId, userId);
    return member && member.role === 'leader';
  }

  /**
   * 사용자가 팀의 멤버인지 확인
   * @param {number} teamId - 팀 ID
   * @param {number} userId - 사용자 ID
   */
  async isTeamMember(teamId, userId) {
    const member = await this.getMember(teamId, userId);
    return !!member;
  }

  /**
   * 고유한 초대 코드 생성
   */
  async generateUniqueInviteCode() {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let attempts = 0;
    const maxAttempts = 10;

    while (attempts < maxAttempts) {
      let code = '';
      for (let i = 0; i < config.business.inviteCodeLength; i++) {
        code += chars.charAt(Math.floor(Math.random() * chars.length));
      }

      // 중복 확인
      const existing = await this.findByInviteCode(code);
      if (!existing) {
        return code;
      }

      attempts++;
    }

    throw new Error('초대 코드 생성에 실패했습니다');
  }

  /**
   * 초대 코드 재생성
   * @param {number} teamId - 팀 ID
   */
  async regenerateInviteCode(teamId) {
    const start = Date.now();
    try {
      const newInviteCode = await this.generateUniqueInviteCode();

      const result = await this.update(teamId, {
        invite_code: newInviteCode,
      });

      logger.performance('Team.regenerateInviteCode', Date.now() - start, {
        teamId,
      });

      logger.audit('TEAM_INVITE_CODE_REGENERATED', {
        teamId,
        newInviteCode,
      });

      return result;
    } catch (error) {
      logger.error('Team.regenerateInviteCode 오류:', {
        teamId,
        error: error.message
      });
      throw error;
    }
  }

  /**
   * 팀 데이터 검증
   * @param {Object} teamData - 검증할 팀 데이터
   */
  validateTeamData(teamData) {
    const { name, description } = teamData;

    this.validateTeamName(name);

    if (description !== undefined && description !== null) {
      this.validateTeamDescription(description);
    }
  }

  /**
   * 팀 이름 검증
   * @param {string} name - 팀 이름
   */
  validateTeamName(name) {
    if (!name) {
      throw new Error('팀 이름은 필수입니다');
    }

    const trimmedName = name.trim();
    if (trimmedName.length < config.business.minTeamNameLength ||
        trimmedName.length > config.business.maxTeamNameLength) {
      throw new Error(`팀 이름은 ${config.business.minTeamNameLength}-${config.business.maxTeamNameLength}자여야 합니다`);
    }

    // 특수문자 제한 (한글, 영문, 숫자, 공백, 일부 특수문자만 허용)
    const nameRegex = /^[가-힣a-zA-Z0-9\s\-_()]+$/;
    if (!nameRegex.test(trimmedName)) {
      throw new Error('팀 이름에는 한글, 영문, 숫자, 공백, 하이픈, 언더스코어, 괄호만 사용할 수 있습니다');
    }
  }

  /**
   * 팀 설명 검증
   * @param {string} description - 팀 설명
   */
  validateTeamDescription(description) {
    if (description && description.length > 500) {
      throw new Error('팀 설명은 500자를 초과할 수 없습니다');
    }
  }
}

module.exports = new Team();