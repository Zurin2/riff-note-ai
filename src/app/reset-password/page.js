'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { getSupabase } from '@/utils/supabase/client';
import AuthCard, { Field, SubmitButton, AuthError } from '@/components/AuthCard';

export default function ResetPasswordPage() {
  const router = useRouter();
  const recoverRef = useRef();
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [stage, setStage] = useState('waiting'); // waiting | ready | missing

  useEffect(() => {
    recoverRef.current = 'waiting';
    const supabase = getSupabase();
    const { data } = supabase.auth.onAuthStateChange((event, session) => {
      if ((event === 'PASSWORD_RECOVERY' || event === 'SIGNED_IN') && session) {
        recoverRef.current = 'ready';
        setStage('ready');
      }
    });
    // The browser client already exchanged ?code=... for a session during init
    // (detectSessionInUrl). Give that exchange a moment, then settle the view.
    const timer = setTimeout(() => {
      if (recoverRef.current !== 'waiting') return;
      supabase.auth.getSession().then(({ data: sessionData }) => {
        if (sessionData?.session) {
          setStage('ready');
        } else {
          recoverRef.current = 'missing';
          setStage('missing');
        }
      });
    }, 1200);
    return () => {
      clearTimeout(timer);
      data.subscription.unsubscribe();
    };
  }, []);

  const submit = async (event) => {
    event.preventDefault();
    setBusy(true);
    setError('');
    const { error: authError } = await getSupabase().auth.updateUser({ password });
    setBusy(false);
    if (authError) {
      setError(authError.message);
      return;
    }
    router.replace('/');
    router.refresh();
  };

  return (
    <AuthCard
      kicker="Account recovery"
      title="Set a new password"
      subtitle="Your existing notes, tasks and history stay exactly where they were."
      footer={
        stage === 'missing' ? (
          <>
            The link expired or was opened on a different device.{' '}
            <Link href="/forgot-password" className="underline underline-offset-4 decoration-border hover:text-foreground">
              Request a new one
            </Link>
          </>
        ) : null
      }
    >
      {stage === 'ready' ? (
        <form onSubmit={submit} className="space-y-4">
          <Field label="New password" type="password" value={password} onChange={setPassword} placeholder="At least 6 characters" autoFocus />
          <AuthError message={error} />
          <SubmitButton busy={busy}>Save password</SubmitButton>
        </form>
      ) : stage === 'missing' ? (
        <p className="text-sm text-muted-foreground">
          This recovery link is invalid or expired — request a new one below.
        </p>
      ) : (
        <p className="text-sm text-muted-foreground" aria-busy="true">
          Verifying the recovery link…
        </p>
      )}
    </AuthCard>
  );
}
