'use client';

import { useEffect, useState } from 'react';
import formatWhen from '@/lib/formatWhen';

// Edit form lives as its own keyed component: mounting snapshots the note into
// local state once, so Cancel simply discards by unmounting — no stale drafts.
function NoteEditForm({ note, onSave, onCancel }) {
  const [title, setTitle] = useState(note.title);
  const [bulletsText, setBulletsText] = useState(
    (Array.isArray(note.bullets) ? note.bullets : []).join('\n')
  );
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const submit = async (event) => {
    event.preventDefault();
    if (busy) return;
    setBusy(true);
    setError('');
    const cleanedTitle = title.trim() || 'Untitled note';
    const bullets = bulletsText
      .split('\n')
      .map((line) => line.trim())
      .filter(Boolean);
    try {
      await onSave(note.id, { title: cleanedTitle, bullets });
    } catch (err) {
      setError(err?.message || "Couldn't save the edit.");
      setBusy(false);
      return;
    }
    setBusy(false);
    onCancel(); // back to view mode, showing the saved values
  };

  return (
    <form onSubmit={submit} className="px-5">
      <label className="block">
        <span className="block text-[11px] font-semibold uppercase tracking-[0.2em] text-muted-foreground mb-1.5">
          Title
        </span>
        <input
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          required
          className="w-full h-11 rounded-[14px] bg-white border border-border/80 px-3.5 font-heading text-base transition-colors duration-150 ease-out focus:outline-none focus:border-[hsl(18_54%_47%)]/60 focus-visible:ring-2 focus-visible:ring-ring/40"
        />
      </label>

      <label className="block mt-4">
        <span className="block text-[11px] font-semibold uppercase tracking-[0.2em] text-muted-foreground mb-1.5">
          Bullets — one idea per line
        </span>
        <textarea
          value={bulletsText}
          onChange={(event) => setBulletsText(event.target.value)}
          rows={Math.max(3, bulletsText.split('\n').length + 1)}
          placeholder={'one idea per line\nadd the missing detail here'}
          className="w-full resize-y rounded-[14px] bg-white border border-border/80 px-3.5 py-2.5 text-sm leading-relaxed transition-colors duration-150 ease-out focus:outline-none focus:border-[hsl(18_54%_47%)]/60 focus-visible:ring-2 focus-visible:ring-ring/40 placeholder:text-muted-foreground/60"
        />
      </label>

      {error ? (
        <p className="mt-3 text-xs px-3 py-2 rounded-lg bg-red-50" style={{ color: 'hsl(6 62% 48%)' }} role="alert">
          {error}
        </p>
      ) : null}

      <div className="flex items-center justify-between mt-4 mb-5">
        <button
          type="button"
          onClick={onCancel}
          className="text-xs text-muted-foreground transition-colors duration-150 ease-out hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50 rounded px-1 py-1"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={busy}
          className="px-5 h-10 rounded-full bg-primary text-primary-foreground text-sm font-medium grid place-items-center transition-opacity duration-150 ease-out hover:opacity-90 disabled:opacity-50 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
        >
          {busy ? (
            <span className="w-4 h-4 rounded-full border-2 border-primary-foreground/30 border-t-primary-foreground animate-spin" aria-hidden="true" />
          ) : (
            'Save note'
          )}
        </button>
      </div>
    </form>
  );
}

export default function NoteDialog({ note, open, onClose, onDelete, onSave }) {
  const [editing, setEditing] = useState(false);

  // Adjust state on prop change during render (React-recommended pattern):
  // whenever the dialog closes, editing mode resets without an effect.
  const [wasOpen, setWasOpen] = useState(open);
  if (open !== wasOpen) {
    setWasOpen(open);
    if (!open) setEditing(false);
  }

  useEffect(() => {
    if (!open || editing) return undefined;
    const onKey = (event) => {
      if (event.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [open, editing, onClose]);

  if (!open || !note) return null;

  const bullets = Array.isArray(note.bullets) ? note.bullets : [];

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={note.title}
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-3 sm:p-6"
    >
      <button
        type="button"
        aria-label="Close note"
        onClick={onClose}
        className="absolute inset-0 bg-black/25 backdrop-blur-[2px]"
      />
      <div className="relative w-full max-w-lg rise rounded-[24px] bg-card border border-border/70 paper-shadow">
        {editing ? (
          <NoteEditForm note={note} onSave={onSave} onCancel={() => setEditing(false)} />
        ) : (
          <>
            <div className="flex items-start justify-between gap-4 px-5 pt-5 pb-3">
              <div>
                <h3 className="font-heading text-xl leading-snug">{note.title}</h3>
                <p className="mt-1 text-xs text-muted-foreground">{formatWhen(note.created_at)}</p>
              </div>
              <button
                type="button"
                onClick={onClose}
                aria-label="Close"
                className="w-8 h-8 rounded-full grid place-items-center text-muted-foreground transition-colors duration-150 ease-out hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
              >
                <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                  <path d="M18 6 6 18M6 6l12 12" strokeLinecap="round" />
                </svg>
              </button>
            </div>

            <div className="px-5 pb-2">
              <ul className="space-y-1.5">
                {bullets.map((bullet, i) => (
                  <li key={i} className="flex gap-2 text-sm leading-relaxed">
                    <span className="mt-[8px] w-1 h-1 rounded-full bg-[hsl(18_54%_47%)] shrink-0" aria-hidden="true" />
                    <span>{bullet}</span>
                  </li>
                ))}
              </ul>
            </div>

            {note.source_text ? (
              <div className="mx-5 mt-4 mb-4 rounded-xl bg-muted/70 p-3">
                <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground mb-1.5">
                  What was said
                </p>
                <p className="text-[12.5px] italic leading-relaxed text-muted-foreground">
                  “{note.source_text}”
                </p>
              </div>
            ) : null}

            <div className="flex items-center justify-between px-5 pb-5 pt-1">
              <div className="flex items-center gap-4">
                <button
                  type="button"
                  onClick={() => setEditing(true)}
                  className="text-xs font-medium text-foreground/80 transition-colors duration-150 ease-out hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50 rounded px-1 py-0.5"
                >
                  Edit note
                </button>
                <button
                  type="button"
                  onClick={() => onDelete(note)}
                  className="text-xs font-medium transition-colors duration-150 ease-out hover:text-destructive focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50 rounded px-1 py-0.5"
                  style={{ color: 'hsl(6 62% 48%)' }}
                >
                  Delete note
                </button>
              </div>
              {note.task_count > 0 ? (
                <span className="text-[11px] text-muted-foreground tabular-nums">
                  {note.task_count} to-do{note.task_count === 1 ? '' : 's'}
                </span>
              ) : null}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
