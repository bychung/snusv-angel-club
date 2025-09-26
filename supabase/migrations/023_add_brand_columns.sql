-- Add brand columns to all tables for multi-brand support
-- Created: 2025-01-XX

-- 모든 테이블에 brand 컬럼 추가 (TEXT 타입으로 확장성 고려, 기본값: 'snusv')
ALTER TABLE profiles ADD COLUMN brand TEXT DEFAULT 'snusv' NOT NULL;
ALTER TABLE funds ADD COLUMN brand TEXT DEFAULT 'snusv' NOT NULL; 
ALTER TABLE fund_members ADD COLUMN brand TEXT DEFAULT 'snusv' NOT NULL;
ALTER TABLE documents ADD COLUMN brand TEXT DEFAULT 'snusv' NOT NULL;
ALTER TABLE companies ADD COLUMN brand TEXT DEFAULT 'snusv' NOT NULL;
ALTER TABLE investments ADD COLUMN brand TEXT DEFAULT 'snusv' NOT NULL;
ALTER TABLE company_documents ADD COLUMN brand TEXT DEFAULT 'snusv' NOT NULL;
ALTER TABLE profile_permissions ADD COLUMN brand TEXT DEFAULT 'snusv' NOT NULL;
ALTER TABLE startup_inquiries ADD COLUMN brand TEXT DEFAULT 'snusv' NOT NULL;
ALTER TABLE angel_inquiries ADD COLUMN brand TEXT DEFAULT 'snusv' NOT NULL;
ALTER TABLE signup_inquiries ADD COLUMN brand TEXT DEFAULT 'snusv' NOT NULL;

-- investment_details와 company_document_details는 뷰이지만,
-- SELECT i.*, cd.* 구문으로 인해 기본 테이블에 brand 컬럼 추가시 자동으로 뷰에 포함됨

-- 브랜드별 조회 성능을 위한 인덱스 추가
CREATE INDEX idx_profiles_brand ON profiles(brand);
CREATE INDEX idx_funds_brand ON funds(brand);
CREATE INDEX idx_fund_members_brand ON fund_members(brand);
CREATE INDEX idx_documents_brand ON documents(brand);
CREATE INDEX idx_companies_brand ON companies(brand);
CREATE INDEX idx_investments_brand ON investments(brand);
-- investment_details와 company_document_details는 뷰이므로 인덱스 생성 불가 (기본 테이블들에 인덱스가 있음)
CREATE INDEX idx_company_documents_brand ON company_documents(brand);
CREATE INDEX idx_profile_permissions_brand ON profile_permissions(brand);
CREATE INDEX idx_startup_inquiries_brand ON startup_inquiries(brand);
CREATE INDEX idx_angel_inquiries_brand ON angel_inquiries(brand);
CREATE INDEX idx_signup_inquiries_brand ON signup_inquiries(brand);

-- 복합 인덱스 (기존 중요한 쿼리들에 brand 조건 추가)
CREATE INDEX idx_fund_members_brand_fund_profile ON fund_members(brand, fund_id, profile_id);
CREATE INDEX idx_documents_brand_fund_category ON documents(brand, fund_id, category);
CREATE INDEX idx_funds_brand_status ON funds(brand, status);

-- 기존 데이터는 모두 'snusv' 브랜드로 설정됨 (기본값)
