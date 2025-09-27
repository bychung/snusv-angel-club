-- 테이블만 생성하는 스크립트

-- Create user role enum
CREATE TYPE user_role AS ENUM ('ADMIN', 'USER');

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

CREATE TABLE IF NOT EXISTS funds (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  par_value INTEGER NOT NULL CHECK (par_value >= 1000000),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS fund_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  fund_id UUID REFERENCES funds(id) ON DELETE CASCADE NOT NULL,
  profile_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  investment_units INTEGER NOT NULL CHECK (investment_units > 0),
  total_units INTEGER NOT NULL CHECK (total_units > 0),
  -- TODO: total_amount는 fund의 par_value를 사용해야 하므로 GENERATED 컬럼으로는 구현 어려움
  -- 대신 애플리케이션 레벨에서 계산하도록 변경 권장
  -- total_amount BIGINT GENERATED ALWAYS AS (investment_units * 1000000) STORED,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(fund_id, profile_id)
);
