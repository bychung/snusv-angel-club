import { createServerClient } from '@supabase/ssr';
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
    fundMembers: createTableOperations(supabase, 'fund_members', brand),
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
  };
}
