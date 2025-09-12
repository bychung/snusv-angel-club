-- 멀티 계정 시스템을 위한 profile_permissions 테이블 생성
-- 프로필 소유자(owner)가 다른 사용자에게 자신의 프로필에 대한 접근 권한을 부여할 수 있음

CREATE TABLE IF NOT EXISTS profile_permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  permission_type TEXT CHECK (permission_type IN ('admin', 'view')) NOT NULL DEFAULT 'view',
  granted_by UUID REFERENCES profiles(id) NOT NULL, -- owner의 profile_id
  granted_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),

  -- 한 유저는 한 프로필에 하나의 권한만
  UNIQUE(profile_id, user_id)
);

-- 인덱스 생성 (성능 향상)
CREATE INDEX IF NOT EXISTS idx_profile_permissions_profile_id ON profile_permissions(profile_id);
CREATE INDEX IF NOT EXISTS idx_profile_permissions_user_id ON profile_permissions(user_id);
CREATE INDEX IF NOT EXISTS idx_profile_permissions_granted_by ON profile_permissions(granted_by);

-- CHECK 제약조건: owner는 permission 테이블에 들어가지 않도록 함
-- (이 제약조건은 복잡하므로 애플리케이션 레벨에서 처리하고, 여기서는 주석으로만 남김)
-- CHECK (user_id != (SELECT user_id FROM profiles WHERE id = profile_id))
