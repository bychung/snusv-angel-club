import { createBrowserClient } from '@supabase/ssr';
import { getCurrentBrand } from '../branding';
import { createTableOperations } from './brand-client';

const DEFAULT_TIMEOUT_MS = 15000;

function createLoggingFetch(timeoutMs: number = DEFAULT_TIMEOUT_MS) {
  return async function loggingFetch(
    input: RequestInfo | URL,
    init?: RequestInit
  ): Promise<Response> {
    const url =
      typeof input === 'string'
        ? input
        : input instanceof URL
        ? input.toString()
        : (input as Request).url;
    const method =
      init?.method || (input instanceof Request ? input.method : 'GET');

    const controller = new AbortController();
    const userSignal = init?.signal;
    const onUserAbort = () =>
      controller.abort(
        (userSignal as any)?.reason || new DOMException('Aborted', 'AbortError')
      );
    if (userSignal) {
      if (userSignal.aborted) onUserAbort();
      else userSignal.addEventListener('abort', onUserAbort, { once: true });
    }
    const timeoutId = setTimeout(
      () => controller.abort(new DOMException('Timeout', 'TimeoutError')),
      timeoutMs
    );

    const startedAt = Date.now();
    // eslint-disable-next-line no-console
    console.log('[supabase fetch] →', method, url);

    try {
      const response = await fetch(input as any, {
        ...init,
        signal: controller.signal,
      });
      const ms = Date.now() - startedAt;
      // eslint-disable-next-line no-console
      console.log(
        '[supabase fetch] ←',
        method,
        url,
        response.status,
        `${ms}ms`
      );
      return response;
    } catch (error) {
      const ms = Date.now() - startedAt;
      // eslint-disable-next-line no-console
      console.warn('[supabase fetch] ✖', method, url, `${ms}ms`, error);
      throw error;
    } finally {
      clearTimeout(timeoutId);
      if (userSignal) userSignal.removeEventListener('abort', onUserAbort);
    }
  };
}

export function createClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL as string | undefined;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY as string | undefined;
  // eslint-disable-next-line no-console
  console.log('[supabase client] init', { hasUrl: !!url, hasAnonKey: !!anon });

  return createBrowserClient(url as string, anon as string, {
    global: {
      fetch: createLoggingFetch(),
    },
  });
}

// 클라이언트용 브랜드 인식 쿼리 래퍼
export function createBrandClient() {
  const supabase = createClient();
  const brand = getCurrentBrand();

  return {
    // 원본 클라이언트
    raw: supabase,

    // 브랜드 필터 자동 적용 테이블 작업들
    profiles: createTableOperations(supabase, 'profiles', brand),
    funds: createTableOperations(supabase, 'funds', brand),
    fundMembers: createTableOperations(supabase, 'fund_members', brand),
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
  };
}
