import { inquiryNotifications } from '@/lib/email/inquiry-notifications';
import { createBrandServerClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

interface SubmitApplicationRequest {
  fundId: string;
  surveyData: {
    name: string;
    phone: string;
    email: string;
    address: string;
    entityType: 'individual' | 'corporate';
    birthDate?: string;
    businessNumber?: string;
    ceo?: string;
    investmentUnits: number;
  };
}

interface SubmitApplicationResponse {
  success: boolean;
  profileId?: string;
  error?: string;
}

export async function POST(
  request: NextRequest
): Promise<NextResponse<SubmitApplicationResponse>> {
  try {
    const body: SubmitApplicationRequest = await request.json();
    const { fundId, surveyData } = body;

    // 입력 검증
    if (!fundId || !surveyData) {
      return NextResponse.json(
        { success: false, error: '필수 데이터가 누락되었습니다.' },
        { status: 400 }
      );
    }

    // Supabase 클라이언트 생성
    const brandClient = await createBrandServerClient();

    // 인증된 사용자 확인 (선택적 - 비로그인 사용자도 허용)
    const {
      data: { user },
      error: authError,
    } = await brandClient.raw.auth.getUser();

    // 인증 에러는 로깅만 하고 계속 진행 (비로그인 사용자 허용)
    if (authError) {
      console.log(
        '[submit-application] 비로그인 사용자 신청:',
        authError.message
      );
    } else if (user) {
      console.log(`[submit-application] 로그인 사용자 신청: ${user.id}`);
    }

    // 프로필 데이터 준비
    const profileData = {
      name: surveyData.name,
      phone: surveyData.phone,
      email: surveyData.email.toLowerCase(),
      entity_type: surveyData.entityType,
      birth_date:
        surveyData.entityType === 'individual'
          ? surveyData.birthDate || null
          : null,
      business_number:
        surveyData.entityType === 'corporate'
          ? surveyData.businessNumber || null
          : null,
      ceo:
        surveyData.entityType === 'corporate' ? surveyData.ceo || null : null,
      address: surveyData.address,
      updated_at: new Date().toISOString(),
    };

    let profile: any;
    let oldProfileData: any = null;
    let profileId: string;

    // 트랜잭션 시작: 로그인 사용자 vs 비로그인 사용자 처리
    if (user) {
      // === 로그인된 사용자 ===
      // 1. 기존 프로필 조회
      const { data: existingProfile } = await brandClient.profiles
        .select('id, name, phone, email')
        .eq('user_id', user.id)
        .single();

      if (!existingProfile) {
        return NextResponse.json(
          { success: false, error: '프로필을 찾을 수 없습니다.' },
          { status: 404 }
        );
      }

      oldProfileData = existingProfile;
      profileId = existingProfile.id;

      // 2. 프로필 업데이트
      const { data: updatedProfile, error: updateError } =
        await brandClient.profiles
          .update(profileData as any)
          .eq('user_id', user.id)
          .select()
          .single();

      if (updateError) {
        throw new Error(`프로필 업데이트 실패: ${updateError.message}`);
      }

      profile = updatedProfile;
    } else {
      // === 비로그인 사용자 ===
      // 1. 이메일로 기존 프로필 확인
      const { data: existingProfile, error: existingProfileError } =
        await brandClient.profiles
          .select('id, user_id, name, phone, email')
          .eq('email', surveyData.email.toLowerCase())
          .maybeSingle();

      if (existingProfileError) {
        throw new Error(existingProfileError.message);
      }

      // 2. 이미 회원가입된 이메일 체크
      if (existingProfile && existingProfile.user_id) {
        return NextResponse.json(
          {
            success: false,
            error:
              '이미 회원가입이 되어 있는 이메일입니다. 로그인 후 수정해 주세요.',
          },
          { status: 400 }
        );
      }

      // 3. 기존 프로필 저장 (변경 이력 추적용)
      if (existingProfile) {
        oldProfileData = existingProfile;
      }

      // 4. 프로필 Upsert
      const { data: upsertedProfile, error: upsertError } =
        await brandClient.profiles
          .upsert(profileData as any, {
            onConflict: 'brand,email',
          })
          .select()
          .single();

      if (upsertError) {
        throw new Error(`프로필 저장 실패: ${upsertError.message}`);
      }

      profile = upsertedProfile;
      profileId = profile.id;
    }

    // === 프로필 변경 이력 저장 (병렬) ===
    if (profile && oldProfileData) {
      const importantFieldChanges: Array<{
        field_name: 'email' | 'phone' | 'name';
        old_value: string;
        new_value: string;
      }> = [];

      if (profileData.email !== oldProfileData.email) {
        importantFieldChanges.push({
          field_name: 'email',
          old_value: oldProfileData.email,
          new_value: profileData.email,
        });
      }

      if (profileData.phone !== oldProfileData.phone) {
        importantFieldChanges.push({
          field_name: 'phone',
          old_value: oldProfileData.phone,
          new_value: profileData.phone,
        });
      }

      if (profileData.name !== oldProfileData.name) {
        importantFieldChanges.push({
          field_name: 'name',
          old_value: oldProfileData.name,
          new_value: profileData.name,
        });
      }

      // 병렬 처리로 이력 저장
      if (importantFieldChanges.length > 0) {
        const changePromises = importantFieldChanges.map(change =>
          brandClient.profileChanges.insert({
            profile_id: profileId,
            changed_by: profileId, // 본인이 수정
            field_name: change.field_name,
            old_value: change.old_value,
            new_value: change.new_value,
          })
        );

        const results = await Promise.all(changePromises);
        results.forEach((result, index) => {
          if (result.error) {
            console.error(
              `[submit-application] 프로필 변경 이력 저장 실패 (${importantFieldChanges[index].field_name}):`,
              result.error
            );
            // 이력 저장 실패는 치명적이지 않으므로 계속 진행
          }
        });
      }
    }

    // === fund_member 처리 ===
    // 0. 펀드 정보 조회 (이메일 알림용)
    const { data: fundData } = await brandClient.funds
      .select('id, name, par_value')
      .eq('id', fundId)
      .single();

    // 1. 기존 fund_member 확인
    const { data: existingFundMember } = await brandClient.fundMembers
      .select('id, total_units, created_at')
      .eq('fund_id', fundId)
      .eq('profile_id', profileId)
      .maybeSingle();

    const isNewApplication = !existingFundMember;

    // 2. fund_member Upsert
    const fundMemberData = {
      fund_id: fundId,
      profile_id: profileId,
      investment_units: 0, // 실제 납입은 관리자가 따로 기록
      total_units: surveyData.investmentUnits, // 약정출자좌수
      updated_at: new Date().toISOString(),
    };

    const { data: upsertedFundMember, error: fundMemberError } =
      await brandClient.fundMembers
        .upsert(fundMemberData as any, {
          onConflict: 'profile_id,fund_id',
        })
        .select('id, created_at')
        .single();

    if (fundMemberError) {
      throw new Error(`펀드 멤버 저장 실패: ${fundMemberError.message}`);
    }

    // === fund_member 변경 이력 저장 ===
    if (upsertedFundMember) {
      if (isNewApplication) {
        // 신규 출자 신청
        const { error: changeHistoryError } =
          await brandClient.fundMemberChanges.insert({
            fund_member_id: upsertedFundMember.id,
            changed_by: profileId, // 본인이 신청
            field_name: 'created',
            old_value: '',
            new_value: upsertedFundMember.created_at,
          });

        if (changeHistoryError) {
          console.error(
            '[submit-application] 출자 신청 이력 저장 실패:',
            changeHistoryError
          );
          // 이력 저장 실패는 치명적이지 않으므로 계속 진행
        }

        // === 신규 출자 신청 이메일 알림 발송 ===
        try {
          const parValue = fundData?.par_value || 1000000; // 기본값: 1,000,000원
          const investmentAmount = surveyData.investmentUnits * parValue;

          await inquiryNotifications.sendFundApplicationNotification({
            id: upsertedFundMember.id,
            name: profile.name,
            email: profile.email,
            createdAt: upsertedFundMember.created_at,
            fund_name: fundData?.name || '(알 수 없음)',
            phone: profile.phone,
            investment_units: surveyData.investmentUnits,
            investment_amount: investmentAmount,
            entity_type: profile.entity_type,
            is_new_application: true,
          });
          console.log(
            `[submit-application] 신규 출자 신청 알림 이메일 발송 완료: ${profile.email}`
          );
        } catch (emailError) {
          console.error(
            '[submit-application] 신규 출자 신청 알림 이메일 발송 실패:',
            emailError
          );
          // 이메일 발송 실패는 치명적이지 않으므로 계속 진행
        }
      } else if (
        existingFundMember &&
        existingFundMember.total_units !== surveyData.investmentUnits
      ) {
        // 약정출자좌수 변경
        const { error: changeHistoryError } =
          await brandClient.fundMemberChanges.insert({
            fund_member_id: existingFundMember.id,
            changed_by: profileId, // 본인이 수정
            field_name: 'total_units',
            old_value: existingFundMember.total_units.toString(),
            new_value: surveyData.investmentUnits.toString(),
          });

        if (changeHistoryError) {
          console.error(
            '[submit-application] 출자 변경 이력 저장 실패:',
            changeHistoryError
          );
          // 이력 저장 실패는 치명적이지 않으므로 계속 진행
        }
      }
    }

    // 성공 응답
    return NextResponse.json({
      success: true,
      profileId: profileId,
    });
  } catch (error: any) {
    console.error('[submit-application] Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || '제출 중 오류가 발생했습니다.',
      },
      { status: 500 }
    );
  }
}
