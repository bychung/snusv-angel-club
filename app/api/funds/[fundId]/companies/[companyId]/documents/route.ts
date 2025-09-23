import { getDocumentsByCompany } from '@/lib/admin/company-documents';
import { createClient } from '@/lib/supabase/server';
import { NextRequest } from 'next/server';

// 펀드 조합원이 투자한 회사의 문서 조회
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ fundId: string; companyId: string }> }
) {
  try {
    const { fundId, companyId } = await params;
    const supabase = await createClient();

    // 사용자 인증 확인
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) {
      return Response.json({ error: '인증이 필요합니다' }, { status: 401 });
    }

    // 사용자 프로필 조회
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('user_id', user.id)
      .single();

    if (profileError || !profile) {
      return Response.json(
        { error: '사용자 프로필을 찾을 수 없습니다' },
        { status: 404 }
      );
    }

    // 해당 펀드의 조합원인지 확인
    const { count: memberCount } = await supabase
      .from('fund_members')
      .select('*', { count: 'exact', head: true })
      .eq('fund_id', fundId)
      .eq('profile_id', profile.id);

    if (!memberCount || memberCount === 0) {
      return Response.json(
        { error: '해당 펀드의 조합원이 아닙니다' },
        { status: 403 }
      );
    }

    // 해당 펀드가 해당 회사에 투자했는지 확인
    const { count: investmentCount } = await supabase
      .from('investments')
      .select('*', { count: 'exact', head: true })
      .eq('fund_id', fundId)
      .eq('company_id', companyId);

    if (!investmentCount || investmentCount === 0) {
      return Response.json(
        { error: '해당 펀드가 투자하지 않은 회사입니다' },
        { status: 403 }
      );
    }

    // 회사 문서 조회
    const companyDocuments = await getDocumentsByCompany(companyId);

    if (!companyDocuments) {
      return Response.json(
        { error: '회사를 찾을 수 없습니다' },
        { status: 404 }
      );
    }

    // 사용자에게 필요한 정보만 반환 (업로드한 사람 정보 등은 제외)
    const sanitizedDocuments = {
      company: {
        id: companyDocuments.company.id,
        name: companyDocuments.company.name,
        description: companyDocuments.company.description,
        website: companyDocuments.company.website,
        category: companyDocuments.company.category,
        established_at: companyDocuments.company.established_at,
      },
      documents: companyDocuments.documents.map(doc => ({
        id: doc.id,
        category: doc.category,
        file_name: doc.file_name,
        file_type: doc.file_type,
        file_size: doc.file_size,
        file_url: doc.file_url,
        created_at: doc.created_at,
      })),
      documents_by_category: Object.entries(
        companyDocuments.documents_by_category
      ).reduce((acc, [category, docs]) => {
        acc[category] = docs.map(doc => ({
          id: doc.id,
          category: doc.category,
          file_name: doc.file_name,
          file_type: doc.file_type,
          file_size: doc.file_size,
          file_url: doc.file_url,
          created_at: doc.created_at,
        }));
        return acc;
      }, {} as any),
      total_documents: companyDocuments.total_documents,
      latest_upload: companyDocuments.latest_upload,
    };

    return Response.json(sanitizedDocuments);
  } catch (error) {
    console.error('회사 문서 조회 실패:', error);
    return Response.json(
      {
        error:
          error instanceof Error
            ? error.message
            : '회사 문서를 불러오는데 실패했습니다',
      },
      { status: 500 }
    );
  }
}
