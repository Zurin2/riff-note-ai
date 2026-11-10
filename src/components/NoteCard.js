'use client';

import formatWhen from '@/lib/formatWhen';

export default function NoteCard({ note, compact = false, onClick }) {
  const bullets = Array.isArray(note.bullets) ? note.bullets : [];
  const body = (
    <>
      <h4 className="font-heading text-[15px] leading-snug">{note.title}</h4>
      <ul className={`space-y-1 ${compact ? 'mt-1.5' : 'mt-2.5'}`}>
        {bullets.map((bullet, i) => (
          <li key={i} className="flex gap-2 text-[13px] leading-snug text-foreground/90">
            <span className="mt-[7px] w-1 h-1 rounded-full bg-[hsl(18_54%_47%)] shrink-0" aria-hidden="true" />
            <span>{bullet}</span>
          </li>
        ))}
      </ul>
      <div className={`flex items-center gap-3 ${compact ? 'mt-2' : 'mt-3'} text-[11px] text-muted-foreground`}>
        {note.task_count > 0 ? (
          <span className="font-medium tabular-nums" style={{ color: 'hsl(18 54% 47%)' }}>
            {note.task_count} to-do{note.task_count === 1 ? '' : 's'}
          </span>
        ) : null}
        {note.created_at ? <span>{formatWhen(note.created_at)}</span> : null}
      </div>
    </>
  );

  const classes = `text-left block w-full rounded-[22px] bg-card border border-border/70 paper-shadow transition-colors duration-150 ease-out hover:border-border focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50 ${compact ? 'p-4' : 'p-5'}`;

  if (onClick) {
    return (
      <button type="button" onClick={onClick} className={classes}>
        {body}
      </button>
    );
  }
  return <div className={classes}>{body}</div>;
}
