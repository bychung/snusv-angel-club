-- Add document versioning support to fund_documents table

-- 1. Add new columns for versioning
ALTER TABLE fund_documents 
  ADD COLUMN IF NOT EXISTS version_number INTEGER DEFAULT 1,
  ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;

-- 2. Set default values for existing records
UPDATE fund_documents 
SET version_number = 1, is_active = true
WHERE version_number IS NULL;

-- 3. Make version_number NOT NULL
ALTER TABLE fund_documents 
  ALTER COLUMN version_number SET NOT NULL;

-- 4. Drop existing unique constraint if exists (fund_id, type)
ALTER TABLE fund_documents 
  DROP CONSTRAINT IF EXISTS fund_documents_fund_id_type_key;

-- 5. Add new unique constraint: (fund_id, type, version_number)
ALTER TABLE fund_documents 
  ADD CONSTRAINT fund_documents_fund_type_version_unique 
  UNIQUE (fund_id, type, version_number);

-- 6. Create indexes for efficient queries
CREATE INDEX IF NOT EXISTS idx_fund_documents_active 
  ON fund_documents(fund_id, type, is_active);

CREATE INDEX IF NOT EXISTS idx_fund_documents_version 
  ON fund_documents(fund_id, type, version_number DESC);

-- 7. Add column comments
COMMENT ON COLUMN fund_documents.version_number IS '문서 버전 번호 (1부터 시작, 자동 증가)';
COMMENT ON COLUMN fund_documents.is_active IS '활성 버전 여부 (최신 버전만 true, 펀드+타입당 1개)';
