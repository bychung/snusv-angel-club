'use client';

import { createClient } from '@/lib/supabase/client';
import { useAuthStore } from '@/store/authStore';
import { useSurveyStore } from '@/store/surveyStore';
import { Session } from '@supabase/supabase-js';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useRef } from 'react';

const supabase = createClient();

export default function AuthProvider({ children }: { children: React.ReactNode }) {
  const {
    setUser,
    fetchProfile,
    findProfileByEmail,
    setLoading,
    resetState,
    signOut,
    profile,
    userFunds,
    getUserFunds,
  } = useAuthStore();
  const surveyStore = useSurveyStore();
  const routerNext = useRouter();
  const pathname = usePathname();

  // 중복 SIGNED_IN 이벤트 처리 방지
  const lastProcessedTokenRef = useRef<string | null>(null);
  const isProcessingRef = useRef(false);

  // 공통 라우팅 로직 함수
  const handleAuthenticatedUserRouting = async (user: any, isInitialLoad = false) => {
    console.log('[AuthProvider] handleAuthenticatedUserRouting called:', {
      userId: user.id,
      currentPath: window.location.pathname,
      isInitialLoad,
    });

    const currentPath = window.location.pathname;

    // /redirect 페이지는 기존 OAuth 콜백 로직 사용
    if (currentPath === '/redirect') {
      return 'oauth-callback';
    }

    // /survey 페이지 접근 시 펀드 참여 여부 확인
    if (currentPath.startsWith('/survey')) {
      console.log('[AuthProvider] Survey page access detected, checking fund participation');

      try {
        // 프로필 확인
        await fetchProfile(user.id);

        // URL에서 fund_id 추출
        const urlParams = new URLSearchParams(window.location.search);
        const fundId = urlParams.get('fund_id');

        if (fundId) {
          console.log('[AuthProvider] Checking participation for fund:', fundId);

          // DB에서 펀드 참여 여부 직접 확인
          const { data: profile } = await supabase
            .from('profiles')
            .select('id')
            .eq('user_id', user.id)
            .single();

          if (profile) {
            const { data, error } = await supabase
              .from('fund_members')
              .select('id')
              .eq('profile_id', profile.id)
              .eq('fund_id', fundId)
              .single();

            if (data && !error) {
              console.log('[AuthProvider] Fund participation found, redirecting to dashboard');
              // 리다이렉트 실행 (상태 플래그 없이)
              routerNext.replace('/dashboard');

              return 'redirected-to-dashboard';
            } else {
              console.log('[AuthProvider] No fund participation found, continuing with survey');
              return 'continue-survey';
            }
          }
        }
      } catch (error) {
        console.log('[AuthProvider] Error checking fund participation:', error);
        // 에러가 있어도 설문조사는 계속 진행 가능
      }

      return 'continue-survey';
    }

    // 기타 보호된 페이지들 처리 (dashboard, admin 등)
    if (isInitialLoad) {
      try {
        await fetchProfile(user.id);
        console.log('[AuthProvider] Profile loaded successfully for:', currentPath);
        return 'profile-loaded';
      } catch (error) {
        console.log('[AuthProvider] Profile loading failed for:', currentPath, error);

        // 프로필이 없으면 로그인 페이지로 리다이렉트
        if ((error as any)?.message === 'PROFILE_NOT_FOUND') {
          console.log('[AuthProvider] No profile found, redirecting to login');
          routerNext.replace('/login?error=' + encodeURIComponent('가입되지 않은 계정입니다.'));

          return 'redirected-to-login';
        }

        return 'profile-load-error';
      }
    }

    return 'default';
  };

  const handleInitialSessionEvent = async (session: Session | null) => {
    console.log(
      '[AuthProvider] INITIAL_SESSION 이벤트 시작 - 유저 정보, 프로필 정보를 가져옵니다.',
      session
    );

    if (session?.user) {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      console.log('[AuthProvider] handleInitialSessionEvent:getUser:', user);
      if (!user) {
        console.log('[AuthProvider] handleInitialSessionEvent:getUser: user is null, ignoring...');
        return;
      }
      await fetchProfile(user.id);
      setUser(user);

      // 경로별 추가 진행
      const currentPath = window.location.pathname;
      if (currentPath.startsWith('/survey')) {
        // 이미 진행한 경우에는 대시보드로 강제 이동
        // 펀드 정보도 가져와야 함

        // URL에서 fund_id 추출
        const urlParams = new URLSearchParams(window.location.search);
        const fundId = urlParams.get('fund_id');
        console.log('[AuthProvider] fundId:', fundId);
        console.log('[AuthProvider] userFunds:', getUserFunds());

        const hasCompletedSurvey = getUserFunds().some(id => id === fundId);
        if (hasCompletedSurvey) {
          routerNext.replace('/dashboard');
          // TODO 더 좋은 방법 찾기
          setTimeout(() => {
            setLoading(false);
          }, 1000);
          return;
        }
      }
      setLoading(false);
    } else {
      // 미가입 유저 혹은 로그아웃 상태 - 별도의 과정 없이 로딩만 해제
      setLoading(false);
    }
  };

  const handleSignedInEvent = async (session: Session | null) => {
    console.log('[AuthProvider] SIGNED_IN 이벤트가 감지되어 처리 시작...');

    if (!session || !session.user || !session.access_token) {
      console.log('[AuthProvider] Session is null, ignoring...');
      return;
    }
    const user = session.user;
    const currentToken = session.access_token;

    // 중복 처리 방지 - 동일한 토큰이면 무시
    if (currentToken && lastProcessedTokenRef.current === currentToken) {
      console.log('[AuthProvider] 중복 SIGNED_IN 이벤트가 감지되어 무시합니다.');
      return;
    }
    lastProcessedTokenRef.current = currentToken;

    // 이미 처리 중이면 무시
    if (isProcessingRef.current) {
      console.log('[AuthProvider] 이미 처리 중인 SIGNED_IN 이벤트가 감지되어 무시합니다.');
      return;
    }
    isProcessingRef.current = true;

    // 어디서 SIGNED_IN 이벤트가 감지되었는지 확인
    const currentPath = window.location.pathname;

    // 본격 진행 전에 user 세팅
    setUser(user);

    // // 어느 경로든, SIGNED_IN 이벤트가 감지되면 우선 프로필부터 fetch
    // await fetchProfile(user.id);
    // console.log('[AuthProvider] Profile loaded successfully for:', currentPath);

    // redirect 페이지에서 SIGNED_IN 이벤트가 감지된 경우 OAuth 콜백 처리
    if (currentPath === '/redirect') {
      console.log('[AuthProvider] OAuth callback - handling all login flow logic');

      // fetchProfile() 호출하여 프로필 존재 확인
      console.log('[AuthProvider] Fetching profile...');
      fetchProfile(session.user.id)
        .then(() => {
          // 프로필이 있으면 원래 페이지로 돌아가거나 대시보드로 이동
          console.log('[AuthProvider] Profile found, checking redirect destination');

          // sessionStorage에서 원래 URL 확인
          const originalUrl = sessionStorage.getItem('redirectAfterAuth');
          if (originalUrl && originalUrl.startsWith('/survey')) {
            console.log('[AuthProvider] Returning to survey page:', originalUrl);
            sessionStorage.removeItem('redirectAfterAuth');
            routerNext.replace(originalUrl);
          } else {
            console.log('[AuthProvider] Redirecting to dashboard');
            routerNext.replace('/dashboard');
          }
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
                  encodeURIComponent(
                    '가입되지 않은 계정이거나 자동 가입이 불가능한 상황입니다. 관리자에게 문의해주세요.'
                  )
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
          setLoading(false); // OAuth 콜백 처리 완료 후 로딩 해제
        });

      return; // OAuth 콜백 처리 완료
    }

    // dashboard 페이지 접근 - 이쪽에 들어올 일이 현재 없음
    if (currentPath === '/dashboard') {
      console.log('[AuthProvider] /dashboard 페이지 접근 시 프로필 존재 확인');
      console.log('[AuthProvider] profile:', profile);
      console.log('[AuthProvider] user:', user);

      if (profile) {
        console.log('[AuthProvider] Profile found, continue with dashboard');
        return;
      } else if (user) {
        console.log(
          '[AuthProvider] 프로필이 없습니다. 하지만 로그인되어 있을수도 있으니 로그인 여부를 확인하겠습니다.'
        );
        // routerNext.replace('/login?error=' + encodeURIComponent('가입되지 않은 계정입니다.'));
        return;
      }

      // await fetchProfile(user.id);
      // console.log('[AuthProvider] Profile loaded successfully for:', currentPath);
      return;
    }

    // survey 페이지 접근 시 펀드 참여 여부 확인 - 이쪽에 들어올 일이 현재 없음
    if (currentPath.startsWith('/survey')) {
      console.log('[AuthProvider] /survey 페이지 접근 시 펀드 참여 여부 확인');

      try {
        // 프로필 확인
        await fetchProfile(user.id);

        // URL에서 fund_id 추출
        const urlParams = new URLSearchParams(window.location.search);
        const fundId = urlParams.get('fund_id');

        if (fundId) {
          console.log('[AuthProvider] Checking participation for fund:', fundId);

          // DB에서 펀드 참여 여부 직접 확인
          const { data: profile } = await supabase
            .from('profiles')
            .select('id')
            .eq('user_id', user.id)
            .single();

          if (profile) {
            const { data, error } = await supabase
              .from('fund_members')
              .select('id')
              .eq('profile_id', profile.id)
              .eq('fund_id', fundId)
              .single();

            if (data && !error) {
              console.log('[AuthProvider] Fund participation found, redirecting to dashboard');
              // 리다이렉트 실행 (상태 플래그 없이)
              routerNext.replace('/dashboard');

              return 'redirected-to-dashboard';
            } else {
              console.log('[AuthProvider] No fund participation found, continuing with survey');
              return 'continue-survey';
            }
          }
        }
      } catch (error) {
        console.log('[AuthProvider] Error checking fund participation:', error);
        // 에러가 있어도 설문조사는 계속 진행 가능
      }

      return 'continue-survey';
    }
  };

  const registerAuthStateChangeListener = () => {
    // 모든 사용자에게 이벤트 리스너 등록
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log('[AuthProvider] registerAuthStateChangeListener:onAuthStateChange:', {
        event,
        hasUser: !!session?.user,
      });

      if (event === 'INITIAL_SESSION') {
        // 로그인 하지 않은 경우에만 처리
        handleInitialSessionEvent(session);
      }

      if (event === 'SIGNED_IN') {
        handleSignedInEvent(session);
      }
    });
    return subscription;
  };

  useEffect(() => {
    // 초기 로딩 상태 설정 (비로그인 상태 빠른 감지를 위해 짧은 로딩)
    setLoading(true);

    // const registerEventListeners = async () => {
    //   // 로그인된 사용자를 위한 전체 인증 상태 변화 감지
    //   const {
    //     data: { subscription },
    //   } = await supabase.auth.onAuthStateChange(async (event, session) => {
    //     console.log('[AuthProvider] onAuthStateChange:', { event, hasUser: !!session?.user });

    //     if (event === 'SIGNED_OUT' || !session?.user) {
    //       // 로그아웃 또는 세션 없음
    //       // 중복 처리 방지 상태 초기화
    //       lastProcessedTokenRef.current = null;
    //       isProcessingRef.current = false;
    //       resetState();
    //       return;
    //     }

    //     setUser(session.user);

    //     if (event === 'SIGNED_IN') {
    //       console.log('[AuthProvider] SIGNED_IN event detected, starting flow...');

    //       // 중복 처리 방지 - 동일한 토큰이면 무시
    //       const currentToken = session?.access_token;
    //       if (currentToken && lastProcessedTokenRef.current === currentToken) {
    //         console.log('[AuthProvider] Duplicate SIGNED_IN event detected, ignoring...');
    //         return;
    //       }

    //       // 이미 처리 중이면 무시
    //       if (isProcessingRef.current) {
    //         console.log('[AuthProvider] Already processing SIGNED_IN event, ignoring...');
    //         return;
    //       }

    //       // 공통 라우팅 로직 실행
    //       handleAuthenticatedUserRouting(session.user, false)
    //         .then(routingResult => {
    //           console.log('[AuthProvider] SIGNED_IN routing result:', routingResult);

    //           // OAuth 콜백인 경우에만 기존 복잡한 로직 실행
    //           if (routingResult === 'oauth-callback' && window.location.pathname === '/redirect') {
    //             console.log('[AuthProvider] OAuth callback - handling all login flow logic');

    //             // 처리 시작
    //             isProcessingRef.current = true;
    //             lastProcessedTokenRef.current = currentToken;

    //             // fetchProfile() 호출하여 프로필 존재 확인
    //             console.log('[AuthProvider] Fetching profile...');
    //             fetchProfile(session.user.id)
    //               .then(() => {
    //                 // 프로필이 있으면 원래 페이지로 돌아가거나 대시보드로 이동
    //                 console.log('[AuthProvider] Profile found, checking redirect destination');

    //                 // sessionStorage에서 원래 URL 확인
    //                 const originalUrl = sessionStorage.getItem('redirectAfterAuth');
    //                 if (originalUrl && originalUrl.startsWith('/survey')) {
    //                   console.log('[AuthProvider] Returning to survey page:', originalUrl);
    //                   sessionStorage.removeItem('redirectAfterAuth');
    //                   routerNext.replace(originalUrl);
    //                 } else {
    //                   console.log('[AuthProvider] Redirecting to dashboard');
    //                   routerNext.replace('/dashboard');
    //                 }
    //               })
    //               .catch(async (error: any) => {
    //                 console.log('[AuthProvider] fetchProfile failed:', error.message);

    //                 if (error.message === 'PROFILE_NOT_FOUND') {
    //                   // 프로필이 없음 - 이메일로 기존 프로필 검색 후 설문조사 완료 여부 확인

    //                   // 1) 먼저 OAuth 로그인 사용자의 이메일로 기존 프로필 검색
    //                   const userEmail = session.user.email;
    //                   console.log(
    //                     '[AuthProvider] Searching for existing profile with email:',
    //                     userEmail
    //                   );

    //                   let existingProfile = null;
    //                   if (userEmail) {
    //                     try {
    //                       existingProfile = await findProfileByEmail(userEmail);
    //                       console.log(
    //                         '[AuthProvider] Existing profile search result:',
    //                         !!existingProfile
    //                       );
    //                     } catch (emailSearchError) {
    //                       console.error(
    //                         '[AuthProvider] Error searching profile by email:',
    //                         emailSearchError
    //                       );
    //                     }
    //                   }

    //                   if (existingProfile) {
    //                     // 이메일로 기존 프로필을 찾은 경우 - OAuth 계정과 연동
    //                     console.log(
    //                       '[AuthProvider] Found existing profile, linking OAuth account...'
    //                     );

    //                     try {
    //                       const { data: updatedProfile, error: updateError } = await supabase
    //                         .from('profiles')
    //                         .update({
    //                           user_id: session.user.id,
    //                           updated_at: new Date().toISOString(),
    //                         })
    //                         .eq('id', existingProfile.id)
    //                         .select()
    //                         .single();

    //                       if (updateError) {
    //                         throw new Error(`프로필 연동 실패: ${updateError.message}`);
    //                       }

    //                       console.log('[AuthProvider] Profile linked successfully');

    //                       // 프로필 데이터를 AuthStore에 로드 후 대시보드로 이동
    //                       console.log('[AuthProvider] Loading linked profile data...');
    //                       fetchProfile(session.user.id)
    //                         .then(() => {
    //                           console.log(
    //                             '[AuthProvider] Profile data loaded, redirecting to dashboard'
    //                           );
    //                           routerNext.replace('/dashboard');
    //                         })
    //                         .catch(profileFetchError => {
    //                           console.error(
    //                             '[AuthProvider] Failed to fetch profile after linking:',
    //                             profileFetchError
    //                           );
    //                           // 프로필 가져오기 실패해도 대시보드로 이동 (이미 DB에 저장됨)
    //                           routerNext.replace('/dashboard');
    //                         });

    //                       return; // 여기서 종료
    //                     } catch (linkError: any) {
    //                       console.error('[AuthProvider] Profile linking failed:', linkError);

    //                       // 세션 정리
    //                       await signOut();
    //                       resetState();

    //                       routerNext.replace(
    //                         '/login?error=' +
    //                           encodeURIComponent('계정 연동에 실패했습니다. 다시 시도해주세요.')
    //                       );
    //                       return;
    //                     }
    //                   }

    //                   // 2) 기존 프로필이 없으면 설문조사 완료 여부 확인
    //                   const fundSurveys = surveyStore.fundSurveys;
    //                   let completedFundId: string | null = null;
    //                   let completedProfileId: string | null = null;

    //                   for (const [fundId, surveyData] of Object.entries(fundSurveys)) {
    //                     if (surveyData.profileId) {
    //                       completedFundId = fundId;
    //                       completedProfileId = surveyData.profileId;
    //                       break;
    //                     }
    //                   }

    //                   const isSignupFlow = !!completedProfileId;
    //                   console.log('[AuthProvider] Profile not found, checking signup flow:', {
    //                     isSignupFlow,
    //                     completedFundId,
    //                     completedProfileId,
    //                   });

    //                   if (isSignupFlow) {
    //                     // 설문조사 완료된 회원가입 플로우 - 프로필 업데이트
    //                     console.log('[AuthProvider] Signup flow detected, updating profile...');

    //                     try {
    //                       const { data: updatedProfile, error: updateError } = await supabase
    //                         .from('profiles')
    //                         .update({
    //                           user_id: session.user.id,
    //                           updated_at: new Date().toISOString(),
    //                         })
    //                         .eq('id', completedProfileId)
    //                         .select()
    //                         .single();

    //                       if (updateError) {
    //                         throw new Error(`프로필 업데이트 실패: ${updateError.message}`);
    //                       }

    //                       console.log('[AuthProvider] Profile updated successfully');

    //                       // 설문조사 데이터 정리 - 완료된 펀드의 데이터만 정리
    //                       if (completedFundId) {
    //                         surveyStore.clearLocalStorage(completedFundId);
    //                         surveyStore.resetSurvey(completedFundId);
    //                       }

    //                       // 프로필 데이터를 AuthStore에 로드 후 대시보드로 이동
    //                       console.log('[AuthProvider] Loading updated profile data...');
    //                       fetchProfile(session.user.id)
    //                         .then(() => {
    //                           console.log(
    //                             '[AuthProvider] Profile data loaded, redirecting to dashboard'
    //                           );
    //                           routerNext.replace('/dashboard');
    //                         })
    //                         .catch(profileFetchError => {
    //                           console.error(
    //                             '[AuthProvider] Failed to fetch profile after signup:',
    //                             profileFetchError
    //                           );
    //                           // 프로필 가져오기 실패해도 대시보드로 이동 (이미 DB에 저장됨)
    //                           routerNext.replace('/dashboard');
    //                         });
    //                     } catch (signupError: any) {
    //                       console.error('[AuthProvider] Signup flow failed:', signupError);

    //                       // 세션 정리
    //                       await signOut();
    //                       resetState();

    //                       routerNext.replace(
    //                         '/survey?error=' +
    //                           encodeURIComponent('회원가입에 실패했습니다. 다시 시도해주세요.')
    //                       );
    //                     }
    //                   } else {
    //                     // 설문조사 미완료 - 로그인 페이지로 에러와 함께 이동
    //                     console.log(
    //                       '[AuthProvider] No profile and no survey completed, redirecting to login with error'
    //                     );

    //                     // 세션 정리
    //                     await signOut();
    //                     resetState();

    //                     routerNext.replace(
    //                       '/login?error=' +
    //                         encodeURIComponent(
    //                           '가입되지 않은 계정이거나 자동 가입이 불가능한 상황입니다. 관리자에게 문의해주세요.'
    //                         )
    //                     );
    //                   }
    //                 } else {
    //                   // 기타 에러
    //                   console.error('[AuthProvider] Unexpected profile fetch error:', error);
    //                   routerNext.replace(
    //                     '/login?error=' +
    //                       encodeURIComponent(
    //                         '프로필을 가져오는데 실패했습니다. 다시 로그인해주세요.'
    //                       )
    //                   );
    //                 }
    //               })
    //               .finally(() => {
    //                 // 처리 완료
    //                 isProcessingRef.current = false;
    //                 setLoading(false); // OAuth 콜백 처리 완료 후 로딩 해제
    //               });

    //             return; // OAuth 콜백 처리 완료
    //           }

    //           // 기타 경우 처리
    //           if (routingResult === 'default') {
    //             // 일반 로그인의 경우 대시보드로 이동
    //             console.log('[AuthProvider] General login detected, redirecting to dashboard');
    //             routerNext.push('/dashboard');
    //           } else {
    //             console.log('[AuthProvider] Routing completed for:', routingResult);
    //           }
    //         })
    //         .catch(error => {
    //           console.error('[AuthProvider] Error in SIGNED_IN routing:', error);
    //         })
    //         .finally(() => {
    //           // 모든 처리 완료
    //           lastProcessedTokenRef.current = currentToken;
    //           setLoading(false);
    //         });

    //       return; // SIGNED_IN 이벤트 처리 완료
    //     } else {
    //       // 기타 이벤트 - 로딩 상태는 getUser()에서 관리됨
    //       console.log('[AuthProvider] Other auth event, loading state managed by getUser()');
    //     }
    //   });
    //   return subscription;
    // };

    // const init = async () => {
    //   const {
    //     data: { user },
    //     error,
    //   } = await supabase.auth.getUser();
    //   console.log('[AuthProvider] getUser result:', { hasUser: !!user, error: error?.message });

    //   if (error || !user) {
    //     // 비로그인 상태 - 이벤트 리스너 없이 즉시 완료
    //     console.log('[AuthProvider] Anonymous user - no auth listener needed');
    //     resetState();
    //     setLoading(false);

    //     // 비로그인 사용자에게는 이벤트 리스너를 등록하지 않음
    //     // OAuth 로그인은 버튼 클릭 시 별도 핸들러에서 처리
    //     console.log('[AuthProvider] Anonymous user setup completed');
    //     return;
    //   }

    //   // 로그인된 사용자 - 전체 인증 로직 및 이벤트 리스너 설정
    //   console.log('[AuthProvider] Authenticated user - setting up full auth handling');
    //   setUser(user);

    //   handleAuthenticatedUserRouting(user, true)
    //     .then(routingResult => {
    //       console.log('[AuthProvider] Initial routing completed:', routingResult);

    //       // 모든 경우에서 로딩 해제 (리디렉션도 포함)
    //       setLoading(false);
    //     })
    //     .catch(error => {
    //       console.error('[AuthProvider] Error in initial routing:', error);
    //       setLoading(false);
    //     });
    // };

    // const authSubscription = registerEventListeners();
    // console.log('[AuthProvider] authSubscription:', authSubscription);
    // init();
    const authSubscription = registerAuthStateChangeListener();

    return () => {
      if (authSubscription) {
        console.log('[AuthProvider] Cleaning up auth subscription');
        authSubscription.unsubscribe();
      }
    };
  }, []); // 빈 의존성 배열 - 마운트 시에만 실행

  return <>{children}</>;
}
