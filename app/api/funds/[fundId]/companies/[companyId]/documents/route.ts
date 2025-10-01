import { getDocumentsByCompany } from '@/lib/admin/company-documents';
import { requireFundAccess, validateUserAccess } from '@/lib/auth/permissions';
import { createBrandServerClient } from '@/lib/supabase/server';
import { NextRequest } from 'next/server';

// 펀드 조합원이 투자한 회사의 문서 조회
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ fundId: string; companyId: string }> }
) {
  try {
    const { fundId, companyId } = await params;

    // 인증 및 사용자 확인
    const authResult = await validateUserAccess(request, '[company-documents]');
    if (authResult instanceof Response) return authResult;

    const { user } = authResult;

    // 펀드 접근 권한 확인
    const accessResult = await requireFundAccess(
      user,
      fundId,
      '[company-documents]'
    );
    if (accessResult instanceof Response) return accessResult;

    // 해당 펀드가 해당 회사에 투자했는지 확인 (브랜드별)
    const brandClient = await createBrandServerClient();
    const { count: investmentCount } = await brandClient.investments
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
