const logger = require('../config/logger');
const config = require('../config/environment');

/**
 * 이벤트 서비스
 * Long Polling 기반 실시간 알림 시스템
 */
class EventService {
  constructor() {
    // 활성 연결 관리
    this.activeConnections = new Map(); // userId -> connection info
    this.eventQueue = new Map(); // userId -> events array

    // 이벤트 ID 생성을 위한 카운터
    this.eventIdCounter = 0;

    // 연결 정리 주기 (30초마다)
    setInterval(() => {
      this.cleanupStaleConnections();
    }, 30000);

    logger.info('EventService 초기화 완료');
  }

  /**
   * Long Polling 연결 등록
   * @param {number} userId - 사용자 ID
   * @param {Object} res - Express response 객체
   * @param {Object} options - 옵션
   * @param {string} options.lastEventId - 마지막 이벤트 ID
   * @param {number[]} options.teamIds - 구독할 팀 ID 목록
   */
  async registerConnection(userId, res, options = {}) {
    const start = Date.now();
    const { lastEventId, teamIds = [] } = options;

    try {
      // 기존 연결이 있으면 종료
      this.closeConnection(userId);

      const connectionId = `${userId}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      const connection = {
        userId,
        connectionId,
        res,
        teamIds,
        connectedAt: new Date(),
        lastEventId,
        timeout: null,
      };

      // 연결 등록
      this.activeConnections.set(userId, connection);

      // 대기 중인 이벤트가 있는지 확인
      const pendingEvents = this.getPendingEvents(userId, lastEventId);
      if (pendingEvents.length > 0) {
        // 즉시 이벤트 전송
        this.sendEventsToConnection(connection, pendingEvents);
        return;
      }

      // 타임아웃 설정 (30초)
      connection.timeout = setTimeout(() => {
        this.sendTimeoutResponse(connection);
      }, config.api.longPollingTimeout || 30000);

      logger.performance('EventService.registerConnection', Date.now() - start, {
        userId,
        connectionId,
        teamIds,
        lastEventId,
      });

      logger.info('Long Polling 연결 등록:', {
        userId,
        connectionId,
        teamIds: teamIds.length,
        lastEventId,
      });

    } catch (error) {
      logger.error('Long Polling 연결 등록 오류:', {
        userId,
        error: error.message,
      });

      if (!res.headersSent) {
        res.status(500).json({
          success: false,
          error: '연결 등록 중 오류가 발생했습니다',
          code: 'CONNECTION_REGISTER_FAILED',
        });
      }
    }
  }

  /**
   * 이벤트 브로드캐스트
   * @param {Object} eventData - 이벤트 데이터
   * @param {string} eventData.eventType - 이벤트 유형
   * @param {number} eventData.teamId - 팀 ID
   * @param {Object} eventData.data - 이벤트 데이터
   * @param {number[]} eventData.affectedUserIds - 영향받는 사용자 ID 목록
   */
  async broadcastEvent(eventData) {
    const start = Date.now();
    try {
      const { eventType, teamId, data, affectedUserIds = [] } = eventData;

      const event = {
        eventId: this.generateEventId(),
        eventType,
        teamId,
        timestamp: new Date().toISOString(),
        data,
        affectedUserIds,
      };

      logger.info('이벤트 브로드캐스트:', {
        eventId: event.eventId,
        eventType,
        teamId,
        affectedUserCount: affectedUserIds.length,
      });

      // 영향받는 사용자들에게 이벤트 전송
      let sentCount = 0;
      for (const userId of affectedUserIds) {
        const connection = this.activeConnections.get(userId);

        if (connection) {
          // 사용자가 해당 팀을 구독하고 있는지 확인
          if (connection.teamIds.length === 0 || connection.teamIds.includes(teamId)) {
            this.sendEventsToConnection(connection, [event]);
            sentCount++;
          }
        } else {
          // 오프라인 사용자의 경우 이벤트 큐에 저장
          this.addToEventQueue(userId, event);
        }
      }

      logger.performance('EventService.broadcastEvent', Date.now() - start, {
        eventId: event.eventId,
        eventType,
        totalUsers: affectedUserIds.length,
        sentCount,
        queuedCount: affectedUserIds.length - sentCount,
      });

      return event.eventId;
    } catch (error) {
      logger.error('이벤트 브로드캐스트 오류:', {
        eventData,
        error: error.message,
      });
      throw error;
    }
  }

  /**
   * 연결 종료
   * @param {number} userId - 사용자 ID
   */
  closeConnection(userId) {
    const connection = this.activeConnections.get(userId);
    if (connection) {
      if (connection.timeout) {
        clearTimeout(connection.timeout);
      }

      if (!connection.res.headersSent) {
        connection.res.status(204).end();
      }

      this.activeConnections.delete(userId);

      logger.info('Long Polling 연결 종료:', {
        userId,
        connectionId: connection.connectionId,
        duration: Date.now() - connection.connectedAt.getTime(),
      });
    }
  }

  /**
   * 연결에 이벤트 전송
   * @param {Object} connection - 연결 정보
   * @param {Array} events - 전송할 이벤트 목록
   */
  sendEventsToConnection(connection, events) {
    try {
      if (connection.res.headersSent) {
        return;
      }

      // 타임아웃 취소
      if (connection.timeout) {
        clearTimeout(connection.timeout);
        connection.timeout = null;
      }

      // 이벤트가 하나인 경우 직접 전송, 여러 개인 경우 배열로 전송
      const responseData = events.length === 1 ? events[0] : events;

      connection.res.json({
        success: true,
        data: responseData,
      });

      // 연결 제거
      this.activeConnections.delete(connection.userId);

      logger.info('이벤트 전송 완료:', {
        userId: connection.userId,
        connectionId: connection.connectionId,
        eventCount: events.length,
        eventIds: events.map(e => e.eventId),
      });

    } catch (error) {
      logger.error('이벤트 전송 오류:', {
        userId: connection.userId,
        connectionId: connection.connectionId,
        error: error.message,
      });

      // 오류 발생 시 연결 정리
      this.activeConnections.delete(connection.userId);
    }
  }

  /**
   * 타임아웃 응답 전송
   * @param {Object} connection - 연결 정보
   */
  sendTimeoutResponse(connection) {
    try {
      if (connection.res.headersSent) {
        return;
      }

      connection.res.status(204).end();

      // 연결 제거
      this.activeConnections.delete(connection.userId);

      logger.info('Long Polling 타임아웃:', {
        userId: connection.userId,
        connectionId: connection.connectionId,
        duration: Date.now() - connection.connectedAt.getTime(),
      });

    } catch (error) {
      logger.error('타임아웃 응답 전송 오류:', {
        userId: connection.userId,
        connectionId: connection.connectionId,
        error: error.message,
      });
    }
  }

  /**
   * 대기 중인 이벤트 조회
   * @param {number} userId - 사용자 ID
   * @param {string} lastEventId - 마지막 이벤트 ID
   * @returns {Array} 대기 중인 이벤트 목록
   */
  getPendingEvents(userId, lastEventId) {
    const events = this.eventQueue.get(userId) || [];

    if (!lastEventId) {
      // 마지막 이벤트 ID가 없으면 모든 이벤트 반환
      return events;
    }

    // 마지막 이벤트 ID 이후의 이벤트만 반환
    const lastIndex = events.findIndex(event => event.eventId === lastEventId);
    if (lastIndex === -1) {
      // 마지막 이벤트 ID를 찾을 수 없으면 모든 이벤트 반환
      return events;
    }

    return events.slice(lastIndex + 1);
  }

  /**
   * 이벤트 큐에 추가
   * @param {number} userId - 사용자 ID
   * @param {Object} event - 이벤트
   */
  addToEventQueue(userId, event) {
    let events = this.eventQueue.get(userId) || [];
    events.push(event);

    // 큐 크기 제한 (최대 100개)
    const maxQueueSize = config.api.maxEventQueueSize || 100;
    if (events.length > maxQueueSize) {
      events = events.slice(-maxQueueSize);
    }

    this.eventQueue.set(userId, events);

    logger.debug('이벤트 큐에 추가:', {
      userId,
      eventId: event.eventId,
      eventType: event.eventType,
      queueSize: events.length,
    });
  }

  /**
   * 만료된 연결 정리
   */
  cleanupStaleConnections() {
    const now = Date.now();
    const maxAge = config.api.longPollingTimeout || 30000;
    let cleanedCount = 0;

    for (const [userId, connection] of this.activeConnections.entries()) {
      const age = now - connection.connectedAt.getTime();

      if (age > maxAge * 2) { // 타임아웃의 2배가 지나면 강제 정리
        this.closeConnection(userId);
        cleanedCount++;
      }
    }

    // 이벤트 큐 정리 (7일 이상 된 이벤트 제거)
    const maxEventAge = 7 * 24 * 60 * 60 * 1000; // 7일
    let cleanedEvents = 0;

    for (const [userId, events] of this.eventQueue.entries()) {
      const filteredEvents = events.filter(event => {
        const age = now - new Date(event.timestamp).getTime();
        return age <= maxEventAge;
      });

      if (filteredEvents.length !== events.length) {
        cleanedEvents += events.length - filteredEvents.length;

        if (filteredEvents.length === 0) {
          this.eventQueue.delete(userId);
        } else {
          this.eventQueue.set(userId, filteredEvents);
        }
      }
    }

    if (cleanedCount > 0 || cleanedEvents > 0) {
      logger.info('연결 및 이벤트 정리 완료:', {
        cleanedConnections: cleanedCount,
        cleanedEvents,
        activeConnections: this.activeConnections.size,
        totalQueuedEvents: Array.from(this.eventQueue.values()).reduce((sum, events) => sum + events.length, 0),
      });
    }
  }

  /**
   * 이벤트 ID 생성
   * @returns {string} 고유한 이벤트 ID
   */
  generateEventId() {
    return `evt_${Date.now()}_${++this.eventIdCounter}`;
  }

  /**
   * 현재 연결 상태 조회
   * @returns {Object} 연결 상태 정보
   */
  getConnectionStats() {
    const stats = {
      activeConnections: this.activeConnections.size,
      totalQueuedEvents: 0,
      userQueueSizes: {},
    };

    for (const [userId, events] of this.eventQueue.entries()) {
      stats.totalQueuedEvents += events.length;
      stats.userQueueSizes[userId] = events.length;
    }

    return stats;
  }

  /**
   * 특정 사용자의 이벤트 큐 비우기
   * @param {number} userId - 사용자 ID
   */
  clearUserEventQueue(userId) {
    const cleared = this.eventQueue.delete(userId);

    if (cleared) {
      logger.info('사용자 이벤트 큐 삭제:', { userId });
    }

    return cleared;
  }
}

// 싱글톤 인스턴스 생성
const eventService = new EventService();

module.exports = eventService;