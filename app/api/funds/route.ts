import {
  getAccessibleProfileIds,
  validateUserAccess,
} from '@/lib/auth/permissions';
import { createBrandServerClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

/**
 * GET /api/funds
 * 현재 사용자가 출자한 펀드 목록 조회
 *
 * - 본인 프로필의 펀드 멤버십
 * - profile_permissions를 통해 접근 가능한 프로필들의 펀드 멤버십
 *
 * @returns {
 *   funds: Array<{
 *     id: string,
 *     name: string,
 *     par_value: number,
 *     status: string,
 *     abbreviation?: string,
 *     membership: {
 *       id: string,
 *       investment_units: number,
 *       total_units: number,
 *       profile_id: string,
 *       created_at: string,
 *       updated_at: string
 *     }
 *   }>
 * }
 */
export async function GET(request: NextRequest) {
  try {
    // 인증 및 사용자 확인
    const authResult = await validateUserAccess(request, '[funds]');
    if (authResult instanceof Response) return authResult;

    const { user } = authResult;

    // 접근 가능한 프로필 ID 목록 조회
    const profileAccess = await getAccessibleProfileIds(user, '[funds]');

    if (!profileAccess.hasAccess) {
      return NextResponse.json({
        funds: [],
      });
    }

    const brandClient = await createBrandServerClient();

    // 접근 가능한 프로필들의 펀드 멤버십 조회
    const { data: fundMembers, error: fundMembersError } =
      await brandClient.fundMembers
        .select(
          `
        id,
        investment_units,
        total_units,
        profile_id,
        created_at,
        updated_at,
        funds (
          id,
          name,
          par_value,
          status,
          abbreviation
        )
      `
        )
        .in('profile_id', profileAccess.accessibleProfileIds)
        .order('created_at', { ascending: false });

    if (fundMembersError) {
      console.error('[funds] 펀드 멤버십 조회 실패:', fundMembersError);
      return NextResponse.json(
        { error: '펀드 목록을 불러오는데 실패했습니다.' },
        { status: 500 }
      );
    }

    console.log(`[funds] ${fundMembers?.length || 0}개의 펀드 멤버십 조회됨`);

    // 4. 응답 형태 변환: fund 중심으로 재구성
    const funds = (fundMembers || []).map((member: any) => ({
      id: member.funds.id,
      name: member.funds.name,
      par_value: member.funds.par_value,
      status: member.funds.status,
      abbreviation: member.funds.abbreviation,
      membership: {
        id: member.id,
        investment_units: member.investment_units,
        total_units: member.total_units,
        profile_id: member.profile_id,
        created_at: member.created_at,
        updated_at: member.updated_at,
      },
    }));

    return NextResponse.json({
      funds,
    });
  } catch (error) {
    console.error('펀드 목록 조회 실패:', error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : '펀드 목록을 불러오는데 실패했습니다',
        funds: [],
      },
      { status: 500 }
    );
  }
}
