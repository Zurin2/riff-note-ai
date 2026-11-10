'use client';

import { useEffect } from 'react';
import formatWhen from '@/lib/formatWhen';

export default function NoteDialog({ note, open, onClose, onDelete }) {
  useEffect(() => {
    if (!open) return undefined;
    const onKey = (event) => {
      if (event.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [open, onClose]);

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
            <p className="text-[12.5px] italic leading-relaxed text-muted-foreground [font-family:var(--font-body)]">
              “{note.source_text}”
            </p>
          </div>
        ) : null}

        <div className="flex items-center justify-between px-5 pb-5 pt-1">
          <button
            type="button"
            onClick={() => onDelete(note)}
            className="text-xs font-medium transition-colors duration-150 ease-out hover:text-destructive focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50 rounded px-1 py-0.5"
            style={{ color: 'hsl(6 62% 48%)' }}
          >
            Delete note
          </button>
          {note.task_count > 0 ? (
            <span className="text-[11px] text-muted-foreground tabular-nums">
              {note.task_count} to-do{note.task_count === 1 ? '' : 's'}
            </span>
          ) : null}
        </div>
      </div>
    </div>
  );
}
