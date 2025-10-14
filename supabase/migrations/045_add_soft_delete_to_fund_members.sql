-- Add soft delete support to fund_members table
ALTER TABLE fund_members
ADD COLUMN deleted_at TIMESTAMPTZ DEFAULT NULL;

-- Add index for better query performance (filtering out deleted records)
CREATE INDEX idx_fund_members_deleted_at ON fund_members(deleted_at);

-- Add index for common query pattern (fund_id + not deleted)
CREATE INDEX idx_fund_members_fund_id_not_deleted ON fund_members(fund_id) WHERE deleted_at IS NULL;

-- Comment on the column
COMMENT ON COLUMN fund_members.deleted_at IS 'Soft delete timestamp. NULL means the record is active, non-NULL means it has been soft deleted.';

