import {
  canDownloadInvestmentCertificate,
  getMemberInvestmentCertificates,
} from '@/lib/admin/documents';
import { requireFundAccess, validateUserAccess } from '@/lib/auth/permissions';
import { createClient as createSupabaseClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';

// 투자확인서 다운로드
export async function GET(request: NextRequest) {
  try {
    // URL 쿼리 파라미터에서 필요한 정보 추출
    const { searchParams, pathname } = new URL(request.url);
    const fundId = pathname.split('/')[3]; // /api/funds/[fundId]/...
    const memberId = searchParams.get('memberId'); // 선택사항 (없으면 현재 사용자)
    const documentYear = searchParams.get('year');
    const documentId = searchParams.get('documentId');

    if (!fundId) {
      return Response.json({ error: '펀드 ID가 필요합니다' }, { status: 400 });
    }

    // 사용자 인증 확인
    const authResult = await validateUserAccess(
      request,
      '[investment-certificate-download]'
    );
    if (authResult instanceof Response) {
      return authResult;
    }
    const { user } = authResult;

    // 펀드 접근 권한 확인
    const accessResult = await requireFundAccess(
      user,
      fundId,
      '[investment-certificate-download]'
    );
    if (accessResult instanceof Response) {
      return accessResult;
    }

    const isParticipant = true; // requireFundAccess를 통과했으므로 참여자임
    const userProfileId = accessResult.fundMemberProfileIds[0]; // 펀드에 참여 중인 프로필 ID

    // memberId가 지정되지 않은 경우 현재 사용자의 프로필 ID 사용
    const targetMemberId = memberId || userProfileId;

    // 투자확인서 다운로드 권한 확인
    // 일반 사용자는 본인의 투자확인서만 다운로드 가능
    if (
      !canDownloadInvestmentCertificate(
        'USER',
        isParticipant,
        targetMemberId,
        userProfileId
      )
    ) {
      return Response.json(
        { error: '해당 투자확인서에 접근할 권한이 없습니다' },
        { status: 403 }
      );
    }

    // 투자확인서 조회
    const certificates = await getMemberInvestmentCertificates(
      fundId,
      targetMemberId,
      documentYear ? parseInt(documentYear) : undefined
    );

    if (certificates.length === 0) {
      return Response.json(
        { error: '해당 조건의 투자확인서를 찾을 수 없습니다' },
        { status: 404 }
      );
    }

    // 특정 문서 ID가 지정된 경우 해당 문서 찾기, 아니면 최신 문서 사용
    let targetDocument;
    if (documentId) {
      targetDocument = certificates.find(cert => cert.id === documentId);
      if (!targetDocument) {
        return Response.json(
          { error: '지정된 문서를 찾을 수 없습니다' },
          { status: 404 }
        );
      }
    } else {
      targetDocument = certificates[0]; // 이미 created_at DESC로 정렬됨
    }

    // 파일 다운로드
    const url = new URL(targetDocument.file_url);
    const pathSegments = url.pathname.split('/');
    const bucketIndex = pathSegments.findIndex(
      segment => segment === 'fund-documents'
    );

    if (bucketIndex === -1 || bucketIndex >= pathSegments.length - 1) {
      return Response.json(
        { error: '파일 경로를 찾을 수 없습니다' },
        { status: 404 }
      );
    }

    const filePath = pathSegments.slice(bucketIndex + 1).join('/');

    // Service Role 전용 클라이언트 생성 (기존 documents와 동일한 방식)
    const serviceClient = createSupabaseClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // Storage에서 파일 다운로드 (Service Role 클라이언트 사용)
    const { data: fileData, error: downloadError } = await serviceClient.storage
      .from('fund-documents')
      .download(filePath);

    if (downloadError) {
      console.error('파일 다운로드 오류:', downloadError);
      return Response.json(
        { error: '파일 다운로드에 실패했습니다.' },
        { status: 500 }
      );
    }

    if (!fileData) {
      return Response.json(
        { error: '파일을 찾을 수 없습니다.' },
        { status: 404 }
      );
    }

    // 파일을 Buffer로 변환
    const buffer = await fileData.arrayBuffer();

    // 파일을 직접 반환 (기존 documents와 동일한 방식)
    return new NextResponse(buffer, {
      headers: {
        'Content-Type': targetDocument.file_type,
        'Content-Disposition': `attachment; filename="${encodeURIComponent(
          targetDocument.file_name
        )}"`,
        'Content-Length': buffer.byteLength.toString(),
      },
    });
  } catch (error) {
    console.error('투자확인서 다운로드 실패:', error);
    return Response.json(
      {
        error:
          error instanceof Error
            ? error.message
            : '내부 서버 오류가 발생했습니다',
      },
      { status: 500 }
    );
  }
}
