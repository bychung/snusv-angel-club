-- Recreate views to include brand columns from base tables
-- Created: 2025-01-XX

-- investment_details 뷰 재생성 (brand 컬럼 포함)
DROP VIEW IF EXISTS investment_details;

CREATE VIEW investment_details AS
SELECT 
  i.*,
  c.name as company_name,
  c.category as company_category,
  c.website as company_website,
  f.name as fund_name,
  f.abbreviation as fund_abbreviation,
  -- 투자금액 계산 (unit_price * investment_shares)
  CASE 
    WHEN i.unit_price IS NOT NULL AND i.investment_shares IS NOT NULL 
    THEN i.unit_price * i.investment_shares
    ELSE NULL
  END as total_investment_amount,
  -- 소유지분 계산 ((investment_shares / issued_shares) * 100)
  CASE 
    WHEN i.investment_shares IS NOT NULL AND i.issued_shares IS NOT NULL AND i.issued_shares > 0 
    THEN ROUND((i.investment_shares::decimal / i.issued_shares::decimal) * 100, 4)
    ELSE NULL 
  END as ownership_percentage
FROM investments i
LEFT JOIN companies c ON i.company_id = c.id
LEFT JOIN funds f ON i.fund_id = f.id;

COMMENT ON VIEW investment_details IS '투자 상세 정보 뷰 (계산된 필드 및 brand 컬럼 포함)';

-- company_document_details 뷰 재생성 (brand 컬럼 포함)
DROP VIEW IF EXISTS company_document_details;

CREATE VIEW company_document_details AS
SELECT 
  cd.*,
  c.name as company_name,
  c.category as company_category,
  p.name as uploader_name,
  p.email as uploader_email
FROM company_documents cd
LEFT JOIN companies c ON cd.company_id = c.id
LEFT JOIN profiles p ON cd.uploaded_by = p.id;

COMMENT ON VIEW company_document_details IS '회사 문서 상세 정보 뷰 (조인된 정보 및 brand 컬럼 포함)';
