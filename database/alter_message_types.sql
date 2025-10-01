-- 메시지 타입에 일정 변경 요청 승인/거절 추가
ALTER TABLE messages DROP CONSTRAINT IF EXISTS messages_message_type_check;

ALTER TABLE messages 
ADD CONSTRAINT messages_message_type_check 
CHECK (message_type IN ('normal', 'schedule_request', 'schedule_approved', 'schedule_rejected'));

COMMENT ON COLUMN messages.message_type IS '메시지 유형: normal(일반), schedule_request(일정 변경 요청), schedule_approved(일정 변경 승인), schedule_rejected(일정 변경 거절)';
