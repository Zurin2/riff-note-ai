'use client';

import Link from 'next/link';

// Slim auth scaffold shared by login / register / forgot-password / reset-password.
export default function AuthCard({ kicker, title, subtitle, children, footer }) {
  return (
    <div className="max-w-md mx-auto px-4 py-16">
      <header className="text-center mb-8">
        <p className="font-heading text-3xl tracking-tight">riff</p>
        <p className="mt-1 text-[11px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
          {kicker}
        </p>
      </header>

      <section className="rise rounded-[24px] bg-card border border-border/70 paper-shadow p-6">
        <h1 className="font-heading text-2xl leading-snug">{title}</h1>
        {subtitle ? <p className="mt-1.5 text-sm text-muted-foreground leading-relaxed">{subtitle}</p> : null}
        <div className="mt-5">{children}</div>
      </section>

      {footer ? <footer className="mt-6 text-center text-sm text-muted-foreground">{footer}</footer> : null}
      <p className="mt-10 text-center text-[11px] text-muted-foreground">
        <Link
          href="/login"
          className="underline underline-offset-4 decoration-border transition-colors duration-150 ease-out hover:text-foreground focus-visible:outline-none"
        >
          Back to sign in
        </Link>
      </p>
    </div>
  );
}

export function Field({ label, type, value, onChange, placeholder, autoFocus }) {
  return (
    <label className="block">
      <span className="block text-[11px] font-semibold uppercase tracking-[0.2em] text-muted-foreground mb-1.5">
        {label}
      </span>
      <input
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        autoFocus={autoFocus}
        required
        className="w-full h-11 rounded-[14px] bg-white border border-border/80 px-3.5 text-sm transition-colors duration-150 ease-out focus:outline-none focus:border-[hsl(18_54%_47%)]/60 focus-visible:ring-2 focus-visible:ring-ring/40 placeholder:text-muted-foreground/60"
      />
    </label>
  );
}

export function SubmitButton({ busy, children }) {
  return (
    <button
      type="submit"
      disabled={busy}
      className="w-full h-11 rounded-full bg-primary text-primary-foreground text-sm font-medium grid place-items-center transition-opacity duration-150 ease-out hover:opacity-90 transition-transform duration-100 active:scale-[0.99] disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
    >
      {busy ? (
        <span className="w-4 h-4 rounded-full border-2 border-primary-foreground/30 border-t-primary-foreground animate-spin" aria-hidden="true" />
      ) : (
        children
      )}
    </button>
  );
}

export function AuthError({ message, tone = 'error' }) {
  if (!message) return null;
  return (
    <p
      className="text-xs leading-relaxed px-3 py-2 rounded-lg bg-red-50"
      style={{ color: tone === 'error' ? 'hsl(6 62% 48%)' : 'hsl(18 54% 47%)' }}
      role="alert"
    >
      {message}
    </p>
  );
}
