import { createServerClient } from '@supabase/ssr';
import { createClient as createSupabaseClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';
import { getCurrentBrand } from '../branding';
import { createTableOperations } from './brand-client';

export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // The `setAll` method was called from a Server Component.
            // This can be ignored if you have middleware refreshing
            // user sessions.
          }
        },
      },
    }
  );
}

// Storage 전용 클라이언트 (Service Role Key로 RLS 우회)
export function createStorageClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceKey) {
    throw new Error('Supabase 환경변수가 설정되지 않았습니다.');
  }

  return createSupabaseClient(url, serviceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

// 서버용 브랜드 인식 쿼리 래퍼
export async function createBrandServerClient() {
  const supabase = await createClient();
  const brand = getCurrentBrand();

  return {
    // 원본 클라이언트
    raw: supabase,

    // 브랜드 필터 자동 적용 테이블 작업들
    profiles: createTableOperations(supabase, 'profiles', brand),
    funds: createTableOperations(supabase, 'funds', brand),
    // fund_members는 soft delete 지원
    fundMembers: createTableOperations(supabase, 'fund_members', brand, {
      hasSoftDelete: true,
    }),
    fundMemberChanges: createTableOperations(
      supabase,
      'fund_member_changes',
      brand
    ),
    profileChanges: createTableOperations(supabase, 'profile_changes', brand),
    documents: createTableOperations(supabase, 'documents', brand),
    companies: createTableOperations(supabase, 'companies', brand),
    investments: createTableOperations(supabase, 'investments', brand),
    investmentDetails: createTableOperations(
      supabase,
      'investment_details',
      brand
    ),
    companyDocuments: createTableOperations(
      supabase,
      'company_documents',
      brand
    ),
    companyDocumentDetails: createTableOperations(
      supabase,
      'company_document_details',
      brand
    ),
    profilePermissions: createTableOperations(
      supabase,
      'profile_permissions',
      brand
    ),
    startupInquiries: createTableOperations(
      supabase,
      'startup_inquiries',
      brand
    ),
    angelInquiries: createTableOperations(supabase, 'angel_inquiries', brand),
    signupInquiries: createTableOperations(supabase, 'signup_inquiries', brand),

    // 조합원 총회 관련 테이블
    assemblies: createTableOperations(supabase, 'assemblies', brand),

    // 브랜드 필터 없는 테이블들 (전체 공통 또는 FK를 통해 브랜드 확인)
    get assemblyDocuments() {
      return supabase.from('assembly_documents');
    },
    assemblyEmails: createTableOperations(supabase, 'assembly_emails', brand),

    // 브랜드 필터 없는 테이블들 (전체 공통 또는 FK를 통해 브랜드 확인)
    get documentTemplates() {
      return supabase.from('document_templates');
    },
    // 매 호출마다 새로운 빌더를 반환하여 쿼리 필터 누적 방지
    get fundDocuments() {
      return supabase.from('fund_documents');
    },
  };
}
