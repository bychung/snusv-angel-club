import { createBrowserClient } from '@supabase/ssr';

const DEFAULT_TIMEOUT_MS = 15000;

function createLoggingFetch(timeoutMs: number = DEFAULT_TIMEOUT_MS) {
  return async function loggingFetch(
    input: RequestInfo | URL,
    init?: RequestInit
  ): Promise<Response> {
    const url =
      typeof input === 'string'
        ? input
        : input instanceof URL
        ? input.toString()
        : (input as Request).url;
    const method = init?.method || (input instanceof Request ? input.method : 'GET');

    const controller = new AbortController();
    const userSignal = init?.signal;
    const onUserAbort = () =>
      controller.abort((userSignal as any)?.reason || new DOMException('Aborted', 'AbortError'));
    if (userSignal) {
      if (userSignal.aborted) onUserAbort();
      else userSignal.addEventListener('abort', onUserAbort, { once: true });
    }
    const timeoutId = setTimeout(
      () => controller.abort(new DOMException('Timeout', 'TimeoutError')),
      timeoutMs
    );

    const startedAt = Date.now();
    // eslint-disable-next-line no-console
    console.log('[supabase fetch] →', method, url);

    try {
      const response = await fetch(input as any, { ...init, signal: controller.signal });
      const ms = Date.now() - startedAt;
      // eslint-disable-next-line no-console
      console.log('[supabase fetch] ←', method, url, response.status, `${ms}ms`);
      return response;
    } catch (error) {
      const ms = Date.now() - startedAt;
      // eslint-disable-next-line no-console
      console.warn('[supabase fetch] ✖', method, url, `${ms}ms`, error);
      throw error;
    } finally {
      clearTimeout(timeoutId);
      if (userSignal) userSignal.removeEventListener('abort', onUserAbort);
    }
  };
}

export function createClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL as string | undefined;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY as string | undefined;
  // eslint-disable-next-line no-console
  console.log('[supabase client] init', { hasUrl: !!url, hasAnonKey: !!anon });

  return createBrowserClient(url as string, anon as string, {
    global: {
      fetch: createLoggingFetch(),
    },
  });
}
