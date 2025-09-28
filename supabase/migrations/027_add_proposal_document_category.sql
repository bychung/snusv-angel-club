-- Add 'proposal' to document_category enum
-- Created: 2024-01-20
-- Description: Adds 'proposal' document category for fund proposal documents

-- Add 'proposal' to the existing document_category enum
ALTER TYPE document_category ADD VALUE 'proposal';
