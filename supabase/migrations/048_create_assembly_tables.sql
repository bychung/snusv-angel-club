-- 조합원 총회 관련 테이블 생성
-- 결성총회, 임시총회, 정기총회, 해산/청산총회 관리

-- 총회 타입 ENUM
CREATE TYPE assembly_type AS ENUM (
  'formation',      -- 결성총회
  'special',        -- 임시총회
  'regular',        -- 정기총회
  'dissolution'     -- 해산/청산총회
);

-- 총회 상태 ENUM
CREATE TYPE assembly_status AS ENUM (
  'draft',          -- 작성 중
  'completed',      -- 문서 생성 완료
  'sent'            -- 발송 완료
);

-- 이메일 발송 상태 ENUM
CREATE TYPE assembly_email_status AS ENUM (
  'pending',        -- 발송 대기
  'sending',        -- 발송 중
  'sent',           -- 발송 완료
  'failed'          -- 발송 실패
);

-- 조합원 총회 테이블
CREATE TABLE IF NOT EXISTS assemblies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  fund_id UUID REFERENCES funds(id) ON DELETE CASCADE NOT NULL,
  type assembly_type NOT NULL,
  status assembly_status DEFAULT 'draft' NOT NULL,
  assembly_date DATE NOT NULL,                    -- 총회 개최일
  created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  brand TEXT NOT NULL
);

-- 인덱스
CREATE INDEX IF NOT EXISTS idx_assemblies_fund_id ON assemblies(fund_id);
CREATE INDEX IF NOT EXISTS idx_assemblies_type ON assemblies(type);
CREATE INDEX IF NOT EXISTS idx_assemblies_status ON assemblies(status);
CREATE INDEX IF NOT EXISTS idx_assemblies_brand ON assemblies(brand);

-- 총회 문서 테이블
-- 문서 타입은 TEXT로 관리 (향후 다양한 문서 타입 추가 용이)
-- 예시 타입들:
-- 결성총회: 'formation_member_list', 'formation_agenda', 'formation_official_letter',
--          'formation_minutes', 'fund_registration_application', 'investment_certificate',
--          'seal_registration', 'member_consent', 'personal_info_consent'
-- 임시총회: 'special_agenda', 'special_minutes', ...
-- 정기총회: 'regular_agenda', 'regular_minutes', ...
-- 해산/청산총회: 'dissolution_agenda', 'dissolution_minutes', ...
CREATE TABLE IF NOT EXISTS assembly_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  assembly_id UUID REFERENCES assemblies(id) ON DELETE CASCADE NOT NULL,
  type TEXT NOT NULL,                          -- 문서 타입 (자유 형식)

  -- 문서 내용 (JSON 형태로 저장, 편집된 내용 저장)
  content JSONB,

  -- 템플릿 정보
  template_id UUID REFERENCES document_templates(id),
  template_version TEXT,

  -- PDF 저장 경로
  pdf_storage_path TEXT,

  -- 생성 정보
  generated_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  generated_at TIMESTAMPTZ DEFAULT NOW(),

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- 한 총회에서 같은 타입의 문서는 하나만
  UNIQUE(assembly_id, type)
);

-- 인덱스
CREATE INDEX IF NOT EXISTS idx_assembly_documents_assembly_id ON assembly_documents(assembly_id);
CREATE INDEX IF NOT EXISTS idx_assembly_documents_type ON assembly_documents(type);

-- 총회 이메일 발송 기록 테이블
CREATE TABLE IF NOT EXISTS assembly_emails (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  assembly_id UUID REFERENCES assemblies(id) ON DELETE CASCADE NOT NULL,

  -- 발송 정보
  recipient_ids UUID[] NOT NULL,          -- 수신자 profile IDs
  recipient_emails TEXT[] NOT NULL,       -- 수신자 이메일 목록

  subject TEXT NOT NULL,
  body TEXT NOT NULL,

  -- 첨부 문서
  attached_document_ids UUID[] NOT NULL,  -- assembly_documents IDs

  -- 발송 상태
  status assembly_email_status DEFAULT 'pending' NOT NULL,
  sent_at TIMESTAMPTZ,
  error_message TEXT,

  -- 발송자
  sent_by UUID REFERENCES profiles(id) ON DELETE SET NULL,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  brand TEXT NOT NULL
);

-- 인덱스
CREATE INDEX IF NOT EXISTS idx_assembly_emails_assembly_id ON assembly_emails(assembly_id);
CREATE INDEX IF NOT EXISTS idx_assembly_emails_status ON assembly_emails(status);
CREATE INDEX IF NOT EXISTS idx_assembly_emails_brand ON assembly_emails(brand);
