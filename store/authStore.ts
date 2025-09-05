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
  setUser: (user: User | null) => void;
  setError: (error: string | null) => void;
  clearError: () => void;
  resetState: () => void;
  setLoading: (loading: boolean) => void;
}

export const useAuthStore = create<AuthStore>((set, get) => ({
  user: null,
  profile: null,
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

          // 상태 초기화 후 에러 메시지 설정
          set({
            user: null,
            profile: null,
            error: '가입되지 않은 계정입니다. 로그인할 수 없습니다.',
          });
          throw new Error('PROFILE_NOT_FOUND');
        }
        throw error;
      }

      console.log('[authStore] Profile found, setting profile');
      set({ profile: profile as Profile });
    } catch (error) {
      console.log('[authStore] fetchProfile error:', error);
      set({
        error: error instanceof Error ? error.message : '프로필을 불러오는데 실패했습니다.',
        profile: null,
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
      isLoading: false,
      isProfileLoading: false,
      error: null,
    });
  },

  setLoading: (loading: boolean) => {
    set({ isLoading: loading });
  },
}));
