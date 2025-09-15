-- Expand funds table with fund management information
-- Created: 2024-01-09
-- Description: Adds fund management fields including GP info, status, and document management with history

-- Create document_category enum for fund document types
CREATE TYPE document_category AS ENUM ('account', 'tax', 'registration', 'agreement');

-- Create fund_status enum
CREATE TYPE fund_status AS ENUM ('ready', 'processing', 'applied', 'active', 'closing', 'closed');

-- Create documents table for fund document management with history
CREATE TABLE IF NOT EXISTS documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  fund_id UUID REFERENCES funds(id) ON DELETE CASCADE NOT NULL,
  category document_category NOT NULL,
  file_name TEXT NOT NULL,
  file_type TEXT NOT NULL,
  file_size INTEGER NOT NULL,
  file_url TEXT NOT NULL,
  uploaded_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add new columns to funds table (without document ID references for history management)
ALTER TABLE funds ADD COLUMN IF NOT EXISTS tax_number TEXT;
ALTER TABLE funds ADD COLUMN IF NOT EXISTS gp_id UUID[];
ALTER TABLE funds ADD COLUMN IF NOT EXISTS address TEXT;
ALTER TABLE funds ADD COLUMN IF NOT EXISTS status fund_status DEFAULT 'ready' NOT NULL;
ALTER TABLE funds ADD COLUMN IF NOT EXISTS account TEXT;
ALTER TABLE funds ADD COLUMN IF NOT EXISTS account_bank TEXT;
ALTER TABLE funds ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_funds_status ON funds(status);
CREATE INDEX IF NOT EXISTS idx_funds_gp_id ON funds USING gin(gp_id);
CREATE INDEX IF NOT EXISTS idx_documents_fund_id ON documents(fund_id);
CREATE INDEX IF NOT EXISTS idx_documents_category ON documents(category);
CREATE INDEX IF NOT EXISTS idx_documents_fund_category ON documents(fund_id, category);
CREATE INDEX IF NOT EXISTS idx_documents_uploaded_by ON documents(uploaded_by);

-- Add trigger to auto-update updated_at on funds table
CREATE OR REPLACE TRIGGER update_funds_updated_at
  BEFORE UPDATE ON funds
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

-- Add trigger to auto-update updated_at on documents table
CREATE OR REPLACE TRIGGER update_documents_updated_at
  BEFORE UPDATE ON documents
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();
