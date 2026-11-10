'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getSupabase } from '@/utils/supabase/client';

// Client-side guard for / and /history. RLS in Postgres is the real security
// boundary; this only keeps signed-out visitors from staring at empty states.
export default function ProtectedRoute({ children }) {
  const router = useRouter();
  const [state, setState] = useState('checking'); // 'checking' | 'in' | 'out'

  useEffect(() => {
    let alive = true;
    getSupabase().auth.getUser().then(({ data }) => {
      if (!alive) return;
      if (data?.user) {
        setState('in');
      } else {
        setState('out');
        router.replace('/login');
      }
    });
    return () => {
      alive = false;
    };
  }, [router]);

  if (state === 'in') return children;

  return (
    <div className="max-w-2xl mx-auto px-4 py-10 space-y-4" aria-busy="true" aria-live="polite">
      {[0, 1, 2].map((i) => (
        <div key={i} className="h-24 rounded-[22px] bg-card border border-border/70 paper-shadow" />
      ))}
    </div>
  );
}
