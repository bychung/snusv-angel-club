-- Supabase Database Schema for SNUSV Angel Club
-- 이 SQL을 Supabase Dashboard의 SQL Editor에서 실행하세요.

-- Create user role enum
CREATE TYPE user_role AS ENUM ('ADMIN', 'USER');

-- Create document category enum
CREATE TYPE document_category AS ENUM ('account', 'tax', 'registration');

-- Create fund status enum
CREATE TYPE fund_status AS ENUM ('ready', 'processing', 'applied', 'active', 'closing', 'closed');

-- profiles 테이블 생성 (전화번호를 unique key로)
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  phone TEXT NOT NULL UNIQUE,
  email TEXT NOT NULL,
  entity_type TEXT CHECK (entity_type IN ('individual', 'corporate')) NOT NULL,
  birth_date DATE,
  business_number TEXT,
  address TEXT NOT NULL,
  role user_role DEFAULT 'USER' NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- phone 컬럼에 인덱스 생성 (upsert 성능 향상)
CREATE INDEX IF NOT EXISTS idx_profiles_phone ON profiles(phone);

-- email 컬럼에 인덱스 생성 (검색 성능 향상)
CREATE INDEX IF NOT EXISTS idx_profiles_email ON profiles(email);

-- role 컬럼에 인덱스 생성 (admin 권한 확인 성능 향상)
CREATE INDEX IF NOT EXISTS idx_profiles_role ON profiles(role);

-- documents 테이블 생성 (펀드 문서 관리 및 히스토리)
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

-- documents에 인덱스 생성
CREATE INDEX IF NOT EXISTS idx_documents_fund_id ON documents(fund_id);
CREATE INDEX IF NOT EXISTS idx_documents_category ON documents(category);
CREATE INDEX IF NOT EXISTS idx_documents_fund_category ON documents(fund_id, category);
CREATE INDEX IF NOT EXISTS idx_documents_uploaded_by ON documents(uploaded_by);

-- funds 테이블 생성
CREATE TABLE IF NOT EXISTS funds (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  abbreviation TEXT,
  tax_number TEXT,
  gp_id UUID[],
  address TEXT,
  status fund_status DEFAULT 'ready' NOT NULL,
  account TEXT,
  account_bank TEXT,
  par_value BIGINT NOT NULL DEFAULT 1000000 CHECK (par_value >= 1000000),
  closed_at TIMESTAMPTZ,
  registered_at TIMESTAMPTZ,
  dissolved_at TIMESTAMPTZ,
  brand TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- fund_members 테이블 생성
CREATE TABLE IF NOT EXISTS fund_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  fund_id UUID REFERENCES funds(id) ON DELETE CASCADE NOT NULL,
  profile_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  investment_units INTEGER NOT NULL CHECK (investment_units > 0),
  total_units INTEGER NOT NULL CHECK (total_units > 0),
  brand TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  -- 한 프로필은 한 펀드에 한 번만 가입 가능
  UNIQUE(fund_id, profile_id),
  -- 약정출자좌수는 출자좌수보다 크거나 같아야 함
  CONSTRAINT fund_members_total_units_gte_investment_units CHECK (total_units >= investment_units)
);

-- fund_members에 복합 인덱스 생성
CREATE INDEX IF NOT EXISTS idx_fund_members_fund_profile ON fund_members(fund_id, profile_id);
CREATE INDEX IF NOT EXISTS idx_fund_members_total_units ON fund_members(total_units);

-- funds 테이블 인덱스 생성
CREATE INDEX IF NOT EXISTS idx_funds_status ON funds(status);
CREATE INDEX IF NOT EXISTS idx_funds_gp_id ON funds USING gin(gp_id);
CREATE INDEX IF NOT EXISTS idx_funds_par_value ON funds(par_value);

-- updated_at 자동 업데이트 함수
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- profiles 테이블 트리거
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

-- fund_members 테이블 트리거
CREATE TRIGGER update_fund_members_updated_at
  BEFORE UPDATE ON fund_members
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

-- funds 테이블 트리거
CREATE TRIGGER update_funds_updated_at
  BEFORE UPDATE ON funds
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

-- documents 테이블 트리거
CREATE TRIGGER update_documents_updated_at
  BEFORE UPDATE ON documents
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

-- 펀드 ID를 확인하는 쿼리
-- SELECT id FROM funds WHERE name = '프로펠-SNUSV엔젤투자조합2호';

-- RLS (Row Level Security) 정책 (옵션 - 나중에 활성화 가능)
-- ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE funds ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE fund_members ENABLE ROW LEVEL SECURITY;

-- 사용자가 자신의 프로필만 수정할 수 있도록 하는 정책 예시
-- CREATE POLICY "Users can update own profile" ON profiles
--   FOR UPDATE
--   USING (auth.uid() = user_id)
--   WITH CHECK (auth.uid() = user_id);

-- CREATE POLICY "Anyone can insert profile" ON profiles
--   FOR INSERT
--   WITH CHECK (true);

-- CREATE POLICY "Users can view own profile" ON profiles
--   FOR SELECT
--   USING (auth.uid() = user_id OR user_id IS NULL);
