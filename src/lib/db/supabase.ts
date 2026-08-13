// CompozeIT – Supabase Client
// Server-side and client-side Supabase clients

import { createClient, SupabaseClient } from '@supabase/supabase-js';

// ============================================================
// Server-side client (uses service role key for full access)
// ============================================================

let serverClient: SupabaseClient | null = null;

function getProjectUrl(url: string): string {
  return url.replace(/\/rest\/v1\/?$/, '');
}

export function getSupabaseServerClient(): SupabaseClient {
  if (serverClient) return serverClient;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceKey) {
    throw new Error(
      'Missing Supabase env vars. Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env.local'
    );
  }

  serverClient = createClient(getProjectUrl(url), serviceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });

  return serverClient;
}

// ============================================================
// Client-side client (uses anon key, respects RLS)
// ============================================================

let browserClient: SupabaseClient | null = null;

export function getSupabaseBrowserClient(): SupabaseClient {
  if (browserClient) return browserClient;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !anonKey) {
    throw new Error(
      'Missing Supabase env vars. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY in .env.local'
    );
  }

  browserClient = createClient(getProjectUrl(url), anonKey);
  return browserClient;
}
