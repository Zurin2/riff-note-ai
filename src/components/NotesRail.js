'use client';

import formatWhen from '@/lib/formatWhen';

export default function NotesRail({ notes, activeId, onSelect }) {
  return (
    <section>
      <h2 className="text-[11px] font-semibold uppercase tracking-[0.2em] text-muted-foreground px-1 mb-2">
        Recent notes
      </h2>
      <div className="divide-y divide-border/50 rounded-[22px] bg-card border border-border/70 paper-shadow">
        {notes.map((note) => (
          <button
            key={note.id}
            type="button"
            onClick={() => onSelect(note)}
            className={`block w-full text-left px-4 py-3 transition-colors duration-150 ease-out hover:bg-muted/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50 ${
              note.id === activeId ? 'bg-muted/70' : ''
            } ${note.id === notes[0].id ? 'rounded-t-[22px]' : ''} ${
              note.id === notes[notes.length - 1].id ? 'rounded-b-[22px]' : ''
            }`}
          >
            <p className="font-heading text-sm leading-snug">{note.title}</p>
            <p className="mt-0.5 text-[11px] text-muted-foreground tabular-nums">
              {Array.isArray(note.bullets) ? note.bullets.length : 0} bullets · {formatWhen(note.created_at)}
            </p>
          </button>
        ))}
      </div>
    </section>
  );
}
