// addBrandToData는 brandClient 내부에서 처리되므로 불필요
import { isAdminServer } from '@/lib/auth/admin-server';
import { ParsedMemberData } from '@/lib/excel-utils';
import { createBrandServerClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

interface BulkUploadRequestBody {
  members: ParsedMemberData[];
}

interface BulkUploadResult {
  success: number;
  errors: Array<{
    index: number;
    name: string;
    error: string;
  }>;
  duplicates: Array<{
    index: number;
    name: string;
    phone: string;
  }>;
}

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ fundId: string }> }
) {
  try {
    const { fundId } = await context.params;
    const brandClient = await createBrandServerClient();

    // 인증 확인 (관리자만)
    const {
      data: { user },
      error: authError,
    } = await brandClient.raw.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: '인증이 필요합니다.' },
        { status: 401 }
      );
    }

    // 관리자 권한 확인
    const adminAccess = await isAdminServer(user);
    if (!adminAccess) {
      console.log('Admin access denied for user:', user.email);
      return NextResponse.json(
        { error: '관리자 권한이 필요합니다.' },
        { status: 403 }
      );
    }

    console.log('Admin access granted for user:', user.email);

    const body: BulkUploadRequestBody = await request.json();
    const { members } = body;

    if (!members || !Array.isArray(members) || members.length === 0) {
      return NextResponse.json(
        { error: '업로드할 데이터가 없습니다.' },
        { status: 400 }
      );
    }

    const result: BulkUploadResult = {
      success: 0,
      errors: [],
      duplicates: [],
    };

    // 트랜잭션으로 처리
    const { error: transactionError } = await brandClient.raw.rpc(
      'bulk_upload_members',
      {
        p_fund_id: fundId,
        p_members: members.map((member, index) => ({
          ...member,
          original_index: index,
        })),
      }
    );

    if (transactionError) {
      // 트랜잭션이 실패한 경우 개별 처리로 폴백
      return await processMembersIndividually(brandClient, fundId, members);
    }

    result.success = members.length;

    return NextResponse.json(result);
  } catch (error: any) {
    console.error('Bulk upload error:', error);
    return NextResponse.json(
      { error: error.message || '업로드 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}

// 개별 처리 함수 (트랜잭션이 실패한 경우)
async function processMembersIndividually(
  brandClient: any,
  fundId: string,
  members: ParsedMemberData[]
): Promise<NextResponse> {
  const result: BulkUploadResult = {
    success: 0,
    errors: [],
    duplicates: [],
  };

  for (let i = 0; i < members.length; i++) {
    const member = members[i];

    try {
      // 1. 기존 프로필 확인 (이메일 기준으로 변경, 개별 추가와 일관성 유지)
      const { data: existingProfile } = await brandClient.profiles
        .select(
          'id, name, phone, investment_units_sum: fund_members(investment_units)'
        )
        .eq('email', member.email.trim())
        .maybeSingle();

      let profileId: string;

      if (existingProfile) {
        profileId = existingProfile.id;
        // 기존 프로필 정보는 업데이트하지 않음 (다른 브랜드 정보 보호)
      } else {
        // 새 프로필 생성

        const { data: newProfile, error: insertError } =
          await brandClient.profiles
            .insert({
              name: member.name,
              phone: member.phone,
              email: member.email,
              entity_type: member.entity_type,
              birth_date: member.birth_date,
              business_number: member.business_number,
              address: member.address,
            })
            .select('id')
            .single();

        if (insertError || !newProfile) {
          result.errors.push({
            index: i + 1,
            name: member.name,
            error:
              '프로필 생성 실패: ' +
              (insertError?.message || '알 수 없는 오류'),
          });
          continue;
        }

        profileId = newProfile.id;
      }

      // 2. 펀드 멤버 확인 (브랜드별)
      const { data: existingFundMember } = await brandClient.fundMembers
        .select('id')
        .eq('fund_id', fundId)
        .eq('profile_id', profileId)
        .single();

      if (existingFundMember) {
        // 이미 등록된 조합원
        result.duplicates.push({
          index: i + 1,
          name: member.name,
          phone: member.phone,
        });
        continue;
      }

      // 3. 펀드 멤버 추가
      const { error: fundMemberError } = await brandClient.fundMembers.insert({
        fund_id: fundId,
        profile_id: profileId,
        investment_units: member.investment_units,
      });

      if (fundMemberError) {
        result.errors.push({
          index: i + 1,
          name: member.name,
          error: '펀드 멤버 등록 실패: ' + fundMemberError.message,
        });
        continue;
      }

      result.success++;
    } catch (error: any) {
      result.errors.push({
        index: i + 1,
        name: member.name,
        error: '처리 중 오류: ' + error.message,
      });
    }
  }

  return NextResponse.json(result);
}
