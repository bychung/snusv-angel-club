-- Add fund_application notification type
-- Created: 2025-10-02
-- Description: Adds 'fund_application' to email_notification_type for new investment application alerts

-- email_notification_type ENUM에 fund_application 추가
ALTER TYPE email_notification_type ADD VALUE IF NOT EXISTS 'fund_application';

-- 코멘트 추가
COMMENT ON TYPE email_notification_type IS 'Email notification types: startup_inquiry, angel_inquiry, signup_inquiry, fund_application';

