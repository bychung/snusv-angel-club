'use client';

import { createClient } from '@/lib/supabase/client';
import { useAuthStore } from '@/store/authStore';
import { useSurveyStore } from '@/store/surveyStore';
import { useRouter } from 'next/navigation';
import { useEffect, useRef } from 'react';

export default function AuthProvider({ children }: { children: React.ReactNode }) {
  const { setUser, fetchProfile, findProfileByEmail, setLoading, resetState, signOut } = useAuthStore();
  const surveyStore = useSurveyStore();
  const routerNext = useRouter();

  // 중복 SIGNED_IN 이벤트 처리 방지
  const lastProcessedTokenRef = useRef<string | null>(null);
  const isProcessingRef = useRef(false);

  useEffect(() => {
    const supabase = createClient();

    // 초기 로딩 상태 설정
    setLoading(true);

    // 현재 사용자 확인 (프로필은 onAuthStateChange에서 처리)
    supabase.auth.getUser().then(({ data: { user }, error }) => {
      console.log('[AuthProvider] getUser result:', { hasUser: !!user, error: error?.message });

      if (error || !user) {
        // 사용자가 없거나 세션이 유효하지 않으면 완전 초기화
        console.log('[AuthProvider] No user, resetting state');
        resetState();
        return;
      }

      // 사용자만 설정, 프로필은 onAuthStateChange에서 처리
      console.log('[AuthProvider] User found, will fetch profile via onAuthStateChange');
      setUser(user);
    });

    // 인증 상태 변화 감지
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log('[AuthProvider] onAuthStateChange:', { event, hasUser: !!session?.user });

      if (event === 'SIGNED_OUT' || !session?.user) {
        // 로그아웃 또는 세션 없음
        // 중복 처리 방지 상태 초기화
        lastProcessedTokenRef.current = null;
        isProcessingRef.current = false;
        resetState();
        return;
      }

      setUser(session.user);

      if (event === 'SIGNED_IN') {
        console.log('[AuthProvider] SIGNED_IN event detected, starting flow...');

        // 중복 처리 방지 - 동일한 토큰이면 무시
        const currentToken = session?.access_token;
        if (currentToken && lastProcessedTokenRef.current === currentToken) {
          console.log('[AuthProvider] Duplicate SIGNED_IN event detected, ignoring...');
          return;
        }

        // 이미 처리 중이면 무시
        if (isProcessingRef.current) {
          console.log('[AuthProvider] Already processing SIGNED_IN event, ignoring...');
          return;
        }

        // OAuth 콜백에서 온 경우 모든 분기 로직 처리
        if (window.location.pathname === '/redirect') {
          console.log('[AuthProvider] OAuth callback - handling all login flow logic');

          // 처리 시작
          isProcessingRef.current = true;
          lastProcessedTokenRef.current = currentToken;

          // fetchProfile() 호출하여 프로필 존재 확인
          console.log('[AuthProvider] Fetching profile...');
          fetchProfile(session.user.id)
            .then(() => {
              // 프로필이 있으면 대시보드로 이동
              console.log('[AuthProvider] Profile found, redirecting to dashboard');
              routerNext.replace('/dashboard');
            })
            .catch(async (error: any) => {
              console.log('[AuthProvider] fetchProfile failed:', error.message);

              if (error.message === 'PROFILE_NOT_FOUND') {
                // 프로필이 없음 - 이메일로 기존 프로필 검색 후 설문조사 완료 여부 확인
                
                // 1) 먼저 OAuth 로그인 사용자의 이메일로 기존 프로필 검색
                const userEmail = session.user.email;
                console.log('[AuthProvider] Searching for existing profile with email:', userEmail);
                
                let existingProfile = null;
                if (userEmail) {
                  try {
                    existingProfile = await findProfileByEmail(userEmail);
                    console.log('[AuthProvider] Existing profile search result:', !!existingProfile);
                  } catch (emailSearchError) {
                    console.error('[AuthProvider] Error searching profile by email:', emailSearchError);
                  }
                }
                
                if (existingProfile) {
                  // 이메일로 기존 프로필을 찾은 경우 - OAuth 계정과 연동
                  console.log('[AuthProvider] Found existing profile, linking OAuth account...');
                  
                  try {
                    const { data: updatedProfile, error: updateError } = await supabase
                      .from('profiles')
                      .update({
                        user_id: session.user.id,
                        updated_at: new Date().toISOString(),
                      })
                      .eq('id', existingProfile.id)
                      .select()
                      .single();

                    if (updateError) {
                      throw new Error(`프로필 연동 실패: ${updateError.message}`);
                    }

                    console.log('[AuthProvider] Profile linked successfully');

                    // 프로필 데이터를 AuthStore에 로드 후 대시보드로 이동
                    console.log('[AuthProvider] Loading linked profile data...');
                    fetchProfile(session.user.id)
                      .then(() => {
                        console.log('[AuthProvider] Profile data loaded, redirecting to dashboard');
                        routerNext.replace('/dashboard');
                      })
                      .catch(profileFetchError => {
                        console.error(
                          '[AuthProvider] Failed to fetch profile after linking:',
                          profileFetchError
                        );
                        // 프로필 가져오기 실패해도 대시보드로 이동 (이미 DB에 저장됨)
                        routerNext.replace('/dashboard');
                      });
                    
                    return; // 여기서 종료
                  } catch (linkError: any) {
                    console.error('[AuthProvider] Profile linking failed:', linkError);

                    // 세션 정리
                    await signOut();
                    resetState();

                    routerNext.replace(
                      '/login?error=' +
                        encodeURIComponent('계정 연동에 실패했습니다. 다시 시도해주세요.')
                    );
                    return;
                  }
                }
                
                // 2) 기존 프로필이 없으면 설문조사 완료 여부 확인
                const fundSurveys = surveyStore.fundSurveys;
                let completedFundId: string | null = null;
                let completedProfileId: string | null = null;
                
                for (const [fundId, surveyData] of Object.entries(fundSurveys)) {
                  if (surveyData.profileId) {
                    completedFundId = fundId;
                    completedProfileId = surveyData.profileId;
                    break;
                  }
                }
                
                const isSignupFlow = !!completedProfileId;
                console.log('[AuthProvider] Profile not found, checking signup flow:', {
                  isSignupFlow,
                  completedFundId,
                  completedProfileId,
                });

                if (isSignupFlow) {
                  // 설문조사 완료된 회원가입 플로우 - 프로필 업데이트
                  console.log('[AuthProvider] Signup flow detected, updating profile...');

                  try {
                    const { data: updatedProfile, error: updateError } = await supabase
                      .from('profiles')
                      .update({
                        user_id: session.user.id,
                        updated_at: new Date().toISOString(),
                      })
                      .eq('id', completedProfileId)
                      .select()
                      .single();

                    if (updateError) {
                      throw new Error(`프로필 업데이트 실패: ${updateError.message}`);
                    }

                    console.log('[AuthProvider] Profile updated successfully');

                    // 설문조사 데이터 정리 - 완료된 펀드의 데이터만 정리
                    if (completedFundId) {
                      surveyStore.clearLocalStorage(completedFundId);
                      surveyStore.resetSurvey(completedFundId);
                    }

                    // 프로필 데이터를 AuthStore에 로드 후 대시보드로 이동
                    console.log('[AuthProvider] Loading updated profile data...');
                    fetchProfile(session.user.id)
                      .then(() => {
                        console.log('[AuthProvider] Profile data loaded, redirecting to dashboard');
                        routerNext.replace('/dashboard');
                      })
                      .catch(profileFetchError => {
                        console.error(
                          '[AuthProvider] Failed to fetch profile after signup:',
                          profileFetchError
                        );
                        // 프로필 가져오기 실패해도 대시보드로 이동 (이미 DB에 저장됨)
                        routerNext.replace('/dashboard');
                      });
                  } catch (signupError: any) {
                    console.error('[AuthProvider] Signup flow failed:', signupError);

                    // 세션 정리
                    await signOut();
                    resetState();

                    routerNext.replace(
                      '/survey?error=' +
                        encodeURIComponent('회원가입에 실패했습니다. 다시 시도해주세요.')
                    );
                  }
                } else {
                  // 설문조사 미완료 - 로그인 페이지로 에러와 함께 이동
                  console.log(
                    '[AuthProvider] No profile and no survey completed, redirecting to login with error'
                  );

                  // 세션 정리
                  await signOut();
                  resetState();

                  routerNext.replace(
                    '/login?error=' +
                      encodeURIComponent('가입되지 않은 계정입니다. 먼저 설문조사를 완료해주세요.')
                  );
                }
              } else {
                // 기타 에러
                console.error('[AuthProvider] Unexpected profile fetch error:', error);
                routerNext.replace(
                  '/login?error=' +
                    encodeURIComponent('프로필을 가져오는데 실패했습니다. 다시 로그인해주세요.')
                );
              }
            })
            .finally(() => {
              // 처리 완료
              isProcessingRef.current = false;
            });

          setLoading(false);
          return;
        }

        // 일반 로그인의 경우 기존 로직 유지
        console.log('[AuthProvider] Regular login flow');

        // 처리 시작
        lastProcessedTokenRef.current = currentToken;

        setTimeout(() => {
          fetchProfile()
            .then(() => {
              routerNext.push('/dashboard');
            })
            .catch(error => {
              console.error('[AuthProvider] 프로필 가져오기 실패:', error);
              const errorMessage =
                error.message === 'PROFILE_NOT_FOUND'
                  ? '가입되지 않은 계정입니다. 회원가입을 진행해주세요.'
                  : '프로필을 가져오는데 실패했습니다. 다시 로그인해주세요.';
              routerNext.push(`/login?error=${encodeURIComponent(errorMessage)}`);
            });
        }, 0);
      } else {
        // 기타 이벤트는 로딩만 해제
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, [
    setUser,
    fetchProfile,
    findProfileByEmail,
    setLoading,
    resetState,
    surveyStore,
    routerNext,
    signOut,
  ]);

  return <>{children}</>;
}
