'use client';

import { createBrowserClient } from '@supabase/ssr';

// One browser client for every Client Component. @supabase/ssr stores the
// session in cookies (matching the server client) and auto-refreshes tokens.
export function getSupabase() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  );
}
