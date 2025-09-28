-- Add original filename column to startup_inquiries table
-- Created: 2025-01-XX
-- Description: Adds ir_deck_filename column to store original filename of uploaded pitch deck

-- startup_inquiries 테이블에 원본 파일명 컬럼 추가
ALTER TABLE startup_inquiries 
ADD COLUMN ir_deck_filename TEXT;

-- 코멘트 추가
COMMENT ON COLUMN startup_inquiries.ir_deck_filename IS '업로드된 피치덱의 원본 파일명';
