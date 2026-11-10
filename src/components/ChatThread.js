'use client';

import NoteCard from './NoteCard';

// The conversation view. User turns are plain dark bubbles; assistant turns
// are NoteCards. When thinking=true a skeleton placeholder holds the last slot.
export default function ChatThread({ messages, notesById, thinking, emptyState }) {
  if (messages.length === 0 && !thinking && emptyState) {
    return <div className="rise">{emptyState}</div>;
  }

  return (
    <div className="space-y-4">
      {messages.map((message) =>
        message.role === 'user' ? (
          <div key={message.id} className="flex justify-end rise">
            <p className="max-w-[85%] rounded-2xl rounded-br-md bg-primary text-primary-foreground text-sm leading-relaxed px-4 py-2.5">
              {message.content}
            </p>
          </div>
        ) : (
          <div key={message.id} className="rise">
            {/* The reply lives in Note / Task; message.note_id is the pointer.
                Old records without a note fall back to the plain title. */}
            {notesById?.[message.note_id] ? (
              <div className="max-w-md ml-1">
                <NoteCard note={notesById[message.note_id]} compact />
              </div>
            ) : (
              <p className="max-w-[85%] text-sm text-muted-foreground px-1">{message.content}</p>
            )}
          </div>
        )
      )}

      {thinking ? (
        <div className="max-w-md ml-1 rounded-[22px] bg-card border border-border/70 paper-shadow p-4" aria-live="polite">
          <span className="text-[10px] font-semibold uppercase tracking-[0.24em] text-muted-foreground">
            Organizing
          </span>
          <div className="mt-2 space-y-1.5" aria-hidden="true">
            <div className="h-3.5 w-1/2 rounded bg-muted shimmer-row" />
            <div className="h-3.5 w-3/4 rounded bg-muted shimmer-row" style={{ animationDelay: '0.15s' }} />
            <div className="h-3.5 w-2/3 rounded bg-muted shimmer-row" style={{ animationDelay: '0.3s' }} />
          </div>
        </div>
      ) : null}
    </div>
  );
}
