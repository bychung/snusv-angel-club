-- Create investments table for fund-company relationships
-- Created: 2024-01-21
-- Description: Creates investments table to track fund investments in portfolio companies

-- 투자 테이블 생성
CREATE TABLE investments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES companies(id) ON DELETE CASCADE NOT NULL,
  fund_id UUID REFERENCES funds(id) ON DELETE CASCADE NOT NULL,
  investment_date DATE,
  unit_price BIGINT, -- 투자단가 (원 단위)
  investment_shares BIGINT, -- 주식수
  issued_shares BIGINT, -- 총발행주식수
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  -- 같은 회사에 같은 펀드 중복 투자 방지
  UNIQUE(company_id, fund_id)
);

-- investments 테이블 인덱스
CREATE INDEX IF NOT EXISTS idx_investments_company_fund ON investments(company_id, fund_id);
CREATE INDEX IF NOT EXISTS idx_investments_company ON investments(company_id);
CREATE INDEX IF NOT EXISTS idx_investments_fund ON investments(fund_id);
CREATE INDEX IF NOT EXISTS idx_investments_date ON investments(investment_date);

-- updated_at 자동 업데이트 트리거
CREATE TRIGGER update_investments_updated_at
  BEFORE UPDATE ON investments
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

-- 코멘트 추가
COMMENT ON TABLE investments IS '펀드의 포트폴리오 회사 투자 정보';
COMMENT ON COLUMN investments.company_id IS '투자 회사 ID';
COMMENT ON COLUMN investments.fund_id IS '투자 펀드 ID';
COMMENT ON COLUMN investments.investment_date IS '투자일';
COMMENT ON COLUMN investments.unit_price IS '투자단가 (원 단위)';
COMMENT ON COLUMN investments.investment_shares IS '투자 주식수';
COMMENT ON COLUMN investments.issued_shares IS '총발행주식수';

-- 계산된 필드를 위한 뷰 생성
CREATE VIEW investment_details AS
SELECT 
  i.*,
  c.name as company_name,
  c.category as company_category,
  c.website as company_website,
  f.name as fund_name,
  f.abbreviation as fund_abbreviation,
  -- 계산된 필드들
  CASE 
    WHEN i.unit_price IS NOT NULL AND i.investment_shares IS NOT NULL 
    THEN i.unit_price * i.investment_shares
    ELSE NULL 
  END as total_investment_amount,
  CASE 
    WHEN i.investment_shares IS NOT NULL AND i.issued_shares IS NOT NULL AND i.issued_shares > 0
    THEN ROUND((i.investment_shares::NUMERIC / i.issued_shares::NUMERIC) * 100, 2)
    ELSE NULL 
  END as ownership_percentage
FROM investments i
LEFT JOIN companies c ON i.company_id = c.id
LEFT JOIN funds f ON i.fund_id = f.id;

COMMENT ON VIEW investment_details IS '투자 상세 정보 뷰 (계산된 필드 포함)';
