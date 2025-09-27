# Team CalTalk API 개선 제안사항

## 추가 필요 엔드포인트

### 1. 팀 멤버 관리 API

```json
"/api/teams/{teamId}/members/{userId}": {
  "delete": {
    "tags": ["팀"],
    "summary": "팀원 제거 (팀장 전용)",
    "description": "팀장이 팀원을 팀에서 제거합니다",
    "parameters": [
      {
        "name": "teamId",
        "in": "path",
        "required": true,
        "schema": {"type": "integer", "format": "int64"}
      },
      {
        "name": "userId",
        "in": "path",
        "required": true,
        "schema": {"type": "integer", "format": "int64"}
      }
    ],
    "responses": {
      "200": {
        "description": "팀원 제거 성공"
      },
      "403": {
        "description": "팀장 권한 필요"
      }
    }
  }
}
```

### 2. 초대 코드 재생성 API

```json
"/api/teams/{teamId}/invite-code/regenerate": {
  "post": {
    "tags": ["팀"],
    "summary": "초대 코드 재생성",
    "description": "보안상 이유로 새로운 초대 코드를 생성합니다 (팀장 전용)",
    "responses": {
      "200": {
        "description": "새 초대 코드 생성 성공",
        "content": {
          "application/json": {
            "schema": {
              "type": "object",
              "properties": {
                "inviteCode": {"type": "string", "example": "NEW2024"}
              }
            }
          }
        }
      }
    }
  }
}
```

### 3. 메시지 읽음 상태 관리 API

```json
"/api/chat/messages/{messageId}/read": {
  "post": {
    "tags": ["채팅"],
    "summary": "메시지 읽음 처리",
    "description": "메시지를 읽음으로 표시합니다",
    "responses": {
      "200": {
        "description": "읽음 처리 완료"
      }
    }
  }
}
```

### 4. 사용자 온라인 상태 API

```json
"/api/users/presence": {
  "post": {
    "tags": ["사용자"],
    "summary": "온라인 상태 업데이트",
    "description": "사용자의 온라인/오프라인 상태를 업데이트합니다",
    "requestBody": {
      "required": true,
      "content": {
        "application/json": {
          "schema": {
            "type": "object",
            "properties": {
              "status": {
                "type": "string",
                "enum": ["online", "offline", "away"]
              }
            }
          }
        }
      }
    }
  }
}
```

## 스키마 수정사항

### 1. Schedule 스키마 확장

```json
"Schedule": {
  "type": "object",
  "properties": {
    "id": {"type": "integer", "format": "int64"},
    "title": {"type": "string"},
    "content": {"type": "string"},
    "startDatetime": {"type": "string", "format": "date-time"},
    "endDatetime": {"type": "string", "format": "date-time"},
    "scheduleType": {"type": "string", "enum": ["personal", "team"]},
    "creatorId": {"type": "integer", "format": "int64"},
    "teamId": {"type": "integer", "format": "int64"},

    // 추가 필드들
    "recurrenceRule": {
      "type": "string",
      "description": "RFC 5545 RRULE 형식의 반복 규칙",
      "example": "FREQ=WEEKLY;BYDAY=MO,WE,FR"
    },
    "category": {
      "type": "string",
      "enum": ["meeting", "deadline", "personal", "project"],
      "description": "일정 카테고리"
    },
    "priority": {
      "type": "string",
      "enum": ["low", "medium", "high", "urgent"],
      "default": "medium"
    },
    "tags": {
      "type": "array",
      "items": {"type": "string"},
      "description": "일정 태그 목록"
    },

    "createdAt": {"type": "string", "format": "date-time"},
    "updatedAt": {"type": "string", "format": "date-time"}
  }
}
```

### 2. Message 스키마 확장

```json
"Message": {
  "type": "object",
  "properties": {
    "id": {"type": "integer", "format": "int64"},
    "teamId": {"type": "integer", "format": "int64"},
    "senderId": {"type": "integer", "format": "int64"},
    "senderName": {"type": "string"},
    "content": {"type": "string"},
    "targetDate": {"type": "string", "format": "date"},
    "relatedScheduleId": {"type": "integer", "format": "int64"},
    "messageType": {
      "type": "string",
      "enum": ["normal", "schedule_request", "schedule_update", "system_notification", "urgent"],
      "description": "확장된 메시지 유형"
    },

    // 추가 필드들
    "readBy": {
      "type": "array",
      "items": {
        "type": "object",
        "properties": {
          "userId": {"type": "integer", "format": "int64"},
          "readAt": {"type": "string", "format": "date-time"}
        }
      },
      "description": "메시지를 읽은 사용자들과 읽은 시간"
    },
    "editedAt": {
      "type": "string",
      "format": "date-time",
      "description": "메시지 수정 시간"
    },
    "replyToMessageId": {
      "type": "integer",
      "format": "int64",
      "description": "답글인 경우 원본 메시지 ID"
    },

    "sentAt": {"type": "string", "format": "date-time"},
    "createdAt": {"type": "string", "format": "date-time"}
  }
}
```

### 3. User 스키마 확장

```json
"User": {
  "type": "object",
  "properties": {
    "id": {"type": "integer", "format": "int64"},
    "email": {"type": "string", "format": "email"},
    "name": {"type": "string"},

    // 추가 필드들
    "presenceStatus": {
      "type": "string",
      "enum": ["online", "offline", "away"],
      "description": "사용자 온라인 상태"
    },
    "lastActiveAt": {
      "type": "string",
      "format": "date-time",
      "description": "마지막 활동 시간"
    },
    "timezone": {
      "type": "string",
      "example": "Asia/Seoul",
      "description": "사용자 시간대"
    },

    "createdAt": {"type": "string", "format": "date-time"},
    "updatedAt": {"type": "string", "format": "date-time"}
  }
}
```

### 4. TeamMember 스키마 확장

```json
"TeamMember": {
  "type": "object",
  "properties": {
    "id": {"type": "integer", "format": "int64"},
    "userId": {"type": "integer", "format": "int64"},
    "name": {"type": "string"},
    "email": {"type": "string", "format": "email"},
    "role": {"type": "string", "enum": ["leader", "member"]},
    "joinedAt": {"type": "string", "format": "date-time"},

    // 추가 필드들
    "permissions": {
      "type": "array",
      "items": {
        "type": "string",
        "enum": ["manage_schedules", "manage_members", "delete_messages"]
      },
      "description": "세부 권한 목록"
    },
    "delegatedUntil": {
      "type": "string",
      "format": "date-time",
      "description": "임시 권한 위임 만료 시간"
    }
  }
}
```

## Long Polling 이벤트 확장

### PollingEvent 스키마 개선

```json
"PollingEvent": {
  "type": "object",
  "properties": {
    "eventId": {"type": "string"},
    "eventType": {
      "type": "string",
      "enum": [
        "schedule_created",
        "schedule_updated",
        "schedule_deleted",
        "message_sent",
        "message_edited",
        "message_deleted",
        "message_read",
        "team_member_joined",
        "team_member_left",
        "team_member_removed",
        "user_presence_changed",
        "schedule_conflict_detected",
        "invite_code_regenerated"
      ]
    },
    "teamId": {"type": "integer", "format": "int64"},
    "timestamp": {"type": "string", "format": "date-time"},
    "data": {"type": "object"},
    "affectedUserIds": {
      "type": "array",
      "items": {"type": "integer", "format": "int64"}
    },

    // 추가 필드들
    "priority": {
      "type": "string",
      "enum": ["low", "normal", "high", "urgent"],
      "default": "normal"
    },
    "requiresAcknowledgment": {
      "type": "boolean",
      "default": false,
      "description": "사용자 확인이 필요한 이벤트인지"
    }
  }
}
```

## 추가 오류 처리

### ConflictError 스키마 확장

```json
"ConflictError": {
  "type": "object",
  "properties": {
    "error": {"type": "string", "example": "SCHEDULE_CONFLICT"},
    "message": {"type": "string"},
    "conflicts": {
      "type": "array",
      "items": {"$ref": "#/components/schemas/ConflictInfo"}
    },

    // 추가 필드들
    "suggestedAlternatives": {
      "type": "array",
      "items": {
        "type": "object",
        "properties": {
          "startDatetime": {"type": "string", "format": "date-time"},
          "endDatetime": {"type": "string", "format": "date-time"},
          "score": {"type": "number", "description": "추천 점수 (0-1)"}
        }
      },
      "description": "시스템이 제안하는 대안 시간들"
    },
    "canForceCreate": {
      "type": "boolean",
      "description": "강제 생성 가능 여부"
    }
  }
}
```

## 검증 규칙 추가

### 요청 검증 강화

1. **CreateScheduleRequest**에 다음 검증 추가:
   - `startDatetime < endDatetime`
   - 최대 일정 기간 7일 제한
   - 과거 시간 일정 생성 방지

2. **SendMessageRequest**에 다음 검증 추가:
   - content 최소 길이 1자
   - targetDate가 과거 날짜여도 허용 (채팅 기록)

3. **JoinTeamRequest**에 다음 검증 추가:
   - 초대 코드 만료 시간 확인
   - 팀 최대 인원 제한 확인

## 보안 강화

### 인증/권한 개선

```json
"/api/teams/{teamId}/members/{userId}/role": {
  "put": {
    "tags": ["팀"],
    "summary": "팀원 권한 변경",
    "description": "팀장이 팀원의 권한을 변경합니다",
    "security": [{"bearerAuth": []}],
    "parameters": [
      {
        "name": "teamId",
        "in": "path",
        "required": true,
        "schema": {"type": "integer", "format": "int64"}
      },
      {
        "name": "userId",
        "in": "path",
        "required": true,
        "schema": {"type": "integer", "format": "int64"}
      }
    ],
    "requestBody": {
      "required": true,
      "content": {
        "application/json": {
          "schema": {
            "type": "object",
            "properties": {
              "role": {
                "type": "string",
                "enum": ["leader", "member"]
              },
              "permissions": {
                "type": "array",
                "items": {"type": "string"}
              },
              "delegateUntil": {
                "type": "string",
                "format": "date-time",
                "description": "임시 권한인 경우 만료 시간"
              }
            }
          }
        }
      }
    },
    "responses": {
      "200": {
        "description": "권한 변경 성공"
      },
      "403": {
        "description": "권한 변경 권한 없음"
      },
      "409": {
        "description": "마지막 팀장의 권한은 변경할 수 없음"
      }
    }
  }
}
```