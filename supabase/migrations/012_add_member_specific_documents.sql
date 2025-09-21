-- Add member-specific document support for investment certificates
-- Created: 2024-01-12
-- Description: Extends documents table to support member-specific documents with year specification

-- Add investment_certificate to document_category enum
ALTER TYPE document_category ADD VALUE 'investment_certificate';

-- Add new columns to documents table for member-specific documents
ALTER TABLE documents 
  ADD COLUMN member_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  ADD COLUMN document_year INTEGER;

-- Add indexes for better performance on member-specific queries
CREATE INDEX IF NOT EXISTS idx_documents_member_year ON documents(fund_id, member_id, document_year);
CREATE INDEX IF NOT EXISTS idx_documents_member_category ON documents(member_id, category);
CREATE INDEX IF NOT EXISTS idx_documents_year ON documents(document_year);

-- Note: member_id validity is enforced at application level
-- CHECK constraints cannot use subqueries in PostgreSQL

-- Note: investment_certificate member_id requirement is enforced at application level
-- PostgreSQL enum safety prevents immediate constraint usage

-- Note: common documents member_id restriction is enforced at application level
-- PostgreSQL enum safety prevents immediate constraint usage

-- Create composite index for member-specific documents
-- (partial index with WHERE clause removed to avoid enum reference)
CREATE INDEX IF NOT EXISTS idx_documents_fund_member_year_category ON documents(
  fund_id, member_id, document_year, category, created_at DESC
) WHERE member_id IS NOT NULL;

-- Add comment to explain the new columns
COMMENT ON COLUMN documents.member_id IS 'Profile ID for member-specific documents (NULL for fund-common documents)';
COMMENT ON COLUMN documents.document_year IS 'Document year for time-specific documents (NULL if not applicable)';
