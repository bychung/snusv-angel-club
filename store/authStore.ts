import { createBrandClient } from '@/lib/supabase/client';
import type { AccessibleProfile, Database, Profile } from '@/types/database';
import type { User } from '@supabase/supabase-js';
import { create } from 'zustand';

// 프로바이더 로그아웃 헬퍼 (브라우저 전용 동작)
function openHiddenIframe(url: string) {
  if (typeof window === 'undefined') return;
  try {
    const iframe = document.createElement('iframe');
    iframe.style.display = 'none';
    iframe.width = '0';
    iframe.height = '0';
    iframe.src = url;
    document.body.appendChild(iframe);
    setTimeout(() => {
      try {
        document.body.removeChild(iframe);
      } catch {}
    }, 2000);
  } catch {}
}

async function triggerProviderLogout(
  provider: 'google' | 'kakao' | null | undefined,
  brandClient: any
) {
  if (typeof window === 'undefined') return;
  if (!provider) return;

  const origin = window.location.origin;

  if (provider === 'google') {
    try {
      // 현재 세션에서 Google 토큰 가져오기
      const {
        data: { session },
      } = await brandClient.raw.auth.getSession();
      const providerToken = session?.provider_token;

      if (providerToken) {
        // Google OAuth 토큰 revoke (앱별 로그아웃)
        await fetch(
          `https://oauth2.googleapis.com/revoke?token=${providerToken}`,
          {
            method: 'POST',
          }
        );
        console.log('[authStore] Google app token revoked successfully');
      } else {
        console.warn('[authStore] No Google provider token found');
      }
    } catch (error) {
      console.error('[authStore] Failed to revoke Google token:', error);
      // 토큰 revoke 실패해도 Supabase 로그아웃은 이미 완료되었으므로 계속 진행
    }
    return;
  }

  if (provider === 'kakao') {
    const clientId = process.env.NEXT_PUBLIC_KAKAO_REST_API_KEY;
    const redirectUri =
      process.env.NEXT_PUBLIC_KAKAO_LOGOUT_REDIRECT_URI || `${origin}/login`;
    if (!clientId) return;
    const url = `https://kauth.kakao.com/oauth/logout?client_id=${encodeURIComponent(
      clientId
    )}&logout_redirect_uri=${encodeURIComponent(redirectUri)}`;
    openHiddenIframe(url);
  }
}

interface AuthStore {
  // 상태
  user: User | null;
  profile: Profile | null;
  userFunds: string[]; // 사용자가 참여한 펀드 ID 목록
  isLoading: boolean;
  isProfileLoading: boolean;
  error: string | null;

  // 멀티 계정 관련 상태
  accessibleProfiles: AccessibleProfile[];
  selectedProfileId: string | null;

  // 관리자 상태
  isAdminUser: boolean;

  // 액션
  signIn: (email: string, password: string) => Promise<void>;
  signInWithOAuth: (provider: 'google' | 'kakao') => Promise<void>;
  signUp: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  updateProfile: (
    data: Database['public']['Tables']['profiles']['Update']
  ) => Promise<void>;
  fetchProfile: (userId?: string) => Promise<void>;
  findProfileByEmail: (email: string) => Promise<Profile | null>;
  setUser: (user: User | null) => void;
  setError: (error: string | null) => void;
  clearError: () => void;
  resetState: () => void;
  setLoading: (loading: boolean) => void;
  getUserFunds: () => string[];

  // 멀티 계정 관련 액션
  fetchAccessibleProfiles: (userId?: string) => Promise<void>;
  selectProfile: (profileId: string) => void;
  addProfileAccess: (
    profileId: string,
    email: string,
    permission: 'admin' | 'view'
  ) => Promise<void>;
  removeProfileAccess: (profileId: string, userId: string) => Promise<void>;
  updateProfileAccess: (
    profileId: string,
    userId: string,
    permissionType: 'admin' | 'view'
  ) => Promise<void>;
  getProfilePermission: (
    profileId: string
  ) => 'owner' | 'admin' | 'view' | null;
}

export const useAuthStore = create<AuthStore>((set, get) => ({
  user: null,
  profile: null,
  userFunds: [],
  isLoading: false,
  isProfileLoading: false,
  error: null,

  // 멀티 계정 관련 초기 상태
  accessibleProfiles: [],
  selectedProfileId: null,

  // 관리자 상태 초기값
  isAdminUser: false,

  signIn: async (email: string, password: string) => {
    set({ isLoading: true, error: null });

    try {
      const brandClient = createBrandClient();
      const { data, error } = await brandClient.raw.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        throw error;
      }

      const user = data.user;
      if (!user) {
        throw new Error('사용자 정보를 가져올 수 없습니다.');
      }

      set({ user });

      // 프로필 정보 가져오기
      try {
        await get().fetchProfile();
        console.log('[authStore] 이메일 로그인 및 프로필 로드 완료');
      } catch (profileError: any) {
        if (profileError?.message === 'PROFILE_NOT_FOUND') {
          // 프로필이 없는 경우 - 이메일로 기존 프로필 찾아서 연결 시도
          try {
            const existingProfile = await get().findProfileByEmail(email);
            if (existingProfile && !existingProfile.user_id) {
              // 기존 프로필에 user_id 연결 (브랜드별)
              const { error: updateError } = await brandClient.profiles
                .update({
                  user_id: user.id,
                  updated_at: new Date().toISOString(),
                })
                .eq('email', email);

              if (updateError) {
                throw new Error('프로필 연결에 실패했습니다.');
              }

              // 프로필 정보 다시 가져오기
              await get().fetchProfile();
              console.log('[authStore] 기존 프로필과 계정 연결 완료');
            } else {
              // 기존 프로필을 찾지 못한 경우 - LoginForm에서 임시 토큰 발행하도록 특별한 에러 타입 던지기
              throw new Error('PROFILE_NOT_FOUND_FOR_EMAIL_LOGIN');
            }
          } catch (linkError) {
            console.error('[authStore] 프로필 연결 실패:', linkError);

            // 프로필 연결 실패 시에도 PROFILE_NOT_FOUND_FOR_EMAIL_LOGIN 에러로 통일
            if (
              linkError instanceof Error &&
              linkError.message === 'PROFILE_NOT_FOUND_FOR_EMAIL_LOGIN'
            ) {
              throw linkError; // 그대로 다시 throw
            } else {
              throw new Error('PROFILE_NOT_FOUND_FOR_EMAIL_LOGIN');
            }
          }
        } else {
          throw profileError;
        }
      }
    } catch (error) {
      set({
        error:
          error instanceof Error ? error.message : '로그인에 실패했습니다.',
        user: null,
        profile: null,
      });
      throw error;
    } finally {
      set({ isLoading: false });
    }
  },

  signInWithOAuth: async (provider: 'google' | 'kakao') => {
    set({ isLoading: true, error: null });

    try {
      // 설문조사 페이지에서 OAuth 로그인하는 경우 원래 URL 저장
      if (
        typeof window !== 'undefined' &&
        window.location.pathname.startsWith('/survey')
      ) {
        const currentUrl = window.location.pathname + window.location.search;
        sessionStorage.setItem('redirectAfterAuth', currentUrl);
        console.log('[authStore] Saved redirect URL for survey:', currentUrl);
      }

      const brandClient = createBrandClient();
      const { error } = await brandClient.raw.auth.signInWithOAuth({
        provider,
        options: {
          redirectTo: `${window.location.origin}/redirect`,
        },
      });

      if (error) {
        throw error;
      }
    } catch (error) {
      set({
        error:
          error instanceof Error
            ? error.message
            : 'OAuth 로그인에 실패했습니다.',
      });
      throw error;
    } finally {
      set({ isLoading: false });
    }
  },

  signUp: async (email: string, password: string) => {
    set({ isLoading: true, error: null });

    try {
      const brandClient = createBrandClient();

      // 1. Supabase Auth 회원가입
      const { data, error } = await brandClient.raw.auth.signUp({
        email,
        password,
      });

      if (error) {
        throw error;
      }

      const user = data.user;
      if (!user) {
        throw new Error('사용자 정보를 가져올 수 없습니다.');
      }

      set({ user });

      // 2. 기존 프로필이 있는지 확인하고 user_id 연결
      try {
        const existingProfile = await get().findProfileByEmail(email);

        if (existingProfile && !existingProfile.user_id) {
          // 기존 프로필에 user_id 연결 (브랜드별)
          const { error: updateError } = await brandClient.profiles
            .update({
              user_id: user.id,
              updated_at: new Date().toISOString(),
            })
            .eq('email', email);

          if (updateError) {
            console.error('프로필 연결 실패:', updateError);
            throw new Error('프로필 연결에 실패했습니다.');
          }

          // 프로필 정보 다시 가져오기
          await get().fetchProfile();

          console.log('[authStore] 기존 프로필과 계정 연결 완료');
        } else if (!existingProfile) {
          // 기존 프로필이 없는 경우 - find-email 페이지로 리디렉션하도록 에러 발생
          throw new Error('PROFILE_NOT_FOUND_FOR_EMAIL');
        } else if (existingProfile.user_id) {
          // 이미 다른 계정과 연결된 프로필인 경우
          throw new Error('이미 다른 계정과 연결된 이메일입니다.');
        }
      } catch (profileError) {
        console.warn('[authStore] 프로필 연결 중 오류:', profileError);

        // 특정 에러는 다시 throw하여 상위에서 처리하도록 함
        if (
          profileError instanceof Error &&
          (profileError.message === 'PROFILE_NOT_FOUND_FOR_EMAIL' ||
            profileError.message.includes('이미 다른 계정과 연결된'))
        ) {
          throw profileError;
        }

        // 기타 에러는 무시하고 진행
        console.warn('[authStore] 기타 프로필 연결 오류 (무시):', profileError);
      }

      console.log('[authStore] 회원가입 완료');
    } catch (error) {
      set({
        error:
          error instanceof Error ? error.message : '회원가입에 실패했습니다.',
      });
      throw error;
    } finally {
      set({ isLoading: false });
    }
  },

  signOut: async () => {
    set({ isLoading: true, error: null });

    try {
      const brandClient = createBrandClient();
      const currentUser = get().user as any;
      const provider: 'google' | 'kakao' | null =
        currentUser?.app_metadata?.provider ||
        currentUser?.identities?.[0]?.provider ||
        null;

      // 프로바이더 로그아웃을 먼저 시도 (토큰이 유효할 때)
      // await triggerProviderLogout(provider, brandClient);

      const { error } = await brandClient.raw.auth.signOut({ scope: 'global' });

      if (error) {
        throw error;
      }

      set({ user: null, profile: null });
    } catch (error) {
      set({
        error:
          error instanceof Error ? error.message : '로그아웃에 실패했습니다.',
      });
      throw error;
    } finally {
      set({ isLoading: false });
    }
  },

  updateProfile: async (
    data: Database['public']['Tables']['profiles']['Update']
  ) => {
    const { user } = get();
    if (!user) {
      throw new Error('로그인이 필요합니다.');
    }

    set({ isLoading: true, error: null });

    try {
      const brandClient = createBrandClient();
      const { data: updatedProfile, error } = await brandClient.profiles
        // @ts-ignore - Supabase 타입 시스템 이슈로 인한 임시 해결책
        .update({
          ...data,
          updated_at: new Date().toISOString(),
        })
        .eq('user_id', user.id)
        .select()
        .single();

      if (error) {
        throw error;
      }

      set({ profile: updatedProfile as Profile });
    } catch (error) {
      set({
        error:
          error instanceof Error
            ? error.message
            : '프로필 업데이트에 실패했습니다.',
      });
      throw error;
    } finally {
      set({ isLoading: false });
    }
  },

  fetchProfile: async (userId?: string) => {
    const { user } = get();
    const targetUserId = userId || user?.id;

    console.log('[authStore] fetchProfile called:', {
      hasUser: !!user,
      userId: user?.id,
      targetUserId,
      usingProvidedUserId: !!userId,
    });

    if (!targetUserId) {
      set({ profile: null, isProfileLoading: false });
      return;
    }

    console.log('[authStore] Setting isProfileLoading: true');
    set({ isProfileLoading: true, error: null });

    try {
      console.log('[authStore] About to create supabase client...');
      const brandClient = createBrandClient();
      console.log('[authStore] Supabase client created successfully');

      console.log('[authStore] About to execute database query...');
      console.log('[authStore] Query details:', {
        table: 'profiles',
        userId: targetUserId,
        supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL,
        hasAnonKey: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      });

      // (임시 제거) REST 프로브 호출은 동시성 잠금을 피하기 위해 비활성화

      // 2) 새로운 프로필 조회 API 호출 (profile_permissions 지원)
      const queryAbortController = new AbortController();
      const queryTimeoutId = setTimeout(() => {
        console.warn('[authStore] Query timeout reached, aborting request');
        queryAbortController.abort();
      }, 15000);

      let profile = null;
      let error = null;

      try {
        const response = await fetch('/api/profiles/me', {
          signal: queryAbortController.signal,
          headers: {
            'Content-Type': 'application/json',
          },
        });

        if (response.ok) {
          const data = await response.json();
          profile = data.profile;

          // 공유받은 프로필인지 로그
          if (data.isSharedProfile) {
            console.log(
              `[authStore] 공유받은 프로필 사용: ${profile?.id} (${data.accessType})`
            );
          }
        } else {
          const errorData = await response.json();
          error = {
            code: 'API_ERROR',
            message: errorData.error || '프로필 조회 실패',
          };
        }
      } catch (fetchError: any) {
        if (fetchError.name === 'AbortError') {
          error = { code: 'TIMEOUT', message: 'Request timeout' };
        } else {
          error = {
            code: 'FETCH_ERROR',
            message: fetchError.message || '네트워크 오류',
          };
        }
      }

      clearTimeout(queryTimeoutId);

      console.log('[authStore] Database query returned (after await)...');

      console.log('[authStore] Database query completed:', {
        hasProfile: !!profile,
        errorCode: error?.code,
      });

      if (error) {
        // API 에러 또는 프로필 없음
        if (
          error.code === 'API_ERROR' ||
          error.code === 'TIMEOUT' ||
          error.code === 'FETCH_ERROR'
        ) {
          console.log('[authStore] Profile API call failed, checking error...');

          // API 에러의 경우 공유받은 프로필이 있는지는 API에서 이미 확인했으므로
          // 여기서는 단순히 오류 처리
          console.log('[authStore] No profile available for this user');
          set({
            error: '접근 가능한 프로필이 없습니다. 계정 권한을 확인해주세요.',
            profile: null,
            userFunds: [],
            isAdminUser: false,
          });

          throw new Error('PROFILE_NOT_FOUND');
        }
        throw error;
      }

      console.log('[authStore] Profile found successfully');

      if (!profile) {
        console.log('[authStore] Profile is null, setting empty state');
        set({
          profile: null,
          userFunds: [],
          isAdminUser: false,
          isProfileLoading: false,
        });
        return;
      }

      // 프로필과 함께 사용자의 펀드 참여 정보도 조회
      console.log('[authStore] Fetching user funds for profile:', profile.id);
      try {
        const { data: fundMembers, error: fundError } =
          await brandClient.fundMembers
            .select('fund_id')
            .eq('profile_id', profile.id);

        let userFunds: string[] = [];
        if (!fundError && fundMembers) {
          userFunds = fundMembers.map((member: any) => member.fund_id);
          console.log('[authStore] User funds loaded successfully:', userFunds);
        } else if (fundError) {
          console.warn('[authStore] Failed to load user funds:', fundError);
          // 에러가 있어도 빈 배열로 설정하여 survey에서 fallback DB 체크가 가능하도록 함
        }

        // 관리자 권한 체크
        const isAdminUser = profile.role === 'ADMIN';

        set({
          profile: profile as Profile,
          userFunds: userFunds,
          isAdminUser: isAdminUser,
        });

        console.log('[authStore] Profile and userFunds set successfully');

        // 접근 가능한 프로필 목록도 함께 로드
        await get().fetchAccessibleProfiles(userId);
      } catch (fundFetchError) {
        console.warn('[authStore] Error fetching user funds:', fundFetchError);
        // 관리자 권한 체크
        const isAdminUser = profile.role === 'ADMIN';

        // 펀드 정보 로딩에 실패해도 프로필은 설정
        set({
          profile: profile as Profile,
          userFunds: [],
          isAdminUser: isAdminUser,
        });
        console.log(
          '[authStore] Profile set with empty userFunds due to fetch error'
        );

        // 접근 가능한 프로필 목록도 함께 로드
        await get().fetchAccessibleProfiles();
      }
    } catch (error) {
      console.log('[authStore] fetchProfile error:', error);
      set({
        error:
          error instanceof Error
            ? error.message
            : '프로필을 불러오는데 실패했습니다.',
        profile: null,
        userFunds: [],
      });
      throw error; // 에러를 다시 던져서 호출하는 곳에서 처리하게 함
    } finally {
      console.log('[authStore] fetchProfile finally: setting isLoading: false');
      set({ isProfileLoading: false });
    }
  },

  setUser: (user: User | null) => {
    set({ user });
  },

  setError: (error: string | null) => {
    set({ error });
  },

  clearError: () => {
    set({ error: null });
  },

  resetState: () => {
    console.log('[authStore] resetState called - clearing all auth state');
    // 완전한 상태 초기화 (모든 필드를 명시적으로 설정)
    set({
      user: null,
      profile: null,
      userFunds: [],
      isLoading: false,
      isProfileLoading: false,
      error: null,
      accessibleProfiles: [],
      selectedProfileId: null,
      isAdminUser: false,
    });
  },

  findProfileByEmail: async (email: string) => {
    console.log('[authStore] findProfileByEmail called:', { email });

    try {
      const brandClient = createBrandClient();

      const { data: profile, error } = await brandClient.profiles
        .select('*')
        .eq('email', email)
        .single();

      console.log('[authStore] findProfileByEmail result:', {
        hasProfile: !!profile,
        errorCode: error?.code,
      });

      if (error) {
        if ((error as any).code === 'PGRST116') {
          // 프로필이 없음 (정상적인 경우)
          return null;
        }
        throw error;
      }

      return profile as Profile;
    } catch (error) {
      console.error('[authStore] findProfileByEmail error:', error);
      throw error;
    }
  },

  setLoading: (loading: boolean) => {
    set({ isLoading: loading });
  },

  getUserFunds: () => {
    return get().userFunds;
  },

  // 멀티 계정 관련 함수들
  fetchAccessibleProfiles: async (userId?: string) => {
    const { user } = get();
    if (!user && !userId) {
      console.log('[authStore] fetchAccessibleProfiles: user not found');
      set({ accessibleProfiles: [], selectedProfileId: null });
      return;
    }

    const targetUserId = userId || user?.id;

    try {
      const brandClient = createBrandClient();

      // 1. 내가 소유한 프로필들 (브랜드별)
      const { data: ownedProfiles, error: ownedError } =
        await brandClient.profiles.select('*').eq('user_id', targetUserId);

      if (ownedError) throw ownedError;

      // 2. 나에게 공유된 프로필들 (브랜드별)
      const { data: sharedAccess, error: sharedError } =
        await brandClient.profilePermissions
          .select(
            `
          permission_type,
          profiles!profile_permissions_profile_id_fkey(*),
          granted_by_profile:profiles!profile_permissions_granted_by_fkey(name)
        `
          )
          .eq('user_id', targetUserId);

      if (sharedError) throw sharedError;

      // 접근 가능한 프로필 목록 구성
      const accessibleProfiles: AccessibleProfile[] = [
        // 내가 소유한 프로필들
        ...(ownedProfiles || []).map((profile: any) => ({
          profile,
          permission: 'owner' as const,
        })),
        // 나에게 공유된 프로필들
        ...(sharedAccess || []).map((access: any) => ({
          profile: (access as any).profiles,
          permission: (access as any).permission_type as 'admin' | 'view',
          grantedBy: (access as any).granted_by_profile?.name,
        })),
      ];

      // 현재 선택된 프로필이 없거나 접근 불가한 경우, 첫 번째 프로필을 선택
      const currentSelectedId = get().selectedProfileId;
      let newSelectedId = currentSelectedId;

      if (
        !currentSelectedId ||
        !accessibleProfiles.find(ap => ap.profile.id === currentSelectedId)
      ) {
        newSelectedId =
          accessibleProfiles.length > 0
            ? accessibleProfiles[0].profile.id
            : null;
      }

      set({
        accessibleProfiles,
        selectedProfileId: newSelectedId,
        profile: newSelectedId
          ? accessibleProfiles.find(ap => ap.profile.id === newSelectedId)
              ?.profile || null
          : null,
      });

      console.log(
        '[authStore] 접근 가능한 프로필 로드 완료:',
        accessibleProfiles.length
      );
    } catch (error) {
      console.error('[authStore] fetchAccessibleProfiles error:', error);
      set({
        error:
          error instanceof Error
            ? error.message
            : '프로필 목록을 불러오는데 실패했습니다.',
        accessibleProfiles: [],
        selectedProfileId: null,
      });
    }
  },

  selectProfile: (profileId: string) => {
    const { accessibleProfiles } = get();
    const selectedProfile = accessibleProfiles.find(
      ap => ap.profile.id === profileId
    );

    if (selectedProfile) {
      set({
        selectedProfileId: profileId,
        profile: selectedProfile.profile,
      });
      console.log('[authStore] 프로필 선택됨:', selectedProfile.profile.name);
    } else {
      console.warn('[authStore] 존재하지 않는 프로필 선택 시도:', profileId);
    }
  },

  addProfileAccess: async (
    profileId: string,
    email: string,
    permission: 'admin' | 'view'
  ) => {
    const { user } = get();
    if (!user) throw new Error('로그인이 필요합니다.');

    try {
      const brandClient = createBrandClient();

      // 1. 이메일로 사용자 검색
      const targetProfile = await get().findProfileByEmail(email);
      if (!targetProfile) {
        throw new Error('해당 이메일의 사용자를 찾을 수 없습니다.');
      }

      if (!targetProfile.user_id) {
        throw new Error('해당 사용자는 아직 계정을 생성하지 않았습니다.');
      }

      // 2. 내가 해당 프로필의 owner인지 확인
      const { data: ownerProfile, error: ownerError } =
        await brandClient.profiles
          .select('*')
          .eq('id', profileId)
          .eq('user_id', user.id)
          .single();

      if (ownerError || !ownerProfile) {
        throw new Error(
          '권한이 없습니다. 프로필 소유자만 접근 권한을 부여할 수 있습니다.'
        );
      }

      // 3. 권한 부여 (브랜드별)
      const { error: insertError } =
        await brandClient.profilePermissions.insert({
          profile_id: profileId,
          user_id: targetProfile.user_id,
          permission_type: permission,
          granted_by: profileId,
        });

      if (insertError) {
        if (insertError.code === '23505') {
          throw new Error('이미 해당 사용자에게 권한이 부여되어 있습니다.');
        }
        throw insertError;
      }

      console.log('[authStore] 프로필 접근 권한 부여 완료:', {
        email,
        permission,
      });
    } catch (error) {
      console.error('[authStore] addProfileAccess error:', error);
      throw error;
    }
  },

  removeProfileAccess: async (profileId: string, userId: string) => {
    const { user } = get();
    if (!user) throw new Error('로그인이 필요합니다.');

    try {
      const brandClient = createBrandClient();

      // 1. 내가 해당 프로필의 owner인지 확인
      const { data: ownerProfile, error: ownerError } =
        await brandClient.profiles
          .select('*')
          .eq('id', profileId)
          .eq('user_id', user.id)
          .single();

      if (ownerError || !ownerProfile) {
        throw new Error(
          '권한이 없습니다. 프로필 소유자만 접근 권한을 회수할 수 있습니다.'
        );
      }

      // 2. 권한 삭제 (브랜드별)
      const { error: deleteError } = await brandClient.profilePermissions
        .delete()
        .eq('profile_id', profileId)
        .eq('user_id', userId);

      if (deleteError) {
        throw deleteError;
      }

      console.log('[authStore] 프로필 접근 권한 회수 완료:', {
        profileId,
        userId,
      });
    } catch (error) {
      console.error('[authStore] removeProfileAccess error:', error);
      throw error;
    }
  },

  updateProfileAccess: async (
    profileId: string,
    userId: string,
    permissionType: 'admin' | 'view'
  ) => {
    try {
      console.log('[authStore] updateProfileAccess called:', {
        profileId,
        userId,
        permissionType,
      });

      const response = await fetch(`/api/profiles/${profileId}/permissions`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId,
          permissionType,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || '권한 업데이트에 실패했습니다.');
      }

      console.log('[authStore] updateProfileAccess successful:', result);

      // 접근 가능한 프로필 목록 새로고침
      await get().fetchAccessibleProfiles();
    } catch (error) {
      console.error('[authStore] updateProfileAccess error:', error);
      throw error;
    }
  },

  getProfilePermission: (profileId: string) => {
    const { user, accessibleProfiles } = get();
    console.log('[authStore] user:', user);
    if (!user) return null;

    const accessibleProfile = accessibleProfiles.find(
      ap => ap.profile.id === profileId
    );
    console.log(
      '[authStore] getProfilePermission:',
      accessibleProfile?.permission
    );
    return accessibleProfile?.permission || null;
  },
}));
