'use client';

import { useState } from 'react';
import { getSupabase } from '@/utils/supabase/client';
import AuthCard, { Field, SubmitButton, AuthError } from '@/components/AuthCard';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const submit = async (event) => {
    event.preventDefault();
    setBusy(true);
    setError('');
    setNotice('');
    // The email lands with a link back to /reset-password; the browser client
    // exchanges the code automatically (same device, PKCE/meta stored client-side).
    const { error: authError } = await getSupabase().auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    setBusy(false);
    if (authError) {
      setError(authError.message);
      return;
    }
    setNotice('Reset link sent. Open it on this device to set a new password.');
  };

  return (
    <AuthCard
      kicker="Account recovery"
      title="Reset your password"
      subtitle="We'll email you a link. Nothing about your notes changes until you set a new password."
    >
      <form onSubmit={submit} className="space-y-4">
        <Field label="Email" type="email" value={email} onChange={setEmail} placeholder="you@example.com" autoFocus />
        <AuthError message={error} />
        {notice ? <AuthError message={notice} tone="notice" /> : null}
        <SubmitButton busy={busy}>Send reset link</SubmitButton>
      </form>
    </AuthCard>
  );
}
