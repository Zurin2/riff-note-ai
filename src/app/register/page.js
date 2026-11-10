'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { getSupabase } from '@/utils/supabase/client';
import AuthCard, { Field, SubmitButton, AuthError } from '@/components/AuthCard';

export default function RegisterPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const submit = async (event) => {
    event.preventDefault();
    setBusy(true);
    setError('');
    setNotice('');
    const { data, error: authError } = await getSupabase().auth.signUp({ email, password });
    setBusy(false);
    if (authError) {
      setError(authError.message);
      return;
    }
    // With email confirmation ON (Supabase default) there is no session yet.
    if (data?.session) {
      router.replace('/');
      router.refresh();
    } else {
      setNotice('Check your email — confirm your address, then sign in.');
    }
  };

  return (
    <AuthCard
      kicker="Start fresh"
      title="Create your account"
      subtitle="One account, one private space. Nobody else — not even admins — can read you here."
      footer={
        <>
          Already have an account?{' '}
          <Link href="/login" className="underline underline-offset-4 decoration-border hover:text-foreground">
            Sign in
          </Link>
        </>
      }
    >
      <form onSubmit={submit} className="space-y-4">
        <Field label="Email" type="email" value={email} onChange={setEmail} placeholder="you@example.com" autoFocus />
        <Field label="Password" type="password" value={password} onChange={setPassword} placeholder="At least 6 characters" />
        <AuthError message={error} />
        {notice ? <AuthError message={notice} tone="notice" /> : null}
        <SubmitButton busy={busy}>Create account</SubmitButton>
      </form>
    </AuthCard>
  );
}
