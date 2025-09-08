import { createClient } from '@/lib/supabase/client';
import type { Database, Profile } from '@/types/database';
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
  supabaseClient: any
) {
  if (typeof window === 'undefined') return;
  if (!provider) return;

  const origin = window.location.origin;

  if (provider === 'google') {
    try {
      // 현재 세션에서 Google 토큰 가져오기
      const {
        data: { session },
      } = await supabaseClient.auth.getSession();
      const providerToken = session?.provider_token;

      if (providerToken) {
        // Google OAuth 토큰 revoke (앱별 로그아웃)
        await fetch(`https://oauth2.googleapis.com/revoke?token=${providerToken}`, {
          method: 'POST',
        });
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
    const redirectUri = process.env.NEXT_PUBLIC_KAKAO_LOGOUT_REDIRECT_URI || `${origin}/login`;
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

  // 액션
  signIn: (email: string, password: string) => Promise<void>;
  signInWithOAuth: (provider: 'google' | 'kakao') => Promise<void>;
  signUp: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  updateProfile: (data: Database['public']['Tables']['profiles']['Update']) => Promise<void>;
  fetchProfile: (userId?: string) => Promise<void>;
  findProfileByEmail: (email: string) => Promise<Profile | null>;
  setUser: (user: User | null) => void;
  setError: (error: string | null) => void;
  clearError: () => void;
  resetState: () => void;
  setLoading: (loading: boolean) => void;
  getUserFunds: () => string[];
}

export const useAuthStore = create<AuthStore>((set, get) => ({
  user: null,
  profile: null,
  userFunds: [],
  isLoading: false,
  isProfileLoading: false,
  error: null,

  signIn: async (email: string, password: string) => {
    set({ isLoading: true, error: null });

    try {
      const supabase = createClient();
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        throw error;
      }

      set({ user: data.user });

      // 프로필 정보 가져오기
      if (data.user) {
        await get().fetchProfile();
      }
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : '로그인에 실패했습니다.',
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
      if (typeof window !== 'undefined' && window.location.pathname.startsWith('/survey')) {
        const currentUrl = window.location.pathname + window.location.search;
        sessionStorage.setItem('redirectAfterAuth', currentUrl);
        console.log('[authStore] Saved redirect URL for survey:', currentUrl);
      }

      const supabase = createClient();
      const { error } = await supabase.auth.signInWithOAuth({
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
        error: error instanceof Error ? error.message : 'OAuth 로그인에 실패했습니다.',
      });
      throw error;
    } finally {
      set({ isLoading: false });
    }
  },

  signUp: async (email: string, password: string) => {
    set({ isLoading: true, error: null });

    try {
      const supabase = createClient();
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
      });

      if (error) {
        throw error;
      }

      set({ user: data.user });
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : '회원가입에 실패했습니다.',
      });
      throw error;
    } finally {
      set({ isLoading: false });
    }
  },

  signOut: async () => {
    set({ isLoading: true, error: null });

    try {
      const supabase = createClient();
      const currentUser = get().user as any;
      const provider: 'google' | 'kakao' | null =
        currentUser?.app_metadata?.provider || currentUser?.identities?.[0]?.provider || null;

      // 프로바이더 로그아웃을 먼저 시도 (토큰이 유효할 때)
      await triggerProviderLogout(provider, supabase);

      const { error } = await supabase.auth.signOut({ scope: 'global' });

      if (error) {
        throw error;
      }

      set({ user: null, profile: null });
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : '로그아웃에 실패했습니다.',
      });
      throw error;
    } finally {
      set({ isLoading: false });
    }
  },

  updateProfile: async (data: Database['public']['Tables']['profiles']['Update']) => {
    const { user } = get();
    if (!user) {
      throw new Error('로그인이 필요합니다.');
    }

    set({ isLoading: true, error: null });

    try {
      const supabase = createClient();
      const { data: updatedProfile, error } = await supabase
        .from('profiles')
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
        error: error instanceof Error ? error.message : '프로필 업데이트에 실패했습니다.',
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
      const supabase = createClient();
      console.log('[authStore] Supabase client created successfully');

      console.log('[authStore] About to execute database query...');
      console.log('[authStore] Query details:', {
        table: 'profiles',
        userId: targetUserId,
        supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL,
        hasAnonKey: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      });

      // (임시 제거) REST 프로브 호출은 동시성 잠금을 피하기 위해 비활성화

      // 2) 공식 postgrest 클라이언트 호출 (타임아웃/중단 제어 포함)
      const queryAbortController = new AbortController();
      const queryTimeoutId = setTimeout(() => {
        console.warn('[authStore] Query timeout reached, aborting request');
        queryAbortController.abort();
      }, 15000);

      const { data: profile, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', targetUserId)
        // Postgrest abortSignal 연결
        .abortSignal(queryAbortController.signal)
        .single();

      clearTimeout(queryTimeoutId);

      console.log('[authStore] Database query returned (after await)...');

      console.log('[authStore] Database query completed:', {
        hasProfile: !!profile,
        errorCode: error?.code,
      });

      if (error) {
        // 프로필이 없으면 에러를 던져서 redirect 페이지에서 처리하게 함
        if ((error as any).code === 'PGRST116') {
          console.log('[authStore] No profile found, signing out unregistered user');

          // 로그아웃 후 에러 던지기
          // try {
          //   // 스토어의 signOut을 호출하여 프로바이더까지 함께 로그아웃
          //   await get().signOut();
          //   console.log('[authStore] SignOut (with provider) completed');
          // } catch (signOutError) {
          //   console.error('[authStore] SignOut failed, continuing anyway:', signOutError);
          // }

          // 에러 메시지만 설정 (user 상태는 signOut()에서 처리)
          set({
            error: '가입되지 않은 계정입니다. 로그인할 수 없습니다.',
          });
          throw new Error('PROFILE_NOT_FOUND');
        }
        throw error;
      }

      console.log('[authStore] Profile found, fetching user funds...');

      // 프로필과 함께 사용자의 펀드 참여 정보도 조회
      try {
        const { data: fundMembers, error: fundError } = await supabase
          .from('fund_members')
          .select('fund_id')
          .eq('profile_id', profile.id);

        let userFunds: string[] = [];
        if (!fundError && fundMembers) {
          userFunds = fundMembers.map(member => member.fund_id);
          console.log('[authStore] User funds loaded successfully:', userFunds);
        } else if (fundError) {
          console.warn('[authStore] Failed to load user funds:', fundError);
          // 에러가 있어도 빈 배열로 설정하여 survey에서 fallback DB 체크가 가능하도록 함
        }

        set({
          profile: profile as Profile,
          userFunds: userFunds,
        });

        console.log('[authStore] Profile and userFunds set successfully');
      } catch (fundFetchError) {
        console.warn('[authStore] Error fetching user funds:', fundFetchError);
        // 펀드 정보 로딩에 실패해도 프로필은 설정
        set({
          profile: profile as Profile,
          userFunds: [],
        });
        console.log('[authStore] Profile set with empty userFunds due to fetch error');
      }
    } catch (error) {
      console.log('[authStore] fetchProfile error:', error);
      set({
        error: error instanceof Error ? error.message : '프로필을 불러오는데 실패했습니다.',
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
    });
  },

  findProfileByEmail: async (email: string) => {
    console.log('[authStore] findProfileByEmail called:', { email });

    try {
      const supabase = createClient();

      const { data: profile, error } = await supabase
        .from('profiles')
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
}));
