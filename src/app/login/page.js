'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { getSupabase } from '@/utils/supabase/client';
import AuthCard, { Field, SubmitButton, AuthError } from '@/components/AuthCard';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const submit = async (event) => {
    event.preventDefault();
    setBusy(true);
    setError('');
    const { error: authError } = await getSupabase().auth.signInWithPassword({ email, password });
    setBusy(false);
    if (authError) {
      setError(
        authError.message === 'Invalid login credentials'
          ? 'That email and password did not match an account.'
          : authError.message
      );
      return;
    }
    router.replace('/');
    router.refresh();
  };

  return (
    <AuthCard
      kicker="Welcome back"
      title="Sign in to riff"
      subtitle="Your notes and to-dos stay private to this account."
      footer={
        <>
          New here?{' '}
          <Link href="/register" className="underline underline-offset-4 decoration-border hover:text-foreground">
            Create an account
          </Link>
          {' · '}
          <Link href="/forgot-password" className="underline underline-offset-4 decoration-border hover:text-foreground">
            Forgot password
          </Link>
        </>
      }
    >
      <form onSubmit={submit} className="space-y-4">
        <Field label="Email" type="email" value={email} onChange={setEmail} placeholder="you@example.com" autoFocus />
        <Field label="Password" type="password" value={password} onChange={setPassword} placeholder="••••••••" />
        <AuthError message={error} />
        <SubmitButton busy={busy}>Sign in</SubmitButton>
      </form>
    </AuthCard>
  );
}
